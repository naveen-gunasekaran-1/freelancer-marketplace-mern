const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Job = require('../models/Job');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Send message
router.post('/', auth, [
  body('receiverId').isMongoId().withMessage('Valid receiver ID required'),
  body('jobId').isMongoId().withMessage('Valid job ID required'),
  body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content required'),
  body('type').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiverId, jobId, content, type = 'text', attachments = [], replyTo } = req.body;
    const senderId = req.user.id;

    // Verify job exists and user has access
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if user is involved in the job
    if (job.clientId.toString() !== senderId && job.selectedFreelancer?.toString() !== senderId) {
      return res.status(403).json({ error: 'Not authorized to send messages for this job' });
    }

    // Create message
    const message = new Message({
      senderId,
      receiverId,
      jobId,
      content,
      type,
      attachments,
      replyTo,
      status: 'sent'
    });

    await message.save();

    // Populate sender info for real-time delivery
    await message.populate('senderId', 'name profileImage');

    // Send real-time message
    req.io.to(`job_${jobId}`).emit('new_message', message);

    // Check if receiver is online and mark as delivered
    const receiverSocketId = req.io.sockets.adapter.rooms.get(`user_${receiverId}`);
    if (receiverSocketId && receiverSocketId.size > 0) {
      message.status = 'delivered';
      message.deliveredAt = new Date();
      await message.save();
      
      // Notify sender about delivery
      req.io.to(`user_${senderId}`).emit('message_delivered', {
        messageId: message._id,
        status: 'delivered',
        deliveredAt: message.deliveredAt
      });
    }

    // Create notification
    const notification = new Notification({
      userId: receiverId,
      type: 'message_received',
      title: 'New Message',
      message: `You received a message from ${req.user.name}`,
      data: {
        messageId: message._id,
        jobId: jobId
      }
    });

    await notification.save();

    // Send notification
    req.io.to(`user_${receiverId}`).emit('notification', notification);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for a job
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Verify job access
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.clientId.toString() !== userId && job.selectedFreelancer?.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to view messages for this job' });
    }

    const messages = await Message.find({ jobId })
      .populate('senderId', 'name profileImage')
      .populate('replyTo', 'content')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    const updatedMessages = await Message.updateMany(
      { jobId, receiverId: userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date(),
        status: 'read'
      }
    );

    // Notify sender about read status
    if (updatedMessages.modifiedCount > 0) {
      const readMessages = await Message.find({
        jobId,
        receiverId: userId,
        isRead: true,
        readAt: { $exists: true }
      }).select('_id senderId');

      // Group by sender and notify
      const senderIds = [...new Set(readMessages.map(m => m.senderId.toString()))];
      senderIds.forEach(senderId => {
        req.io.to(`user_${senderId}`).emit('messages_read', {
          jobId,
          readBy: userId,
          readAt: new Date()
        });
      });
    }

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get conversation list
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get unique job conversations for the user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $group: {
          _id: '$jobId',
          lastMessage: { $last: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.senderId',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastMessage.receiverId',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      {
        $project: {
          jobId: '$_id',
          job: { $arrayElemAt: ['$job', 0] },
          lastMessage: 1,
          unreadCount: 1,
          otherUser: {
            $cond: [
              { $eq: ['$lastMessage.senderId', userId] },
              { $arrayElemAt: ['$receiver', 0] },
              { $arrayElemAt: ['$sender', 0] }
            ]
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Edit message
router.put('/:messageId', auth, [
  body('content').isLength({ min: 1, max: 2000 }).withMessage('Message content required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    // Send real-time update
    req.io.to(`job_${message.jobId}`).emit('message_edited', {
      messageId: message._id,
      content: message.content,
      editedAt: message.editedAt
    });

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Mark message as delivered
router.put('/:messageId/delivered', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.receiverId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (message.status === 'sent') {
      message.status = 'delivered';
      message.deliveredAt = new Date();
      await message.save();

      // Notify sender
      req.io.to(`user_${message.senderId}`).emit('message_delivered', {
        messageId: message._id,
        status: 'delivered',
        deliveredAt: message.deliveredAt
      });
    }

    res.json({ success: true, status: message.status });
  } catch (error) {
    console.error('Mark delivered error:', error);
    res.status(500).json({ error: 'Failed to mark as delivered' });
  }
});

// Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    // Send real-time update
    req.io.to(`job_${message.jobId}`).emit('message_deleted', {
      messageId: message._id
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
