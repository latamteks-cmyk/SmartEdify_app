// Global setup for all E2E tests
import { TestConfigurationFactory, TestTimeoutManager, TEST_CONSTANTS } from './utils/test-configuration.factory';

// Global beforeAll for timeout management
beforeAll(async () => {
  console.log('🚀 Global test setup started');
  
  // Set Jest timeout
  jest.setTimeout(TEST_CONSTANTS.TEST_TIMEOUT);
  
  // Configure process timeout handlers
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception in tests:', error);
    TestTimeoutManager.clearAllTimeouts();
  });
  
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled rejection in tests:', reason);
    TestTimeoutManager.clearAllTimeouts();
  });
  
  console.log('✅ Global test setup completed');
}, TEST_CONSTANTS.SERVICE_INITIALIZATION_TIMEOUT);

// Global afterAll for cleanup
afterAll(async () => {
  console.log('🧹 Global test cleanup started');
  
  try {
    TestTimeoutManager.clearAllTimeouts();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Global test cleanup completed');
  } catch (error) {
    console.error('❌ Error during global cleanup:', error);
  }
}, TEST_CONSTANTS.MAX_CLEANUP_TIME);

describe('Test Setup (e2e)', () => {
  it('should pass basic setup test', () => {
    expect(true).toBe(true);
  });
});
