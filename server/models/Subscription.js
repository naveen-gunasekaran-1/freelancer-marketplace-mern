const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planType: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
    default: 'active',
    required: true
  },
  // Razorpay details
  razorpaySubscriptionId: {
    type: String
  },
  razorpayPlanId: {
    type: String
  },
  razorpayCustomerId: {
    type: String
  },
  // Pricing
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  // Dates
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  trialEndsAt: {
    type: Date
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  // Plan features and limits
  features: {
    proposalLimit: {
      type: Number,
      default: 5 // Free plan default
    },
    jobPostLimit: {
      type: Number,
      default: 3 // Free plan default
    },
    skillVerification: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    dedicatedAccountManager: {
      type: Boolean,
      default: false
    },
    advancedReporting: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    }
  },
  // Usage tracking
  usage: {
    proposalsCount: {
      type: Number,
      default: 0
    },
    jobsPosted: {
      type: Number,
      default: 0
    },
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  // Payment history
  invoices: [{
    invoiceId: String,
    razorpayInvoiceId: String,
    amount: Number,
    currency: String,
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed']
    },
    paidAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Static method to get plan details
subscriptionSchema.statics.getPlanDetails = function(planType) {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      priceYearly: 0,
      currency: 'INR',
      features: {
        proposalLimit: 5,
        jobPostLimit: 3,
        skillVerification: false,
        prioritySupport: false,
        analytics: false,
        customBranding: false,
        dedicatedAccountManager: false,
        advancedReporting: false,
        apiAccess: false
      },
      description: 'Perfect for getting started',
      popular: false
    },
    pro: {
      name: 'Pro',
      price: 2999,
      priceYearly: 29990, // ~16% discount
      currency: 'INR',
      features: {
        proposalLimit: -1, // Unlimited
        jobPostLimit: -1, // Unlimited
        skillVerification: true,
        prioritySupport: true,
        analytics: true,
        customBranding: false,
        dedicatedAccountManager: false,
        advancedReporting: true,
        apiAccess: true
      },
      description: 'Best for growing freelancers and small teams',
      popular: true,
      trialDays: 14
    },
    enterprise: {
      name: 'Enterprise',
      price: 9999,
      priceYearly: 99990, // ~17% discount
      currency: 'INR',
      features: {
        proposalLimit: -1, // Unlimited
        jobPostLimit: -1, // Unlimited
        skillVerification: true,
        prioritySupport: true,
        analytics: true,
        customBranding: true,
        dedicatedAccountManager: true,
        advancedReporting: true,
        apiAccess: true
      },
      description: 'For established businesses and agencies',
      popular: false,
      trialDays: 14
    }
  };
  
  return plans[planType] || plans.free;
};

// Method to check if user has reached limit
subscriptionSchema.methods.hasReachedLimit = function(limitType) {
  const limit = this.features[limitType];
  const usage = this.usage[limitType.replace('Limit', 'Count')];
  
  // -1 means unlimited
  if (limit === -1) return false;
  
  return usage >= limit;
};

// Method to increment usage
subscriptionSchema.methods.incrementUsage = function(usageType) {
  if (!this.usage[usageType]) {
    this.usage[usageType] = 0;
  }
  this.usage[usageType] += 1;
  return this.save();
};

// Method to reset monthly usage
subscriptionSchema.methods.resetMonthlyUsage = function() {
  const now = new Date();
  const lastReset = this.usage.lastResetDate;
  
  // Check if a month has passed
  if (lastReset) {
    const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                       (now.getMonth() - lastReset.getMonth());
    
    if (monthsDiff >= 1) {
      this.usage.proposalsCount = 0;
      this.usage.jobsPosted = 0;
      this.usage.lastResetDate = now;
      return this.save();
    }
  }
  
  return Promise.resolve(this);
};

// Method to check if trial has expired
subscriptionSchema.methods.isTrialExpired = function() {
  if (!this.trialEndsAt) return false;
  return new Date() > this.trialEndsAt;
};

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
  if (this.status === 'cancelled') return false;
  if (this.status === 'trialing' && this.isTrialExpired()) return false;
  if (this.endDate && new Date() > this.endDate) return false;
  return ['active', 'trialing'].includes(this.status);
};

// Method to upgrade plan
subscriptionSchema.methods.upgradePlan = async function(newPlanType) {
  const planDetails = this.constructor.getPlanDetails(newPlanType);
  
  this.planType = newPlanType;
  this.features = planDetails.features;
  
  return this.save();
};

// Virtual for remaining trial days
subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.trialEndsAt) return 0;
  const now = new Date();
  const diffTime = this.trialEndsAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Ensure virtuals are included in JSON
subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
