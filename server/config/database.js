const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB connection string - using a local MongoDB instance
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancer-marketplace';
    
    console.log('Attempting to connect to MongoDB...');
    console.log('MongoDB URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    // Remove deprecated options - they're no longer needed in MongoDB driver v4+
    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.log('\n📋 To fix this issue:');
    console.log('1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/');
    console.log('2. Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas');
    console.log('3. Update MONGODB_URI in your .env file');
    console.log('\n💡 For quick setup with Docker:');
    console.log('   docker run -d -p 27017:27017 --name mongodb mongo:latest');
    console.log('\n🔄 Server will continue running but database operations will fail.');
    console.log('   Please fix the MongoDB connection and restart the server.\n');
    
    // Don't exit the process, let the server continue running
    // process.exit(1);
  }
};

module.exports = connectDB;