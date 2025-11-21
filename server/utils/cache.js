const Redis = require('ioredis');
const logger = require('./logger');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnClusterDown: 300,
        enableOfflineQueue: false,
        maxLoadingTimeout: 5000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error:', { error: error.message });
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', { error: error.message });
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Redis set error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', { key, error: error.message });
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', { key, error: error.message });
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis expire error:', { key, ttl, error: error.message });
      return false;
    }
  }

  async keys(pattern) {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', { pattern, error: error.message });
      return [];
    }
  }

  async flush() {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Redis flush error:', { error: error.message });
      return false;
    }
  }

  // Cache middleware for Express routes
  cacheMiddleware(ttl = this.defaultTTL, keyGenerator = null) {
    return async (req, res, next) => {
      if (!this.isConnected) {
        return next();
      }

      try {
        const key = keyGenerator ? keyGenerator(req) : this.generateCacheKey(req);
        const cachedData = await this.get(key);

        if (cachedData) {
          logger.info('Cache hit:', { key });
          return res.json(cachedData);
        }

        // Store original res.json
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function(data) {
          // Cache the response
          cacheService.set(key, data, ttl).catch(error => {
            logger.error('Failed to cache response:', { key, error: error.message });
          });
          
          // Call original json method
          originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', { error: error.message });
        next();
      }
    };
  }

  generateCacheKey(req) {
    const { method, url, query, body } = req;
    const userId = req.user ? req.user._id : 'anonymous';
    
    // Create a hash of the request
    const keyData = {
      method,
      url,
      query,
      body: method === 'POST' ? body : undefined,
      userId
    };
    
    return `cache:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  // Specific cache methods for different data types
  async cacheUser(userId, userData, ttl = 1800) { // 30 minutes
    return await this.set(`user:${userId}`, userData, ttl);
  }

  async getCachedUser(userId) {
    return await this.get(`user:${userId}`);
  }

  async cacheJob(jobId, jobData, ttl = 3600) { // 1 hour
    return await this.set(`job:${jobId}`, jobData, ttl);
  }

  async getCachedJob(jobId) {
    return await this.get(`job:${jobId}`);
  }

  async cacheJobsList(query, jobsData, ttl = 1800) { // 30 minutes
    const queryKey = Buffer.from(JSON.stringify(query)).toString('base64');
    return await this.set(`jobs:list:${queryKey}`, jobsData, ttl);
  }

  async getCachedJobsList(query) {
    const queryKey = Buffer.from(JSON.stringify(query)).toString('base64');
    return await this.get(`jobs:list:${queryKey}`);
  }

  async cacheProposals(jobId, proposalsData, ttl = 1800) { // 30 minutes
    return await this.set(`proposals:${jobId}`, proposalsData, ttl);
  }

  async getCachedProposals(jobId) {
    return await this.get(`proposals:${jobId}`);
  }

  async cacheMessages(jobId, messagesData, ttl = 300) { // 5 minutes
    return await this.set(`messages:${jobId}`, messagesData, ttl);
  }

  async getCachedMessages(jobId) {
    return await this.get(`messages:${jobId}`);
  }

  // Invalidate cache methods
  async invalidateUser(userId) {
    await this.del(`user:${userId}`);
    // Also invalidate related caches
    await this.invalidateUserRelatedCaches(userId);
  }

  async invalidateJob(jobId) {
    await this.del(`job:${jobId}`);
    // Invalidate jobs list cache
    const jobListKeys = await this.keys('jobs:list:*');
    for (const key of jobListKeys) {
      await this.del(key);
    }
  }

  async invalidateProposals(jobId) {
    await this.del(`proposals:${jobId}`);
  }

  async invalidateMessages(jobId) {
    await this.del(`messages:${jobId}`);
  }

  async invalidateUserRelatedCaches(userId) {
    // Invalidate jobs where user is client or freelancer
    const jobKeys = await this.keys(`job:*`);
    for (const key of jobKeys) {
      const job = await this.get(key);
      if (job && (job.clientId === userId || job.selectedFreelancer === userId)) {
        await this.del(key);
      }
    }
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected) {
      return { status: 'unhealthy', error: 'Not connected to Redis' };
    }

    try {
      const pong = await this.redis.ping();
      if (pong === 'PONG') {
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', error: 'Ping failed' };
      }
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
