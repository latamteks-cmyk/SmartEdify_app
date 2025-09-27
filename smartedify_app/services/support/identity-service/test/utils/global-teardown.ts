// Global teardown for Jest E2E tests
// This ensures all processes are properly closed after test execution

export default async (): Promise<void> => {
  console.log('🧹 Global teardown: Cleaning up processes...');
  
  // Force exit after a reasonable timeout
  const forceExitTimeout = setTimeout(() => {
    console.log('⚠️ Force exiting after timeout');
    process.exit(0);
  }, 5000); // 5 seconds timeout
  
  try {
    // Clean up any remaining open handles
    if (global.gc) {
      global.gc();
    }
    
    // Clear all timers
    const timers = (process as any)._getActiveHandles?.() || [];
    timers.forEach((timer: any) => {
      if (timer && typeof timer.close === 'function') {
        timer.close();
      }
    });
    
    clearTimeout(forceExitTimeout);
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Error during global teardown:', error);
    clearTimeout(forceExitTimeout);
  }
};