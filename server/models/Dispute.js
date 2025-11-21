const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  initiatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  respondentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'work_not_delivered',
      'poor_quality',
      'late_delivery',
      'scope_creep',
      'payment_issue',
      'communication_problem',
      'other'
    ]
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'closed'],
    default: 'open'
  },
  resolution: {
    type: String,
    enum: ['refund_client', 'pay_freelancer', 'partial_refund', 'no_action'],
    default: null
  },
  resolutionAmount: Number,
  adminNotes: String,
  evidence: [{
    type: String, // 'document', 'image', 'message'
    url: String,
    description: String,
    uploadedBy: mongoose.Schema.Types.ObjectId
  }],
  timeline: [{
    action: String,
    description: String,
    timestamp: Date,
    userId: mongoose.Schema.Types.ObjectId
  }],
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  closedAt: Date
}, {
  timestamps: true
});

// Indexes
disputeSchema.index({ jobId: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ initiatorId: 1 });
disputeSchema.index({ respondentId: 1 });
disputeSchema.index({ assignedAdmin: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
