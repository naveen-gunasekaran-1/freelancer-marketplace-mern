# Selenium Regression Testing

Automated regression testing suite for the Freelancer Marketplace MERN application using Selenium WebDriver.

## 📋 Prerequisites

- Node.js v14 or higher
- Chrome browser installed
- Application running (both frontend and backend)
  - Backend: `http://localhost:3001`
  - Frontend: `http://localhost:5173`

## 🚀 Quick Start

### 1. Start the Application

```bash
# In project root, start both server and client
npm run dev
```

### 2. Create Test Data

```bash
# Create 10 sample jobs for testing
npm run test:jobs:create
```

### 3. Run All Tests

```bash
# Run all regression tests with browser visible
npm run test:regression

# Run all tests in headless mode (faster, no browser window)
npm run test:regression:headless
```

### 4. Run Individual Test Suites

```bash
# Authentication tests only
npm run test:regression:auth

# Improved authentication tests (better error handling)
npm run test:regression:auth:improved

# Diagnose application flow
npm run test:regression:diagnose

# Job posting tests only
npm run test:regression:jobs

# Messaging tests only
npm run test:regression:messaging
```

### 5. Clean Up Test Data

```bash
# Remove all test jobs created by the script
npm run test:jobs:cleanup
```

## 📁 Test Structure

```
tests/regression/
├── setup.js                 # Test utilities and configuration
├── auth.test.js             # Authentication regression tests
├── auth.improved.test.js    # Improved auth tests with better error handling
├── diagnose.js              # Application flow diagnostic tool
├── jobs.test.js             # Job posting regression tests
├── messaging.test.js        # Messaging & chat regression tests
├── createTestJobs.js        # Script to create 10 test jobs
├── cleanupTestJobs.js       # Script to remove test jobs
├── runAll.js                # Master test runner
├── screenshots/             # Auto-generated test screenshots
├── reports/                 # JSON test reports
└── test-data/               # Test job IDs for cleanup
```

## 🧪 Test Coverage

### Authentication Tests
- ✅ User Signup
- ✅ User Login
- ✅ Token Persistence (after page refresh)
- ✅ User Logout
- ✅ Invalid Login Credentials
- ✅ Dashboard Navigation (improved tests)

### Job Posting Tests
- ✅ Create Job Posting
- ✅ Search Jobs
- ✅ Filter Jobs
- ✅ View Job Details
- ✅ Edit Job Posting
- ✅ Test Data Creation (10 sample jobs)
- ✅ Test Data Cleanup

### Messaging Tests
- ✅ Navigate to Messages/Chat
- ✅ View Conversations List
- ✅ Send Message
- ✅ Verify Encryption Status (IndexedDB keys)
- ✅ Load Message History

### Diagnostic Tools
- ✅ Application Flow Diagnosis
- ✅ Form Element Detection
- ✅ Button Text Verification
- ✅ LocalStorage Inspection

## 📊 Test Data Management

### Creating Test Jobs

The `createTestJobs.js` script creates 10 diverse sample jobs for testing:

```bash
npm run test:jobs:create
```

**What it creates:**
- Full Stack MERN Developer ($5,000)
- Mobile App Developer - React Native ($4,500)
- Python Data Scientist for ML Project ($6,000)
- WordPress Theme Customization ($800)
- UI/UX Designer for SaaS Dashboard ($3,500)
- DevOps Engineer - AWS Infrastructure ($7,000)
- Content Writer - Tech Blog ($1,200)
- E-commerce Website with Stripe ($5,500)
- Blockchain Smart Contract Developer ($8,000)
- Video Editor for YouTube Channel ($2,000)

**Features:**
- Creates a test client user automatically
- Saves job IDs to `test-data/test-jobs.json` for cleanup
- Handles rate limiting with delays
- Provides detailed console feedback

### Cleaning Up Test Jobs

Remove all test jobs created by the script:

```bash
npm run test:jobs:cleanup
```

**What it does:**
- Reads job IDs from `test-data/test-jobs.json`
- Deletes each job via API
- Shows detailed progress and summary
- Removes the data file after successful cleanup
- Handles already-deleted jobs gracefully

