const mongoose = require('mongoose');
const logger = require('../utils/logger');
const cacheService = require('./cache');

// Health check service
class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  registerDefaultChecks() {
    // Database health check
    this.registerCheck('database', async () => {
      try {
        const state = mongoose.connection.readyState;
        if (state !== 1) {
          throw new Error(`Database connection state: ${state}`);
        }
        
        // Test database query
        await mongoose.connection.db.admin().ping();
        
        return {
          status: 'healthy',
          details: {
            state: state,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message
        };
      }
    });

    // Memory health check
    this.registerCheck('memory', async () => {
      try {
        const memUsage = process.memoryUsage();
        const totalMem = memUsage.heapTotal;
        const usedMem = memUsage.heapUsed;
        const freeMem = totalMem - usedMem;
        const usagePercent = (usedMem / totalMem) * 100;

        const status = usagePercent > 90 ? 'warning' : 'healthy';
        
        return {
          status,
          details: {
            heapUsed: Math.round(usedMem / 1024 / 1024) + ' MB',
            heapTotal: Math.round(totalMem / 1024 / 1024) + ' MB',
            heapFree: Math.round(freeMem / 1024 / 1024) + ' MB',
            usagePercent: Math.round(usagePercent * 100) / 100 + '%',
            rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
            external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message
        };
      }
    });

    // CPU health check
    this.registerCheck('cpu', async () => {
      try {
        const startUsage = process.cpuUsage();
        
        // Wait a bit to measure CPU usage
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endUsage = process.cpuUsage(startUsage);
        const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        
        const status = cpuPercent > 80 ? 'warning' : 'healthy';
        
        return {
          status,
          details: {
            cpuPercent: Math.round(cpuPercent * 100) / 100 + '%',
            user: endUsage.user,
            system: endUsage.system
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message
        };
      }
    });

    // Disk space health check
    this.registerCheck('disk', async () => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Check available disk space
        const stats = fs.statSync('.');
        const freeSpace = require('os').freemem();
        const totalSpace = require('os').totalmem();
        const usagePercent = ((totalSpace - freeSpace) / totalSpace) * 100;
        
        const status = usagePercent > 90 ? 'warning' : 'healthy';
        
        return {
          status,
          details: {
            freeSpace: Math.round(freeSpace / 1024 / 1024) + ' MB',
            totalSpace: Math.round(totalSpace / 1024 / 1024) + ' MB',
            usagePercent: Math.round(usagePercent * 100) / 100 + '%'
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message
        };
      }
    });

    // Redis cache health check
    this.registerCheck('redis', async () => {
      try {
        const health = await cacheService.healthCheck();
        return health;
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message
        };
      }
    });
  }

  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    try {
      return await check();
    } catch (error) {
      logger.error(`Health check '${name}' failed`, { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async runAllChecks() {
    const results = {};
    const overallStatus = { status: 'healthy', timestamp: new Date().toISOString() };
    
    for (const [name, check] of this.checks) {
      try {
        results[name] = await this.runCheck(name);
        
        // Update overall status
        if (results[name].status === 'unhealthy') {
          overallStatus.status = 'unhealthy';
        } else if (results[name].status === 'warning' && overallStatus.status === 'healthy') {
          overallStatus.status = 'warning';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        };
        overallStatus.status = 'unhealthy';
      }
    }
    
    return {
      ...overallStatus,
      checks: results
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
}

// Create singleton instance
const healthCheckService = new HealthCheckService();

// Health check endpoint handler
const healthCheck = async (req, res) => {
  try {
    const health = await healthCheckService.runAllChecks();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check endpoint error', { error: error.message });
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};

// Readiness check (simpler check for load balancers)
const readinessCheck = async (req, res) => {
  try {
    // Only check critical services
    const dbHealth = await healthCheckService.runCheck('database');
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', error: dbHealth.error });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
};

// Liveness check (basic check for container health)
const livenessCheck = (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
};

module.exports = {
  healthCheckService,
  healthCheck,
  readinessCheck,
  livenessCheck
};
