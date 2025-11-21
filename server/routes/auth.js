const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, type, skills = [] } = req.body;

    console.log('📝 Registration attempt:', { email, name, type });

    // Validation
    if (!email || !password || !name || !type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['freelancer', 'client'].includes(type)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Format skills properly - convert strings to skill objects
    const formattedSkills = Array.isArray(skills) 
      ? skills.map(skill => {
          if (typeof skill === 'string') {
            return {
              name: skill.trim(),
              level: 'beginner',
              verified: false,
              verificationProof: [],
              badge: null
            };
          }
          return skill; // Already formatted as object
        })
      : [];

    // Create user
    const newUser = new User({
      email,
      password: hashedPassword,
      name,
      type,
      skills: formattedSkills
    });

    await newUser.save();
    console.log('✅ User created successfully:', newUser._id);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, type: newUser.type },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userResponse = {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      type: newUser.type,
      skills: newUser.skills || [],
      rating: newUser.rating || 0,
      completedJobs: newUser.completedJobs || 0,
      profileImage: newUser.profileImage || '',
      bio: newUser.bio || '',
      hourlyRate: newUser.hourlyRate || 0,
      location: newUser.location || '',
      phone: newUser.phone || '',
      website: newUser.website || '',
      portfolio: newUser.portfolio || [],
      verificationStatus: newUser.verificationStatus || 'unverified',
      verificationDocuments: newUser.verificationDocuments || [],
      isActive: newUser.isActive !== false,
      lastLogin: newUser.lastLogin,
      preferences: newUser.preferences || {
        notifications: { email: true, push: true, sms: false },
        privacy: { showProfile: true, showPortfolio: true, showSkills: true }
      }
    };

    res.status(201).json({ token, user: userResponse });
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ error: 'Server error during registration. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Login successful for user:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, type: user.type },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      type: user.type,
      skills: user.skills || [],
      rating: user.rating || 0,
      completedJobs: user.completedJobs || 0,
      profileImage: user.profileImage || '',
      bio: user.bio || '',
      hourlyRate: user.hourlyRate || 0,
      location: user.location || '',
      phone: user.phone || '',
      website: user.website || '',
      portfolio: user.portfolio || [],
      verificationStatus: user.verificationStatus || 'unverified',
      verificationDocuments: user.verificationDocuments || [],
      isActive: user.isActive !== false,
      lastLogin: user.lastLogin,
      preferences: user.preferences || {
        notifications: { email: true, push: true, sms: false },
        privacy: { showProfile: true, showPortfolio: true, showSkills: true }
      }
    };

    res.json({ token, user: userResponse });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login. Please try again.' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, bio, skills, hourlyRate, location } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (skills) updateData.skills = Array.isArray(skills) ? skills : [];
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (location !== undefined) updateData.location = location;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;