const express = require('express');
const router = express.Router();
const SkillVerification = require('../models/SkillVerification');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Submit skill verification request
router.post('/', auth, [
  body('skillName').isLength({ min: 1 }).withMessage('Skill name required'),
  body('skillLevel').isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Valid skill level required'),
  body('evidence').isArray({ min: 1 }).withMessage('At least one piece of evidence required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { skillName, skillLevel, evidence } = req.body;
    const freelancerId = req.user.id;

    // Check if user is a freelancer
    if (req.user.type !== 'freelancer') {
      return res.status(403).json({ error: 'Only freelancers can submit skill verifications' });
    }

    // Check if verification already exists
    const existingVerification = await SkillVerification.findOne({
      freelancerId,
      skillName
    });

    if (existingVerification) {
      return res.status(400).json({ error: 'Verification request already exists for this skill' });
    }

    // Create verification request
    const verification = new SkillVerification({
      freelancerId,
      skillName,
      skillLevel,
      evidence,
      status: 'pending'
    });

    await verification.save();

    // Create notification for admin (skip for now since we don't have admin users)
    // In production, you would find actual admin users and create notifications for them
    // const adminUsers = await User.find({ type: 'admin' });
    // for (const admin of adminUsers) {
    //   const adminNotification = new Notification({
    //     userId: admin._id,
    //     type: 'skill_verified', // Using existing enum value
    //     title: 'New Skill Verification Request',
    //     message: `${req.user.name} submitted a verification request for ${skillName}`,
    //     data: {
    //       skillName,
    //       verificationId: verification._id
    //     },
    //     priority: 'medium'
    //   });
    //   await adminNotification.save();
    // }

    res.status(201).json(verification);
  } catch (error) {
    console.error('Skill verification submission error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to submit skill verification' });
  }
});

// Get skill verification requests (for admin)
router.get('/admin', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { page = 1, limit = 20, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const verifications = await SkillVerification.find(query)
      .populate('freelancerId', 'name email profileImage')
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

// Get user's skill verification requests
router.get('/my-verifications', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const query = { freelancerId: userId };
    if (status) {
      query.status = status;
    }

    const verifications = await SkillVerification.find(query)
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
    console.error('Get user skill verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch skill verifications' });
  }
});

// Review skill verification (admin only)
router.put('/:verificationId/review', auth, [
  body('status').isIn(['approved', 'rejected', 'resubmit_required']).withMessage('Valid status required'),
  body('reviewNotes').optional().isLength({ max: 1000 }).withMessage('Review notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { verificationId } = req.params;
    const { status, reviewNotes, verificationScore, scoringDetails, rejectionReason } = req.body;
    const reviewerId = req.user.id;

    const verification = await SkillVerification.findById(verificationId)
      .populate('freelancerId');

    if (!verification) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (verification.status === 'approved') {
      return res.status(400).json({ error: 'Verification already approved' });
    }

    // Update verification
    verification.status = 'under_review';
    verification.reviewerId = reviewerId;
    verification.reviewNotes = reviewNotes;

    // Add to history
    verification.verificationHistory.push({
      action: `Review started by admin`,
      performedBy: reviewerId,
      notes: reviewNotes || 'Under review'
    });

    if (status === 'approved') {
      // Calculate verification score if not provided
      let finalScore = verificationScore || 0;
      
      if (scoringDetails) {
        verification.scoringDetails = scoringDetails;
        finalScore = Object.values(scoringDetails).reduce((sum, score) => sum + score, 0);
      }
      
      verification.verificationScore = Math.min(finalScore, 100);
      verification.badgeAwarded = verification.calculateBadge();
      verification.status = 'approved';
      verification.reviewedAt = new Date();
      verification.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

      // Update user's skill with verification
      const user = await User.findById(verification.freelancerId._id);
      
      // Check if skill already exists
      const existingSkillIndex = user.skills.findIndex(s => s.name === verification.skillName);
      
      if (existingSkillIndex >= 0) {
        // Update existing skill
        user.skills[existingSkillIndex].verified = true;
        user.skills[existingSkillIndex].badge = verification.badgeAwarded;
        user.skills[existingSkillIndex].verificationScore = verification.verificationScore;
        user.skills[existingSkillIndex].verifiedAt = new Date();
        user.skills[existingSkillIndex].verifiedBy = reviewerId;
      } else {
        // Add new skill
        user.skills.push({
          name: verification.skillName,
          level: verification.skillLevel,
          verified: true,
          verificationProof: verification.evidence.map(e => ({
            url: e.url || e.fileUrl,
            type: e.type,
            description: e.description
          })),
          badge: verification.badgeAwarded,
          verificationScore: verification.verificationScore,
          verifiedAt: new Date(),
          verifiedBy: reviewerId
        });
      }

      await user.save();

      // Add approval to history
      verification.verificationHistory.push({
        action: 'Verification approved',
        performedBy: reviewerId,
        notes: `Badge awarded: ${verification.badgeAwarded} (Score: ${verification.verificationScore})`
      });

      // Create notification for freelancer
      const notification = new Notification({
        userId: verification.freelancerId._id,
        type: 'skill_verified',
        title: 'Skill Verification Approved',
        message: `Your ${verification.skillName} skill has been verified! You earned a ${verification.badgeAwarded} badge with a score of ${verification.verificationScore}/100.`,
        data: {
          skillName: verification.skillName,
          badgeType: verification.badgeAwarded,
          score: verification.verificationScore
        },
        priority: 'high'
      });

      await notification.save();

      // Send real-time notification
      if (req.io) {
        req.io.to(`user_${verification.freelancerId._id}`).emit('skill_verified', {
          skillName: verification.skillName,
          badge: verification.badgeAwarded,
          score: verification.verificationScore
        });
      }
    } else if (status === 'rejected') {
      verification.status = 'rejected';
      verification.reviewedAt = new Date();
      verification.rejectionReason = rejectionReason || reviewNotes;

      verification.verificationHistory.push({
        action: 'Verification rejected',
        performedBy: reviewerId,
        notes: rejectionReason || reviewNotes
      });

      // Create notification for freelancer about rejection
      const notification = new Notification({
        userId: verification.freelancerId._id,
        type: 'skill_verified',
        title: 'Skill Verification Rejected',
        message: `Your ${verification.skillName} skill verification was rejected. ${rejectionReason || reviewNotes || 'Please provide more evidence.'}`,
        data: {
          skillName: verification.skillName,
          reason: rejectionReason || reviewNotes
        },
        priority: 'medium'
      });

      await notification.save();
    } else if (status === 'resubmit_required') {
      verification.status = 'resubmit_required';
      verification.rejectionReason = rejectionReason || reviewNotes;

      verification.verificationHistory.push({
        action: 'Resubmission required',
        performedBy: reviewerId,
        notes: rejectionReason || reviewNotes
      });

      // Create notification
      const notification = new Notification({
        userId: verification.freelancerId._id,
        type: 'skill_verified',
        title: 'Skill Verification - Additional Information Required',
        message: `Please provide additional information for your ${verification.skillName} skill verification. ${rejectionReason || reviewNotes}`,
        data: {
          skillName: verification.skillName,
          reason: rejectionReason || reviewNotes
        },
        priority: 'high'
      });

      await notification.save();
    }

    await verification.save();

    res.json(verification);
  } catch (error) {
    console.error('Review skill verification error:', error);
    res.status(500).json({ error: 'Failed to review skill verification' });
  }
});

