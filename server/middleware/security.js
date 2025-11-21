const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Enhanced security configuration
const securityConfig = {
  // Helmet configuration for security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // Rate limiting for different endpoints
  rateLimits: {
    // General API rate limiting
    general: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    }),

    // Strict rate limiting for authentication
    auth: rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    }),

    // File upload rate limiting
    upload: rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
      message: 'Too many file uploads, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    })
  },

  // CORS configuration
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // In development, allow all localhost origins and dev tunnels
      if (process.env.NODE_ENV !== 'production') {
        // Allow all localhost origins
        if (origin.startsWith('http://localhost:') || 
            origin.startsWith('http://127.0.0.1:') ||
            origin.includes('.devtunnels.ms') ||
            origin.includes('.ngrok.io')) {
          return callback(null, true);
        }
      }
      
      // Always allow configured CLIENT_URL and FRONTEND_URL
      const clientUrl = process.env.CLIENT_URL;
      const frontendUrl = process.env.FRONTEND_URL;
      
      if (origin === clientUrl || origin === frontendUrl) {
        return callback(null, true);
      }
      
      const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  },

  // Security middleware
  securityMiddleware: (req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Add cache control headers for sensitive endpoints
    if (req.path.includes('/api/auth/') || req.path.includes('/api/admin/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  },

  // Input sanitization
  sanitizeInput: (req, res, next) => {
    // Sanitize string inputs
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    };

    // Recursively sanitize object
    const sanitizeObject = (obj) => {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  },

  // SQL injection protection (for MongoDB, this is more about NoSQL injection)
  nosqlInjectionProtection: (req, res, next) => {
    const dangerousPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$regex/i,
      /\$exists/i,
      /\$in/i,
      /\$nin/i,
      /\$or/i,
      /\$and/i,
      /\$not/i,
      /\$nor/i,
      /\$all/i,
      /\$elemMatch/i,
      /\$size/i,
      /\$type/i,
      /\$mod/i,
      /\$text/i,
      /\$geoNear/i,
      /\$geoWithin/i,
      /\$geoIntersects/i,
      /\$near/i,
      /\$nearSphere/i,
      /\$center/i,
      /\$centerSphere/i,
      /\$box/i,
      /\$polygon/i,
      /\$geometry/i,
      /\$maxDistance/i,
      /\$minDistance/i,
      /\$slice/i,
      /\$push/i,
      /\$pull/i,
      /\$addToSet/i,
      /\$pop/i,
      /\$inc/i,
      /\$set/i,
      /\$unset/i,
      /\$rename/i,
      /\$currentDate/i,
      /\$mul/i,
      /\$min/i,
      /\$max/i,
      /\$bit/i
    ];

    const checkForInjection = (obj) => {
      if (typeof obj === 'string') {
        return dangerousPatterns.some(pattern => pattern.test(obj));
      }
      
      if (Array.isArray(obj)) {
        return obj.some(checkForInjection);
      }
      
      if (obj && typeof obj === 'object') {
        return Object.values(obj).some(checkForInjection);
      }
      
      return false;
    };

    if (checkForInjection(req.body) || checkForInjection(req.query) || checkForInjection(req.params)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    next();
  },

  // IP whitelist for admin endpoints
  adminIPWhitelist: (req, res, next) => {
    const adminIPs = process.env.ADMIN_IP_WHITELIST ? 
      process.env.ADMIN_IP_WHITELIST.split(',') : 
      ['127.0.0.1', '::1'];
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (req.path.includes('/api/admin/') && !adminIPs.includes(clientIP)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  }
};

module.exports = securityConfig;
