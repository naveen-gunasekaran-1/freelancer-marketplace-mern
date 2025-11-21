const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationProof: [{
    url: String,
    type: { type: String, enum: ['certificate', 'portfolio', 'github', 'linkedin', 'other'] },
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  badge: {
    type: String,
    enum: ['novice', 'professional', 'ultra-pro', 'master'],
    default: null
  },
  verificationScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['freelancer', 'client', 'admin'],
    required: true
  },
  skills: [skillSchema],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  hourlyRate: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  portfolio: [{
    title: String,
    description: String,
    imageUrl: String,
    projectUrl: String
  }],
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified'],
    default: 'unverified'
  },
  verificationDocuments: [{
    type: String, // ID, passport, etc.
    url: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      showProfile: { type: Boolean, default: true },
      showPortfolio: { type: Boolean, default: true },
      showSkills: { type: Boolean, default: true }
    }
  },
  // Payment details
  paymentMethods: [{
    type: { type: String, enum: ['razorpay', 'bank'], default: 'razorpay' },
    isDefault: { type: Boolean, default: false },
    details: mongoose.Schema.Types.Mixed
  }],
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  // Professional details
  experience: {
    type: Number, // years of experience
    default: 0
  },
  education: [{
    institution: String,
    degree: String,
    fieldOfStudy: String,
    startDate: Date,
    endDate: Date,
    description: String
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expirationDate: Date,
    credentialId: String,
    credentialUrl: String
  }],
  languages: [{
    language: String,
    proficiency: { type: String, enum: ['basic', 'conversational', 'fluent', 'native'] }
  }],
  // Availability
  availability: {
    status: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available' },
    hoursPerWeek: { type: Number, min: 0, max: 168 },
    timezone: String
  },
  // Social links
  socialLinks: {
    linkedin: String,
    github: String,
    twitter: String,
    portfolio: String,
    behance: String,
    dribbble: String
  },
  // Statistics
  statistics: {
    totalEarnings: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    successRate: { type: Number, default: 0, min: 0, max: 100 },
    responseTime: { type: Number, default: 0 }, // in hours
    onTimeDelivery: { type: Number, default: 0, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

// Index for better search performance
userSchema.index({ type: 1 });
userSchema.index({ 'skills.name': 1 });
userSchema.index({ location: 1 });
userSchema.index({ 'availability.status': 1 });
userSchema.index({ rating: -1 });

// Virtual for full skill verification status
userSchema.virtual('skillsVerificationLevel').get(function() {
  if (!this.skills || this.skills.length === 0) return 'unverified';
  
  const verifiedSkills = this.skills.filter(s => s.verified).length;
  const totalSkills = this.skills.length;
  const percentage = (verifiedSkills / totalSkills) * 100;
  
  if (percentage >= 80) return 'ultra-pro';
  if (percentage >= 50) return 'professional';
  if (percentage >= 20) return 'novice';
  return 'unverified';
});

module.exports = mongoose.model('User', userSchema);