const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Transaction Type
  type: {
    type: String,
    enum: ['deposit', 'escrow', 'release', 'refund', 'withdrawal', 'platform_fee', 'subscription'],
    required: true
  },
  
  // Related Entities
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: function() {
      return ['deposit', 'escrow', 'release', 'refund', 'platform_fee'].includes(this.type);
    }
  },
  
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  },
  
  milestone: {
    milestoneId: String,
    title: String,
    description: String
  },
  
  // Parties Involved
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Amount Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  
  platformFee: {
    percentage: {
      type: Number,
      default: 15 // 15% commission
    },
    amount: {
      type: Number,
      default: 0
    }
  },
  
  netAmount: {
    type: Number, // Amount after platform fee
    default: 0
  },
  
  // Payment Gateway Details
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  
  // Transaction Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'held'],
    default: 'pending'
  },
  
  // Escrow Status (if type is escrow)
  escrowStatus: {
    type: String,
    enum: ['held', 'released', 'disputed', 'refunded'],
    default: 'held'
  },
  
  // Release Details (for escrow)
  releaseDate: Date,
  autoReleaseDate: Date, // Auto-release after 7 days if no dispute
  
  // Withdrawal Details
  withdrawalMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'paypal', 'crypto']
  },
  
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    upiId: String
  },
  
  // Metadata
  description: String,
  notes: mongoose.Schema.Types.Mixed,
  
  // Dispute Information
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    disputeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dispute'
    },
    reason: String,
    disputedAt: Date
  },
  
  // Refund Information
  refund: {
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundAmount: Number,
    refundedAt: Date,
    refundReason: String,
    razorpayRefundId: String
  },
  
  // Timestamps
  completedAt: Date,
  failedAt: Date,
  
  // Error Tracking
  errorDetails: {
    code: String,
    message: String,
    timestamp: Date
  }
  
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ from: 1, createdAt: -1 });
transactionSchema.index({ to: 1, createdAt: -1 });
transactionSchema.index({ job: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ razorpayOrderId: 1 });
transactionSchema.index({ razorpayPaymentId: 1 });

// Calculate platform fee and net amount before saving
transactionSchema.pre('save', function(next) {
  if (this.type === 'release' || this.type === 'withdrawal') {
    const feeAmount = (this.amount * this.platformFee.percentage) / 100;
    this.platformFee.amount = Math.round(feeAmount * 100) / 100; // Round to 2 decimals
    this.netAmount = this.amount - this.platformFee.amount;
  } else {
    this.netAmount = this.amount;
  }
  next();
});

// Auto-release escrow after 7 days
transactionSchema.methods.scheduleAutoRelease = function() {
  if (this.type === 'escrow' && this.status === 'completed') {
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + 7);
    this.autoReleaseDate = releaseDate;
    return this.save();
  }
};

// Virtual for user balance calculation
transactionSchema.statics.getUserBalance = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        $or: [
          { to: new mongoose.Types.ObjectId(userId), status: 'completed', type: { $in: ['release', 'refund'] } },
          { from: new mongoose.Types.ObjectId(userId), status: 'completed', type: 'withdrawal' }
        ]
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'release'] },
              '$netAmount',
              0
            ]
          }
        },
        totalWithdrawals: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'withdrawal'] },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ]);
  
  if (result.length > 0) {
    return {
      balance: result[0].totalEarnings - result[0].totalWithdrawals,
      totalEarnings: result[0].totalEarnings,
      totalWithdrawals: result[0].totalWithdrawals
    };
  }
  
  return { balance: 0, totalEarnings: 0, totalWithdrawals: 0 };
};

module.exports = mongoose.model('Transaction', transactionSchema);
