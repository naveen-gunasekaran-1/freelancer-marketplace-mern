const Razorpay = require('razorpay');
const path = require('path');

// Ensure environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id', // Replace with your Razorpay Key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_key_secret' // Replace with your Razorpay Key Secret
});

module.exports = razorpayInstance;
