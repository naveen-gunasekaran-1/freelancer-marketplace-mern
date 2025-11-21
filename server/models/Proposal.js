const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverLetter: {
    type: String,
    required: true
  },
  proposedBudget: {
    type: Number,
    required: true,
    min: 0
  },
  timeline: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  clientResponse: {
    type: String,
    default: ''
  },
  attachments: [{
    filename: String,
    url: String
  }]
}, {
  timestamps: true
});

// Compound index to prevent duplicate proposals
proposalSchema.index({ jobId: 1, freelancerId: 1 }, { unique: true });

// Indexes for queries
proposalSchema.index({ freelancerId: 1, createdAt: -1 });
proposalSchema.index({ jobId: 1, status: 1 });
proposalSchema.index({ status: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);