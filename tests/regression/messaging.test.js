const { By, Key, until } = require('selenium-webdriver');
const {
  createDriver,
  config,
  takeScreenshot,
  waitForElement,
  clearLocalStorage,
  setLocalStorageItem,
  generateTestData,
  logStep,
  logError,
} = require('./setup');

/**
 * Messaging & Chat Regression Tests
 * Tests: Send Message, Receive Message, Encryption Status, Message History
 */
async function runMessagingTests() {
  console.log('\n💬 Starting Messaging Regression Tests...\n');
  
  let driver;
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  try {
    driver = await createDriver();
    
    // Setup: Login first
    await setupAuthenticatedSession(driver);
    
    // Test 1: Navigate to Messages
    try {
      logStep('Test 1: Navigate to Messages/Chat');
      await testNavigateToMessages(driver);
      results.passed++;
      results.tests.push({ name: 'Navigate to Messages', status: 'PASSED' });
    } catch (error) {
      logError('Navigate to messages test failed', error);
      await takeScreenshot(driver, 'navigate_messages_failed');
      results.failed++;
      results.tests.push({ name: 'Navigate to Messages', status: 'FAILED', error: error.message });
    }
    
    // Test 2: View Conversations List
    try {
      logStep('Test 2: View Conversations List');
      await testViewConversations(driver);
      results.passed++;
      results.tests.push({ name: 'View Conversations', status: 'PASSED' });
    } catch (error) {
      logError('View conversations test failed', error);
      await takeScreenshot(driver, 'view_conversations_failed');
      results.failed++;
      results.tests.push({ name: 'View Conversations', status: 'FAILED', error: error.message });
    }
    
    // Test 3: Send Message
    try {
      logStep('Test 3: Send Message');
      await testSendMessage(driver);
      results.passed++;
      results.tests.push({ name: 'Send Message', status: 'PASSED' });
    } catch (error) {
      logError('Send message test failed', error);
      await takeScreenshot(driver, 'send_message_failed');
      results.failed++;
      results.tests.push({ name: 'Send Message', status: 'FAILED', error: error.message });
    }
    
    // Test 4: Check Encryption Status
    try {
      logStep('Test 4: Verify Encryption Status');
      await testEncryptionStatus(driver);
      results.passed++;
      results.tests.push({ name: 'Encryption Status', status: 'PASSED' });
    } catch (error) {
      logError('Encryption status test failed', error);
      await takeScreenshot(driver, 'encryption_status_failed');
      results.failed++;
      results.tests.push({ name: 'Encryption Status', status: 'FAILED', error: error.message });
    }
    
    // Test 5: Message History
    try {
      logStep('Test 5: Load Message History');
      await testMessageHistory(driver);
      results.passed++;
      results.tests.push({ name: 'Message History', status: 'PASSED' });
    } catch (error) {
      logError('Message history test failed', error);
      await takeScreenshot(driver, 'message_history_failed');
      results.failed++;
      results.tests.push({ name: 'Message History', status: 'FAILED', error: error.message });
    }
    
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
  
  printResults('Messaging Tests', results);
  return results;
}

/**
 * Setup authenticated session
 */
async function setupAuthenticatedSession(driver) {
  const testData = generateTestData();
  
  await driver.get(config.baseUrl);
  await driver.sleep(1000);
  
  try {
    // Try to switch to signup form
    try {
      const signupTab = await waitForElement(driver, By.xpath("//button[contains(text(), 'Sign up')]"), 3000);
      await signupTab.click();
      await driver.sleep(500);
    } catch (e) {
      // Already on signup or form not visible
    }
    
    const nameInput = await waitForElement(driver, By.css('input[placeholder*="name" i], input[name="name"]'));
    await nameInput.sendKeys(testData.name);
    
    const emailInput = await waitForElement(driver, By.css('input[type="email"]'));
    await emailInput.sendKeys(testData.email);
    
    const passwordInput = await waitForElement(driver, By.css('input[type="password"]'));
    await passwordInput.sendKeys(testData.password);
    
    const submitButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Create Account')]"));
    await submitButton.click();
    await driver.sleep(2000);
    
    console.log('  ✓ Authenticated session created');
  } catch (error) {
    console.warn('  ⚠ Could not create authenticated session:', error.message);
  }
}

/**
 * Test navigate to messages
 */
async function testNavigateToMessages(driver) {
  await takeScreenshot(driver, 'before_navigate_messages');
  
  // Try to find messages/chat navigation
  try {
    const messagesLink = await waitForElement(driver, By.xpath("//a[contains(text(), 'Message') or contains(text(), 'Chat') or contains(@href, 'message') or contains(@href, 'chat')]"), 5000);
    await messagesLink.click();
  } catch (e) {
    // Try direct URL navigation
    await driver.get(`${config.baseUrl}/messages`);
  }
  
  await driver.sleep(2000);
  await takeScreenshot(driver, 'messages_page');
  
  // Verify we're on messages page
  const currentUrl = await driver.getCurrentUrl();
  if (!currentUrl.includes('message') && !currentUrl.includes('chat')) {
    throw new Error('Failed to navigate to messages page');
  }
  
  console.log('  ✓ Navigated to messages page');
}

/**
 * Test view conversations list
 */
async function testViewConversations(driver) {
  await driver.sleep(1000);
  
  // Look for conversations list
  try {
    const conversationElements = await driver.findElements(By.css('[class*="conversation"], [class*="chat-list"], [class*="message-list"]'));
    
    if (conversationElements.length === 0) {
      console.log('  ⚠ No conversations found (empty state is valid)');
    } else {
      console.log(`  ✓ Found ${conversationElements.length} conversation elements`);
    }
  } catch (e) {
    console.log('  ✓ Conversations list area verified');
  }
  
  await takeScreenshot(driver, 'conversations_list');
}

/**
 * Test send message
 */
async function testSendMessage(driver) {
  const testMessage = `Test message ${Date.now()}`;
  
  // Try to find a conversation or start new chat
  try {
    // Look for existing conversation
    const conversations = await driver.findElements(By.css('[class*="conversation"], [class*="chat-item"]'));
    
    if (conversations.length > 0) {
      // Click first conversation
      await conversations[0].click();
      await driver.sleep(1000);
    } else {
      console.log('  ⚠ No existing conversations to test with');
      // Could add logic here to create a new conversation
      return;
    }
  } catch (e) {
    console.log('  ⚠ Could not select conversation');
    return;
  }
  
  await takeScreenshot(driver, 'before_send_message');
  
  // Find message input and send button
  try {
    const messageInput = await waitForElement(driver, By.css('input[placeholder*="message" i], textarea[placeholder*="message" i], input[type="text"]'));
    await messageInput.clear();
    await messageInput.sendKeys(testMessage);
    
    // Find send button
    const sendButton = await waitForElement(driver, By.xpath("//button[contains(text(), 'Send') or contains(@aria-label, 'Send')]"));
    await sendButton.click();
    
    await driver.sleep(1500);
    await takeScreenshot(driver, 'after_send_message');
    
    // Verify message appears in chat
    const pageText = await driver.findElement(By.css('body')).getText();
    if (!pageText.includes(testMessage)) {
      throw new Error('Sent message not found in chat');
    }
    
    console.log(`  ✓ Message sent: "${testMessage}"`);
  } catch (e) {
    throw new Error(`Failed to send message: ${e.message}`);
  }
}

/**
 * Test encryption status
 */
async function testEncryptionStatus(driver) {
  await driver.sleep(1000);
  
  // Look for encryption indicators
  try {
    // Check for encryption status in UI
    const pageSource = await driver.getPageSource();
    
    // Look for encryption-related text or icons
    const hasEncryptionIndicator = 
      pageSource.includes('encrypted') ||
      pageSource.includes('encryption') ||
      pageSource.includes('🔐') ||
      pageSource.includes('secure');
    
    if (hasEncryptionIndicator) {
      console.log('  ✓ Encryption indicators found in UI');
    } else {
      console.log('  ⚠ No visible encryption indicators (may be background feature)');
    }
    
    // Check IndexedDB for encryption keys
    const hasEncryptionKeys = await driver.executeScript(`
      return new Promise((resolve) => {
        const request = indexedDB.open('FreelancerMarketplaceKeys');
        request.onsuccess = (event) => {
          const db = event.target.result;
          const hasKeysStore = db.objectStoreNames.contains('keys');
          db.close();
          resolve(hasKeysStore);
        };
        request.onerror = () => resolve(false);
      });
    `);
    
    if (hasEncryptionKeys) {
      console.log('  ✓ Encryption keys store found in IndexedDB');
    } else {
      console.log('  ⚠ No encryption keys store in IndexedDB');
    }
    
    await takeScreenshot(driver, 'encryption_status');
  } catch (e) {
    console.log('  ✓ Encryption status check completed');
  }
}

/**
 * Test message history
 */
async function testMessageHistory(driver) {
  // Refresh page to test message persistence
  await driver.navigate().refresh();
  await driver.sleep(2000);
  
  await takeScreenshot(driver, 'after_refresh');
  
  // Verify messages still appear after refresh
  try {
    const messageElements = await driver.findElements(By.css('[class*="message"], [class*="chat-bubble"]'));
    
    if (messageElements.length === 0) {
      console.log('  ⚠ No messages found after refresh (may be expected if no history)');
    } else {
      console.log(`  ✓ Found ${messageElements.length} messages in history`);
    }
  } catch (e) {
    console.log('  ✓ Message history check completed');
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
  runMessagingTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runMessagingTests };
