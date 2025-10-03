#!/usr/bin/env node

/**
 * Simple Performance Test for Identity Service
 * 
 * This script performs basic load testing on the identity service to verify
 * performance under high-load scenarios.
 */

import * as http from 'http';
import * as https from 'https';
import { performance } from 'perf_hooks';

// Configuration
const CONFIG = {
  // Service endpoint
  SERVICE_URL: process.env.SERVICE_URL || 'http://localhost:3001',
  
  // Test parameters
  CONCURRENT_USERS: parseInt(process.env.CONCURRENT_USERS || '50'),
  REQUESTS_PER_USER: parseInt(process.env.REQUESTS_PER_USER || '5'),
  
  // Timing threshold (milliseconds)
  RESPONSE_TIME_THRESHOLD: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '1000'),
};

// Test data
const TEST_USERS = Array.from({ length: CONFIG.CONCURRENT_USERS }, (_, i) => ({
  id: `user-${i}`,
  email: `user-${i}@example.com`,
  tenant_id: `tenant-${i % 5}`, // 5 tenants
}));

// HTTP client with keep-alive
const httpClient = new http.Agent({
  keepAlive: true,
  maxSockets: CONFIG.CONCURRENT_USERS,
});

const httpsClient = new https.Agent({
  keepAlive: true,
  maxSockets: CONFIG.CONCURRENT_USERS,
});

