const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
  db: jest.fn(),
  auth: jest.fn(),
  payment: jest.fn(),
  socket: jest.fn()
}));

describe('Health Check Endpoints', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancer-marketplace-test');
    }
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(['healthy', 'warning', 'unhealthy']).toContain(response.body.status);
    });

    it('should include database check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks.database).toHaveProperty('status');
    });

    it('should include memory check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('memory');
      expect(response.body.checks.memory).toHaveProperty('status');
      expect(response.body.checks.memory).toHaveProperty('details');
    });

    it('should include uptime check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.checks).toHaveProperty('uptime');
      expect(response.body.checks.uptime).toHaveProperty('status');
      expect(response.body.checks.uptime).toHaveProperty('details');
    });
  });

  describe('GET /api/ready', () => {
    it('should return ready status when database is connected', async () => {
      const response = await request(app)
        .get('/api/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
    });
  });

  describe('GET /api/live', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/api/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});

describe('API Documentation', () => {
  describe('GET /api-docs', () => {
    it('should serve Swagger documentation', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      expect(response.text).toContain('swagger');
    });
  });
});

describe('Error Handling', () => {
  describe('GET /api/nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });
  });
});

describe('Security Headers', () => {
  it('should include security headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
    expect(response.headers).toHaveProperty('x-xss-protection');
  });
});
