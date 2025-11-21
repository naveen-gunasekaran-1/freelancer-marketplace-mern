const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiting');
const securityConfig = require('./middleware/security');
const cacheService = require('./utils/cache');

// Load .env from parent directory (root of project)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const proposalRoutes = require('./routes/proposals');
const paymentRoutes = require('./routes/payments');
const reviewRoutes = require('./routes/reviews');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const skillVerificationRoutes = require('./routes/skillVerification');
const disputeRoutes = require('./routes/disputes');
const adminRoutes = require('./routes/admin');
const workspaceRoutes = require('./routes/workspace');
const secureConversationRoutes = require('./routes/secureConversation');
const uploadRoutes = require('./routes/upload');
const subscriptionRoutes = require('./routes/subscriptions');

const app = express();
const server = createServer(app);

// Trust proxy - needed for dev tunnels and reverse proxies
app.set('trust proxy', true);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000
});

// Make io globally available
global.io = io;

const PORT = process.env.PORT || 3001;

// Connect to MongoDB
connectDB();

// Connect to Redis Cache (Optional - commented out to avoid errors)
// Only enable if you have Redis installed and running
// cacheService.connect().catch(error => {
//   logger.error('Failed to connect to Redis cache:', { error: error.message });
// });

// Security middleware
app.use(securityConfig.helmet);
app.use(compression());

// Security middleware
app.use(securityConfig.securityMiddleware);
app.use(securityConfig.sanitizeInput);
app.use(securityConfig.nosqlInjectionProtection);
app.use(securityConfig.adminIPWhitelist);

// Rate limiting
app.use('/api/', generalLimiter);

// CORS middleware
app.use(cors(securityConfig.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    logger.http(req, res, responseTime);
  });
  
  next();
});

const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // Get user from database to ensure they still exist
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication error: User account is inactive'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error('Socket authentication error:', { error: error.message, stack: error.stack });
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.socket('user_connected', socket.id, { 
    userId: socket.user._id, 
    userName: socket.user.name 
  });
  
  // Join user to their personal room for notifications
  socket.join(`user_${socket.user._id}`);
  
  socket.on('join_job', (jobId) => {
    socket.join(`job_${jobId}`);
    logger.socket('user_joined_job', socket.id, { 
      userId: socket.user._id, 
      jobId 
    });
  });
  
  socket.on('leave_job', (jobId) => {
    socket.leave(`job_${jobId}`);
    logger.socket('user_left_job', socket.id, { 
      userId: socket.user._id, 
      jobId 
    });
  });

  socket.on('typing', (data) => {
    socket.to(`job_${data.jobId}`).emit('typing', {
      userId: socket.user._id,
      userName: socket.user.name,
      isTyping: data.isTyping
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(`job_${data.jobId}`).emit('typing', {
      userId: socket.user._id,
      userName: socket.user.name,
      isTyping: false
    });
  });
  
  socket.on('disconnect', () => {
    logger.socket('user_disconnected', socket.id, { 
      userId: socket.user._id, 
      userName: socket.user.name 
    });
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Import health check utilities
const { healthCheck, readinessCheck, livenessCheck } = require('./utils/healthCheck');

// Import Swagger documentation
const { specs, swaggerUi } = require('./utils/swagger');

// Root endpoint - for Socket.io compatibility (must be before API routes)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Freelancer Marketplace API Server',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs'
  });
});

// Favicon handler - silently handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// Health check endpoints
app.get('/api/health', healthCheck);
app.get('/api/ready', readinessCheck);
app.get('/api/live', livenessCheck);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Freelancer Marketplace API Documentation'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/skill-verification', skillVerificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/secure-conversations', secureConversationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', uploadRoutes);

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Global error handler:', { 
    error: error.message, 
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user ? req.user._id : null
  });
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ error: 'Validation Error', details: errors });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Socket.IO server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});