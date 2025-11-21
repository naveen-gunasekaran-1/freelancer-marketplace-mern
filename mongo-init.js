# MongoDB initialization script
db = db.getSiblingDB('freelancer-marketplace');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'name', 'type'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        type: {
          enum: ['freelancer', 'client', 'admin']
        }
      }
    }
  }
});

db.createCollection('jobs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'description', 'budget', 'category', 'clientId'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 5,
          maxLength: 100
        },
        budget: {
          bsonType: 'number',
          minimum: 1
        },
        category: {
          enum: ['Web Development', 'Mobile Development', 'Design', 'Writing', 'Marketing', 'Data Science', 'DevOps', 'AI/ML', 'Blockchain', 'Other']
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ type: 1 });
db.users.createIndex({ 'skills.name': 1 });
db.users.createIndex({ rating: -1 });

db.jobs.createIndex({ clientId: 1 });
db.jobs.createIndex({ status: 1 });
db.jobs.createIndex({ category: 1 });
db.jobs.createIndex({ budget: 1 });
db.jobs.createIndex({ createdAt: -1 });
db.jobs.createIndex({ 'skills': 1 });

db.proposals.createIndex({ jobId: 1 });
db.proposals.createIndex({ freelancerId: 1 });
db.proposals.createIndex({ status: 1 });

db.messages.createIndex({ jobId: 1 });
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ receiverId: 1 });
db.messages.createIndex({ createdAt: -1 });

db.payments.createIndex({ jobId: 1 });
db.payments.createIndex({ payerId: 1 });
db.payments.createIndex({ payeeId: 1 });
db.payments.createIndex({ status: 1 });

db.reviews.createIndex({ jobId: 1 });
db.reviews.createIndex({ reviewerId: 1 });
db.reviews.createIndex({ revieweeId: 1 });

db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ createdAt: -1 });
db.notifications.createIndex({ isRead: 1 });

db.disputes.createIndex({ jobId: 1 });
db.disputes.createIndex({ status: 1 });
db.disputes.createIndex({ createdAt: -1 });

db.skillverifications.createIndex({ userId: 1 });
db.skillverifications.createIndex({ status: 1 });
db.skillverifications.createIndex({ skillName: 1 });

print('Database initialized successfully');
