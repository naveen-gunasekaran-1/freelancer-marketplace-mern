const express = require('express');
const Job = require('../models/Job');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Search jobs with advanced filters
router.get('/search', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      budgetMin,
      budgetMax, 
      skills, 
      page = 1, 
      limit = 10,
      sortBy = 'newest',
      experienceLevel,
      duration
    } = req.query;
    
    let query = { status: 'open' };
    
    // Text search
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Category filter
    if (category && category.trim()) {
      query.category = category;
    }
    
    // Budget range filter
    if (budgetMin || budgetMax) {
      query.budget = {};
      if (budgetMin) query.budget.$gte = parseFloat(budgetMin);
      if (budgetMax) query.budget.$lte = parseFloat(budgetMax);
    }
    
    // Skills filter - handle both array and comma-separated string
    if (skills) {
      let skillsArray = [];
      if (Array.isArray(skills)) {
        skillsArray = skills.filter(s => s && s.trim());
      } else if (typeof skills === 'string' && skills.trim()) {
        skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
      }
      
      if (skillsArray.length > 0) {
        query.requiredSkills = { $in: skillsArray };
      }
    }

    // Experience level filter
    if (experienceLevel && experienceLevel.trim()) {
      query.experienceLevel = experienceLevel;
    }

    // Duration filter
    if (duration && duration.trim()) {
      query.duration = duration;
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest
    if (sortBy === 'budget-high') {
      sortOption = { budget: -1 };
    } else if (sortBy === 'budget-low') {
      sortOption = { budget: 1 };
    } else if (sortBy === 'oldest') {
      sortOption = { createdAt: 1 };
    }

    const jobs = await Job.find(query)
      .populate('clientId', 'name rating completedJobs profileImage')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get user's jobs (client's posted jobs) - BEFORE /:id to avoid route conflict
router.get('/user/my-jobs', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'client') {
      return res.status(403).json({ error: 'Only clients can view their jobs' });
    }

    const jobs = await Job.find({ clientId: req.user._id })
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    console.error('User jobs fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all jobs with search and filter
router.get('/', async (req, res) => {
  try {
    const { search, category, minBudget, maxBudget, skills, page = 1, limit = 10 } = req.query;
    
    let query = { status: 'open' };
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Budget range filter
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = parseInt(minBudget);
      if (maxBudget) query.budget.$lte = parseInt(maxBudget);
    }
    
    // Skills filter
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      query.skills = { $in: skillsArray };
    }

    const jobs = await Job.find(query)
      .populate('clientId', 'name rating completedJobs')
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
    console.error('Jobs fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single job - MUST be after all specific routes like /search, /user/my-jobs
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('clientId', 'name rating completedJobs location');
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Job fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new job (clients only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'client') {
      return res.status(403).json({ error: 'Only clients can post jobs' });
    }

    const { title, description, budget, category, skills, duration, deadline } = req.body;

    // Validation
    if (!title || !description || !budget || !category || !skills || !duration) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newJob = new Job({
      title,
      description,
      budget,
      category,
      skills: Array.isArray(skills) ? skills : [skills],
      duration,
      clientId: req.user._id,
      deadline: deadline ? new Date(deadline) : undefined
    });

    await newJob.save();
    
    // Populate client info before sending response
    await newJob.populate('clientId', 'name rating completedJobs');

    // Emit real-time event for new job
    if (global.io) {
      global.io.emit('job_created', {
        job: newJob,
        clientId: req.user._id,
        timestamp: new Date()
      });
      console.log('🌐 Broadcasted job_created event:', newJob._id);
    }

    res.status(201).json(newJob);
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update job (job owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }

    const { title, description, budget, category, skills, duration, status, deadline } = req.body;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (budget) updateData.budget = budget;
    if (category) updateData.category = category;
    if (skills) updateData.skills = Array.isArray(skills) ? skills : [skills];
    if (duration) updateData.duration = duration;
    if (status) updateData.status = status;
    if (deadline) updateData.deadline = new Date(deadline);

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('clientId', 'name rating completedJobs');

    // Emit real-time event for job update
    if (global.io) {
      global.io.emit('job_updated', {
        job: updatedJob,
        clientId: req.user._id,
        timestamp: new Date()
      });
      console.log('🌐 Broadcasted job_updated event:', updatedJob._id);
    }

    res.json(updatedJob);
  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete job (job owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this job' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;