const { By } = require('selenium-webdriver');
const { createDriver, config, takeScreenshot, waitForElement } = require('./setup');

/**
 * Diagnostic Test - Understand the Application Flow
 */
async function diagnoseApp() {
  console.log('\n🔍 Starting Application Diagnosis...\n');
  
  let driver;
  
  try {
    driver = await createDriver();
    
    // Step 1: Navigate to homepage
    console.log('1️⃣ Navigating to homepage...');
    await driver.get(config.baseUrl);
    await driver.sleep(2000);
    await takeScreenshot(driver, 'diag_01_homepage');
    
    const pageSource = await driver.getPageSource();
    console.log('   ✓ Page loaded');
    console.log(`   ✓ Page HTML length: ${pageSource.length} characters`);
    
    // Step 2: Check page structure
    console.log('\n2️⃣ Checking page structure...');
    const bodyText = await driver.findElement(By.css('body')).getText();
    console.log('   First 200 characters of page:', bodyText.substring(0, 200));
    
    // Step 3: Look for auth form
    console.log('\n3️⃣ Looking for authentication form...');
    try {
      const forms = await driver.findElements(By.css('form'));
      console.log(`   ✓ Found ${forms.length} form(s)`);
      
      const inputs = await driver.findElements(By.css('input'));
      console.log(`   ✓ Found ${inputs.length} input field(s)`);
      
      for (let i = 0; i < Math.min(inputs.length, 10); i++) {
        const type = await inputs[i].getAttribute('type');
        const name = await inputs[i].getAttribute('name');
        const placeholder = await inputs[i].getAttribute('placeholder');
        console.log(`     - Input ${i + 1}: type="${type}", name="${name}", placeholder="${placeholder}"`);
      }
    } catch (e) {
      console.log('   ✗ Error checking forms:', e.message);
    }
    
    // Step 4: Look for buttons
    console.log('\n4️⃣ Looking for buttons...');
    try {
      const buttons = await driver.findElements(By.css('button'));
      console.log(`   ✓ Found ${buttons.length} button(s)`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].getText();
        const type = await buttons[i].getAttribute('type');
        console.log(`     - Button ${i + 1}: text="${text}", type="${type}"`);
      }
    } catch (e) {
      console.log('   ✗ Error checking buttons:', e.message);
    }
    
    // Step 5: Try to find signup toggle
    console.log('\n5️⃣ Looking for signup toggle...');
    try {
      const signupToggle = await driver.findElement(By.xpath("//button[contains(text(), 'Sign up')]"));
      console.log('   ✓ Found signup toggle button');
      await signupToggle.click();
      await driver.sleep(1000);
      await takeScreenshot(driver, 'diag_02_after_signup_toggle');
      console.log('   ✓ Clicked signup toggle');
      
      // Check inputs after toggle
      const inputsAfter = await driver.findElements(By.css('input'));
      console.log(`   ✓ After toggle: ${inputsAfter.length} input field(s)`);
    } catch (e) {
      console.log('   ⚠ Could not find/click signup toggle:', e.message);
    }
    
    // Step 6: Try to fill signup form
    console.log('\n6️⃣ Attempting to fill signup form...');
    try {
      const nameInput = await driver.findElement(By.css('input[name="name"]'));
      await nameInput.clear();
      await nameInput.sendKeys('Test User');
      console.log('   ✓ Filled name field');
      
      const typeSelect = await driver.findElement(By.css('select[name="type"]'));
      await typeSelect.sendKeys('client');
      console.log('   ✓ Selected account type');
      
      const emailInput = await driver.findElement(By.css('input[name="email"]'));
      await emailInput.clear();
      await emailInput.sendKeys('test@example.com');
      console.log('   ✓ Filled email field');
      
      const passwordInput = await driver.findElement(By.css('input[name="password"]'));
      await passwordInput.clear();
      await passwordInput.sendKeys('Test123!@#');
      console.log('   ✓ Filled password field');
      
      await takeScreenshot(driver, 'diag_03_form_filled');
      
    } catch (e) {
      console.log('   ✗ Error filling form:', e.message);
      await takeScreenshot(driver, 'diag_03_form_error');
    }
    
    // Step 7: Look for submit button
    console.log('\n7️⃣ Looking for submit button...');
    try {
      const submitButton = await driver.findElement(By.xpath("//button[contains(text(), 'Create Account')]"));
      console.log('   ✓ Found submit button');
      await submitButton.click();
      console.log('   ✓ Clicked submit button');
      
      await driver.sleep(3000);
      await takeScreenshot(driver, 'diag_04_after_submit');
      
      // Check for errors
      const pageTextAfter = await driver.findElement(By.css('body')).getText();
      if (pageTextAfter.includes('error') || pageTextAfter.includes('invalid') || pageTextAfter.includes('failed')) {
        console.log('   ⚠ Possible error message on page');
        console.log('   Page text sample:', pageTextAfter.substring(0, 300));
      }
      
      // Check localStorage
      const token = await driver.executeScript("return localStorage.getItem('token');");
      console.log('   Token in localStorage:', token ? `Yes (${token.substring(0, 20)}...)` : 'No');
      
      // Check current URL
      const currentUrl = await driver.getCurrentUrl();
      console.log('   Current URL:', currentUrl);
      
      // Check for auth user
      const user = await driver.executeScript("return localStorage.getItem('user');");
      console.log('   User in localStorage:', user ? 'Yes' : 'No');
      
    } catch (e) {
      console.log('   ✗ Error with submit:', e.message);
      await takeScreenshot(driver, 'diag_04_submit_error');
    }
    
    console.log('\n✅ Diagnosis complete! Check screenshots in tests/regression/screenshots/\n');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// Run diagnosis
if (require.main === module) {
  diagnoseApp()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { diagnoseApp };