// Make HTTP request
function makeRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any,
): Promise<{ statusCode: number; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const parsedUrl = new URL(url);
    const options: http.RequestOptions | https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      agent: parsedUrl.protocol === 'https:' ? httpsClient : httpClient,
    };

    const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
      res.on('data', () => {}); // Consume response data
      res.on('end', () => {
        const endTime = performance.now();
        resolve({
          statusCode: res.statusCode || 0,
          responseTime: endTime - startTime,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      reject({ error, responseTime: endTime - startTime });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test authorization endpoint
async function testAuthorizeEndpoint(): Promise<number[]> {
  const responseTimes: number[] = [];
  
  // Run tests for each user
  const userPromises = TEST_USERS.map(async (user) => {
    // Run multiple requests per user
    for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
      try {
        const response = await makeRequest(
          'GET',
          `${CONFIG.SERVICE_URL}/authorize?redirect_uri=https://example.com/callback&scope=openid%20profile&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256`,
        );
        
        responseTimes.push(response.responseTime);
      } catch (error) {
        console.error(`Error in user ${user.id} request ${i + 1}:`, error);
        responseTimes.push(CONFIG.RESPONSE_TIME_THRESHOLD + 1000); // Add penalty for errors
      }
    }
  });
  
  await Promise.all(userPromises);
  return responseTimes;
}

// Test token endpoint
async function testTokenEndpoint(): Promise<number[]> {
  const responseTimes: number[] = [];
  
  // Run tests for each user
  const userPromises = TEST_USERS.map(async (user) => {
    // Run multiple requests per user
    for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
      try {
        const response = await makeRequest(
          'POST',
          `${CONFIG.SERVICE_URL}/oauth/token`,
          {
            'DPoP': 'mock-dpop-proof',
          },
          {
            grant_type: 'authorization_code',
            code: 'test-code',
            code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
            redirect_uri: 'https://example.com/callback',
          }
        );
        
        responseTimes.push(response.responseTime);
      } catch (error) {
        console.error(`Error in user ${user.id} request ${i + 1}:`, error);
        responseTimes.push(CONFIG.RESPONSE_TIME_THRESHOLD + 1000); // Add penalty for errors
      }
    }
  });
  
  await Promise.all(userPromises);
  return responseTimes;
}

// Test introspection endpoint
async function testIntrospectEndpoint(): Promise<number[]> {
  const responseTimes: number[] = [];
  
  // Run tests for each user
  const userPromises = TEST_USERS.map(async (user) => {
    // Run multiple requests per user
    for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
      try {
        const response = await makeRequest(
          'POST',
          `${CONFIG.SERVICE_URL}/oauth/introspect`,
          {
            'Authorization': 'Basic dGVzdC1jbGllbnQ6dGVzdC1zZWNyZXQ=', // Base64 encoded "test-client:test-secret"
          },
          {
            token: 'test-token',
          }
        );
        
        responseTimes.push(response.responseTime);
      } catch (error) {
        console.error(`Error in user ${user.id} request ${i + 1}:`, error);
        responseTimes.push(CONFIG.RESPONSE_TIME_THRESHOLD + 1000); // Add penalty for errors
      }
    }
  });
  
  await Promise.all(userPromises);
  return responseTimes;
}

// Calculate statistics
function calculateStats(times: number[]) {
  if (times.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
  
  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  
  return { avg, min, max, p95, p99 };
}

// Performance test runner
async function runPerformanceTest() {
  console.log('Starting simple performance test...');
  console.log(`Configuration: ${CONFIG.CONCURRENT_USERS} concurrent users, ${CONFIG.REQUESTS_PER_USER} requests per user`);
  
  // Track overall test timing
  const testStartTime = performance.now();
  
  // Test authorize endpoint
  console.log('\nTesting /authorize endpoint...');
  const authorizeTimes = await testAuthorizeEndpoint();
  
  // Test token endpoint
  console.log('\nTesting /oauth/token endpoint...');
  const tokenTimes = await testTokenEndpoint();
  
  // Test introspect endpoint
  console.log('\nTesting /oauth/introspect endpoint...');
  const introspectTimes = await testIntrospectEndpoint();
  
  const testEndTime = performance.now();
  const totalTime = testEndTime - testStartTime;
  
  // Calculate statistics
  const authorizeStats = calculateStats(authorizeTimes);
  const tokenStats = calculateStats(tokenTimes);
  const introspectStats = calculateStats(introspectTimes);
  
  // Print results
  console.log('\n=== PERFORMANCE TEST RESULTS ===');
  console.log(`Total test time: ${(totalTime / 1000).toFixed(2)} seconds`);
  console.log(`Total requests: ${authorizeTimes.length + tokenTimes.length + introspectTimes.length}`);
  
  console.log('\n--- /authorize endpoint ---');
  console.log(`  Average response time: ${authorizeStats.avg.toFixed(2)} ms`);
  console.log(`  Min response time: ${authorizeStats.min.toFixed(2)} ms`);
  console.log(`  Max response time: ${authorizeStats.max.toFixed(2)} ms`);
  console.log(`  95th percentile: ${authorizeStats.p95.toFixed(2)} ms`);
  console.log(`  99th percentile: ${authorizeStats.p99.toFixed(2)} ms`);
  
  console.log('\n--- /oauth/token endpoint ---');
  console.log(`  Average response time: ${tokenStats.avg.toFixed(2)} ms`);
  console.log(`  Min response time: ${tokenStats.min.toFixed(2)} ms`);
  console.log(`  Max response time: ${tokenStats.max.toFixed(2)} ms`);
  console.log(`  95th percentile: ${tokenStats.p95.toFixed(2)} ms`);
  console.log(`  99th percentile: ${tokenStats.p99.toFixed(2)} ms`);
  
  console.log('\n--- /oauth/introspect endpoint ---');
  console.log(`  Average response time: ${introspectStats.avg.toFixed(2)} ms`);
  console.log(`  Min response time: ${introspectStats.min.toFixed(2)} ms`);
  console.log(`  Max response time: ${introspectStats.max.toFixed(2)} ms`);
  console.log(`  95th percentile: ${introspectStats.p95.toFixed(2)} ms`);
  console.log(`  99th percentile: ${introspectStats.p99.toFixed(2)} ms`);
  
  // Check against thresholds
  const allPassed = 
    authorizeStats.avg <= CONFIG.RESPONSE_TIME_THRESHOLD &&
    tokenStats.avg <= CONFIG.RESPONSE_TIME_THRESHOLD &&
    introspectStats.avg <= CONFIG.RESPONSE_TIME_THRESHOLD;
  
  console.log('\n=== SUMMARY ===');
  if (allPassed) {
    console.log('✅ All endpoints passed performance threshold');
  } else {
    console.log('❌ Some endpoints failed performance threshold');
    if (authorizeStats.avg > CONFIG.RESPONSE_TIME_THRESHOLD) {
      console.log(`  /authorize: ${authorizeStats.avg.toFixed(2)} ms > ${CONFIG.RESPONSE_TIME_THRESHOLD} ms threshold`);
    }
    if (tokenStats.avg > CONFIG.RESPONSE_TIME_THRESHOLD) {
      console.log(`  /oauth/token: ${tokenStats.avg.toFixed(2)} ms > ${CONFIG.RESPONSE_TIME_THRESHOLD} ms threshold`);
    }
    if (introspectStats.avg > CONFIG.RESPONSE_TIME_THRESHOLD) {
      console.log(`  /oauth/introspect: ${introspectStats.avg.toFixed(2)} ms > ${CONFIG.RESPONSE_TIME_THRESHOLD} ms threshold`);
    }
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the performance test
if (require.main === module) {
  runPerformanceTest().catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}