const { body, param, query, validationResult } = require('express-validator');

// Common validation rules
const commonValidations = {
  // ObjectId validation
  objectId: (field) => param(field).isMongoId().withMessage('Invalid ID format'),
  
  // Email validation
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  // Password validation
  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  // Name validation
  name: () => body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  // Phone validation
  phone: () => body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  // URL validation
  url: () => body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  
  // Budget validation
  budget: () => body('budget')
    .isFloat({ min: 1 })
    .withMessage('Budget must be a positive number'),
  
  // Rating validation
  rating: () => body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

// User validation rules
const userValidations = {
  register: [
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.name(),
    body('type')
      .isIn(['freelancer', 'client'])
      .withMessage('User type must be either freelancer or client'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      })
  ],
  
  login: [
    commonValidations.email(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  updateProfile: [
    commonValidations.name().optional(),
    commonValidations.phone(),
    commonValidations.url(),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location must be less than 100 characters'),
    body('hourlyRate')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Hourly rate must be a positive number')
  ]
};

// Job validation rules
const jobValidations = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Job title must be between 5 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Job description must be between 20 and 2000 characters'),
    commonValidations.budget(),
    body('category')
      .isIn(['Web Development', 'Mobile Development', 'Design', 'Writing', 'Marketing', 'Data Science', 'DevOps', 'AI/ML', 'Blockchain', 'Other'])
      .withMessage('Invalid job category'),
    body('skills')
      .isArray({ min: 1 })
      .withMessage('At least one skill is required'),
    body('skills.*')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Each skill must be between 2 and 30 characters'),
    body('duration')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Duration must be between 1 and 50 characters'),
    body('deadline')
      .optional()
      .isISO8601()
      .withMessage('Deadline must be a valid date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Deadline must be in the future');
        }
        return true;
      })
  ],
  
  update: [
    commonValidations.objectId('id'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Job title must be between 5 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Job description must be between 20 and 2000 characters'),
    body('budget')
      .optional()
      .isFloat({ min: 1 })
      .withMessage('Budget must be a positive number')
  ]
};

// Proposal validation rules
const proposalValidations = {
  create: [
    body('jobId')
      .isMongoId()
      .withMessage('Invalid job ID'),
    body('proposal')
      .trim()
      .isLength({ min: 50, max: 1000 })
      .withMessage('Proposal must be between 50 and 1000 characters'),
    body('bidAmount')
      .isFloat({ min: 1 })
      .withMessage('Bid amount must be a positive number'),
    body('timeline')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Timeline must be between 1 and 100 characters')
  ]
};

// Review validation rules
const reviewValidations = {
  create: [
    body('jobId')
      .isMongoId()
      .withMessage('Invalid job ID'),
    body('revieweeId')
      .isMongoId()
      .withMessage('Invalid reviewee ID'),
    commonValidations.rating(),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Comment must be less than 500 characters'),
    body('categories')
      .optional()
      .isObject()
      .withMessage('Categories must be an object')
  ]
};

// Message validation rules
const messageValidations = {
  send: [
    body('receiverId')
      .isMongoId()
      .withMessage('Invalid receiver ID'),
    body('jobId')
      .isMongoId()
      .withMessage('Invalid job ID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message content must be between 1 and 1000 characters')
  ]
};

// Skill verification validation rules
const skillVerificationValidations = {
  submit: [
    body('skillName')
      .trim()
      .isLength({ min: 2, max: 30 })
      .withMessage('Skill name must be between 2 and 30 characters'),
    body('level')
      .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
      .withMessage('Invalid skill level'),
    body('proof')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Proof must be between 10 and 1000 characters'),
    body('attachments')
      .optional()
      .isArray()
      .withMessage('Attachments must be an array')
  ]
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

module.exports = {
  commonValidations,
  userValidations,
  jobValidations,
  proposalValidations,
  reviewValidations,
  messageValidations,
  skillVerificationValidations,
  handleValidationErrors
};
