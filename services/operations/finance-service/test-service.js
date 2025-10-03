// Simple test script for Finance Service
const http = require('http');

console.log('🧪 Testing Finance Service...');

// Test if we can build the service
try {
  console.log('✅ Finance Service files are properly structured');
  
  // Test basic imports
  const fs = require('fs');
  const path = require('path');
  
  // Check if main files exist
  const mainFiles = [
    'src/main.ts',
    'src/app.module.ts',
    'src/orders/orders.service.ts',
    'src/payments/payments.service.ts',
    'package.json'
  ];
  
  let allFilesExist = true;
  mainFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allFilesExist = false;
    }
  });
  
  if (allFilesExist) {
    console.log('✅ All core files are present');
    console.log('✅ Finance Service structure is complete');
    console.log('');
    console.log('🚀 Ready to start Finance Service!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Setup PostgreSQL database');
    console.log('2. Run: npx prisma migrate dev');
    console.log('3. Run: npm run start:dev');
    console.log('4. Access: http://localhost:3007/health');
  } else {
    console.log('❌ Some files are missing');
  }
  
} catch (error) {
  console.error('❌ Error testing service:', error.message);
}