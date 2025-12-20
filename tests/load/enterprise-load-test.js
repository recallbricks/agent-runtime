/**
 * RecallBricks Enterprise Load Test - 150% Capacity
 *
 * Comprehensive end-to-end load testing for enterprise readiness
 * Tests at 150% of expected production capacity
 */

const http = require('http');
const https = require('https');
const { EventEmitter } = require('events');

// ============================================================================
// Enterprise Load Test Configuration
// ============================================================================

const CONFIG = {
  // Target API (use RecallBricks API directly for E2E)
  apiUrl: process.env.RECALLBRICKS_API_URL || 'https://recallbricks-api-clean.onrender.com',
  apiKey: process.env.RECALLBRICKS_API_KEY || 'test_key',
  projectId: process.env.RECALLBRICKS_USER_ID || 'enterprise_load_test',

  // Enterprise baseline: 1000 concurrent users
  // 150% capacity = 1500 concurrent users
  baselineConcurrency: 1000,
  capacityMultiplier: 1.5,

  // Test durations
  warmupDuration: 10000,      // 10 seconds warmup
  testDuration: 60000,        // 60 seconds per test
  cooldownDuration: 5000,     // 5 seconds cooldown

  // SLA requirements
  sla: {
    maxLatencyP50: 500,       // 500ms p50
    maxLatencyP95: 2000,      // 2s p95
    maxLatencyP99: 5000,      // 5s p99
    maxErrorRate: 0.01,       // 1% error rate
    minThroughput: 100,       // 100 req/s minimum
  },
};

// Calculate 150% capacity
const TARGET_CONCURRENCY = Math.ceil(CONFIG.baselineConcurrency * CONFIG.capacityMultiplier);

// ============================================================================
// Metrics Collector
// ============================================================================

class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.requests = {
      total: 0,
      success: 0,
      failed: 0,
      timeout: 0,
    };
    this.latencies = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
    this.memorySnapshots = [];
  }

  recordRequest(success, latency, error = null) {
    this.requests.total++;
    if (success) {
      this.requests.success++;
    } else {
      this.requests.failed++;
      if (error) {
        this.errors.push(error);
      }
    }
    this.latencies.push(latency);
  }

  recordTimeout() {
    this.requests.total++;
    this.requests.timeout++;
    this.requests.failed++;
  }

  recordMemory() {
    const usage = process.memoryUsage();
    this.memorySnapshots.push({
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    });
  }

  getPercentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getResults() {
    const duration = (this.endTime - this.startTime) / 1000;
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);

    return {
      duration,
      requests: this.requests,
      throughput: this.requests.total / duration,
      successRate: this.requests.success / this.requests.total,
      errorRate: this.requests.failed / this.requests.total,
      latency: {
        min: sortedLatencies[0] || 0,
        max: sortedLatencies[sortedLatencies.length - 1] || 0,
        mean: sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length || 0,
        p50: this.getPercentile(sortedLatencies, 50),
        p75: this.getPercentile(sortedLatencies, 75),
        p90: this.getPercentile(sortedLatencies, 90),
        p95: this.getPercentile(sortedLatencies, 95),
        p99: this.getPercentile(sortedLatencies, 99),
        p999: this.getPercentile(sortedLatencies, 99.9),
      },
      memory: {
        initial: this.memorySnapshots[0],
        final: this.memorySnapshots[this.memorySnapshots.length - 1],
        peak: this.memorySnapshots.reduce((max, s) => s.heapUsed > max.heapUsed ? s : max, this.memorySnapshots[0]),
      },
      errors: this.errors.slice(0, 10), // First 10 errors
    };
  }
}

// ============================================================================
// HTTP Request Helper
// ============================================================================

