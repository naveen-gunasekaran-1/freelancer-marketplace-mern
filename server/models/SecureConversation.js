const mongoose = require('mongoose');

// Secure conversation created when proposal is accepted
const secureConversationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Unique conversation ID
  conversationId: {
    type: String,
    required: true,
    unique: true
  },
  // End-to-end encryption keys (public keys only - private keys never stored)
  encryption: {
    clientPublicKey: String, // Client's public key for encryption
    freelancerPublicKey: String, // Freelancer's public key for encryption
    encryptionAlgorithm: {
      type: String,
      default: 'RSA-OAEP' // Using RSA-OAEP for asymmetric encryption
    },
    signingAlgorithm: {
      type: String,
      default: 'RSASSA-PKCS1-v1_5' // For message signing
    },
    keySize: {
      type: Number,
      default: 2048
    }
  },
  // Security settings
  security: {
    requireTwoFactor: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 3600000 }, // 1 hour in ms
    allowScreenRecording: { type: Boolean, default: false },
    watermarkEnabled: { type: Boolean, default: true },
    requireVerification: { type: Boolean, default: true }
  },
  // Video conferencing settings
  videoConference: {
    enabled: { type: Boolean, default: true },
    maxDuration: { type: Number, default: 7200 }, // 2 hours in seconds
    recordingAllowed: { type: Boolean, default: false },
    encryptedRecordings: [{ // If recording allowed, store encrypted
      recordingId: String,
      encryptedBlobUrl: String, // URL to encrypted recording
      encryptionKey: String, // Encrypted with both users' keys
      duration: Number,
      timestamp: Date,
      participants: [String]
    }]
  },
  // Meeting scheduling
  scheduledMeetings: [{
    meetingId: String,
    title: String,
    description: String,
    scheduledAt: Date,
    duration: Number, // in minutes
    type: {
      type: String,
      enum: ['video', 'audio', 'screen-share'],
      default: 'video'
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled'
    },
    meetingLink: String, // Encrypted meeting room link
    participants: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joined: Boolean,
      joinedAt: Date,
      leftAt: Date
    }],
    reminders: [{
      time: Date,
      sent: Boolean
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  // Encrypted messages
  messages: [{
    messageId: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    encryptedContent: String, // Message encrypted with recipient's public key
    contentHash: String, // SHA-256 hash for integrity verification
    signature: String, // Digital signature from sender
    messageType: {
      type: String,
      enum: ['text', 'file', 'image', 'voice', 'system'],
      default: 'text'
    },
    encryptedAttachments: [{
      fileName: String,
      fileSize: Number,
      mimeType: String,
      encryptedUrl: String,
      encryptionKey: String, // Symmetric key encrypted with recipient's public key
      checksum: String
    }],
    isRead: { type: Boolean, default: false },
    readAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent'
    },
    deliveredAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    expiresAt: Date, // For self-destructing messages
    createdAt: { type: Date, default: Date.now }
  }],
  // Workspace sharing
  sharedWorkspace: {
    enabled: { type: Boolean, default: true },
    documents: [{
      documentId: String,
      name: String,
      encryptedUrl: String,
      encryptionKey: String, // Encrypted with both users' keys
      fileSize: Number,
      mimeType: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      version: Number,
      checksum: String,
      uploadedAt: { type: Date, default: Date.now },
      accessLog: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        action: String, // 'viewed', 'downloaded', 'edited'
        timestamp: Date
      }]
    }],
    tasks: [{
      taskId: String,
      title: String,
      description: String,
      status: {
        type: String,
        enum: ['todo', 'in-progress', 'review', 'completed'],
        default: 'todo'
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: Date,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: { type: Date, default: Date.now },
      completedAt: Date
    }]
  },
  // Screen sharing sessions
  screenSharingSessions: [{
    sessionId: String,
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number, // in seconds
    quality: String, // 'low', 'medium', 'high'
    encryptionEnabled: { type: Boolean, default: true }
  }],
  // Conversation status
  status: {
    type: String,
    enum: ['active', 'archived', 'suspended', 'closed'],
    default: 'active'
  },
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  totalMeetings: {
    type: Number,
    default: 0
  },
  // Audit log for security
  auditLog: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: String,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Archive settings
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
secureConversationSchema.index({ jobId: 1 });
secureConversationSchema.index({ clientId: 1, freelancerId: 1 });
secureConversationSchema.index({ status: 1 });
secureConversationSchema.index({ 'messages.createdAt': -1 });

// Method to add encrypted message
secureConversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.totalMessages += 1;
  this.lastActivity = new Date();
  return this.save();
};

// Method to schedule meeting
secureConversationSchema.methods.scheduleMeeting = function(meetingData) {
  this.scheduledMeetings.push(meetingData);
  this.totalMeetings += 1;
  this.lastActivity = new Date();
  return this.save();
};

// Method to add audit log entry
secureConversationSchema.methods.addAuditLog = function(action, performedBy, details, ipAddress, userAgent) {
  this.auditLog.push({
    action,
    performedBy,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });
  return this.save();
};

module.exports = mongoose.model('SecureConversation', secureConversationSchema);
