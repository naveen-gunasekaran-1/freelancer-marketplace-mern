const axios = require('axios');

/**
 * Create Test Jobs Script
 * Creates 10 sample jobs for testing purposes
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

const testJobs = [
  {
    title: 'Full Stack MERN Developer Needed',
    description: 'We are looking for an experienced Full Stack Developer proficient in MongoDB, Express.js, React, and Node.js. The project involves building a social media platform with real-time chat features. You should have 3+ years of experience and be able to work independently.',
    budget: 5000,
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express.js', 'Socket.io'],
    category: 'Web Development',
    duration: '3 months',
    experienceLevel: 'Expert'
  },
  {
    title: 'Mobile App Developer - React Native',
    description: 'Seeking a talented React Native developer to build a cross-platform mobile application for iOS and Android. The app is a fitness tracking application with social features. Must have experience with Redux, Firebase, and REST APIs.',
    budget: 4500,
    skills: ['React Native', 'JavaScript', 'Redux', 'Firebase', 'Mobile Development'],
    category: 'Mobile Development',
    duration: '2 months',
    experienceLevel: 'Intermediate'
  },
  {
    title: 'Python Data Scientist for ML Project',
    description: 'Looking for a data scientist to help with a machine learning project. You will work on predictive modeling, data analysis, and visualization. Experience with TensorFlow, Pandas, and scikit-learn is required. Project duration is flexible.',
    budget: 6000,
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'Data Analysis', 'Pandas', 'scikit-learn'],
    category: 'Data Science',
    duration: '4 months',
    experienceLevel: 'Expert'
  },
  {
    title: 'WordPress Theme Customization',
    description: 'Need someone to customize an existing WordPress theme for our company website. Tasks include color scheme changes, layout adjustments, and adding custom post types. Should be familiar with PHP, CSS, and WordPress best practices.',
    budget: 800,
    skills: ['WordPress', 'PHP', 'CSS', 'HTML', 'JavaScript'],
    category: 'Web Development',
    duration: '2 weeks',
    experienceLevel: 'Beginner'
  },
  {
    title: 'UI/UX Designer for SaaS Dashboard',
    description: 'We need a creative UI/UX designer to design a modern dashboard for our SaaS product. You should provide wireframes, mockups, and a complete design system. Experience with Figma is mandatory. The design should be responsive and user-friendly.',
    budget: 3500,
    skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Responsive Design', 'Prototyping'],
    category: 'Design',
    duration: '6 weeks',
    experienceLevel: 'Intermediate'
  },
  {
    title: 'DevOps Engineer - AWS Infrastructure',
    description: 'Looking for a DevOps engineer to set up and maintain our AWS infrastructure. Responsibilities include CI/CD pipeline setup, Docker containerization, Kubernetes orchestration, and monitoring setup. Must have hands-on AWS experience.',
    budget: 7000,
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'DevOps', 'Terraform'],
    category: 'DevOps',
    duration: '3 months',
    experienceLevel: 'Expert'
  },
  {
    title: 'Content Writer - Tech Blog',
    description: 'Seeking an experienced tech writer to create engaging blog posts about web development, AI, and cloud computing. You should be able to explain complex topics in simple terms. 10 articles needed, 1500-2000 words each.',
    budget: 1200,
    skills: ['Content Writing', 'Technical Writing', 'SEO', 'Research'],
    category: 'Writing',
    duration: '1 month',
    experienceLevel: 'Intermediate'
  },
  {
    title: 'E-commerce Website with Stripe Integration',
    description: 'Build a complete e-commerce website using React and Node.js with Stripe payment integration. Features include product catalog, shopping cart, checkout, order management, and admin panel. Responsive design required.',
    budget: 5500,
    skills: ['React', 'Node.js', 'Stripe', 'MongoDB', 'E-commerce', 'Payment Integration'],
    category: 'Web Development',
    duration: '2.5 months',
    experienceLevel: 'Intermediate'
  },
  {
    title: 'Blockchain Smart Contract Developer',
    description: 'Need an experienced Solidity developer to create smart contracts for our DeFi project. You will develop, test, and deploy contracts on Ethereum. Security audit experience is a plus. Must understand gas optimization.',
    budget: 8000,
    skills: ['Solidity', 'Ethereum', 'Smart Contracts', 'Web3.js', 'Blockchain'],
    category: 'Blockchain',
    duration: '3 months',
    experienceLevel: 'Expert'
  },
  {
    title: 'Video Editor for YouTube Channel',
    description: 'Looking for a creative video editor for our tech YouTube channel. You will edit 4-5 videos per week, add transitions, effects, captions, and thumbnails. Experience with Premiere Pro or Final Cut Pro required.',
    budget: 2000,
    skills: ['Video Editing', 'Adobe Premiere Pro', 'After Effects', 'Motion Graphics'],
    category: 'Video Production',
    duration: '1 month',
    experienceLevel: 'Beginner'
  }
];

async function createTestUser() {
  try {
    const timestamp = Date.now();
    const userData = {
      name: `Test Client ${timestamp}`,
      email: `testclient_${timestamp}@example.com`,
      password: 'TestPass123!@#',
      type: 'client'
    };

    console.log('📝 Creating test client user...');
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    
    if (response.data.token) {
      console.log(`✅ Test client created: ${userData.email}`);
      return {
        token: response.data.token,
        userId: response.data.user._id,
        email: userData.email
      };
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      console.log('⚠️  Test user already exists, attempting login...');
      
      // Try to login instead
      const loginData = {
        email: `testclient_${Date.now() - 1000}@example.com`,
        password: 'TestPass123!@#'
      };
      
      try {
        const loginResponse = await axios.post(`${API_URL}/api/auth/login`, loginData);
        return {
          token: loginResponse.data.token,
          userId: loginResponse.data.user._id,
          email: loginData.email
        };
      } catch (loginError) {
        throw new Error('Could not create or login test user');
      }
    }
    throw error;
  }
}

async function createTestJobs() {
  console.log('\n🚀 Starting Test Job Creation...\n');
  console.log('='.repeat(60));
  
  try {
    // Create a test client user
    const user = await createTestUser();
    console.log(`🔑 Using token: ${user.token.substring(0, 20)}...`);
    console.log('='.repeat(60) + '\n');
    
    const createdJobs = [];
    
    for (let i = 0; i < testJobs.length; i++) {
      const job = testJobs[i];
      
      try {
        console.log(`📋 Creating Job ${i + 1}/${testJobs.length}: "${job.title}"`);
        
        const response = await axios.post(
          `${API_URL}/api/jobs`,
          job,
          {
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data._id) {
          createdJobs.push({
            id: response.data._id,
            title: response.data.title,
            budget: response.data.budget
          });
          console.log(`   ✅ Created successfully (ID: ${response.data._id})`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${createdJobs.length} jobs`);
    console.log(`❌ Failed: ${testJobs.length - createdJobs.length} jobs`);
    console.log('='.repeat(60));
    
    // Save job IDs to file for cleanup
    const fs = require('fs');
    const path = require('path');
    
    const testDataDir = path.join(__dirname, 'test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    const dataFile = path.join(testDataDir, 'test-jobs.json');
    fs.writeFileSync(dataFile, JSON.stringify({
      createdAt: new Date().toISOString(),
      userId: user.userId,
      userEmail: user.email,
      token: user.token,
      jobs: createdJobs
    }, null, 2));
    
    console.log(`\n💾 Job IDs saved to: ${dataFile}`);
    console.log('\n✨ Test jobs created successfully!\n');
    
    return createdJobs;
    
  } catch (error) {
    console.error('\n❌ Error creating test jobs:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createTestJobs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { createTestJobs };
