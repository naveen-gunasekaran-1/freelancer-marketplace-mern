const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'approved'],
    default: 'pending'
  },
  deliverables: [String],
  completedAt: Date,
  approvedAt: Date
});

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly'],
    default: 'fixed'
  },
  category: {
    type: String,
    required: true,
    enum: ['Web Development', 'Mobile Development', 'Design', 'Writing', 'Marketing', 'Data Science', 'DevOps', 'AI/ML', 'Blockchain', 'Other']
  },
  skills: [{
    type: String,
    required: true,
    trim: true
  }],
  requiredSkills: [{
    name: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    },
    required: { type: Boolean, default: true }
  }],
  duration: {
    type: String,
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  proposalCount: {
    type: Number,
    default: 0
  },
  selectedFreelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deadline: {
    type: Date
  },
  milestones: [milestoneSchema],
  paymentSchedule: {
    type: String,
    enum: ['upfront', 'milestone', 'completion'],
    default: 'completion'
  },
  attachments: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],
  tags: [String],
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false
  },
  urgent: {
    type: Boolean,
    default: false
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'intermediate', 'expert'],
    default: 'intermediate'
  },
  timezone: String,
  startDate: Date,
  completedAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// Indexes for better search and filter performance
jobSchema.index({ status: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ clientId: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ createdAt: -1 });

// Text index for search functionality
jobSchema.index({ 
  title: 'text', 
  description: 'text',
  skills: 'text'
});

module.exports = mongoose.model('Job', jobSchema);