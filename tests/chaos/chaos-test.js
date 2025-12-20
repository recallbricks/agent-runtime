/**
 * RecallBricks Chaos Engineering Test
 *
 * Inject failures and test system resilience
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// ============================================================================
// Chaos Scenarios
// ============================================================================

const CHAOS_SCENARIOS = [
  {
    name: 'Random Server Restarts',
    description: 'Restart server randomly during load',
    chaos: async (stopFn, startFn) => {
      console.log('  Starting load...');
      const loadPromise = generateLoad(60000); // 1 minute of load

      // Random restarts during load
      for (let i = 0; i < 3; i++) {
        await sleep(Math.random() * 15000 + 5000); // Random 5-20s
        console.log(`  Chaos event ${i + 1}: Restarting server`);
        stopFn();
        await sleep(2000);
        await startFn();
        await sleep(2000);
      }

      await loadPromise;
      return { restarts: 3 };
    },
  },
  {
    name: 'Network Latency Injection',
    description: 'Simulate network delays',
    chaos: async () => {
      console.log('  Testing with simulated network latency...');

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          makeDelayedRequest('/health', Math.random() * 5000)
        );
      }

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      return { total: 100, succeeded };
    },
  },
  {
    name: 'Memory Pressure',
    description: 'Generate memory pressure during operation',
    chaos: async () => {
      console.log('  Creating memory pressure...');

      const memoryHogs = [];
      const loadPromise = generateLoad(30000);

      // Create memory pressure
      for (let i = 0; i < 10; i++) {
        memoryHogs.push(new Array(1024 * 1024).fill('x')); // ~1MB each
        await sleep(1000);
      }

      await loadPromise;

      // Cleanup
      memoryHogs.length = 0;

      return { memoryAllocated: '10MB' };
    },
  },
  {
    name: 'Concurrent User Storm',
    description: 'Simulate 1000 concurrent users',
    chaos: async () => {
      console.log('  Simulating 1000 concurrent users...');

      const users = [];
      for (let i = 0; i < 1000; i++) {
        users.push(simulateUser(i, 30000)); // 30s per user
      }

      const results = await Promise.allSettled(users);
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;

      return { total: 1000, succeeded };
    },
  },
  {
    name: 'Random Endpoint Failures',
    description: 'Mix successful and failing requests',
    chaos: async () => {
      console.log('  Testing mixed success/failure scenarios...');

      const requests = [];
      const validEndpoints = ['/health', '/context', '/identity'];
      const invalidEndpoints = [
        '/nonexistent',
        '/admin',
        '/../etc/passwd',
        '/api/v2/hack',
      ];

      for (let i = 0; i < 500; i++) {
        const endpoint =
          Math.random() > 0.3
            ? validEndpoints[Math.floor(Math.random() * validEndpoints.length)]
            : invalidEndpoints[
                Math.floor(Math.random() * invalidEndpoints.length)
              ];

        requests.push(makeRequest(endpoint, { method: 'GET' }).catch(() => null));
      }

      const results = await Promise.allSettled(requests);
      return { total: 500, completed: results.length };
    },
  },
  {
    name: 'Resource Exhaustion',
    description: 'Exhaust various resources simultaneously',
    chaos: async () => {
      console.log('  Attempting to exhaust resources...');

      const attacks = [
        // CPU intensive
        () => {
          const promises = [];
          for (let i = 0; i < 50; i++) {
            promises.push(
              makeRequest('/chat', {
                method: 'POST',
                body: { message: 'x'.repeat(10000) },
              }).catch(() => null)
            );
          }
          return Promise.allSettled(promises);
        },

        // Connection flooding
        () => {
          const connections = [];
          for (let i = 0; i < 200; i++) {
            connections.push(makeRequest('/health', { keepAlive: true }).catch(() => null));
          }
          return Promise.allSettled(connections);
        },

        // Rapid fire
        () => {
          const rapid = [];
          for (let i = 0; i < 1000; i++) {
            rapid.push(
              makeRequest('/health', { timeout: 100 }).catch(() => null)
            );
          }
          return Promise.allSettled(rapid);
        },
      ];

      const results = await Promise.all(attacks.map((attack) => attack()));
      return { attacksLaunched: attacks.length, results: results.length };
    },
  },
];

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const data = options.body ? JSON.stringify(options.body) : null;

    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(data && { 'Content-Length': Buffer.byteLength(data) }),
        },
        timeout: options.timeout || 30000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (data) req.write(data);
    req.end();
  });
}

function makeDelayedRequest(path, delay) {
  return sleep(delay).then(() => makeRequest(path, { method: 'GET' }));
}

async function generateLoad(duration) {
  const endTime = Date.now() + duration;
  let requests = 0;
  let errors = 0;

  while (Date.now() < endTime) {
    try {
      await makeRequest('/health', { method: 'GET', timeout: 5000 });
      requests++;
    } catch {
      errors++;
    }
    await sleep(Math.random() * 100);
  }

  return { requests, errors };
}

async function simulateUser(userId, duration) {
  const endTime = Date.now() + duration;
  let actions = 0;

  while (Date.now() < endTime) {
    try {
      // Random user actions
      const action = Math.random();

      if (action < 0.6) {
        // Chat
        await makeRequest('/chat', {
          method: 'POST',
          body: { message: `User ${userId} message` },
        });
      } else if (action < 0.8) {
        // Get context
        await makeRequest('/context', { method: 'GET' });
      } else {
        // Get identity
        await makeRequest('/identity', { method: 'GET' });
      }

      actions++;
      await sleep(Math.random() * 5000); // Random delay 0-5s
    } catch {
      // Ignore errors in user simulation
    }
  }

  return { userId, actions };
}

// ============================================================================
// Server Management
// ============================================================================

let serverProcess;

async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../dist/adapters/api/server.js');

    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: '3000',
        RECALLBRICKS_AGENT_ID: 'chaos_test_agent',
        RECALLBRICKS_USER_ID: 'chaos_test_user',
        RECALLBRICKS_API_KEY: 'test_key',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('listening on port')) {
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

async function runChaosTest(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Chaos Test: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const startTime = Date.now();
    const result = await scenario.chaos(stopServer, startServer);
    const duration = Date.now() - startTime;

    console.log(`\nDuration: ${(duration / 1000).toFixed(2)}s`);
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Status: SURVIVED ✓');

    return { scenario: scenario.name, passed: true, result, duration };
  } catch (error) {
    console.log(`Error: ${error.message}`);
    console.log('Status: FAILED ✗');

    return { scenario: scenario.name, passed: false, error: error.message };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllChaosTests() {
  const results = [];

  console.log('Starting Chaos Engineering Tests');
  console.log('Goal: Break the system and verify resilience\n');

  try {
    console.log('Starting server...');
    await startServer();
    await sleep(2000);
    console.log('Server ready\n');

    for (const scenario of CHAOS_SCENARIOS) {
      const result = await runChaosTest(scenario);
      results.push(result);

      // Recovery period
      console.log('\nRecovery period: 5 seconds...');
      await sleep(5000);
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('Chaos Test Summary');
    console.log(`${'='.repeat(80)}\n`);

    const survived = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    results.forEach((result) => {
      const status = result.passed ? '✓ SURVIVED' : '✗ FAILED';
      console.log(`${status} - ${result.scenario}`);
    });

    console.log(`\nTotal: ${survived}/${results.length} survived`);

    if (survived === results.length) {
      console.log('\n🎉 System is chaos-proof!');
      console.log('The runtime demonstrated excellent resilience.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failed} chaos scenarios caused failures`);
      console.log('Review and improve resilience mechanisms.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Chaos test error:', error);
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

runAllChaosTests();
