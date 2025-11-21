const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR' // Changed to INR for Razorpay
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'escrowed', 'released', 'refunded', 'disputed', 'failed'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['milestone', 'full', 'partial', 'advance'],
    required: true
  },
  milestone: {
    name: String,
    description: String,
    percentage: Number,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    order: Number // For multiple milestones
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal', 'bank_transfer', 'wallet'],
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paypal'],
    default: 'razorpay'
  },
  transactionId: String,
  escrowReleaseDate: Date,
  escrowAutoRelease: {
    type: Boolean,
    default: false
  },
  disputeReason: String,
  refundReason: String,
  metadata: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    stripePaymentIntentId: String,
    paypalOrderId: String,
    bankTransactionId: String
  },
  // Razorpay specific fields
  razorpay: {
    orderId: String,
    paymentId: String,
    signature: String,
    contactNumber: String,
    email: String
  },
  // Escrow details
  escrow: {
    isEscrowed: { type: Boolean, default: false },
    escrowedAt: Date,
    releasedAt: Date,
    autoReleaseAfterDays: { type: Number, default: 7 },
    releaseConditions: [{
      condition: String,
      met: { type: Boolean, default: false },
      metAt: Date
    }]
  },
  // Platform fees
  fees: {
    platformFee: { type: Number, default: 0 },
    platformFeePercentage: { type: Number, default: 10 },
    paymentGatewayFee: { type: Number, default: 0 },
    netAmount: Number // Amount after deducting all fees
  },
  // Invoice details
  invoice: {
    invoiceNumber: String,
    invoiceUrl: String,
    generatedAt: Date
  },
  notes: String,
  // History tracking
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ jobId: 1 });
paymentSchema.index({ clientId: 1 });
paymentSchema.index({ freelancerId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
