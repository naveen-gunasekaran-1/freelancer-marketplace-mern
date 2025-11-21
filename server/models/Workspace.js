const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  meetingLink: String,
  meetingId: String,
  password: String,
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'participant'],
      default: 'participant'
    },
    joinedAt: Date,
    leftAt: Date,
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'joined', 'left'],
      default: 'invited'
    }
  }],
  recordings: [{
    url: String,
    duration: Number,
    size: Number,
    recordedAt: Date
  }],
  agenda: [{
    item: String,
    order: Number
  }],
  notes: String,
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Support multiple team members (freelancers/collaborators)
  teamMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['lead', 'member', 'viewer'],
      default: 'member'
    },
    permissions: {
      canEditTasks: { type: Boolean, default: true },
      canUploadFiles: { type: Boolean, default: true },
      canScheduleMeetings: { type: Boolean, default: true },
      canInviteMembers: { type: Boolean, default: false },
      canDeleteContent: { type: Boolean, default: false }
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'invited', 'removed'],
      default: 'active'
    }
  }],
  // Legacy freelancer field (for backward compatibility)
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active'
  },
  // Group conversation ID for team chat
  groupConversationId: {
    type: String,
    unique: true,
    sparse: true
  },
  meetings: [meetingSchema],
  documents: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    category: {
      type: String,
      enum: ['contract', 'requirement', 'deliverable', 'design', 'code', 'document', 'other'],
      default: 'other'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    },
    isShared: {
      type: Boolean,
      default: true
    },
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  tasks: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'review', 'completed', 'blocked'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    dueDate: Date,
    completedAt: Date,
    tags: [String],
    subtasks: [{
      title: String,
      completed: { type: Boolean, default: false },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      completedAt: Date
    }],
    attachments: [{
      name: String,
      url: String,
      uploadedAt: Date
    }],
    comments: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    activityLog: [{
      action: String, // 'created', 'assigned', 'status_changed', 'commented'
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      details: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  timeline: [{
    event: String,
    description: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    allowScreenSharing: {
      type: Boolean,
      default: true
    },
    allowRecording: {
      type: Boolean,
      default: true
    },
    autoScheduleReminders: {
      type: Boolean,
      default: true
    },
    reminderMinutesBefore: {
      type: Number,
      default: 15
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
workspaceSchema.index({ job: 1 });
workspaceSchema.index({ client: 1, freelancer: 1 });
workspaceSchema.index({ status: 1 });
meetingSchema.index({ scheduledAt: 1 });
meetingSchema.index({ status: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