// Get verified skills for search optimization
router.get('/verified-skills', async (req, res) => {
  try {
    const { skill, level, badge } = req.query;

    const query = { status: 'approved' };
    if (skill) {
      query.skillName = new RegExp(skill, 'i');
    }
    if (level) {
      query.skillLevel = level;
    }
    if (badge) {
      query.badgeAwarded = badge;
    }

    const verifications = await SkillVerification.find(query)
      .populate('freelancerId', 'name profileImage rating')
      .select('skillName skillLevel badgeAwarded verificationScore freelancerId')
      .sort({ verificationScore: -1 });

    res.json(verifications);
  } catch (error) {
    console.error('Get verified skills error:', error);
    res.status(500).json({ error: 'Failed to fetch verified skills' });
  }
});

// Update/Resubmit verification evidence
router.put('/:verificationId/resubmit', auth, [
  body('evidence').isArray({ min: 1 }).withMessage('At least one piece of evidence required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { verificationId } = req.params;
    const { evidence, additionalNotes } = req.body;

    const verification = await SkillVerification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (verification.freelancerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (verification.status !== 'resubmit_required' && verification.status !== 'rejected') {
      return res.status(400).json({ error: 'Cannot update this verification' });
    }

    // Update evidence
    verification.evidence = evidence;
    verification.status = 'pending';
    verification.submittedAt = new Date();

    verification.verificationHistory.push({
      action: 'Evidence resubmitted',
      performedBy: req.user.id,
      notes: additionalNotes || 'Updated evidence'
    });

    await verification.save();

    res.json(verification);
  } catch (error) {
    console.error('Resubmit verification error:', error);
    res.status(500).json({ error: 'Failed to resubmit verification' });
  }
});

// Get verification statistics (for admin dashboard)
router.get('/statistics/overview', auth, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [
      totalVerifications,
      pendingCount,
      approvedCount,
      rejectedCount,
      underReviewCount,
      badgeDistribution,
      topSkills
    ] = await Promise.all([
      SkillVerification.countDocuments(),
      SkillVerification.countDocuments({ status: 'pending' }),
      SkillVerification.countDocuments({ status: 'approved' }),
      SkillVerification.countDocuments({ status: 'rejected' }),
      SkillVerification.countDocuments({ status: 'under_review' }),
      SkillVerification.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$badgeAwarded', count: { $sum: 1 } } }
      ]),
      SkillVerification.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: '$skillName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      total: totalVerifications,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      underReview: underReviewCount,
      badgeDistribution: badgeDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topSkills
    });
  } catch (error) {
    console.error('Get verification statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get freelancer's verified skills summary
router.get('/freelancer/:freelancerId/skills', async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const verifications = await SkillVerification.find({
      freelancerId,
      status: 'approved'
    }).select('skillName skillLevel badgeAwarded verificationScore reviewedAt expiresAt');

    // Calculate overall skill level
    const totalScore = verifications.reduce((sum, v) => sum + v.verificationScore, 0);
    const averageScore = verifications.length > 0 ? totalScore / verifications.length : 0;

    // Count badges
    const badgeCounts = verifications.reduce((acc, v) => {
      acc[v.badgeAwarded] = (acc[v.badgeAwarded] || 0) + 1;
      return acc;
    }, {});

    res.json({
      verifiedSkills: verifications,
      totalVerified: verifications.length,
      averageScore: Math.round(averageScore),
      badgeCounts
    });
  } catch (error) {
    console.error('Get freelancer skills error:', error);
    res.status(500).json({ error: 'Failed to fetch freelancer skills' });
  }
});

module.exports = router;
