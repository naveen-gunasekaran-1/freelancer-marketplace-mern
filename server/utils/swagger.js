const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Freelancer Marketplace API',
      version: '1.0.0',
      description: 'A comprehensive freelancer marketplace platform API with advanced features including skill verification, real-time communication, secure payments, and admin panel.',
      contact: {
        name: 'API Support',
        email: 'support@freelancer-marketplace.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.CLIENT_URL || 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.freelancer-marketplace.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password', 'name', 'type'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            name: {
              type: 'string',
              description: 'User full name'
            },
            type: {
              type: 'string',
              enum: ['freelancer', 'client', 'admin'],
              description: 'User type'
            },
            skills: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Skill'
              },
              description: 'User skills'
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'User rating'
            },
            completedJobs: {
              type: 'number',
              description: 'Number of completed jobs'
            },
            profileImage: {
              type: 'string',
              description: 'Profile image URL'
            },
            bio: {
              type: 'string',
              description: 'User biography'
            },
            hourlyRate: {
              type: 'number',
              description: 'Hourly rate for freelancers'
            },
            location: {
              type: 'string',
              description: 'User location'
            },
            phone: {
              type: 'string',
              description: 'User phone number'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'User website'
            },
            portfolio: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PortfolioItem'
              },
              description: 'User portfolio items'
            },
            verificationStatus: {
              type: 'string',
              enum: ['unverified', 'pending', 'verified'],
              description: 'User verification status'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether user account is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation date'
            }
          }
        },
        Skill: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Skill name'
            },
            level: {
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced', 'expert'],
              description: 'Skill level'
            },
            verified: {
              type: 'boolean',
              description: 'Whether skill is verified'
            },
            badge: {
              type: 'string',
              enum: ['bronze', 'silver', 'gold', 'platinum'],
              description: 'Skill verification badge'
            }
          }
        },
        PortfolioItem: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Portfolio item title'
            },
            description: {
              type: 'string',
              description: 'Portfolio item description'
            },
            imageUrl: {
              type: 'string',
              description: 'Portfolio item image URL'
            },
            projectUrl: {
              type: 'string',
              description: 'Portfolio item project URL'
            }
          }
        },
        Job: {
          type: 'object',
          required: ['title', 'description', 'budget', 'category', 'clientId'],
          properties: {
            id: {
              type: 'string',
              description: 'Job ID'
            },
            title: {
              type: 'string',
              description: 'Job title'
            },
            description: {
              type: 'string',
              description: 'Job description'
            },
            budget: {
              type: 'number',
              description: 'Job budget'
            },
            budgetType: {
              type: 'string',
              enum: ['fixed', 'hourly'],
              description: 'Budget type'
            },
            category: {
              type: 'string',
              enum: ['Web Development', 'Mobile Development', 'Design', 'Writing', 'Marketing', 'Data Science', 'DevOps', 'AI/ML', 'Blockchain', 'Other'],
              description: 'Job category'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Required skills'
            },
            duration: {
              type: 'string',
              description: 'Project duration'
            },
            clientId: {
              type: 'string',
              description: 'Client ID'
            },
            status: {
              type: 'string',
              enum: ['open', 'closed', 'in_progress', 'completed', 'cancelled'],
              description: 'Job status'
            },
            proposalCount: {
              type: 'number',
              description: 'Number of proposals'
            },
            selectedFreelancer: {
              type: 'string',
              description: 'Selected freelancer ID'
            },
            deadline: {
              type: 'string',
              format: 'date-time',
              description: 'Job deadline'
            },
            milestones: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Milestone'
              },
              description: 'Job milestones'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job creation date'
            }
          }
        },
        Milestone: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Milestone name'
            },
            description: {
              type: 'string',
              description: 'Milestone description'
            },
            amount: {
              type: 'number',
              description: 'Milestone amount'
            },
            percentage: {
              type: 'number',
              description: 'Milestone percentage'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Milestone due date'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'approved'],
              description: 'Milestone status'
            }
          }
        },
        Proposal: {
          type: 'object',
          required: ['jobId', 'proposal', 'bidAmount', 'timeline'],
          properties: {
            id: {
              type: 'string',
              description: 'Proposal ID'
            },
            jobId: {
              type: 'string',
              description: 'Job ID'
            },
            freelancerId: {
              type: 'string',
              description: 'Freelancer ID'
            },
            proposal: {
              type: 'string',
              description: 'Proposal text'
            },
            bidAmount: {
              type: 'number',
              description: 'Bid amount'
            },
            timeline: {
              type: 'string',
              description: 'Project timeline'
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected'],
              description: 'Proposal status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Proposal creation date'
            }
          }
        },
        Message: {
          type: 'object',
          required: ['senderId', 'receiverId', 'jobId', 'content'],
          properties: {
            id: {
              type: 'string',
              description: 'Message ID'
            },
            senderId: {
              type: 'string',
              description: 'Sender ID'
            },
            receiverId: {
              type: 'string',
              description: 'Receiver ID'
            },
            jobId: {
              type: 'string',
              description: 'Job ID'
            },
            content: {
              type: 'string',
              description: 'Message content'
            },
            isRead: {
              type: 'boolean',
              description: 'Whether message is read'
            },
            replyTo: {
              type: 'string',
              description: 'Reply to message ID'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Message creation date'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Error details'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./server/routes/*.js'] // Path to the API files
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi
};
