const mongoose = require('mongoose');

const skillVerificationSchema = new mongoose.Schema({
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skillName: {
    type: String,
    required: true,
    trim: true
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    required: true
  },
  evidence: [{
    type: {
      type: String,
      enum: ['certificate', 'portfolio', 'github', 'linkedin', 'test_score', 'work_sample', 'reference', 'other'],
      required: true
    },
    title: String,
    description: String,
    url: String,
    fileUrl: String,
    issuer: String,
    dateIssued: Date,
    score: Number,
    maxScore: Number,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'resubmit_required'],
    default: 'pending'
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String,
  rejectionReason: String,
  badgeAwarded: {
    type: String,
    enum: ['novice', 'professional', 'ultra-pro', 'master'],
    default: null
  },
  verificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // Scoring breakdown
  scoringDetails: {
    certificatesScore: { type: Number, default: 0 },
    portfolioScore: { type: Number, default: 0 },
    testScore: { type: Number, default: 0 },
    referenceScore: { type: Number, default: 0 },
    experienceScore: { type: Number, default: 0 }
  },
  expiresAt: Date,
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  // Verification history
  verificationHistory: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Calculate badge based on verification score
skillVerificationSchema.methods.calculateBadge = function() {
  const score = this.verificationScore;
  if (score >= 90) return 'master';
  if (score >= 75) return 'ultra-pro';
  if (score >= 50) return 'professional';
  if (score >= 25) return 'novice';
  return null;
};

// Prevent duplicate verification requests for same skill
skillVerificationSchema.index({ freelancerId: 1, skillName: 1, status: 1 });

// Indexes
skillVerificationSchema.index({ status: 1 });
skillVerificationSchema.index({ reviewerId: 1 });
skillVerificationSchema.index({ badgeAwarded: 1 });
skillVerificationSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('SkillVerification', skillVerificationSchema);
