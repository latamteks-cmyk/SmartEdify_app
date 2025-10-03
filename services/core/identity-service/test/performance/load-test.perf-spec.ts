#!/usr/bin/env node

/**
 * Performance Testing Script for Identity Service
 * 
 * This script performs load testing on the identity service to verify
 * performance under high-load scenarios as specified in the requirements.
 * 
 * It tests:
 * 1. Concurrent authentication requests
 * 2. Token exchange performance
 * 3. Refresh token operations
 * 4. Introspection performance
 * 5. Revocation performance
 * 6. Database query performance
 */

import { performance } from 'perf_hooks';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Configuration
const CONFIG = {
  // Service endpoint
  SERVICE_URL: process.env.SERVICE_URL || 'http://localhost:3001',
  
  // Test parameters
  CONCURRENT_USERS: parseInt(process.env.CONCURRENT_USERS || '100'),
  REQUESTS_PER_USER: parseInt(process.env.REQUESTS_PER_USER || '10'),
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '60'), // seconds
  
  // Authentication parameters
  CLIENT_ID: process.env.CLIENT_ID || 'test-client',
  CLIENT_SECRET: process.env.CLIENT_SECRET || 'test-secret',
  
  // Timing thresholds (milliseconds)
  AUTH_THRESHOLD: parseInt(process.env.AUTH_THRESHOLD || '500'),
  TOKEN_THRESHOLD: parseInt(process.env.TOKEN_THRESHOLD || '500'),
  REFRESH_THRESHOLD: parseInt(process.env.REFRESH_THRESHOLD || '500'),
  INTROSPECT_THRESHOLD: parseInt(process.env.INTROSPECT_THRESHOLD || '500'),
  REVOKE_THRESHOLD: parseInt(process.env.REVOKE_THRESHOLD || '500'),
  
  // Database thresholds (milliseconds)
  DB_QUERY_THRESHOLD: parseInt(process.env.DB_QUERY_THRESHOLD || '100'),
  
  // Output file
  OUTPUT_FILE: process.env.OUTPUT_FILE || 'performance-results.json',
};

// Test data
const TEST_USERS = Array.from({ length: CONFIG.CONCURRENT_USERS }, (_, i) => ({
  id: `user-${i}`,
  email: `user-${i}@example.com`,
  tenant_id: `tenant-${i % 10}`, // 10 tenants
}));

// Test results storage
const testResults: {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  percentile95: number;
  percentile99: number;
  errors: string[];
  throughput: number; // requests per second
}[] = [];

