/**
 * RecallBricks Load Test Runner
 *
 * Comprehensive load testing with autocannon
 */

const autocannon = require('autocannon');
const { spawn } = require('child_process');
const path = require('path');

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_SCENARIOS = [
  {
    name: 'Baseline Load - 100 req/s',
    connections: 10,
    duration: 60,
    pipelining: 1,
    requests: [
      {
        method: 'POST',
        path: '/chat',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: 'What is the weather like today?',
        }),
      },
    ],
  },
  {
    name: 'Moderate Load - 500 req/s',
    connections: 50,
    duration: 60,
    pipelining: 1,
    requests: [
      {
        method: 'POST',
        path: '/chat',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me about cognitive architectures',
        }),
      },
    ],
  },
  {
    name: 'Heavy Load - 1000 req/s',
    connections: 100,
    duration: 60,
    pipelining: 1,
    requests: [
      {
        method: 'POST',
        path: '/chat',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: 'Complex query with lots of context',
        }),
      },
    ],
  },
  {
    name: 'Spike Test - 2000 req/s burst',
    connections: 200,
    duration: 30,
    pipelining: 1,
    requests: [
      {
        method: 'POST',
        path: '/chat',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: 'Spike load test',
        }),
      },
    ],
  },
  {
    name: 'Context API Load',
    connections: 50,
    duration: 60,
    pipelining: 1,
    requests: [
      {
        method: 'GET',
        path: '/context',
      },
    ],
  },
  {
    name: 'Mixed Workload',
    connections: 50,
    duration: 60,
    pipelining: 1,
    requests: [
      {
        method: 'POST',
        path: '/chat',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' }),
        weight: 70,
      },
      {
        method: 'GET',
        path: '/context',
        weight: 20,
      },
      {
        method: 'GET',
        path: '/identity',
        weight: 10,
      },
    ],
  },
];

// ============================================================================
// Server Management
// ============================================================================

let serverProcess;

async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting RecallBricks API server...');

    const serverPath = path.join(__dirname, '../../dist/adapters/api/server.js');

    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: '3000',
        RECALLBRICKS_AGENT_ID: 'load_test_agent',
        RECALLBRICKS_USER_ID: 'load_test_user',
        RECALLBRICKS_API_KEY: 'test_key',
        RECALLBRICKS_DEBUG: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('listening on port')) {
        console.log('Server started successfully\n');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server error: ${data}`);
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      reject(new Error('Server start timeout'));
    }, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    console.log('\nStopping server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// ============================================================================
// Test Execution
// ============================================================================

async function runTest(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url: 'http://localhost:3000',
      connections: scenario.connections,
      duration: scenario.duration,
      pipelining: scenario.pipelining,
      requests: scenario.requests,
    });

    autocannon.track(instance, {
      renderProgressBar: true,
      renderLatencyTable: true,
      renderResultsTable: true,
    });

    instance.on('done', (results) => {
      console.log('\nResults:');
      console.log(`  Requests:     ${results.requests.total}`);
      console.log(`  Duration:     ${results.duration}s`);
      console.log(`  Throughput:   ${results.requests.average} req/s`);
      console.log(`  Latency:`);
      console.log(`    Mean:       ${results.latency.mean}ms`);
      console.log(`    Median:     ${results.latency.p50}ms`);
      console.log(`    p95:        ${results.latency.p95}ms`);
      console.log(`    p99:        ${results.latency.p99}ms`);
      console.log(`    p99.9:      ${results.latency.p999}ms`);
      console.log(`  Errors:       ${results.errors}`);
      console.log(`  Timeouts:     ${results.timeouts}`);
      console.log(`  Non-2xx:      ${results.non2xx}`);

      // Analyze results
      const passed = analyzeResults(scenario, results);

      resolve({ scenario, results, passed });
    });

    instance.on('error', reject);
  });
}

function analyzeResults(scenario, results) {
  const checks = {
    throughput: results.requests.average >= scenario.connections * 0.5,
    errorRate: results.errors / results.requests.total < 0.01,
    latencyP95: results.latency.p95 < 5000,
    latencyP99: results.latency.p99 < 10000,
  };

  console.log('\nAnalysis:');
  console.log(`  Throughput acceptable:  ${checks.throughput ? '✓' : '✗'}`);
  console.log(`  Error rate < 1%:        ${checks.errorRate ? '✓' : '✗'}`);
  console.log(`  p95 latency < 5s:       ${checks.latencyP95 ? '✓' : '✗'}`);
  console.log(`  p99 latency < 10s:      ${checks.latencyP99 ? '✓' : '✗'}`);

  const passed = Object.values(checks).every((check) => check);
  console.log(`\nOverall: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);

  return passed;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  const results = [];

  try {
    // Start server
    await startServer();

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Run each test scenario
    for (const scenario of TEST_SCENARIOS) {
      const result = await runTest(scenario);
      results.push(result);

      // Cool down between tests
      console.log('\nCooling down for 5 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('Test Summary');
    console.log(`${'='.repeat(80)}\n`);

    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;

    results.forEach((result) => {
      const status = result.passed ? '✓ PASSED' : '✗ FAILED';
      console.log(`${status} - ${result.scenario.name}`);
    });

    console.log(`\nTotal: ${passedTests}/${totalTests} passed`);

    if (passedTests === totalTests) {
      console.log('\n🎉 All load tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some load tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Load test error:', error);
    process.exit(1);
  } finally {
    stopServer();
  }
}

// ============================================================================
// Entry Point
// ============================================================================

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\nInterrupted, cleaning up...');
  stopServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(0);
});

// Run tests
runAllTests();
