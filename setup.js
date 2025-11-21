const crypto = require('crypto');
const fs = require('fs');

console.log('🚀 Freelancer Marketplace - Quick Setup Script\n');

// Generate JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex');

// Check if .env exists
if (fs.existsSync('.env')) {
  console.log('⚠️  .env file already exists. Please update manually.');
  console.log('\nYour generated JWT Secret:');
  console.log(jwtSecret);
  console.log('\nAdd this to your .env file as JWT_SECRET\n');
} else {
  // Read .env.example
  let envContent = fs.readFileSync('.env.example', 'utf8');
  
  // Replace JWT_SECRET
  envContent = envContent.replace(
    'JWT_SECRET=your_super_secret_jwt_key_change_this_in_production',
    `JWT_SECRET=${jwtSecret}`
  );
  
  // Write .env
  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env file with secure JWT secret');
}

console.log('\n📋 Next Steps:');
console.log('1. Update .env with your MongoDB URI');
console.log('2. Add your Razorpay credentials (get from https://dashboard.razorpay.com/)');
console.log('3. Add Cloudinary credentials for file uploads (optional)');
console.log('4. Run: npm run dev\n');

console.log('📚 For detailed setup instructions, see IMPLEMENTATION_GUIDE.md\n');