// Utility functions
const sleep = promisify(setTimeout);

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
async function makeRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: any,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const parsedUrl = new URL(url);
    const options = {
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
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const endTime = performance.now();
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data,
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

// Generate random string
function randomString(length: number): string {
  return Array.from({ length }, () => 
    Math.random().toString(36)[2] || 'x'
  ).join('');
}

// Generate PKCE challenge
function generatePKCE(): { code_challenge: string; code_verifier: string } {
  const code_verifier = randomString(43);
  const code_challenge = require('crypto')
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');
  return { code_challenge, code_verifier };
}

// Generate DPoP proof (simplified for testing)
function generateDPoPProof(): string {
  // In a real implementation, this would be a proper JWS
  return 'mock-dpop-proof-' + randomString(32);
}

// Test functions
async function testAuthenticationFlow(user: any): Promise<any> {
  try {
    // 1. Authorization code request with PKCE
    const pkce = generatePKCE();
    const dpopProof = generateDPoPProof();
    
    const authStart = performance.now();
    const authResponse = await makeRequest(
      'GET',
      `${CONFIG.SERVICE_URL}/authorize?response_type=code&client_id=${CONFIG.CLIENT_ID}&redirect_uri=https://example.com/callback&scope=openid%20profile&code_challenge=${pkce.code_challenge}&code_challenge_method=S256`,
      {
        'DPoP': dpopProof,
      }
    );
    const authEnd = performance.now();
    const authTime = authEnd - authStart;
    
    if (authResponse.statusCode !== 302) {
      throw new Error(`Authorization failed with status ${authResponse.statusCode}`);
    }
    
    // Extract code from redirect URL
    const redirectUrl = new URL(authResponse.headers.location || '', CONFIG.SERVICE_URL);
    const code = redirectUrl.searchParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code in redirect URL');
    }
    
    // 2. Token exchange
    const tokenStart = performance.now();
    const tokenResponse = await makeRequest(
      'POST',
      `${CONFIG.SERVICE_URL}/oauth/token`,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'DPoP': dpopProof,
      },
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: pkce.code_verifier,
        redirect_uri: 'https://example.com/callback',
      }).toString()
    );
    const tokenEnd = performance.now();
    const tokenTime = tokenEnd - tokenStart;
    
    if (tokenResponse.statusCode !== 200) {
      throw new Error(`Token exchange failed with status ${tokenResponse.statusCode}`);
    }
    
    const tokenData = JSON.parse(tokenResponse.body);
    
    return {
      success: true,
      authTime,
      tokenTime,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testTokenRefresh(refreshToken: string): Promise<any> {
  try {
    const dpopProof = generateDPoPProof();
    
    const refreshStart = performance.now();
    const refreshResponse = await makeRequest(
      'POST',
      `${CONFIG.SERVICE_URL}/oauth/token`,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'DPoP': dpopProof,
      },
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString()
    );
    const refreshEnd = performance.now();
    const refreshTime = refreshEnd - refreshStart;
    
    if (refreshResponse.statusCode !== 200) {
      throw new Error(`Token refresh failed with status ${refreshResponse.statusCode}`);
    }
    
    const tokenData = JSON.parse(refreshResponse.body);
    
    return {
      success: true,
      refreshTime,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testTokenIntrospection(accessToken: string): Promise<any> {
  try {
    // Basic auth for client
    const auth = Buffer.from(`${CONFIG.CLIENT_ID}:${CONFIG.CLIENT_SECRET}`).toString('base64');
    
    const introspectStart = performance.now();
    const introspectResponse = await makeRequest(
      'POST',
      `${CONFIG.SERVICE_URL}/oauth/introspect`,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
      },
      new URLSearchParams({
        token: accessToken,
      }).toString()
    );
    const introspectEnd = performance.now();
    const introspectTime = introspectEnd - introspectStart;
    
    if (introspectResponse.statusCode !== 200) {
      throw new Error(`Token introspection failed with status ${introspectResponse.statusCode}`);
    }
    
    return {
      success: true,
      introspectTime,
      active: JSON.parse(introspectResponse.body).active,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testTokenRevocation(refreshToken: string): Promise<any> {
  try {
    const revokeStart = performance.now();
    const revokeResponse = await makeRequest(
      'POST',
      `${CONFIG.SERVICE_URL}/oauth/revoke`,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      new URLSearchParams({
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }).toString()
    );
    const revokeEnd = performance.now();
    const revokeTime = revokeEnd - revokeStart;
    
    // Revocation should always return 200 OK per RFC 7009
    if (revokeResponse.statusCode !== 200) {
      throw new Error(`Token revocation failed with status ${revokeResponse.statusCode}`);
    }
    
    return {
      success: true,
      revokeTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Performance test runner
async function runPerformanceTest() {
  console.log('Starting performance test...');
  console.log(`Configuration: ${CONFIG.CONCURRENT_USERS} concurrent users, ${CONFIG.REQUESTS_PER_USER} requests per user`);
  
  // Track overall test timing
  const testStartTime = performance.now();
  
  // Run tests for each user
  const userPromises = TEST_USERS.map(async (user) => {
    const userResults = {
      userId: user.id,
      authTimes: [] as number[],
      tokenTimes: [] as number[],
      refreshTimes: [] as number[],
      introspectTimes: [] as number[],
      revokeTimes: [] as number[],
      successes: 0,
      failures: 0,
    };
    
    // Run multiple requests per user
    for (let i = 0; i < CONFIG.REQUESTS_PER_USER; i++) {
      try {
        // 1. Authentication flow
        const authResult = await testAuthenticationFlow(user);
        if (authResult.success) {
          userResults.authTimes.push(authResult.authTime);
          userResults.tokenTimes.push(authResult.tokenTime);
          userResults.successes++;
          
          // 2. Token refresh
          const refreshResult = await testTokenRefresh(authResult.refreshToken);
          if (refreshResult.success) {
            userResults.refreshTimes.push(refreshResult.refreshTime);
            userResults.successes++;
            
            // 3. Token introspection
            const introspectResult = await testTokenIntrospection(authResult.accessToken);
            if (introspectResult.success) {
              userResults.introspectTimes.push(introspectResult.introspectTime);
              userResults.successes++;
              
              // 4. Token revocation
              const revokeResult = await testTokenRevocation(refreshResult.refreshToken);
              if (revokeResult.success) {
                userResults.revokeTimes.push(revokeResult.revokeTime);
                userResults.successes++;
              } else {
                userResults.failures++;
              }
            } else {
              userResults.failures++;
            }
          } else {
            userResults.failures++;
          }
        } else {
          userResults.failures++;
        }
        
        // Small delay between requests to simulate real-world usage
        await sleep(10);
      } catch (error) {
        userResults.failures++;
        console.error(`Error in user ${user.id} request ${i + 1}:`, error);
      }
    }
    
    return userResults;
  });
  
  // Wait for all user tests to complete
  const allUserResults = await Promise.all(userPromises);
  
  const testEndTime = performance.now();
  const totalTime = testEndTime - testStartTime;
  
  // Aggregate results
  const allAuthTimes = allUserResults.flatMap(r => r.authTimes);
  const allTokenTimes = allUserResults.flatMap(r => r.tokenTimes);
  const allRefreshTimes = allUserResults.flatMap(r => r.refreshTimes);
  const allIntrospectTimes = allUserResults.flatMap(r => r.introspectTimes);
  const allRevokeTimes = allUserResults.flatMap(r => r.revokeTimes);
  
  const totalSuccesses = allUserResults.reduce((sum, r) => sum + r.successes, 0);
  const totalFailures = allUserResults.reduce((sum, r) => sum + r.failures, 0);
  const totalRequests = totalSuccesses + totalFailures;
  
  // Calculate percentiles
  const calculatePercentile = (times: number[], percentile: number): number => {
    if (times.length === 0) return 0;
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index];
  };
  
  // Calculate averages
  const calculateAverage = (times: number[]): number => {
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  };
  
  // Store test results
  testResults.push({
    testName: 'Authentication Flow',
    totalRequests: allAuthTimes.length,
    successfulRequests: allAuthTimes.length,
    failedRequests: 0,
    avgResponseTime: calculateAverage(allAuthTimes),
    minResponseTime: Math.min(...allAuthTimes, Infinity) === Infinity ? 0 : Math.min(...allAuthTimes),
    maxResponseTime: Math.max(...allAuthTimes, -Infinity) === -Infinity ? 0 : Math.max(...allAuthTimes),
    percentile95: calculatePercentile(allAuthTimes, 95),
    percentile99: calculatePercentile(allAuthTimes, 99),
    errors: [],
    throughput: allAuthTimes.length / (totalTime / 1000),
  });
  
  testResults.push({
    testName: 'Token Exchange',
    totalRequests: allTokenTimes.length,
    successfulRequests: allTokenTimes.length,
    failedRequests: 0,
    avgResponseTime: calculateAverage(allTokenTimes),
    minResponseTime: Math.min(...allTokenTimes, Infinity) === Infinity ? 0 : Math.min(...allTokenTimes),
    maxResponseTime: Math.max(...allTokenTimes, -Infinity) === -Infinity ? 0 : Math.max(...allTokenTimes),
    percentile95: calculatePercentile(allTokenTimes, 95),
    percentile99: calculatePercentile(allTokenTimes, 99),
    errors: [],
    throughput: allTokenTimes.length / (totalTime / 1000),
  });
  
  testResults.push({
    testName: 'Token Refresh',
    totalRequests: allRefreshTimes.length,
    successfulRequests: allRefreshTimes.length,
    failedRequests: 0,
    avgResponseTime: calculateAverage(allRefreshTimes),
    minResponseTime: Math.min(...allRefreshTimes, Infinity) === Infinity ? 0 : Math.min(...allRefreshTimes),
    maxResponseTime: Math.max(...allRefreshTimes, -Infinity) === -Infinity ? 0 : Math.max(...allRefreshTimes),
    percentile95: calculatePercentile(allRefreshTimes, 95),
    percentile99: calculatePercentile(allRefreshTimes, 99),
    errors: [],
    throughput: allRefreshTimes.length / (totalTime / 1000),
  });
  
  testResults.push({
    testName: 'Token Introspection',
    totalRequests: allIntrospectTimes.length,
    successfulRequests: allIntrospectTimes.length,
    failedRequests: 0,
    avgResponseTime: calculateAverage(allIntrospectTimes),
    minResponseTime: Math.min(...allIntrospectTimes, Infinity) === Infinity ? 0 : Math.min(...allIntrospectTimes),
    maxResponseTime: Math.max(...allIntrospectTimes, -Infinity) === -Infinity ? 0 : Math.max(...allIntrospectTimes),
    percentile95: calculatePercentile(allIntrospectTimes, 95),
    percentile99: calculatePercentile(allIntrospectTimes, 99),
    errors: [],
    throughput: allIntrospectTimes.length / (totalTime / 1000),
  });
  
  testResults.push({
    testName: 'Token Revocation',
    totalRequests: allRevokeTimes.length,
    successfulRequests: allRevokeTimes.length,
    failedRequests: 0,
    avgResponseTime: calculateAverage(allRevokeTimes),
    minResponseTime: Math.min(...allRevokeTimes, Infinity) === Infinity ? 0 : Math.min(...allRevokeTimes),
    maxResponseTime: Math.max(...allRevokeTimes, -Infinity) === -Infinity ? 0 : Math.max(...allRevokeTimes),
    percentile95: calculatePercentile(allRevokeTimes, 95),
    percentile99: calculatePercentile(allRevokeTimes, 99),
    errors: [],
    throughput: allRevokeTimes.length / (totalTime / 1000),
  });
  
  // Overall results
  testResults.push({
    testName: 'Overall Performance',
    totalRequests,
    successfulRequests: totalSuccesses,
    failedRequests: totalFailures,
    avgResponseTime: calculateAverage([
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes,
    ]),
    minResponseTime: Math.min(
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes,
      Infinity
    ) === Infinity ? 0 : Math.min(
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes
    ),
    maxResponseTime: Math.max(
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes,
      -Infinity
    ) === -Infinity ? 0 : Math.max(
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes
    ),
    percentile95: calculatePercentile([
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes,
    ], 95),
    percentile99: calculatePercentile([
      ...allAuthTimes,
      ...allTokenTimes,
      ...allRefreshTimes,
      ...allIntrospectTimes,
      ...allRevokeTimes,
    ], 99),
    errors: [],
    throughput: totalRequests / (totalTime / 1000),
  });
  
  // Print results
  console.log('\n=== PERFORMANCE TEST RESULTS ===');
  console.log(`Total test time: ${(totalTime / 1000).toFixed(2)} seconds`);
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Successful requests: ${totalSuccesses}`);
  console.log(`Failed requests: ${totalFailures}`);
  console.log(`Success rate: ${((totalSuccesses / totalRequests) * 100).toFixed(2)}%`);
  
  testResults.forEach(result => {
    console.log(`\n--- ${result.testName} ---`);
    console.log(`  Requests: ${result.totalRequests}`);
    console.log(`  Success rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
    console.log(`  Average response time: ${result.avgResponseTime.toFixed(2)} ms`);
    console.log(`  Min response time: ${result.minResponseTime.toFixed(2)} ms`);
    console.log(`  Max response time: ${result.maxResponseTime.toFixed(2)} ms`);
    console.log(`  95th percentile: ${result.percentile95.toFixed(2)} ms`);
    console.log(`  99th percentile: ${result.percentile99.toFixed(2)} ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(2)} req/sec`);
    
    // Check against thresholds
    if (result.avgResponseTime > CONFIG.AUTH_THRESHOLD && result.testName.includes('Authentication')) {
      console.log(`  ⚠️  WARNING: Average response time exceeds threshold (${CONFIG.AUTH_THRESHOLD} ms)`);
    }
    if (result.avgResponseTime > CONFIG.TOKEN_THRESHOLD && result.testName.includes('Token')) {
      console.log(`  ⚠️  WARNING: Average response time exceeds threshold (${CONFIG.TOKEN_THRESHOLD} ms)`);
    }
    if (result.avgResponseTime > CONFIG.REFRESH_THRESHOLD && result.testName.includes('Refresh')) {
      console.log(`  ⚠️  WARNING: Average response time exceeds threshold (${CONFIG.REFRESH_THRESHOLD} ms)`);
    }
    if (result.avgResponseTime > CONFIG.INTROSPECT_THRESHOLD && result.testName.includes('Introspection')) {
      console.log(`  ⚠️  WARNING: Average response time exceeds threshold (${CONFIG.INTROSPECT_THRESHOLD} ms)`);
    }
    if (result.avgResponseTime > CONFIG.REVOKE_THRESHOLD && result.testName.includes('Revocation')) {
      console.log(`  ⚠️  WARNING: Average response time exceeds threshold (${CONFIG.REVOKE_THRESHOLD} ms)`);
    }
  });
  
  // Save results to file
  try {
    fs.writeFileSync(
      path.join(__dirname, CONFIG.OUTPUT_FILE),
      JSON.stringify({
        config: CONFIG,
        results: testResults,
        timestamp: new Date().toISOString(),
        totalTestTime: totalTime,
        totalRequests,
        totalSuccesses,
        totalFailures,
        successRate: (totalSuccesses / totalRequests) * 100,
      }, null, 2)
    );
    console.log(`\nResults saved to ${CONFIG.OUTPUT_FILE}`);
  } catch (error) {
    console.error('Failed to save results to file:', error);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  const overallSuccessRate = (totalSuccesses / totalRequests) * 100;
  console.log(`Overall success rate: ${overallSuccessRate.toFixed(2)}%`);
  
  if (overallSuccessRate >= 95) {
    console.log('✅ Performance test PASSED');
  } else {
    console.log('❌ Performance test FAILED - Success rate below 95%');
  }
  
  // Check response time thresholds
  const avgResponseTime = calculateAverage([
    ...allAuthTimes,
    ...allTokenTimes,
    ...allRefreshTimes,
    ...allIntrospectTimes,
    ...allRevokeTimes,
  ]);
  
  if (avgResponseTime <= CONFIG.AUTH_THRESHOLD) {
    console.log('✅ Average response time within threshold');
  } else {
    console.log(`❌ Average response time (${avgResponseTime.toFixed(2)} ms) exceeds threshold (${CONFIG.AUTH_THRESHOLD} ms)`);
  }
  
  process.exit(overallSuccessRate >= 95 && avgResponseTime <= CONFIG.AUTH_THRESHOLD ? 0 : 1);
}

// Run the performance test
if (require.main === module) {
  runPerformanceTest().catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}