const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

/**
 * Test Configuration
 */
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3001',
  implicitWait: 10000,
  pageLoadTimeout: 30000,
  screenshotDir: './tests/regression/screenshots',
  headless: process.env.HEADLESS === 'true',
};

/**
 * Create a new WebDriver instance
 * @returns {Promise<import('selenium-webdriver').WebDriver>}
 */
async function createDriver() {
  const options = new chrome.Options();
  
  if (config.headless) {
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
  }
  
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-blink-features=AutomationControlled');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  await driver.manage().setTimeouts({
    implicit: config.implicitWait,
    pageLoad: config.pageLoadTimeout,
  });
  
  return driver;
}

/**
 * Take a screenshot
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string} filename
 */
async function takeScreenshot(driver, filename) {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(config.screenshotDir)) {
    fs.mkdirSync(config.screenshotDir, { recursive: true });
  }
  
  const screenshot = await driver.takeScreenshot();
  const filepath = path.join(config.screenshotDir, `${filename}_${Date.now()}.png`);
  fs.writeFileSync(filepath, screenshot, 'base64');
  console.log(`📸 Screenshot saved: ${filepath}`);
}

/**
 * Wait for element to be visible and enabled
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {import('selenium-webdriver').By} locator
 * @param {number} timeout
 */
async function waitForElement(driver, locator, timeout = 10000) {
  const { until } = require('selenium-webdriver');
  const element = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  await driver.wait(until.elementIsEnabled(element), timeout);
  return element;
}

/**
 * Clear localStorage
 * @param {import('selenium-webdriver').WebDriver} driver
 */
async function clearLocalStorage(driver) {
  await driver.executeScript('localStorage.clear();');
}

/**
 * Get localStorage value
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string} key
 */
async function getLocalStorageItem(driver, key) {
  return await driver.executeScript(`return localStorage.getItem('${key}');`);
}

/**
 * Set localStorage value
 * @param {import('selenium-webdriver').WebDriver} driver
 * @param {string} key
 * @param {string} value
 */
async function setLocalStorageItem(driver, key, value) {
  await driver.executeScript(`localStorage.setItem('${key}', '${value}');`);
}

/**
 * Generate random test data
 */
function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test_${timestamp}@example.com`,
    password: 'Test123!@#',
    name: `Test User ${timestamp}`,
    username: `testuser_${timestamp}`,
  };
}

/**
 * Log test step
 * @param {string} message
 */
function logStep(message) {
  console.log(`\n✓ ${message}`);
}

/**
 * Log test error
 * @param {string} message
 * @param {Error} error
 */
function logError(message, error) {
  console.error(`\n✗ ${message}`);
  console.error(error);
}

module.exports = {
  config,
  createDriver,
  takeScreenshot,
  waitForElement,
  clearLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
  generateTestData,
  logStep,
  logError,
};