function makeRequest(options, body = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const isHttps = options.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 300;
        resolve({
          success,
          latency,
          statusCode: res.statusCode,
          data: data,
          error: success ? null : `HTTP ${res.statusCode}`,
        });
      });
    });

    req.on('error', (error) => {
      const latency = Date.now() - startTime;
      resolve({
        success: false,
        latency,
        statusCode: 0,
        data: null,
        error: error.message,
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      resolve({
        success: false,
        latency: 30000,
        statusCode: 0,
        data: null,
        error: 'TIMEOUT',
      });
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// ============================================================================
// Test Scenarios
// ============================================================================

const SCENARIOS = [
  {
    name: 'Memory Learn Endpoint - 150% Load',
    description: 'Test POST /api/v1/memories/learn at 150% capacity',
    endpoint: '/api/v1/memories/learn',
    method: 'POST',
    concurrency: TARGET_CONCURRENCY,
    duration: CONFIG.testDuration,
    generateBody: (i) => JSON.stringify({
      text: `Enterprise load test message ${i}: This is a comprehensive test of the memory system under heavy load conditions. Testing persistence, retrieval, and metadata extraction capabilities.`,
      source: 'enterprise-load-test',
      project_id: CONFIG.projectId,
      metadata: {
        test_id: `load_test_${Date.now()}_${i}`,
        importance: Math.random(),
        timestamp: new Date().toISOString(),
      },
    }),
  },
  {
    name: 'Memory Recall Endpoint - 150% Load',
    description: 'Test GET /api/v1/memories/recall at 150% capacity',
    endpoint: '/api/v1/memories/recall',
    method: 'GET',
    concurrency: TARGET_CONCURRENCY,
    duration: CONFIG.testDuration,
    queryParams: {
      query: 'enterprise load test',
      limit: 10,
      organized: true,
      project_id: CONFIG.projectId,
    },
  },
  {
    name: 'Mixed Workload - 150% Load',
    description: 'Mixed read/write workload (70% read, 30% write)',
    mixed: true,
    concurrency: TARGET_CONCURRENCY,
    duration: CONFIG.testDuration,
    distribution: {
      recall: 0.7,  // 70% reads
      learn: 0.3,   // 30% writes
    },
  },
  {
    name: 'Burst Traffic Simulation',
    description: 'Simulate traffic bursts at 200% capacity',
    endpoint: '/api/v1/memories/recall',
    method: 'GET',
    concurrency: Math.ceil(TARGET_CONCURRENCY * 1.33), // 200% of baseline
    duration: 30000, // Shorter duration for burst
    queryParams: {
      query: 'burst test query',
      limit: 5,
      project_id: CONFIG.projectId,
    },
  },
  {
    name: 'Sustained High Load',
    description: 'Sustained load at 150% for extended period',
    endpoint: '/api/v1/memories/recall',
    method: 'GET',
    concurrency: TARGET_CONCURRENCY,
    duration: CONFIG.testDuration * 2, // 2 minutes
    queryParams: {
      query: 'sustained load test',
      limit: 10,
      project_id: CONFIG.projectId,
    },
  },
  {
    name: 'Large Payload Test',
    description: 'Test with large text payloads',
    endpoint: '/api/v1/memories/learn',
    method: 'POST',
    concurrency: Math.ceil(TARGET_CONCURRENCY * 0.5), // 75% for large payloads
    duration: CONFIG.testDuration,
    generateBody: (i) => JSON.stringify({
      text: `Large payload test ${i}: ${'Lorem ipsum dolor sit amet. '.repeat(100)}`,
      source: 'enterprise-load-test-large',
      project_id: CONFIG.projectId,
      metadata: {
        test_id: `large_payload_${Date.now()}_${i}`,
        size: 'large',
      },
    }),
  },
];

// ============================================================================
// Load Test Runner
// ============================================================================

class LoadTestRunner extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.metrics = new MetricsCollector();
    this.running = false;
    this.activeRequests = 0;
  }

  async runScenario(scenario) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Concurrency: ${scenario.concurrency} (150% of ${CONFIG.baselineConcurrency})`);
    console.log(`Duration: ${scenario.duration / 1000}s`);
    console.log(`${'='.repeat(80)}\n`);

    this.metrics.reset();
    this.running = true;
    this.metrics.startTime = Date.now();

    const url = new URL(CONFIG.apiUrl);
    const baseOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.apiKey,
      },
    };

    // Memory monitoring interval
    const memoryInterval = setInterval(() => {
      this.metrics.recordMemory();
    }, 1000);

    // Progress reporting interval
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - this.metrics.startTime) / 1000;
      const progress = Math.min(100, (elapsed / (scenario.duration / 1000)) * 100).toFixed(1);
      const throughput = (this.metrics.requests.total / elapsed).toFixed(1);
      const errorRate = ((this.metrics.requests.failed / Math.max(1, this.metrics.requests.total)) * 100).toFixed(2);
      process.stdout.write(`\rProgress: ${progress}% | Requests: ${this.metrics.requests.total} | Throughput: ${throughput} req/s | Errors: ${errorRate}% | Active: ${this.activeRequests}    `);
    }, 500);

    // Request generator
    const endTime = Date.now() + scenario.duration;
    let requestId = 0;

    const generateRequest = async () => {
      if (!this.running || Date.now() >= endTime) return;

      this.activeRequests++;
      requestId++;
      const currentId = requestId;

      let options, body;

      if (scenario.mixed) {
        // Mixed workload
        const rand = Math.random();
        if (rand < scenario.distribution.recall) {
          options = {
            ...baseOptions,
            method: 'GET',
            path: `/api/v1/memories/recall?query=mixed_test&limit=10&project_id=${CONFIG.projectId}`,
          };
          body = null;
        } else {
          options = {
            ...baseOptions,
            method: 'POST',
            path: '/api/v1/memories/learn',
          };
          body = JSON.stringify({
            text: `Mixed workload write ${currentId}`,
            source: 'mixed-load-test',
            project_id: CONFIG.projectId,
          });
        }
      } else if (scenario.method === 'GET') {
        const params = new URLSearchParams(scenario.queryParams).toString();
        options = {
          ...baseOptions,
          method: 'GET',
          path: `${scenario.endpoint}?${params}`,
        };
        body = null;
      } else {
        options = {
          ...baseOptions,
          method: scenario.method,
          path: scenario.endpoint,
        };
        body = scenario.generateBody ? scenario.generateBody(currentId) : null;
      }

      try {
        const result = await makeRequest(options, body);
        this.metrics.recordRequest(result.success, result.latency, result.error);
      } catch (error) {
        this.metrics.recordRequest(false, 0, error.message);
      }

      this.activeRequests--;

      // Continue generating requests if still running
      if (this.running && Date.now() < endTime) {
        setImmediate(generateRequest);
      }
    };

    // Start concurrent request generators
    const generators = [];
    for (let i = 0; i < scenario.concurrency; i++) {
      generators.push(generateRequest());
      // Stagger start slightly to avoid thundering herd
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, scenario.duration));

    // Stop and wait for remaining requests
    this.running = false;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Grace period

    clearInterval(memoryInterval);
    clearInterval(progressInterval);
    console.log('\n');

    this.metrics.endTime = Date.now();
    return this.metrics.getResults();
  }

  analyzeSLA(results) {
    const sla = CONFIG.sla;
    const checks = {
      latencyP50: {
        passed: results.latency.p50 <= sla.maxLatencyP50,
        value: results.latency.p50,
        threshold: sla.maxLatencyP50,
        unit: 'ms',
      },
      latencyP95: {
        passed: results.latency.p95 <= sla.maxLatencyP95,
        value: results.latency.p95,
        threshold: sla.maxLatencyP95,
        unit: 'ms',
      },
      latencyP99: {
        passed: results.latency.p99 <= sla.maxLatencyP99,
        value: results.latency.p99,
        threshold: sla.maxLatencyP99,
        unit: 'ms',
      },
      errorRate: {
        passed: results.errorRate <= sla.maxErrorRate,
        value: (results.errorRate * 100).toFixed(2),
        threshold: (sla.maxErrorRate * 100).toFixed(2),
        unit: '%',
      },
      throughput: {
        passed: results.throughput >= sla.minThroughput,
        value: results.throughput.toFixed(2),
        threshold: sla.minThroughput,
        unit: 'req/s',
      },
    };

    return checks;
  }

  printResults(results, slaChecks) {
    console.log('Performance Results:');
    console.log('─'.repeat(60));
    console.log(`  Total Requests:    ${results.requests.total}`);
    console.log(`  Successful:        ${results.requests.success}`);
    console.log(`  Failed:            ${results.requests.failed}`);
    console.log(`  Timeouts:          ${results.requests.timeout}`);
    console.log(`  Duration:          ${results.duration.toFixed(2)}s`);
    console.log(`  Throughput:        ${results.throughput.toFixed(2)} req/s`);
    console.log(`  Success Rate:      ${(results.successRate * 100).toFixed(2)}%`);
    console.log(`  Error Rate:        ${(results.errorRate * 100).toFixed(2)}%`);
    console.log('');
    console.log('Latency Distribution:');
    console.log('─'.repeat(60));
    console.log(`  Min:               ${results.latency.min.toFixed(2)}ms`);
    console.log(`  Mean:              ${results.latency.mean.toFixed(2)}ms`);
    console.log(`  p50 (Median):      ${results.latency.p50.toFixed(2)}ms`);
    console.log(`  p75:               ${results.latency.p75.toFixed(2)}ms`);
    console.log(`  p90:               ${results.latency.p90.toFixed(2)}ms`);
    console.log(`  p95:               ${results.latency.p95.toFixed(2)}ms`);
    console.log(`  p99:               ${results.latency.p99.toFixed(2)}ms`);
    console.log(`  p99.9:             ${results.latency.p999.toFixed(2)}ms`);
    console.log(`  Max:               ${results.latency.max.toFixed(2)}ms`);
    console.log('');
    console.log('SLA Compliance:');
    console.log('─'.repeat(60));

    let allPassed = true;
    for (const [name, check] of Object.entries(slaChecks)) {
      const status = check.passed ? '✓ PASS' : '✗ FAIL';
      const color = check.passed ? '' : '';
      console.log(`  ${status} ${name}: ${check.value}${check.unit} (threshold: ${check.threshold}${check.unit})`);
      if (!check.passed) allPassed = false;
    }

    console.log('');
    console.log('Memory Usage:');
    console.log('─'.repeat(60));
    if (results.memory.initial && results.memory.final) {
      const heapGrowth = results.memory.final.heapUsed - results.memory.initial.heapUsed;
      console.log(`  Initial Heap:      ${(results.memory.initial.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final Heap:        ${(results.memory.final.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Peak Heap:         ${(results.memory.peak.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Heap Growth:       ${(heapGrowth / 1024 / 1024).toFixed(2)} MB`);
    }

    if (results.errors.length > 0) {
      console.log('');
      console.log('Sample Errors:');
      console.log('─'.repeat(60));
      results.errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    }

    return allPassed;
  }
}

// ============================================================================
// Main Test Execution
// ============================================================================

async function runEnterpriseLoadTest() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                 RecallBricks Enterprise Load Test - 150% Capacity            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Target API:        ${CONFIG.apiUrl.padEnd(54)}║
║  Baseline Users:    ${String(CONFIG.baselineConcurrency).padEnd(54)}║
║  Test Capacity:     ${(CONFIG.capacityMultiplier * 100 + '%').padEnd(54)}║
║  Target Concurrency: ${String(TARGET_CONCURRENCY).padEnd(53)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  const runner = new LoadTestRunner(CONFIG);
  const allResults = [];
  let overallPassed = true;

  // Warmup
  console.log('Warming up API...');
  await new Promise(resolve => setTimeout(resolve, CONFIG.warmupDuration));

  // Run each scenario
  for (const scenario of SCENARIOS) {
    try {
      const results = await runner.runScenario(scenario);
      const slaChecks = runner.analyzeSLA(results);
      const passed = runner.printResults(results, slaChecks);

      allResults.push({
        scenario: scenario.name,
        results,
        slaChecks,
        passed,
      });

      if (!passed) overallPassed = false;

      // Cooldown between scenarios
      console.log(`\nCooling down for ${CONFIG.cooldownDuration / 1000}s...\n`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.cooldownDuration));
    } catch (error) {
      console.error(`Error running scenario ${scenario.name}:`, error.message);
      allResults.push({
        scenario: scenario.name,
        error: error.message,
        passed: false,
      });
      overallPassed = false;
    }
  }

  // Final Summary
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          ENTERPRISE READINESS REPORT                          ║
╠══════════════════════════════════════════════════════════════════════════════╣`);

  allResults.forEach(result => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const line = `║  ${status}  ${result.scenario}`;
    console.log(line.padEnd(79) + '║');
  });

  const passedCount = allResults.filter(r => r.passed).length;
  const totalCount = allResults.length;

  console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total: ${passedCount}/${totalCount} scenarios passed at 150% capacity`.padEnd(79) + '║');
  console.log(`║  `.padEnd(79) + '║');

  if (overallPassed) {
    console.log(`║  ✓ ENTERPRISE READY - System handles 150% capacity within SLA`.padEnd(79) + '║');
  } else {
    console.log(`║  ✗ NOT READY - Some scenarios failed SLA requirements`.padEnd(79) + '║');
  }

  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);

  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      apiUrl: CONFIG.apiUrl,
      baselineConcurrency: CONFIG.baselineConcurrency,
      capacityMultiplier: CONFIG.capacityMultiplier,
      targetConcurrency: TARGET_CONCURRENCY,
      sla: CONFIG.sla,
    },
    results: allResults,
    summary: {
      totalScenarios: totalCount,
      passedScenarios: passedCount,
      enterpriseReady: overallPassed,
    },
  };

  console.log('\nDetailed report saved to: enterprise-load-test-report.json');
  require('fs').writeFileSync(
    'tests/load/enterprise-load-test-report.json',
    JSON.stringify(report, null, 2)
  );

  process.exit(overallPassed ? 0 : 1);
}

// ============================================================================
// Entry Point
// ============================================================================

process.on('SIGINT', () => {
  console.log('\nTest interrupted, generating partial report...');
  process.exit(1);
});

runEnterpriseLoadTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
