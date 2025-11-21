const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Job = require('../models/Job');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Create review
router.post('/', auth, [
  body('jobId').isMongoId().withMessage('Valid job ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters'),
  body('categories.communication').isInt({ min: 1, max: 5 }).withMessage('Communication rating required'),
  body('categories.quality').isInt({ min: 1, max: 5 }).withMessage('Quality rating required'),
  body('categories.timeliness').isInt({ min: 1, max: 5 }).withMessage('Timeliness rating required'),
  body('categories.professionalism').isInt({ min: 1, max: 5 }).withMessage('Professionalism rating required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { jobId, rating, comment, categories } = req.body;
    const reviewerId = req.user.id;

    // Check if job exists and is completed
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed jobs' });
    }

    // Determine reviewee (the other party)
    const revieweeId = job.clientId.toString() === reviewerId ? job.selectedFreelancer : job.clientId;

    // Check if review already exists
    const existingReview = await Review.findOne({ jobId, reviewerId });
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this job' });
    }

    // Create review
    const review = new Review({
      jobId,
      reviewerId,
      revieweeId,
      rating,
      comment,
      categories,
      isVerified: true // Auto-verify for completed jobs
    });

    await review.save();

    // Update user's average rating
    await updateUserRating(revieweeId);

    // Send notification to reviewee
    req.io.to(`user_${revieweeId}`).emit('review_received', {
      rating,
      jobId,
      reviewerName: req.user.name
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Review creation error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const query = { revieweeId: userId };
    if (rating) {
      query.rating = parseInt(rating);
    }

    const reviews = await Review.find(query)
      .populate('reviewerId', 'name profileImage')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviews for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const reviews = await Review.find({ jobId })
      .populate('reviewerId', 'name profileImage')
      .populate('revieweeId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Get job reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch job reviews' });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user already marked as helpful
    if (review.helpful.users.includes(userId)) {
      return res.status(400).json({ error: 'Already marked as helpful' });
    }

    review.helpful.users.push(userId);
    review.helpful.count += 1;
    await review.save();

    res.json({ message: 'Marked as helpful' });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ error: 'Failed to mark as helpful' });
  }
});

// Respond to review
router.post('/:reviewId/response', auth, [
  body('comment').isLength({ min: 10, max: 500 }).withMessage('Response must be between 10 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reviewId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.revieweeId.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to respond to this review' });
    }

    if (review.response) {
      return res.status(400).json({ error: 'Response already exists' });
    }

    review.response = {
      comment,
      createdAt: new Date()
    };

    await review.save();

    res.json({ message: 'Response added successfully' });
  } catch (error) {
    console.error('Review response error:', error);
    res.status(500).json({ error: 'Failed to add response' });
  }
});

// Helper function to update user rating
async function updateUserRating(userId) {
  try {
    const reviews = await Review.find({ revieweeId: userId });
    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await User.findByIdAndUpdate(userId, { rating: averageRating });
  } catch (error) {
    console.error('Update user rating error:', error);
  }
}

module.exports = router;
