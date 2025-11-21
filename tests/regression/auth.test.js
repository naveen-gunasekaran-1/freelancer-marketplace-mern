const { By, Key, until } = require('selenium-webdriver');
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
 * Authentication Regression Tests
 * Tests: Signup, Login, Logout, Token Persistence, Invalid Credentials
 */
async function runAuthTests() {
  console.log('\n🔐 Starting Authentication Regression Tests...\n');
  
  let driver;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  try {
    driver = await createDriver();
    
    // Test 1: User Signup
    try {
      logStep('Test 1: User Signup');
      await testSignup(driver);
      results.passed++;
      results.tests.push({ name: 'Signup', status: 'PASSED' });
    } catch (error) {
      logError('Signup test failed', error);
      await takeScreenshot(driver, 'signup_failed');
      results.failed++;
      results.tests.push({ name: 'Signup', status: 'FAILED', error: error.message });
    }
    
    // Clear storage before next test
    await clearLocalStorage(driver);
    
    // Test 2: User Login
    try {
      logStep('Test 2: User Login');
      await testLogin(driver);
      results.passed++;
      results.tests.push({ name: 'Login', status: 'PASSED' });
    } catch (error) {
      logError('Login test failed', error);
      await takeScreenshot(driver, 'login_failed');
      results.failed++;
      results.tests.push({ name: 'Login', status: 'FAILED', error: error.message });
    }
    
    // Test 3: Token Persistence
    try {
      logStep('Test 3: Token Persistence After Refresh');
      await testTokenPersistence(driver);
      results.passed++;
      results.tests.push({ name: 'Token Persistence', status: 'PASSED' });
    } catch (error) {
      logError('Token persistence test failed', error);
      await takeScreenshot(driver, 'token_persistence_failed');
      results.failed++;
      results.tests.push({ name: 'Token Persistence', status: 'FAILED', error: error.message });
    }
    
    // Test 4: Logout
    try {
      logStep('Test 4: User Logout');
      await testLogout(driver);
      results.passed++;
      results.tests.push({ name: 'Logout', status: 'PASSED' });
    } catch (error) {
      logError('Logout test failed', error);
      await takeScreenshot(driver, 'logout_failed');
      results.failed++;
      results.tests.push({ name: 'Logout', status: 'FAILED', error: error.message });
    }
    
    // Test 5: Invalid Credentials
    try {
      logStep('Test 5: Invalid Login Credentials');
      await testInvalidLogin(driver);
      results.passed++;
      results.tests.push({ name: 'Invalid Login', status: 'PASSED' });
    } catch (error) {
      logError('Invalid login test failed', error);
      await takeScreenshot(driver, 'invalid_login_failed');
      results.failed++;
      results.tests.push({ name: 'Invalid Login', status: 'FAILED', error: error.message });
    }
    
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
  
  printResults('Authentication Tests', results);
  return results;
}

/**
 * Test user signup flow
 */
async function testSignup(driver) {
  const testData = generateTestData();
  
  // Navigate to homepage
  await driver.get(config.baseUrl);
  await driver.sleep(1000);
  
  // Check if AuthForm is already visible or click to open it
  try {
    // Try to find the toggle button to switch to signup
    const toggleButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign up')]"), 3000);
    await toggleButton.click();
  } catch (e) {
    // AuthForm might not be open, do nothing and continue
  }
  await driver.sleep(500);
  
  // Fill signup form
  const nameInput = await waitForElement(driver, By.css('input[name="name"], input[id="name"]'));
  await nameInput.clear();
  await nameInput.sendKeys(testData.name);
  
  // Select account type (default is freelancer, but let's be explicit)
  const typeSelect = await waitForElement(driver, By.css('select[name="type"], select[id="type"]'));
  await typeSelect.sendKeys('client'); // Use 'client' to avoid skills field requirement
  
  const emailInput = await waitForElement(driver, By.css('input[name="email"], input[id="email"]'));
  await emailInput.clear();
  await emailInput.sendKeys(testData.email);
  
  const passwordInput = await waitForElement(driver, By.css('input[name="password"], input[id="password"]'));
  await passwordInput.clear();
  await passwordInput.sendKeys(testData.password);
  
  // Submit form
  await takeScreenshot(driver, 'before_signup');
  const submitButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Create Account')]"));
  await submitButton.click();
  
  // Wait for successful signup (longer timeout for API response)
  await driver.sleep(3000);
  
  // Take screenshot to see result
  await takeScreenshot(driver, 'after_signup_submit');
  
  // Check for error messages first
  const pageText = await driver.findElement(By.css('body')).getText();
  if (pageText.includes('already exists') || pageText.includes('already registered')) {
    console.log('  ⚠ User already exists, attempting login instead');
    // Try logging in with these credentials
    await driver.get(config.baseUrl);
    await driver.sleep(1000);
    
    const emailInput = await waitForElement(driver, By.css('input[type="email"]'));
    await emailInput.clear();
    await emailInput.sendKeys(testData.email);
    
    const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
    await passwordInput.clear();
    await passwordInput.sendKeys(testData.password);
    
    const loginButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign In')]"));
    await loginButton.click();
    await driver.sleep(3000);
  }
  
  // Verify token is stored
  const token = await getLocalStorageItem(driver, 'token');
  if (!token) {
    await takeScreenshot(driver, 'signup_no_token');
    throw new Error('JWT token not found in localStorage after signup');
  }
  
  await takeScreenshot(driver, 'after_signup');
  console.log(`  ✓ User created: ${testData.email}`);
  
  // Store credentials for later tests
  global.testUser = testData;
}

/**
 * Test user login flow
 */
async function testLogin(driver) {
  if (!global.testUser) {
    throw new Error('No test user available. Run signup test first.');
  }
  
  const testData = global.testUser;
  
  // Navigate to homepage
  await driver.get(config.baseUrl);
  await driver.sleep(1000);
  
  // AuthForm should be visible by default (Sign In form)
  // If we see "Sign up" toggle, we're on the right form
  await driver.sleep(500);
  
  // Fill login form
  const emailInput = await waitForElement(driver, By.css('input[type="email"], input[placeholder*="email" i]'));
  await emailInput.clear();
  await emailInput.sendKeys(testData.email);
  
  const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
  await passwordInput.clear();
  await passwordInput.sendKeys(testData.password);
  
  // Submit form
  await takeScreenshot(driver, 'before_login');
  const submitButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign In')]"));
  await submitButton.click();
  
  // Wait for successful login (longer timeout)
  await driver.sleep(3000);
  
  // Verify token is stored
  const token = await getLocalStorageItem(driver, 'token');
  if (!token) {
    await takeScreenshot(driver, 'login_no_token');
    throw new Error('JWT token not found in localStorage after login');
  }
  
  await takeScreenshot(driver, 'after_login');
  console.log(`  ✓ User logged in: ${testData.email}`);
}

/**
 * Test token persistence after page refresh
 */
async function testTokenPersistence(driver) {
  // Get token before refresh
  const tokenBefore = await getLocalStorageItem(driver, 'token');
  if (!tokenBefore) {
    throw new Error('No token found before refresh');
  }
  
  // Refresh page
  await driver.navigate().refresh();
  await driver.sleep(2000);
  
  // Verify token still exists
  const tokenAfter = await getLocalStorageItem(driver, 'token');
  if (!tokenAfter) {
    throw new Error('Token lost after page refresh');
  }
  
  if (tokenBefore !== tokenAfter) {
    throw new Error('Token changed after refresh');
  }
  
  console.log('  ✓ Token persisted after refresh');
}

/**
 * Test user logout
 */
async function testLogout(driver) {
  // Find and click logout button (usually in header or profile menu)
  try {
    // Look for user menu button (likely shows user name or icon)
    const profileMenu = await waitForElement(driver, By.css('button[class*="user"], button:has(svg)'), 5000);
    await profileMenu.click();
    await driver.sleep(500);
    
    // Click logout (look for LogOut icon or text)
    const logoutButton = await waitForElement(driver, By.xpath("//button[contains(., 'Log Out') or contains(., 'Logout')]"));
    await logoutButton.click();
    await driver.sleep(1000);
    
  } catch (e) {
    console.log('  ⚠ Could not find logout button, user might not be logged in');
    throw new Error('Logout button not found');
  }
  
  // Verify token is removed
  const token = await getLocalStorageItem(driver, 'token');
  if (token) {
    throw new Error('Token still exists after logout');
  }
  
  await takeScreenshot(driver, 'after_logout');
  console.log('  ✓ User logged out successfully');
}

/**
 * Test invalid login credentials
 */
async function testInvalidLogin(driver) {
  // Navigate to homepage
  await driver.get(config.baseUrl);
  await driver.sleep(1000);
  
  // Form should be visible by default
  await driver.sleep(500);
  
  // Fill with invalid credentials
  const emailInput = await waitForElement(driver, By.css('input[type="email"], input[placeholder*="email" i]'));
  await emailInput.sendKeys('invalid@example.com');
  
  const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
  await passwordInput.sendKeys('wrongpassword');
  
  // Submit form
  const submitButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign In')]"));
  await submitButton.click();
  await driver.sleep(1500);
  
  // Verify error message appears
  try {
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Invalid') or contains(text(), 'incorrect') or contains(text(), 'failed')]")), 3000);
    console.log('  ✓ Error message displayed for invalid credentials');
  } catch (e) {
    // Check if still on login page (not redirected)
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl === config.baseUrl) {
      throw new Error('Accepted invalid credentials');
    }
  }
  
  // Verify no token is stored
  const token = await getLocalStorageItem(driver, 'token');
  if (token) {
    throw new Error('Token stored despite invalid credentials');
  }
  
  await takeScreenshot(driver, 'invalid_login');
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
  runAuthTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runAuthTests };
