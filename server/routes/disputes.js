const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Create dispute
router.post('/', auth, [
  body('jobId').isMongoId().withMessage('Valid job ID required'),
  body('paymentId').isMongoId().withMessage('Valid payment ID required'),
  body('reason').isIn([
    'work_not_delivered',
    'poor_quality',
    'late_delivery',
    'scope_creep',
    'payment_issue',
    'communication_problem',
    'other'
  ]).withMessage('Valid reason required'),
  body('description').isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId, paymentId, reason, description, evidence = [] } = req.body;
    const initiatorId = req.user.id;

    // Verify job and payment exist
    const job = await Job.findById(jobId);
    const payment = await Payment.findById(paymentId);

    if (!job || !payment) {
      return res.status(404).json({ error: 'Job or payment not found' });
    }

    // Check if user is involved in the job
    if (job.clientId.toString() !== initiatorId && job.selectedFreelancer?.toString() !== initiatorId) {
      return res.status(403).json({ error: 'Not authorized to create dispute for this job' });
    }

    // Check if dispute already exists
    const existingDispute = await Dispute.findOne({ jobId, paymentId });
    if (existingDispute) {
      return res.status(400).json({ error: 'Dispute already exists for this payment' });
    }

    // Determine respondent
    const respondentId = job.clientId.toString() === initiatorId ? job.selectedFreelancer : job.clientId;

    // Create dispute
    const dispute = new Dispute({
      jobId,
      paymentId,
      initiatorId,
      respondentId,
      reason,
      description,
      evidence,
      timeline: [{
        action: 'dispute_created',
        description: 'Dispute opened',
        timestamp: new Date(),
        userId: initiatorId
      }]
    });

    await dispute.save();

    // Update payment status
    await Payment.findByIdAndUpdate(paymentId, { status: 'disputed' });

    // Create notifications
    const notifications = [
      {
        userId: respondentId,
        type: 'dispute_opened',
        title: 'Dispute Opened',
        message: `A dispute has been opened for job: ${job.title}`,
        data: { disputeId: dispute._id, jobId }
      },
      {
        userId: 'admin', // Admin notification
        type: 'dispute_opened',
        title: 'New Dispute',
        message: `A new dispute has been opened by ${req.user.name}`,
        data: { disputeId: dispute._id, jobId },
        priority: 'high'
      }
    ];

    await Notification.insertMany(notifications);

    // Send real-time notifications
    req.io.to(`user_${respondentId}`).emit('dispute_opened', {
      disputeId: dispute._id,
      jobTitle: job.title
    });

    res.status(201).json(dispute);
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// Get disputes for user
router.get('/my-disputes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      $or: [
        { initiatorId: userId },
        { respondentId: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    const disputes = await Dispute.find(query)
      .populate('jobId', 'title')
      .populate('initiatorId', 'name')
      .populate('respondentId', 'name')
      .populate('assignedAdmin', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Dispute.countDocuments(query);

    res.json({
      disputes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// Get dispute details
router.get('/:disputeId', auth, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.id;

    const dispute = await Dispute.findById(disputeId)
      .populate('jobId', 'title description')
      .populate('initiatorId', 'name email')
      .populate('respondentId', 'name email')
      .populate('assignedAdmin', 'name email');

    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    // Check if user has access to this dispute
    if (dispute.initiatorId._id.toString() !== userId && 
        dispute.respondentId._id.toString() !== userId && 
        req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this dispute' });
    }

    res.json(dispute);
  } catch (error) {
    console.error('Get dispute details error:', error);
    res.status(500).json({ error: 'Failed to fetch dispute details' });
  }
});

// Add evidence to dispute
router.post('/:disputeId/evidence', auth, [
  body('type').isIn(['document', 'image', 'message']).withMessage('Valid evidence type required'),
  body('url').isURL().withMessage('Valid URL required'),
  body('description').isLength({ min: 5, max: 500 }).withMessage('Description must be between 5 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { disputeId } = req.params;
    const { type, url, description } = req.body;
    const userId = req.user.id;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    // Check if user has access
    if (dispute.initiatorId.toString() !== userId && dispute.respondentId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to add evidence to this dispute' });
    }

    // Add evidence
    dispute.evidence.push({
      type,
      url,
      description,
      uploadedBy: userId
    });

    // Add timeline entry
    dispute.timeline.push({
      action: 'evidence_added',
      description: `${req.user.name} added evidence: ${description}`,
      timestamp: new Date(),
      userId
    });

    await dispute.save();

    res.json(dispute);
  } catch (error) {
    console.error('Add evidence error:', error);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

// Admin: Assign dispute
router.put('/:disputeId/assign', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { disputeId } = req.params;
    const { adminId } = req.body;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    dispute.assignedAdmin = adminId;
    dispute.status = 'under_review';

    dispute.timeline.push({
      action: 'assigned',
      description: `Dispute assigned to admin`,
      timestamp: new Date(),
      userId: req.user.id
    });

    await dispute.save();

    res.json(dispute);
  } catch (error) {
    console.error('Assign dispute error:', error);
    res.status(500).json({ error: 'Failed to assign dispute' });
  }
});

// Admin: Resolve dispute
router.put('/:disputeId/resolve', auth, [
  body('resolution').isIn(['refund_client', 'pay_freelancer', 'partial_refund', 'no_action']).withMessage('Valid resolution required'),
  body('adminNotes').optional().isLength({ max: 1000 }).withMessage('Admin notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { disputeId } = req.params;
    const { resolution, resolutionAmount, adminNotes } = req.body;

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolutionAmount = resolutionAmount;
    dispute.adminNotes = adminNotes;
    dispute.resolvedAt = new Date();

    dispute.timeline.push({
      action: 'resolved',
      description: `Dispute resolved: ${resolution}`,
      timestamp: new Date(),
      userId: req.user.id
    });

    // Update payment based on resolution
    const payment = await Payment.findById(dispute.paymentId);
    if (payment) {
      switch (resolution) {
        case 'refund_client':
          payment.status = 'refunded';
          payment.refundReason = adminNotes;
          break;
        case 'pay_freelancer':
          payment.status = 'released';
          break;
        case 'partial_refund':
          payment.status = 'refunded';
          payment.refundReason = adminNotes;
          break;
        default:
          payment.status = 'released';
      }
      await payment.save();
    }

    await dispute.save();

    // Create notifications
    const notifications = [
      {
        userId: dispute.initiatorId,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `Your dispute has been resolved: ${resolution}`,
        data: { disputeId: dispute._id }
      },
      {
        userId: dispute.respondentId,
        type: 'dispute_resolved',
        title: 'Dispute Resolved',
        message: `The dispute against you has been resolved: ${resolution}`,
        data: { disputeId: dispute._id }
      }
    ];

    await Notification.insertMany(notifications);

    res.json(dispute);
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

module.exports = router;
