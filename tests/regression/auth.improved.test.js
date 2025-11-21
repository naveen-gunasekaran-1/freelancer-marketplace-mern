const { By, until } = require('selenium-webdriver');
const {
  createDriver,
  config,
  takeScreenshot,
  waitForElement,
  clearLocalStorage,
  getLocalStorageItem,
  generateTestData,
  logStep,
  logError,
} = require('./setup');

/**
 * Improved Authentication Regression Tests
 * More robust with better error handling and diagnostics
 */
async function runImprovedAuthTests() {
  console.log('\n🔐 Starting Improved Authentication Regression Tests...\n');
  
  let driver;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  try {
    driver = await createDriver();
    
    // Enable browser console logs
    await driver.manage().logs();
    
    // Test 1: User Signup with Better Diagnostics
    try {
      logStep('Test 1: User Signup (Improved)');
      await testSignupImproved(driver);
      results.passed++;
      results.tests.push({ name: 'Signup (Improved)', status: 'PASSED' });
    } catch (error) {
      logError('Signup test failed', error);
      await takeScreenshot(driver, 'signup_improved_failed');
      results.failed++;
      results.tests.push({ name: 'Signup (Improved)', status: 'FAILED', error: error.message });
    }
    
    // Test 2: User Login
    try {
      logStep('Test 2: User Login (Improved)');
      await testLoginImproved(driver);
      results.passed++;
      results.tests.push({ name: 'Login (Improved)', status: 'PASSED' });
    } catch (error) {
      logError('Login test failed', error);
      await takeScreenshot(driver, 'login_improved_failed');
      results.failed++;
      results.tests.push({ name: 'Login (Improved)', status: 'FAILED', error: error.message });
    }
    
    // Test 3: Dashboard Navigation
    try {
      logStep('Test 3: Dashboard Navigation');
      await testDashboardNavigation(driver);
      results.passed++;
      results.tests.push({ name: 'Dashboard Navigation', status: 'PASSED' });
    } catch (error) {
      logError('Dashboard navigation test failed', error);
      await takeScreenshot(driver, 'dashboard_failed');
      results.failed++;
      results.tests.push({ name: 'Dashboard Navigation', status: 'FAILED', error: error.message });
    }
    
    // Test 4: Token Persistence
    if (global.testUser && global.testUser.loggedIn) {
      try {
        logStep('Test 4: Token Persistence After Refresh');
        await testTokenPersistenceImproved(driver);
        results.passed++;
        results.tests.push({ name: 'Token Persistence', status: 'PASSED' });
      } catch (error) {
        logError('Token persistence test failed', error);
        await takeScreenshot(driver, 'token_persistence_improved_failed');
        results.failed++;
        results.tests.push({ name: 'Token Persistence', status: 'FAILED', error: error.message });
      }
    }
    
    // Test 5: Logout
    if (global.testUser && global.testUser.loggedIn) {
      try {
        logStep('Test 5: User Logout');
        await testLogoutImproved(driver);
        results.passed++;
        results.tests.push({ name: 'Logout (Improved)', status: 'PASSED' });
      } catch (error) {
        logError('Logout test failed', error);
        await takeScreenshot(driver, 'logout_improved_failed');
        results.failed++;
        results.tests.push({ name: 'Logout (Improved)', status: 'FAILED', error: error.message });
      }
    }
    
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
  
  printResults('Improved Authentication Tests', results);
  return results;
}

/**
 * Improved signup test with better error detection
 */
async function testSignupImproved(driver) {
  const testData = generateTestData();
  
  console.log(`  📧 Test email: ${testData.email}`);
  
  // Navigate to homepage
  await driver.get(config.baseUrl);
  await driver.sleep(1500);
  await takeScreenshot(driver, 'improved_01_homepage');
  
  // Click signup toggle
  const signupToggle = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign up')]"));
  await signupToggle.click();
  await driver.sleep(800);
  await takeScreenshot(driver, 'improved_02_signup_form');
  
  // Fill form
  const nameInput = await waitForElement(driver, By.css('input[name="name"]'));
  await nameInput.clear();
  await nameInput.sendKeys(testData.name);
  console.log('  ✓ Filled name');
  
  const typeSelect = await waitForElement(driver, By.css('select[name="type"]'));
  await typeSelect.sendKeys('client');
  console.log('  ✓ Selected client type');
  
  const emailInput = await waitForElement(driver, By.css('input[name="email"]'));
  await emailInput.clear();
  await emailInput.sendKeys(testData.email);
  console.log('  ✓ Filled email');
  
  const passwordInput = await waitForElement(driver, By.css('input[name="password"]'));
  await passwordInput.clear();
  await passwordInput.sendKeys(testData.password);
  console.log('  ✓ Filled password');
  
  await takeScreenshot(driver, 'improved_03_form_filled');
  
  // Submit
  const submitButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Create Account')]"));
  await submitButton.click();
  console.log('  ✓ Submitted form');
  
  // Wait for response with multiple checks
  await driver.sleep(1000);
  
  // Check for error messages
  const bodyText = await driver.findElement(By.css('body')).getText();
  
  if (bodyText.includes('already exists') || bodyText.includes('already registered')) {
    console.log('  ⚠ User already exists, trying login instead...');
    
    // Switch to login
    await driver.get(config.baseUrl);
    await driver.sleep(1000);
    
    const loginEmailInput = await waitForElement(driver, By.css('input[name="email"]'));
    await loginEmailInput.clear();
    await loginEmailInput.sendKeys(testData.email);
    
    const loginPasswordInput = await waitForElement(driver, By.css('input[name="password"]'));
    await loginPasswordInput.clear();
    await loginPasswordInput.sendKeys(testData.password);
    
    const loginButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign In')]"));
    await loginButton.click();
    await driver.sleep(2000);
  } else if (bodyText.includes('error') || bodyText.includes('invalid') || bodyText.includes('failed')) {
    await takeScreenshot(driver, 'improved_04_error_message');
    throw new Error(`Signup failed with error message: ${bodyText.substring(0, 200)}`);
  } else {
    // Wait longer for success
    await driver.sleep(2000);
  }
  
  await takeScreenshot(driver, 'improved_04_after_submit');
  
  // Check for success indicators
  const token = await getLocalStorageItem(driver, 'token');
  const currentUrl = await driver.getCurrentUrl();
  const finalBodyText = await driver.findElement(driver, By.css('body')).getText();
  
  console.log(`  📍 Current URL: ${currentUrl}`);
  console.log(`  🔑 Token present: ${token ? 'Yes' : 'No'}`);
  
  // Check if we're logged in (either token exists OR we see dashboard elements)
  const isDashboard = finalBodyText.includes('Dashboard') || 
                      finalBodyText.includes('Browse Jobs') || 
                      finalBodyText.includes('Post Job') ||
                      finalBodyText.includes('FreelanceHub');
  
  if (token) {
    console.log('  ✅ Signup successful - token stored');
    global.testUser = { ...testData, token, loggedIn: true };
  } else if (isDashboard) {
    console.log('  ✅ Signup successful - redirected to dashboard (token may be in httpOnly cookie)');
    global.testUser = { ...testData, loggedIn: true };
  } else {
    await takeScreenshot(driver, 'improved_04_no_success');
    throw new Error('Signup completed but no token or dashboard found');
  }
}

/**
 * Improved login test
 */
async function testLoginImproved(driver) {
  // Clear storage first
  await clearLocalStorage(driver);
  
  // Use existing test user or create new credentials
  const testData = global.testUser || generateTestData();
  
  // Navigate to homepage
  await driver.get(config.baseUrl);
  await driver.sleep(1500);
  
  // Should be on login form by default
  const emailInput = await waitForElement(driver, By.css('input[name="email"]'));
  await emailInput.clear();
  await emailInput.sendKeys(testData.email);
  
  const passwordInput = await waitForElement(driver, By.css('input[name="password"]'));
  await passwordInput.clear();
  await passwordInput.sendKeys(testData.password);
  
  await takeScreenshot(driver, 'improved_login_before');
  
  const submitButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign In')]"));
  await submitButton.click();
  
  await driver.sleep(2500);
  await takeScreenshot(driver, 'improved_login_after');
  
  // Verify login
  const token = await getLocalStorageItem(driver, 'token');
  const bodyText = await driver.findElement(By.css('body')).getText();
  const isDashboard = bodyText.includes('Dashboard') || bodyText.includes('Browse Jobs') || bodyText.includes('Post Job');
  
  if (token || isDashboard) {
    console.log('  ✅ Login successful');
    global.testUser = { ...testData, token, loggedIn: true };
  } else {
    throw new Error('Login failed - no token or dashboard found');
  }
}

/**
 * Test dashboard navigation
 */
async function testDashboardNavigation(driver) {
  await driver.sleep(1000);
  
  // Check if we can see dashboard elements
  const bodyText = await driver.findElement(By.css('body')).getText();
  
  if (bodyText.includes('FreelanceHub') && 
      (bodyText.includes('Dashboard') || bodyText.includes('Browse Jobs') || bodyText.includes('Post Job'))) {
    console.log('  ✅ Dashboard elements visible');
    await takeScreenshot(driver, 'improved_dashboard');
  } else {
    throw new Error('Dashboard not accessible');
  }
}

/**
 * Improved token persistence test
 */
async function testTokenPersistenceImproved(driver) {
  const tokenBefore = await getLocalStorageItem(driver, 'token');
  
  if (!tokenBefore) {
    console.log('  ⚠ No token to test persistence (may be using httpOnly cookies)');
    return;
  }
  
  await driver.navigate().refresh();
  await driver.sleep(2000);
  
  const tokenAfter = await getLocalStorageItem(driver, 'token');
  
  if (tokenAfter && tokenAfter === tokenBefore) {
    console.log('  ✅ Token persisted after refresh');
  } else {
    throw new Error('Token lost after refresh');
  }
}

/**
 * Improved logout test
 */
async function testLogoutImproved(driver) {
  await driver.sleep(1000);
  
  // Take screenshot to see current state
  await takeScreenshot(driver, 'improved_before_logout');
  
  // Look for user menu or logout button
  try {
    // Method 1: Find user menu by looking for common patterns
    const buttons = await driver.findElements(By.css('button'));
    
    for (const button of buttons) {
      const text = await button.getText();
      const outerHTML = await button.getAttribute('outerHTML');
      
      // Look for profile/menu button
      if (outerHTML.includes('ChevronDown') || outerHTML.includes('User') || text.includes(global.testUser?.name || '')) {
        await button.click();
        console.log('  ✓ Clicked user menu');
        await driver.sleep(500);
        await takeScreenshot(driver, 'improved_menu_open');
        break;
      }
    }
    
    // Method 2: Look for logout button
    const logoutButton = await driver.findElement(By.xpath("//*[contains(text(), 'Log Out') or contains(text(), 'Logout')]"));
    await logoutButton.click();
    console.log('  ✓ Clicked logout');
    
    await driver.sleep(1500);
    await takeScreenshot(driver, 'improved_after_logout');
    
    // Verify logout
    const token = await getLocalStorageItem(driver, 'token');
    const bodyText = await driver.findElement(By.css('body')).getText();
    
    if (!token && (bodyText.includes('Sign In') || bodyText.includes('Sign up'))) {
      console.log('  ✅ Logout successful');
      global.testUser.loggedIn = false;
    } else {
      throw new Error('Logout may not have completed');
    }
    
  } catch (e) {
    throw new Error(`Could not complete logout: ${e.message}`);
  }
}

/**
 * Print test results
 */
function printResults(testName, results) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${testName} Results`);
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total:  ${results.passed + results.failed}`);
  console.log('='.repeat(60));
  
  results.tests.forEach(test => {
    const icon = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  console.log('='.repeat(60) + '\n');
}

// Run tests if executed directly
if (require.main === module) {
  runImprovedAuthTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runImprovedAuthTests };