## 📊 Test Reports

After running tests, reports are generated in two formats:

1. **Console Output**: Real-time test execution logs with pass/fail status
2. **JSON Report**: Detailed report saved to `tests/regression/reports/`
3. **Test Data File**: Job IDs saved to `tests/regression/test-data/`

### Sample Report Structure

```json
{
  "timestamp": "2025-11-19T10:30:00.000Z",
  "duration": "45.2s",
  "summary": {
    "total": 15,
    "passed": 14,
    "failed": 1,
    "passRate": "93.3%"
  },
  "suites": {
    "authentication": { "passed": 5, "failed": 0 },
    "jobs": { "passed": 4, "failed": 1 },
    "messaging": { "passed": 5, "failed": 0 }
  }
}
```

## 📸 Screenshots

Screenshots are automatically captured:
- Before and after critical actions
- When tests fail (for debugging)
- Saved to `tests/regression/screenshots/`

## ⚙️ Configuration

Edit `tests/regression/setup.js` to customize:

```javascript
const config = {
  baseUrl: 'http://localhost:5173',       // Frontend URL
  apiUrl: 'http://localhost:3001',        // Backend API URL
  implicitWait: 10000,                    // Wait timeout (ms)
  pageLoadTimeout: 30000,                 // Page load timeout (ms)
  screenshotDir: './screenshots',         // Screenshot directory
  headless: process.env.HEADLESS === 'true', // Headless mode
};
```

## 🔍 Debugging Failed Tests

When tests fail:

1. **Check Screenshots**: Review `screenshots/` for visual debugging
2. **Console Logs**: Look for detailed error messages in terminal
3. **Browser DevTools**: Run without headless mode to see browser actions
4. **Test Reports**: Review JSON reports for specific failure details

### Common Issues

**Issue: Tests can't find elements**
- Solution: Increase `implicitWait` timeout in `setup.js`
- Solution: Ensure application is fully loaded before running tests

**Issue: "Connection refused" errors**
- Solution: Verify both frontend and backend are running
- Solution: Check URLs in `config` match your setup

**Issue: ChromeDriver version mismatch**
- Solution: Update chromedriver: `npm install --save-dev chromedriver@latest`

## 🛠️ Extending Tests

### Add New Test Case

1. Open relevant test file (e.g., `auth.test.js`)
2. Create new test function:

```javascript
async function testNewFeature(driver) {
  // Navigate to page
  await driver.get(`${config.baseUrl}/feature`);
  
  // Interact with elements
  const button = await waitForElement(driver, By.css('button'));
  await button.click();
  
  // Assert expected behavior
  const result = await driver.findElement(By.id('result')).getText();
  if (!result.includes('success')) {
    throw new Error('Feature test failed');
  }
  
  console.log('  ✓ New feature tested successfully');
}
```

3. Add to test runner in main function
4. Run your new test

### Create New Test Suite

1. Create new file: `tests/regression/feature.test.js`
2. Follow pattern from existing test files
3. Export main function: `module.exports = { runFeatureTests };`
4. Import and call in `runAll.js`

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: Regression Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run dev &
      - run: sleep 10 # Wait for server to start
      - run: npm run test:regression:headless
```

## 🎯 Best Practices

1. **Run tests regularly**: After every major code change
2. **Keep tests independent**: Each test should work standalone
3. **Use descriptive names**: Test names should explain what they test
4. **Clean up data**: Reset test data between runs if needed
5. **Update selectors**: Keep element selectors current with UI changes
6. **Monitor test duration**: Optimize slow tests to maintain fast feedback

## 📝 Test Naming Convention

```
testAction → What the test does
testFeatureName → What feature is being tested
testExpectedBehavior → What should happen
```

Examples:
- `testSignup` - Tests signup functionality
- `testInvalidLogin` - Tests rejection of invalid credentials
- `testEncryptionStatus` - Verifies encryption is active

## 🤝 Contributing

When adding new tests:
1. Follow existing code structure and patterns
2. Add appropriate error handling and screenshots
3. Update this README with new test coverage
4. Ensure tests pass before committing

## 📄 License

Same as main project license.
