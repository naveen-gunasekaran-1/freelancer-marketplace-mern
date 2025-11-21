const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Job = require('../models/Job');
const Proposal = require('../models/Proposal');
const Payment = require('../models/Payment');
const Dispute = require('../models/Dispute');
const Review = require('../models/Review');
const SkillVerification = require('../models/SkillVerification');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Admin dashboard stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [
      totalUsers,
      totalJobs,
      totalProposals,
      totalPayments,
      activeDisputes,
      pendingVerifications,
      recentJobs,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Proposal.countDocuments(),
      Payment.countDocuments(),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      SkillVerification.countDocuments({ status: 'pending' }),
      Job.find().sort({ createdAt: -1 }).limit(5).populate('clientId', 'name'),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email type createdAt')
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalJobs,
        totalProposals,
        totalPayments,
        activeDisputes,
        pendingVerifications
      },
      recent: {
        jobs: recentJobs,
        users: recentUsers
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

// Get all users with pagination and filters
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, type, status, search } = req.query;

    const query = {};
    if (type) query.type = type;
    if (status) query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all jobs with pagination and filters
router.get('/jobs', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status, category, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const jobs = await Job.find(query)
      .populate('clientId', 'name email')
      .populate('selectedFreelancer', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get all disputes
router.get('/disputes', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const disputes = await Dispute.find(query)
      .populate('jobId', 'title')
      .populate('initiatorId', 'name email')
      .populate('respondentId', 'name email')
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

// Get all payments
router.get('/payments', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status, type } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const payments = await Payment.find(query)
      .populate('jobId', 'title')
      .populate('clientId', 'name email')
      .populate('freelancerId', 'name email')
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
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Update user status
router.put('/users/:userId/status', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Update job status
router.put('/jobs/:jobId/status', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { jobId } = req.params;
    const { status, cancellationReason } = req.body;

    const job = await Job.findByIdAndUpdate(
      jobId,
      { status, cancellationReason },
      { new: true }
    ).populate('clientId', 'name email');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

// Get skill verification requests
router.get('/skill-verifications', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status) query.status = status;

    const verifications = await SkillVerification.find(query)
      .populate('freelancerId', 'name email')
      .populate('reviewerId', 'name')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SkillVerification.countDocuments(query);

    res.json({
      verifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get skill verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch skill verifications' });
  }
});

// Get analytics data
router.get('/analytics', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { period = '30' } = req.query; // days
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const [
      userStats,
      jobStats,
      paymentStats,
      disputeStats
    ] = await Promise.all([
      // User analytics
      User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            freelancers: {
              $sum: { $cond: [{ $eq: ['$type', 'freelancer'] }, 1, 0] }
            },
            clients: {
              $sum: { $cond: [{ $eq: ['$type', 'client'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Job analytics
      Job.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            totalBudget: { $sum: '$budget' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Payment analytics
      Payment.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Dispute analytics
      Dispute.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      users: userStats,
      jobs: jobStats,
      payments: paymentStats,
      disputes: disputeStats
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

module.exports = router;
