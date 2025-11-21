const { runAuthTests } = require('./auth.test');
const { runJobTests } = require('./jobs.test');
const { runMessagingTests } = require('./messaging.test');

/**
 * Master Test Runner
 * Executes all regression test suites and generates summary report
 */
async function runAllTests() {
  console.log('\n🚀 Starting Selenium Regression Test Suite\n');
  console.log('='.repeat(60));
  console.log('Freelancer Marketplace - Automated Regression Testing');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  const allResults = {
    auth: null,
    jobs: null,
    messaging: null,
  };
  
  // Run Authentication Tests
  try {
    allResults.auth = await runAuthTests();
  } catch (error) {
    console.error('❌ Authentication test suite crashed:', error.message);
    allResults.auth = { passed: 0, failed: 1, tests: [{ name: 'Auth Suite', status: 'CRASHED', error: error.message }] };
  }
  
  console.log('\n' + '─'.repeat(60) + '\n');
  
  // Run Job Posting Tests
  try {
    allResults.jobs = await runJobTests();
  } catch (error) {
    console.error('❌ Job posting test suite crashed:', error.message);
    allResults.jobs = { passed: 0, failed: 1, tests: [{ name: 'Jobs Suite', status: 'CRASHED', error: error.message }] };
  }
  
  console.log('\n' + '─'.repeat(60) + '\n');
  
  // Run Messaging Tests
  try {
    allResults.messaging = await runMessagingTests();
  } catch (error) {
    console.error('❌ Messaging test suite crashed:', error.message);
    allResults.messaging = { passed: 0, failed: 1, tests: [{ name: 'Messaging Suite', status: 'CRASHED', error: error.message }] };
  }
  
  // Calculate totals
  const totalPassed = 
    (allResults.auth?.passed || 0) + 
    (allResults.jobs?.passed || 0) + 
    (allResults.messaging?.passed || 0);
  
  const totalFailed = 
    (allResults.auth?.failed || 0) + 
    (allResults.jobs?.failed || 0) + 
    (allResults.messaging?.failed || 0);
  
  const totalTests = totalPassed + totalFailed;
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
  
  // Generate final report
  printFinalReport(allResults, totalPassed, totalFailed, totalTests, passRate, duration);
  
  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

/**
 * Print comprehensive final report
 */
function printFinalReport(allResults, totalPassed, totalFailed, totalTests, passRate, duration) {
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log('\n🔐 Authentication Tests:');
  console.log(`   ✅ Passed: ${allResults.auth?.passed || 0}`);
  console.log(`   ❌ Failed: ${allResults.auth?.failed || 0}`);
  
  console.log('\n💼 Job Posting Tests:');
  console.log(`   ✅ Passed: ${allResults.jobs?.passed || 0}`);
  console.log(`   ❌ Failed: ${allResults.jobs?.failed || 0}`);
  
  console.log('\n💬 Messaging Tests:');
  console.log(`   ✅ Passed: ${allResults.messaging?.passed || 0}`);
  console.log(`   ❌ Failed: ${allResults.messaging?.failed || 0}`);
  
  console.log('\n' + '─'.repeat(60));
  console.log('📈 OVERALL SUMMARY:');
  console.log('─'.repeat(60));
  console.log(`   Total Tests:    ${totalTests}`);
  console.log(`   ✅ Passed:       ${totalPassed}`);
  console.log(`   ❌ Failed:       ${totalFailed}`);
  console.log(`   📊 Pass Rate:    ${passRate}%`);
  console.log(`   ⏱️  Duration:     ${duration}s`);
  console.log('='.repeat(60));
  
  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed successfully!\n');
  } else {
    console.log('\n⚠️  Some tests failed. Review the logs above for details.\n');
  }
  
  // Save report to file
  saveReportToFile(allResults, totalPassed, totalFailed, totalTests, passRate, duration);
}

/**
 * Save test report to file
 */
function saveReportToFile(allResults, totalPassed, totalFailed, totalTests, passRate, duration) {
  const fs = require('fs');
  const path = require('path');
  
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `test-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    summary: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      passRate: `${passRate}%`,
    },
    suites: {
      authentication: allResults.auth,
      jobs: allResults.jobs,
      messaging: allResults.messaging,
    },
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${reportPath}\n`);
}

// Run all tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
