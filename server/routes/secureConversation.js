const express = require('express');
const SecureConversation = require('../models/SecureConversation');
const authenticateToken = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Get user's secure conversations
router.get('/my-conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await SecureConversation.find({
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ],
      status: { $ne: 'closed' }
    })
    .populate('jobId', 'title budget category status')
    .populate('clientId', 'name profileImage rating')
    .populate('freelancerId', 'name profileImage rating skills')
    .select('-messages -auditLog') // Don't send all messages, fetch separately
    .sort({ lastActivity: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversation by proposal ID
router.get('/proposal/:proposalId', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      proposalId: req.params.proposalId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    })
    .populate('jobId', 'title budget category status')
    .populate('clientId', 'name profileImage rating email')
    .populate('freelancerId', 'name profileImage rating email skills')
    .select('conversationId jobId proposalId clientId freelancerId status lastActivity');

    if (!conversation) {
      return res.status(404).json({ error: 'No conversation found for this proposal' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation by proposal:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific conversation details
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    })
    .populate('jobId', 'title budget category status')
    .populate('clientId', 'name profileImage rating email')
    .populate('freelancerId', 'name profileImage rating email skills');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Exchange public keys for E2E encryption
router.post('/:conversationId/exchange-keys', authenticateToken, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Store public key based on user role
    if (conversation.clientId.toString() === req.user._id.toString()) {
      conversation.encryption.clientPublicKey = publicKey;
    } else {
      conversation.encryption.freelancerPublicKey = publicKey;
    }

    await conversation.save();

    // Add audit log
    await conversation.addAuditLog(
      'public_key_exchanged',
      req.user._id,
      'Public key registered for E2E encryption',
      req.ip,
      req.get('user-agent')
    );

    // Notify other party that encryption is ready
    const partnerId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    if (req.io && conversation.encryption.clientPublicKey && conversation.encryption.freelancerPublicKey) {
      req.io.to(`user_${partnerId}`).emit('encryption_ready', {
        conversationId: conversation.conversationId,
        message: 'End-to-end encryption is now active'
      });
    }

    res.json({ 
      success: true, 
      encryptionReady: !!(conversation.encryption.clientPublicKey && conversation.encryption.freelancerPublicKey)
    });
  } catch (error) {
    console.error('Error exchanging keys:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send encrypted message
router.post('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { encryptedContent, contentHash, signature, messageType, encryptedAttachments } = req.body;

    console.log('📨 Received message:', {
      encryptedContentLength: encryptedContent?.length,
      encryptedContentPreview: encryptedContent?.substring(0, 50),
      contentHash: contentHash?.substring(0, 20),
      signature: signature?.substring(0, 30),
      messageType
    });

    if (!encryptedContent || !contentHash) {
      return res.status(400).json({ error: 'Encrypted content and hash are required' });
    }

    // Signature is optional for basic encryption
    if (!signature || signature === 'BASIC_ENCRYPTION_NO_SIGNATURE') {
      console.log('⚠️ Message using basic encryption (no signature)');
    }

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.status !== 'active') {
      return res.status(400).json({ error: 'Conversation is not active' });
    }

    // Determine recipient
    const recipientId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    const messageId = `msg_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    const messageData = {
      messageId,
      senderId: req.user._id,
      recipientId,
      encryptedContent,
      contentHash,
      signature,
      messageType: messageType || 'text',
      encryptedAttachments: encryptedAttachments || [],
      isRead: false,
      status: 'sent',
      createdAt: new Date()
    };

    console.log('💾 Storing message in database:', {
      messageId,
      encryptedContentLength: encryptedContent.length,
      encryptedContentPreview: encryptedContent.substring(0, 50),
      isBasicEncryption: signature === 'BASIC_ENCRYPTION_NO_SIGNATURE'
    });

    await conversation.addMessage(messageData);

    // Check if recipient is online
    const recipientSocketId = req.io?.sockets.adapter.rooms.get(`user_${recipientId}`);
    const isRecipientOnline = recipientSocketId && recipientSocketId.size > 0;

    // If recipient is online, mark as delivered
    if (isRecipientOnline) {
      // Find the message we just added and update its status
      const messageIndex = conversation.messages.findIndex(m => m.messageId === messageId);
      if (messageIndex !== -1) {
        conversation.messages[messageIndex].status = 'delivered';
        conversation.messages[messageIndex].deliveredAt = new Date();
        await conversation.save();
        messageData.status = 'delivered';
        messageData.deliveredAt = new Date();
        
        // Notify sender about delivery
        req.io.to(`user_${req.user._id}`).emit('message_delivered', {
          messageId,
          status: 'delivered',
          deliveredAt: messageData.deliveredAt
        });
      }
    }

    // Emit real-time encrypted message to recipient
    if (req.io) {
      req.io.to(`user_${recipientId}`).emit('encrypted_message', {
        conversationId: conversation.conversationId,
        message: messageData
      });
    }

    res.status(201).json({ 
      success: true, 
      messageId,
      timestamp: messageData.createdAt,
      status: messageData.status
    });
  } catch (error) {
    console.error('Error sending encrypted message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get encrypted messages
router.get('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    let messages = conversation.messages;

    // Filter messages if 'before' timestamp provided (for pagination)
    if (before) {
      messages = messages.filter(msg => msg.createdAt < new Date(before));
    }

    // Sort by newest first and limit
    messages = messages
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, parseInt(limit));

    console.log(`📤 Sending ${messages.length} messages to client`);
    if (messages.length > 0) {
      console.log('📧 Sample message:', {
        messageId: messages[0].messageId,
        encryptedContentLength: messages[0].encryptedContent?.length,
        encryptedContentPreview: messages[0].encryptedContent?.substring(0, 50),
        signature: messages[0].signature?.substring(0, 30)
      });
    }

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read
router.put('/:conversationId/messages/read', authenticateToken, async (req, res) => {
  try {
    const { messageIds } = req.body;

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Determine who is the sender (other person)
    const senderId = conversation.clientId.toString() === req.user._id.toString()
      ? conversation.freelancerId
      : conversation.clientId;

    // Mark messages as read
    let updated = false;
    conversation.messages.forEach(msg => {
      if (messageIds.includes(msg.messageId) && msg.recipientId.toString() === req.user._id.toString()) {
        msg.isRead = true;
        msg.readAt = new Date();
        msg.status = 'read';
        updated = true;
      }
    });

    if (updated) {
      await conversation.save();
      
      // Notify sender about read status using global.io
      if (global.io) {
        global.io.to(`user_${senderId}`).emit('messages_read', {
          conversationId: req.params.conversationId,
          readBy: req.user._id,
          readAt: new Date()
        });
        console.log('📤 Emitted messages_read to user:', senderId, 'for conversation:', req.params.conversationId);
      } else {
        console.warn('⚠️ global.io not available for messages_read');
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark message as delivered
router.put('/:conversationId/messages/:messageId/delivered', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Find and update the message
    const message = conversation.messages.find(m => m.messageId === messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (message.status === 'sent') {
      message.status = 'delivered';
      message.deliveredAt = new Date();
      await conversation.save();

      // Notify sender with conversationId using global.io
      if (global.io) {
        global.io.to(`user_${message.senderId}`).emit('message_delivered', {
          conversationId: req.params.conversationId,
          messageId: message.messageId,
          status: 'delivered',
          deliveredAt: message.deliveredAt
        });
        console.log('📤 Emitted message_delivered to user:', message.senderId, 'for conversation:', req.params.conversationId);
      } else {
        console.warn('⚠️ global.io not available');
      }
    }

    res.json({ success: true, status: message.status });
  } catch (error) {
    console.error('Error marking message as delivered:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Schedule encrypted meeting
router.post('/:conversationId/meetings', authenticateToken, async (req, res) => {
  try {
    const { title, description, scheduledAt, duration, type } = req.body;

    if (!title || !scheduledAt || !duration) {
      return res.status(400).json({ error: 'Title, scheduled time, and duration are required' });
    }

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const meetingId = `meet_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
    const meetingLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/secure-meeting/${meetingId}`;

    const partnerId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    const meetingData = {
      meetingId,
      title,
      description: description || '',
      scheduledAt: new Date(scheduledAt),
      duration: parseInt(duration),
      type: type || 'video',
      status: 'scheduled',
      meetingLink,
      participants: [
        { userId: req.user._id, joined: false },
        { userId: partnerId, joined: false }
      ],
      createdBy: req.user._id,
      createdAt: new Date()
    };

    await conversation.scheduleMeeting(meetingData);

    // Add audit log
    await conversation.addAuditLog(
      'meeting_scheduled',
      req.user._id,
      `Meeting "${title}" scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      req.ip,
      req.get('user-agent')
    );

    // Notify partner
    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('meeting_scheduled', {
        conversationId: conversation.conversationId,
        meeting: meetingData
      });
    }

    res.status(201).json({ success: true, meeting: meetingData });
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get scheduled meetings
router.get('/:conversationId/meetings', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    }).select('scheduledMeetings');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation.scheduledMeetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join meeting (update participant status)
router.post('/:conversationId/meetings/:meetingId/join', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const meeting = conversation.scheduledMeetings.find(
      m => m.meetingId === req.params.meetingId
    );

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Update participant status
    const participant = meeting.participants.find(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (participant) {
      participant.joined = true;
      participant.joinedAt = new Date();
    }

    // Update meeting status
    if (meeting.status === 'scheduled') {
      meeting.status = 'in-progress';
    }

    await conversation.save();

    // Notify other participant
    const partnerId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('participant_joined', {
        conversationId: conversation.conversationId,
        meetingId: meeting.meetingId,
        userId: req.user._id
      });
    }

    res.json({ success: true, meeting });
  } catch (error) {
    console.error('Error joining meeting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload encrypted document to workspace
router.post('/:conversationId/documents', authenticateToken, async (req, res) => {
  try {
    const { name, encryptedUrl, encryptionKey, fileSize, mimeType, checksum } = req.body;

    if (!name || !encryptedUrl || !encryptionKey) {
      return res.status(400).json({ error: 'Document name, URL, and encryption key are required' });
    }

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const documentId = `doc_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;

    const documentData = {
      documentId,
      name,
      encryptedUrl,
      encryptionKey,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/octet-stream',
      uploadedBy: req.user._id,
      version: 1,
      checksum: checksum || '',
      uploadedAt: new Date(),
      accessLog: []
    };

    conversation.sharedWorkspace.documents.push(documentData);
    conversation.lastActivity = new Date();
    await conversation.save();

    // Add audit log
    await conversation.addAuditLog(
      'document_uploaded',
      req.user._id,
      `Document "${name}" uploaded to workspace`,
      req.ip,
      req.get('user-agent')
    );

    // Notify partner
    const partnerId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('document_uploaded', {
        conversationId: conversation.conversationId,
        document: documentData
      });
    }

    res.status(201).json({ success: true, document: documentData });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get workspace documents
router.get('/:conversationId/documents', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    })
    .select('sharedWorkspace.documents')
    .populate('sharedWorkspace.documents.uploadedBy', 'name profileImage');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation.sharedWorkspace.documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workspace task
router.post('/:conversationId/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const taskId = `task_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const taskData = {
      taskId,
      title,
      description: description || '',
      status: 'todo',
      assignedTo: assignedTo || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      createdBy: req.user._id,
      createdAt: new Date()
    };

    conversation.sharedWorkspace.tasks.push(taskData);
    conversation.lastActivity = new Date();
    await conversation.save();

    // Notify assigned user if specified
    if (assignedTo && req.io) {
      req.io.to(`user_${assignedTo}`).emit('task_assigned', {
        conversationId: conversation.conversationId,
        task: taskData
      });
    }

    res.status(201).json({ success: true, task: taskData });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get workspace tasks
router.get('/:conversationId/tasks', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    })
    .select('sharedWorkspace.tasks')
    .populate('sharedWorkspace.tasks.assignedTo', 'name profileImage')
    .populate('sharedWorkspace.tasks.createdBy', 'name profileImage');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation.sharedWorkspace.tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
router.patch('/:conversationId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const task = conversation.sharedWorkspace.tasks.find(
      t => t.taskId === req.params.taskId
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      }
    }

    conversation.lastActivity = new Date();
    await conversation.save();

    // Notify partner
    const partnerId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('task_updated', {
        conversationId: conversation.conversationId,
        task
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start screen sharing session
router.post('/:conversationId/screen-share/start', authenticateToken, async (req, res) => {
  try {
    const { quality } = req.body;

    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const sessionId = `screen_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const sessionData = {
      sessionId,
      initiatedBy: req.user._id,
      startedAt: new Date(),
      quality: quality || 'medium',
      encryptionEnabled: true
    };

    conversation.screenSharingSessions.push(sessionData);
    await conversation.save();

    // Notify partner
    const partnerId = conversation.clientId.toString() === req.user._id.toString() 
      ? conversation.freelancerId 
      : conversation.clientId;

    if (req.io) {
      req.io.to(`user_${partnerId}`).emit('screen_share_started', {
        conversationId: conversation.conversationId,
        sessionId,
        initiatedBy: req.user._id
      });
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error starting screen share:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get conversation audit log (for security review)
router.get('/:conversationId/audit-log', authenticateToken, async (req, res) => {
  try {
    const conversation = await SecureConversation.findOne({
      conversationId: req.params.conversationId,
      $or: [
        { clientId: req.user._id },
        { freelancerId: req.user._id }
      ]
    })
    .select('auditLog')
    .populate('auditLog.performedBy', 'name email');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation.auditLog);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
