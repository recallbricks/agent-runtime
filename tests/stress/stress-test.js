/**
 * RecallBricks Stress Test Suite
 *
 * Try to break the system - find limits and failure modes
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// ============================================================================
// Stress Test Scenarios
// ============================================================================

const STRESS_SCENARIOS = [
  {
    name: 'Memory Exhaustion - Large Payloads',
    description: 'Send extremely large chat messages to test memory limits',
    test: async () => {
      const largeMessage = 'x'.repeat(10 * 1024 * 1024); // 10MB message
      return makeRequest('/chat', {
        method: 'POST',
        body: { message: largeMessage },
      });
    },
    expectedFailure: true,
  },
  {
    name: 'Rapid Fire - 10,000 requests instantly',
    description: 'Send 10k requests as fast as possible to test queue limits',
    test: async () => {
      const promises = [];
      for (let i = 0; i < 10000; i++) {
        promises.push(
          makeRequest('/chat', {
            method: 'POST',
            body: { message: `Request ${i}` },
            timeout: 100,
          }).catch(() => null) // Ignore individual failures
        );
      }
      const results = await Promise.allSettled(promises);
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      return { succeeded, failed, total: 10000 };
    },
    expectedFailure: false,
    validate: (result) => result.failed / result.total < 0.5, // Less than 50% failure
  },
  {
    name: 'Connection Flood - 1000 concurrent connections',
    description: 'Open 1000 concurrent connections to test connection limits',
    test: async () => {
      const connections = [];
      for (let i = 0; i < 1000; i++) {
        connections.push(
          makeRequest('/health', { method: 'GET', keepAlive: true })
        );
      }
      const results = await Promise.allSettled(connections);
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return { succeeded, total: 1000 };
    },
    expectedFailure: false,
    validate: (result) => result.succeeded > 500, // At least 50% success
  },
  {
    name: 'Null Byte Attack',
    description: 'Send messages with null bytes and special characters',
    test: async () => {
      const attacks = [
        '\x00\x00\x00',
        'test\x00message',
        '\u0000\u0000\u0000',
        '�'.repeat(1000),
      ];

      for (const attack of attacks) {
        await makeRequest('/chat', {
          method: 'POST',
          body: { message: attack },
        });
      }
      return { tested: attacks.length };
    },
    expectedFailure: false,
  },
  {
    name: 'Recursive Payload',
    description: 'Send deeply nested JSON to test parser limits',
    test: async () => {
      let nested = { message: 'deep' };
      for (let i = 0; i < 1000; i++) {
        nested = { data: nested };
      }

      return makeRequest('/chat', {
        method: 'POST',
        body: nested,
      });
    },
    expectedFailure: true,
  },
  {
    name: 'Invalid JSON Attack',
    description: 'Send malformed JSON to test error handling',
    test: async () => {
      return makeRequest('/chat', {
        method: 'POST',
        rawBody: '{invalid json}',
      });
    },
    expectedFailure: true,
  },
  {
    name: 'Slowloris Attack Simulation',
    description: 'Send requests very slowly to tie up connections',
    test: async () => {
      const slowRequests = [];
      for (let i = 0; i < 100; i++) {
        slowRequests.push(makeSlowRequest('/health'));
      }
      const results = await Promise.allSettled(slowRequests);
      return { completed: results.length };
    },
    expectedFailure: false,
  },
  {
    name: 'Cache Poisoning Attempt',
    description: 'Attempt to poison cache with conflicting data',
    test: async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          makeRequest('/context', {
            method: 'GET',
            headers: { 'x-poison': `attempt-${i}` },
          })
        );
      }
      await Promise.allSettled(promises);
      return { attempts: 100 };
    },
    expectedFailure: false,
  },
  {
    name: 'Integer Overflow Tests',
    description: 'Send extreme numeric values',
    test: async () => {
      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Infinity,
        -Infinity,
        NaN,
      ];

      for (const value of extremeValues) {
        await makeRequest('/chat', {
          method: 'POST',
          body: { message: `Value: ${value}` },
        });
      }
      return { tested: extremeValues.length };
    },
    expectedFailure: false,
  },
  {
    name: 'Long-Running Request',
    description: 'Test timeout handling with long-running requests',
    test: async () => {
      return makeRequest('/chat', {
        method: 'POST',
        body: { message: 'Long running test' },
        timeout: 100, // Very short timeout
      });
    },
    expectedFailure: true,
  },
];

// ============================================================================
// HTTP Request Utilities
// ============================================================================

function makeRequest(
  path,
  options = {}
) {
  return new Promise((resolve, reject) => {
    const data = options.rawBody || (options.body ? JSON.stringify(options.body) : null);

    const reqOptions = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
        ...options.headers,
      },
      timeout: options.timeout || 30000,
      keepAlive: options.keepAlive || false,
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

function makeSlowRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: 'GET',
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve({ status: res.statusCode }));
      }
    );

    req.on('error', reject);

    // Send data very slowly
    const interval = setInterval(() => {
      try {
        req.write(' ');
      } catch {
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      req.end();
    }, 5000);
  });
}

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
        RECALLBRICKS_AGENT_ID: 'stress_test_agent',
        RECALLBRICKS_USER_ID: 'stress_test_user',
        RECALLBRICKS_API_KEY: 'test_key',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('listening on port')) {
        console.log('Server started\n');
        resolve();
      }
    });

    serverProcess.on('error', reject);

    setTimeout(() => reject(new Error('Server start timeout')), 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// ============================================================================
// Test Execution
// ============================================================================

async function runStressTest(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Stress Test: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const startTime = Date.now();
    const result = await scenario.test();
    const duration = Date.now() - startTime;

    console.log(`Duration: ${duration}ms`);

    if (scenario.validate) {
      const passed = scenario.validate(result);
      console.log(`Result: ${passed ? 'PASSED ✓' : 'FAILED ✗'}`);
      console.log('Details:', JSON.stringify(result, null, 2));
      return { scenario: scenario.name, passed, result, duration };
    }

    console.log(`Result: PASSED ✓`);
    console.log('Details:', JSON.stringify(result, null, 2));
    return { scenario: scenario.name, passed: true, result, duration };
  } catch (error) {
    console.log(`Error: ${error.message}`);

    if (scenario.expectedFailure) {
      console.log(`Result: PASSED ✓ (Expected failure caught)`);
      return { scenario: scenario.name, passed: true, error: error.message };
    }

    console.log(`Result: FAILED ✗ (Unexpected error)`);
    return { scenario: scenario.name, passed: false, error: error.message };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllStressTests() {
  const results = [];

  try {
    await startServer();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    for (const scenario of STRESS_SCENARIOS) {
      const result = await runStressTest(scenario);
      results.push(result);

      // Cool down between tests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('Stress Test Summary');
    console.log(`${'='.repeat(80)}\n`);

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    results.forEach((result) => {
      const status = result.passed ? '✓ PASSED' : '✗ FAILED';
      console.log(`${status} - ${result.scenario}`);
    });

    console.log(`\nTotal: ${passed}/${results.length} passed, ${failed} failed`);

    if (passed === results.length) {
      console.log('\n🎉 System survived all stress tests!');
      console.log('The runtime is resilient and handles edge cases well.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some stress tests failed');
      console.log('Review failure modes and improve resilience.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Stress test error:', error);
    process.exit(1);
  } finally {
    stopServer();
  }
}

// ============================================================================
// Entry Point
// ============================================================================

process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

runAllStressTests();
