const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Cleanup Test Jobs Script
 * Removes all test jobs that were created by the createTestJobs script
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function cleanupTestJobs() {
  console.log('\n🧹 Starting Test Job Cleanup...\n');
  console.log('='.repeat(60));
  
  try {
    // Load test job data
    const dataFile = path.join(__dirname, 'test-data', 'test-jobs.json');
    
    if (!fs.existsSync(dataFile)) {
      console.log('⚠️  No test jobs data file found.');
      console.log('   File expected at:', dataFile);
      console.log('\n💡 Tip: Run createTestJobs.js first to create test jobs.\n');
      return;
    }
    
    const testData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    console.log(`📂 Found test data from: ${testData.createdAt}`);
    console.log(`👤 User: ${testData.userEmail}`);
    console.log(`📋 Jobs to delete: ${testData.jobs.length}`);
    console.log('='.repeat(60) + '\n');
    
    if (testData.jobs.length === 0) {
      console.log('✅ No jobs to clean up.\n');
      return;
    }
    
    const deletedJobs = [];
    const failedJobs = [];
    
    for (let i = 0; i < testData.jobs.length; i++) {
      const job = testData.jobs[i];
      
      try {
        console.log(`🗑️  Deleting Job ${i + 1}/${testData.jobs.length}: "${job.title}"`);
        console.log(`   ID: ${job.id}`);
        
        const response = await axios.delete(
          `${API_URL}/api/jobs/${job.id}`,
          {
            headers: {
              'Authorization': `Bearer ${testData.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.status === 200 || response.status === 204) {
          deletedJobs.push(job);
          console.log('   ✅ Deleted successfully');
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('   ⚠️  Job not found (may be already deleted)');
          deletedJobs.push(job); // Consider it cleaned up
        } else {
          console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
          failedJobs.push(job);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully deleted: ${deletedJobs.length} jobs`);
    console.log(`❌ Failed to delete: ${failedJobs.length} jobs`);
    console.log('='.repeat(60));
    
    if (failedJobs.length > 0) {
      console.log('\n❌ Failed Jobs:');
      failedJobs.forEach(job => {
        console.log(`   - ${job.title} (ID: ${job.id})`);
      });
    }
    
    // If all jobs deleted successfully, remove the data file
    if (failedJobs.length === 0) {
      fs.unlinkSync(dataFile);
      console.log('\n💾 Test data file removed.');
      
      // Try to remove empty directory
      const testDataDir = path.dirname(dataFile);
      try {
        if (fs.readdirSync(testDataDir).length === 0) {
          fs.rmdirSync(testDataDir);
        }
      } catch (e) {
        // Directory not empty or other issue, ignore
      }
    } else {
      // Update the data file with remaining jobs
      testData.jobs = failedJobs;
      fs.writeFileSync(dataFile, JSON.stringify(testData, null, 2));
      console.log('\n💾 Test data file updated with remaining jobs.');
    }
    
    console.log('\n✨ Cleanup completed!\n');
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupTestJobs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestJobs };
