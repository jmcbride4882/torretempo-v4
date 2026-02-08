/**
 * Load Test: 100 Concurrent Clock-Ins
 * 
 * Task 2.17: Simulates 100 users clocking in simultaneously
 * 
 * Metrics:
 * - 95th percentile response time <500ms
 * - 0 errors
 * - 0 database deadlocks
 * 
 * Usage:
 *   npx tsx scripts/load-test-clock-in.ts
 * 
 * Prerequisites:
 *   - API server running on localhost:3000
 *   - Database seeded with test users
 */

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:3000',
  concurrentUsers: 100,
  organizationSlug: 'demo-restaurant',
  targetP95: 500, // milliseconds
  targetErrorRate: 0, // percentage
};

// ============================================================================
// Types
// ============================================================================

interface ClockInPayload {
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  method: 'tap' | 'gps' | 'nfc' | 'qr' | 'pin';
}

interface TestResult {
  userId: string;
  success: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
}

interface LoadTestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  minResponseTime: number;
  maxResponseTime: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
}

// ============================================================================
// Test Data Generation
// ============================================================================

/**
 * Generate random coordinates near Madrid (for geofence testing)
 */
function generateMadridCoordinates(): { latitude: number; longitude: number } {
  // Madrid center: 40.4168, -3.7038
  // Add small random offset (within 50m)
  const latOffset = (Math.random() - 0.5) * 0.0009; // ~50m
  const lonOffset = (Math.random() - 0.5) * 0.0009;
  
  return {
    latitude: 40.4168 + latOffset,
    longitude: -3.7038 + lonOffset,
  };
}

/**
 * Generate clock-in payload for a user
 */
function generateClockInPayload(): ClockInPayload {
  const coords = generateMadridCoordinates();
  
  return {
    timestamp: new Date().toISOString(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: Math.floor(Math.random() * 20) + 5, // 5-25m accuracy
    method: 'tap',
  };
}

/**
 * Generate test user IDs
 */
function generateUserIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `test-user-${i + 1}`);
}

// ============================================================================
// HTTP Client
// ============================================================================

/**
 * Perform a single clock-in request
 */
async function clockIn(
  userId: string,
  authToken: string,
  payload: ClockInPayload
): Promise<TestResult> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(
      `${CONFIG.baseUrl}/api/v1/org/${CONFIG.organizationSlug}/time-entries/clock-in`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-User-Id': userId, // For testing without real auth
        },
        body: JSON.stringify(payload),
      }
    );
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    if (!response.ok) {
      const errorBody = await response.text();
      return {
        userId,
        success: false,
        responseTime,
        statusCode: response.status,
        error: errorBody,
      };
    }
    
    return {
      userId,
      success: true,
      responseTime,
      statusCode: response.status,
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      userId,
      success: false,
      responseTime: endTime - startTime,
      statusCode: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)] ?? 0;
}

/**
 * Calculate load test summary statistics
 */
function calculateSummary(results: TestResult[], totalDuration: number): LoadTestSummary {
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  return {
    totalRequests: results.length,
    successfulRequests: successfulResults.length,
    failedRequests: failedResults.length,
    errorRate: (failedResults.length / results.length) * 100,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    p50ResponseTime: percentile(responseTimes, 50),
    p95ResponseTime: percentile(responseTimes, 95),
    p99ResponseTime: percentile(responseTimes, 99),
    requestsPerSecond: results.length / (totalDuration / 1000),
    totalDuration,
  };
}

// ============================================================================
// Main Test Runner
// ============================================================================

/**
 * Run the load test
 */
async function runLoadTest(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TORRE TEMPO - LOAD TEST: 100 CONCURRENT CLOCK-INS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Target URL: ${CONFIG.baseUrl}`);
  console.log(`  Concurrent Users: ${CONFIG.concurrentUsers}`);
  console.log(`  Organization: ${CONFIG.organizationSlug}`);
  console.log(`  Target P95: <${CONFIG.targetP95}ms`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Generate test data
  const userIds = generateUserIds(CONFIG.concurrentUsers);
  const testToken = 'load-test-token'; // Would be real tokens in production
  
  console.log(`Preparing ${CONFIG.concurrentUsers} concurrent requests...\n`);
  
  // Create all requests
  const requests = userIds.map(userId => ({
    userId,
    payload: generateClockInPayload(),
  }));
  
  // Execute all requests concurrently
  console.log('Starting load test...\n');
  const startTime = performance.now();
  
  const results = await Promise.all(
    requests.map(req => clockIn(req.userId, testToken, req.payload))
  );
  
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  // Calculate statistics
  const summary = calculateSummary(results, totalDuration);
  
  // Print results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LOAD TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('  Request Summary:');
  console.log(`    Total Requests:      ${summary.totalRequests}`);
  console.log(`    Successful:          ${summary.successfulRequests}`);
  console.log(`    Failed:              ${summary.failedRequests}`);
  console.log(`    Error Rate:          ${summary.errorRate.toFixed(2)}%`);
  console.log();
  
  console.log('  Response Times:');
  console.log(`    Min:                 ${summary.minResponseTime.toFixed(2)}ms`);
  console.log(`    Max:                 ${summary.maxResponseTime.toFixed(2)}ms`);
  console.log(`    Average:             ${summary.avgResponseTime.toFixed(2)}ms`);
  console.log(`    P50 (Median):        ${summary.p50ResponseTime.toFixed(2)}ms`);
  console.log(`    P95:                 ${summary.p95ResponseTime.toFixed(2)}ms`);
  console.log(`    P99:                 ${summary.p99ResponseTime.toFixed(2)}ms`);
  console.log();
  
  console.log('  Throughput:');
  console.log(`    Total Duration:      ${summary.totalDuration.toFixed(2)}ms`);
  console.log(`    Requests/Second:     ${summary.requestsPerSecond.toFixed(2)}`);
  console.log();
  
  // Validation
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const p95Pass = summary.p95ResponseTime < CONFIG.targetP95;
  const errorPass = summary.errorRate <= CONFIG.targetErrorRate;
  
  console.log(`  P95 < ${CONFIG.targetP95}ms:          ${p95Pass ? '✅ PASS' : '❌ FAIL'} (${summary.p95ResponseTime.toFixed(2)}ms)`);
  console.log(`  Error Rate = 0%:       ${errorPass ? '✅ PASS' : '❌ FAIL'} (${summary.errorRate.toFixed(2)}%)`);
  console.log();
  
  // Print failed requests if any
  if (summary.failedRequests > 0) {
    console.log('  Failed Requests:');
    const failedResults = results.filter(r => !r.success).slice(0, 10);
    for (const result of failedResults) {
      console.log(`    - ${result.userId}: ${result.statusCode} - ${result.error?.substring(0, 50)}`);
    }
    if (summary.failedRequests > 10) {
      console.log(`    ... and ${summary.failedRequests - 10} more`);
    }
    console.log();
  }
  
  // Overall result
  const overallPass = p95Pass && errorPass;
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  OVERALL: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Exit with appropriate code
  process.exit(overallPass ? 0 : 1);
}

// ============================================================================
// Dry Run Mode (for testing without server)
// ============================================================================

/**
 * Run in dry-run mode (simulates requests without actual HTTP calls)
 */
async function runDryRun(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TORRE TEMPO - LOAD TEST (DRY RUN MODE)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Simulating 100 concurrent clock-ins without actual HTTP calls\n');
  
  const userIds = generateUserIds(CONFIG.concurrentUsers);
  
  // Simulate requests with random response times
  const startTime = performance.now();
  
  const results: TestResult[] = await Promise.all(
    userIds.map(async (userId) => {
      // Simulate network latency (10-200ms)
      const simulatedLatency = Math.random() * 190 + 10;
      await new Promise(resolve => setTimeout(resolve, simulatedLatency));
      
      // 98% success rate simulation
      const success = Math.random() > 0.02;
      
      return {
        userId,
        success,
        responseTime: simulatedLatency,
        statusCode: success ? 200 : 500,
        error: success ? undefined : 'Simulated error',
      };
    })
  );
  
  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  
  const summary = calculateSummary(results, totalDuration);
  
  console.log('  Simulated Results:');
  console.log(`    Total Requests:      ${summary.totalRequests}`);
  console.log(`    Successful:          ${summary.successfulRequests}`);
  console.log(`    Failed:              ${summary.failedRequests}`);
  console.log(`    P95 Response Time:   ${summary.p95ResponseTime.toFixed(2)}ms`);
  console.log(`    Requests/Second:     ${summary.requestsPerSecond.toFixed(2)}`);
  console.log();
  console.log('  ✅ Dry run completed successfully');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// Entry Point
// ============================================================================

const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  runDryRun().catch(console.error);
} else {
  runLoadTest().catch(console.error);
}
