const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret'
});

// Create Razorpay order (escrow payment)
router.post('/create-order', auth, [
  body('jobId').isMongoId().withMessage('Valid job ID required'),
  body('amount').isNumeric().withMessage('Valid amount required'),
  body('type').isIn(['milestone', 'full', 'partial', 'advance']).withMessage('Valid payment type required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId, amount, type, milestone } = req.body;
    const userId = req.user.id;

    // Verify job exists and user has permission
    const job = await Job.findById(jobId).populate('clientId freelancerId');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.clientId._id.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to create payment for this job' });
    }

    // Calculate platform fees
    const platformFeePercentage = 10; // 10% platform fee
    const platformFee = (amount * platformFeePercentage) / 100;
    const netAmount = amount - platformFee;

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${jobId}_${Date.now()}`,
      notes: {
        jobId: jobId,
        clientId: userId,
        freelancerId: job.selectedFreelancer?.toString() || '',
        type: type,
        platformFee: platformFee
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create payment record
    const payment = new Payment({
      jobId,
      clientId: userId,
      freelancerId: job.selectedFreelancer,
      amount,
      currency: 'INR',
      type,
      milestone,
      paymentMethod: 'razorpay',
      paymentGateway: 'razorpay',
      razorpay: {
        orderId: razorpayOrder.id
      },
      fees: {
        platformFee,
        platformFeePercentage,
        netAmount
      },
      escrow: {
        isEscrowed: false,
        autoReleaseAfterDays: 7
      },
      statusHistory: [{
        status: 'pending',
        changedAt: new Date(),
        changedBy: userId,
        reason: 'Order created'
      }]
    });

    await payment.save();

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      paymentId: payment._id,
      key: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id'
    });
  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify and confirm Razorpay payment
router.post('/verify-payment', auth, [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
  body('paymentId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body;
    const userId = req.user.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      payment.status = 'failed';
      payment.statusHistory.push({
        status: 'failed',
        changedAt: new Date(),
        changedBy: userId,
        reason: 'Signature verification failed'
      });
      await payment.save();
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Payment verified successfully - move to escrow
    payment.status = 'escrowed';
    payment.razorpay.paymentId = razorpay_payment_id;
    payment.razorpay.signature = razorpay_signature;
    payment.transactionId = razorpay_payment_id;
    payment.escrow.isEscrowed = true;
    payment.escrow.escrowedAt = new Date();
    payment.escrowReleaseDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    payment.statusHistory.push({
      status: 'escrowed',
      changedAt: new Date(),
      changedBy: userId,
      reason: 'Payment verified and moved to escrow'
    });

    await payment.save();

    // Update job status if it's a full payment
    if (payment.type === 'full') {
      await Job.findByIdAndUpdate(payment.jobId, { status: 'in_progress' });
    }

    // Send notification to freelancer
    if (req.io) {
      req.io.to(`user_${payment.freelancerId}`).emit('payment_received', {
        amount: payment.amount,
        jobId: payment.jobId,
        type: payment.type
      });
    }

    res.json({ 
      message: 'Payment verified and escrowed successfully',
      payment 
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Release escrowed payment to freelancer
router.post('/release/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (payment.status !== 'escrowed') {
      return res.status(400).json({ error: 'Payment is not in escrow' });
    }

    // Release payment to freelancer
    payment.status = 'released';
    payment.escrow.releasedAt = new Date();
    payment.statusHistory.push({
      status: 'released',
      changedAt: new Date(),
      changedBy: userId,
      reason: 'Payment released by client'
    });
    await payment.save();

    // Update freelancer's statistics
    await User.findByIdAndUpdate(payment.freelancerId, {
      $inc: { 
        completedJobs: 1,
        'statistics.totalEarnings': payment.fees.netAmount,
        walletBalance: payment.fees.netAmount
      }
    });

    // Update client's statistics
    await User.findByIdAndUpdate(payment.clientId, {
      $inc: { 
        'statistics.totalSpent': payment.amount
      }
    });

    // Update milestone if applicable
    if (payment.type === 'milestone' && payment.milestone) {
      payment.milestone.completed = true;
      payment.milestone.completedAt = new Date();
      await payment.save();
    }

    // Send notification to freelancer
    if (req.io) {
      req.io.to(`user_${payment.freelancerId}`).emit('payment_released', {
        amount: payment.fees.netAmount,
        jobId: payment.jobId,
        paymentId: payment._id
      });
    }

    res.json({ message: 'Payment released successfully', payment });
  } catch (error) {
    console.error('Payment release error:', error);
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      $or: [
        { clientId: userId },
        { freelancerId: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .populate('jobId', 'title')
      .populate('clientId', 'name')
      .populate('freelancerId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get User Wallet/Balance (MUST be before /:paymentId route)
router.get('/wallet', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const Transaction = require('../models/Transaction');
    
    // Get balance
    const balance = await Transaction.getUserBalance(userId);
    
    // Get recent transactions
    const recentTransactions = await Transaction.find({
      $or: [
        { from: userId },
        { to: userId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('job', 'title')
    .populate('from', 'name email')
    .populate('to', 'name email');
    
    // Get pending withdrawals
    const pendingWithdrawals = await Transaction.find({
      from: userId,
      type: 'withdrawal',
      status: { $in: ['pending', 'processing'] }
    });
    
    res.json({
      balance: balance.balance,
      totalEarnings: balance.totalEarnings,
      totalWithdrawals: balance.totalWithdrawals,
      recentTransactions: recentTransactions,
      pendingWithdrawals: pendingWithdrawals
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet details', details: error.message });
  }
});

// Get Transaction History (MUST be before /:paymentId route)
router.get('/transactions', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, status, page = 1, limit = 20 } = req.query;
    const Transaction = require('../models/Transaction');
    
    const query = {
      $or: [
        { from: userId },
        { to: userId }
      ]
    };
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('job', 'title')
      .populate('from', 'name email')
      .populate('to', 'name email');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      transactions: transactions,
      pagination: {
        total: total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions', details: error.message });
  }
});

// Get payment details
router.get('/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findById(paymentId)
      .populate('jobId', 'title description')
      .populate('clientId', 'name email')
      .populate('freelancerId', 'name email');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.clientId._id.toString() !== userId && payment.freelancerId._id.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Payment details error:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// Create milestone payment structure for a job
router.post('/milestones/create', auth, [
  body('jobId').isMongoId(),
  body('milestones').isArray().notEmpty()
], async (req, res) => {
  try {
    const { jobId, milestones } = req.body;
    const userId = req.user.id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate that milestones add up to 100%
    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({ error: 'Milestone percentages must add up to 100%' });
    }

    const createdMilestones = [];
    
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const milestoneAmount = (job.budget * m.percentage) / 100;
      
      const payment = new Payment({
        jobId,
        clientId: userId,
        freelancerId: job.selectedFreelancer,
        amount: milestoneAmount,
        currency: 'INR',
        type: 'milestone',
        paymentMethod: 'razorpay',
        paymentGateway: 'razorpay',
        milestone: {
          name: m.name,
          description: m.description,
          percentage: m.percentage,
          dueDate: m.dueDate,
          order: i + 1,
          completed: false
        },
        fees: {
          platformFeePercentage: 10,
          platformFee: (milestoneAmount * 10) / 100,
          netAmount: milestoneAmount - ((milestoneAmount * 10) / 100)
        },
        statusHistory: [{
          status: 'pending',
          changedAt: new Date(),
          changedBy: userId,
          reason: 'Milestone created'
        }]
      });

      await payment.save();
      createdMilestones.push(payment);
    }

    res.status(201).json({ 
      message: 'Milestones created successfully', 
      milestones: createdMilestones 
    });
  } catch (error) {
    console.error('Create milestones error:', error);
    res.status(500).json({ error: 'Failed to create milestones' });
  }
});

// Get all milestones for a job
router.get('/milestones/job/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const payments = await Payment.find({
      jobId,
      type: 'milestone'
    }).sort({ 'milestone.order': 1 });

    res.json(payments);
  } catch (error) {
    console.error('Fetch milestones error:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

// Request refund
router.post('/refund/:paymentId', auth, [
  body('reason').notEmpty()
], async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (payment.status !== 'escrowed') {
      return res.status(400).json({ error: 'Payment cannot be refunded' });
    }

    payment.status = 'disputed';
    payment.refundReason = reason;
    payment.statusHistory.push({
      status: 'disputed',
      changedAt: new Date(),
      changedBy: userId,
      reason: `Refund requested: ${reason}`
    });

    await payment.save();

    // Notify admin about refund request
    if (req.io) {
      req.io.emit('admin_notification', {
        type: 'refund_request',
        paymentId: payment._id,
        jobId: payment.jobId,
        reason
      });
    }

    res.json({ message: 'Refund request submitted', payment });
  } catch (error) {
    console.error('Refund request error:', error);
    res.status(500).json({ error: 'Failed to request refund' });
  }
});

// Webhook for Razorpay payment notifications
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== webhookSignature) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    console.log('Razorpay webhook received:', event);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        // Payment successful
        await Payment.updateOne(
          { 'razorpay.orderId': paymentEntity.order_id },
          { 
            $set: { 
              status: 'processing',
              'razorpay.paymentId': paymentEntity.id
            }
          }
        );
        break;

      case 'payment.failed':
        // Payment failed
        await Payment.updateOne(
          { 'razorpay.orderId': paymentEntity.order_id },
          { 
            $set: { status: 'failed' },
            $push: {
              statusHistory: {
                status: 'failed',
                changedAt: new Date(),
                reason: paymentEntity.error_description || 'Payment failed'
              }
            }
          }
        );
        break;
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
