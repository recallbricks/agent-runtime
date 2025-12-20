/**
 * RecallBricks Agent Runtime - Metrics & Monitoring
 *
 * Enterprise-grade metrics collection and export
 */

import { Logger } from '../types';

// ============================================================================
// Metrics Types
// ============================================================================

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Histogram {
  count: number;
  sum: number;
  buckets: Map<number, number>; // bucket upper bound -> count
}

export interface Summary {
  count: number;
  sum: number;
  quantiles: Map<number, number>; // quantile -> value
}

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

// ============================================================================
// Metric Classes
// ============================================================================

export class Counter {
  private value = 0;
  private labels = new Map<string, number>();

  constructor(private name: string, private help: string) {}

  inc(value = 1, labels?: Record<string, string>): void {
    if (labels) {
      const key = JSON.stringify(labels);
      this.labels.set(key, (this.labels.get(key) || 0) + value);
    } else {
      this.value += value;
    }
  }

  getValue(labels?: Record<string, string>): number {
    if (labels) {
      const key = JSON.stringify(labels);
      return this.labels.get(key) || 0;
    }
    return this.value;
  }

  reset(): void {
    this.value = 0;
    this.labels.clear();
  }

  export(): string {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} counter\n`;

    if (this.labels.size === 0) {
      output += `${this.name} ${this.value}\n`;
    } else {
      for (const [labelsJson, value] of this.labels) {
        const labels = JSON.parse(labelsJson);
        const labelStr = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        output += `${this.name}{${labelStr}} ${value}\n`;
      }
    }

    return output;
  }
}

export class Gauge {
  private value = 0;
  private labels = new Map<string, number>();

  constructor(private name: string, private help: string) {}

  set(value: number, labels?: Record<string, string>): void {
    if (labels) {
      const key = JSON.stringify(labels);
      this.labels.set(key, value);
    } else {
      this.value = value;
    }
  }

  inc(value = 1, labels?: Record<string, string>): void {
    if (labels) {
      const key = JSON.stringify(labels);
      this.labels.set(key, (this.labels.get(key) || 0) + value);
    } else {
      this.value += value;
    }
  }

  dec(value = 1, labels?: Record<string, string>): void {
    this.inc(-value, labels);
  }

  getValue(labels?: Record<string, string>): number {
    if (labels) {
      const key = JSON.stringify(labels);
      return this.labels.get(key) || 0;
    }
    return this.value;
  }

  reset(): void {
    this.value = 0;
    this.labels.clear();
  }

  export(): string {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} gauge\n`;

    if (this.labels.size === 0) {
      output += `${this.name} ${this.value}\n`;
    } else {
      for (const [labelsJson, value] of this.labels) {
        const labels = JSON.parse(labelsJson);
        const labelStr = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        output += `${this.name}{${labelStr}} ${value}\n`;
      }
    }

    return output;
  }
}

export class HistogramMetric {
  private observations = new Map<string, Histogram>();
  private buckets: number[];

  constructor(
    private name: string,
    private help: string,
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  ) {
    this.buckets = [...buckets, Infinity].sort((a, b) => a - b);
  }

  observe(value: number, labels?: Record<string, string>): void {
    const key = labels ? JSON.stringify(labels) : 'default';
    let histogram = this.observations.get(key);

    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: new Map(this.buckets.map((b) => [b, 0])),
      };
      this.observations.set(key, histogram);
    }

    histogram.count++;
    histogram.sum += value;

    // Update buckets
    for (const bucket of this.buckets) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  reset(): void {
    this.observations.clear();
  }

  export(): string {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} histogram\n`;

    for (const [labelsJson, histogram] of this.observations) {
      const labels = labelsJson !== 'default' ? JSON.parse(labelsJson) : {};
      const labelStr = Object.entries(labels).length > 0
        ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
        : '';

      for (const [bucket, count] of histogram.buckets) {
        const le = bucket === Infinity ? '+Inf' : bucket.toString();
        output += `${this.name}_bucket${labelStr}{le="${le}"} ${count}\n`;
      }

      output += `${this.name}_sum${labelStr} ${histogram.sum}\n`;
      output += `${this.name}_count${labelStr} ${histogram.count}\n`;
    }

    return output;
  }
}

// ============================================================================
// Metrics Registry
// ============================================================================

export class MetricsRegistry {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, HistogramMetric>();

  constructor(private logger: Logger) {}

  /**
   * Create or get a counter
   */
  counter(name: string, help: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter(name, help));
      this.logger.debug(`Counter registered: ${name}`);
    }
    return this.counters.get(name)!;
  }

  /**
   * Create or get a gauge
   */
  gauge(name: string, help: string): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Gauge(name, help));
      this.logger.debug(`Gauge registered: ${name}`);
    }
    return this.gauges.get(name)!;
  }

  /**
   * Create or get a histogram
   */
  histogram(name: string, help: string, buckets?: number[]): HistogramMetric {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new HistogramMetric(name, help, buckets));
      this.logger.debug(`Histogram registered: ${name}`);
    }
    return this.histograms.get(name)!;
  }

  /**
   * Export all metrics in Prometheus format
   */
  export(): string {
    let output = '';

    for (const counter of this.counters.values()) {
      output += counter.export() + '\n';
    }

    for (const gauge of this.gauges.values()) {
      output += gauge.export() + '\n';
    }

    for (const histogram of this.histograms.values()) {
      output += histogram.export() + '\n';
    }

    return output;
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const gauge of this.gauges.values()) {
      gauge.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
    this.logger.info('All metrics reset');
  }

  /**
   * Get metrics summary as JSON
   */
  getSummary(): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    for (const [name, counter] of this.counters) {
      summary[name] = counter.getValue();
    }

    for (const [name, gauge] of this.gauges) {
      summary[name] = gauge.getValue();
    }

    return summary;
  }
}

// ============================================================================
// Standard Runtime Metrics
// ============================================================================

export class RuntimeMetrics {
  private registry: MetricsRegistry;

  // Request metrics
  public requestsTotal: Counter;
  public requestDuration: HistogramMetric;
  public requestErrors: Counter;
  public requestsInFlight: Gauge;

  // LLM metrics
  public llmRequestsTotal: Counter;
  public llmRequestDuration: HistogramMetric;
  public llmTokensUsed: Counter;
  public llmErrors: Counter;

  // Context metrics
  public contextLoadsTotal: Counter;
  public contextLoadDuration: HistogramMetric;
  public contextCacheHits: Counter;
  public contextCacheMisses: Counter;

  // AutoSaver metrics
  public savesTotal: Counter;
  public saveDuration: HistogramMetric;
  public saveQueueSize: Gauge;
  public saveErrors: Counter;

  // Identity Validation metrics
  public identityViolationsTotal: Counter;
  public identityCorrectionsTotal: Counter;

  // Circuit Breaker metrics
  public circuitBreakerState: Gauge;
  public circuitBreakerTrips: Counter;

  // System metrics
  public uptimeSeconds: Gauge;
  public memoryUsageBytes: Gauge;
  public cpuUsagePercent: Gauge;

  constructor(logger: Logger) {
    this.registry = new MetricsRegistry(logger);

    // Initialize all metrics
    this.requestsTotal = this.registry.counter(
      'recallbricks_requests_total',
      'Total number of requests'
    );

    this.requestDuration = this.registry.histogram(
      'recallbricks_request_duration_seconds',
      'Request duration in seconds',
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
    );

    this.requestErrors = this.registry.counter(
      'recallbricks_request_errors_total',
      'Total number of request errors'
    );

    this.requestsInFlight = this.registry.gauge(
      'recallbricks_requests_in_flight',
      'Number of requests currently being processed'
    );

    this.llmRequestsTotal = this.registry.counter(
      'recallbricks_llm_requests_total',
      'Total number of LLM requests'
    );

    this.llmRequestDuration = this.registry.histogram(
      'recallbricks_llm_request_duration_seconds',
      'LLM request duration in seconds'
    );

    this.llmTokensUsed = this.registry.counter(
      'recallbricks_llm_tokens_used_total',
      'Total number of LLM tokens used'
    );

    this.llmErrors = this.registry.counter(
      'recallbricks_llm_errors_total',
      'Total number of LLM errors'
    );

    this.contextLoadsTotal = this.registry.counter(
      'recallbricks_context_loads_total',
      'Total number of context loads'
    );

    this.contextLoadDuration = this.registry.histogram(
      'recallbricks_context_load_duration_seconds',
      'Context load duration in seconds'
    );

    this.contextCacheHits = this.registry.counter(
      'recallbricks_context_cache_hits_total',
      'Total number of context cache hits'
    );

    this.contextCacheMisses = this.registry.counter(
      'recallbricks_context_cache_misses_total',
      'Total number of context cache misses'
    );

    this.savesTotal = this.registry.counter(
      'recallbricks_saves_total',
      'Total number of conversation saves'
    );

    this.saveDuration = this.registry.histogram(
      'recallbricks_save_duration_seconds',
      'Save duration in seconds'
    );

    this.saveQueueSize = this.registry.gauge(
      'recallbricks_save_queue_size',
      'Current save queue size'
    );

    this.saveErrors = this.registry.counter(
      'recallbricks_save_errors_total',
      'Total number of save errors'
    );

    this.identityViolationsTotal = this.registry.counter(
      'recallbricks_identity_violations_total',
      'Total number of identity violations detected'
    );

    this.identityCorrectionsTotal = this.registry.counter(
      'recallbricks_identity_corrections_total',
      'Total number of identity corrections applied'
    );

    this.circuitBreakerState = this.registry.gauge(
      'recallbricks_circuit_breaker_state',
      'Circuit breaker state (0=closed, 1=half-open, 2=open)'
    );

    this.circuitBreakerTrips = this.registry.counter(
      'recallbricks_circuit_breaker_trips_total',
      'Total number of circuit breaker trips'
    );

    this.uptimeSeconds = this.registry.gauge(
      'recallbricks_uptime_seconds',
      'Uptime in seconds'
    );

    this.memoryUsageBytes = this.registry.gauge(
      'recallbricks_memory_usage_bytes',
      'Memory usage in bytes'
    );

    this.cpuUsagePercent = this.registry.gauge(
      'recallbricks_cpu_usage_percent',
      'CPU usage percentage'
    );

    // Start collecting system metrics
    this.startSystemMetricsCollection();
  }

  /**
   * Start collecting system metrics
   */
  private startSystemMetricsCollection(): void {
    const startTime = Date.now();

    setInterval(() => {
      // Uptime
      this.uptimeSeconds.set((Date.now() - startTime) / 1000);

      // Memory usage
      const memUsage = process.memoryUsage();
      this.memoryUsageBytes.set(memUsage.heapUsed);

      // CPU usage (approximate)
      const cpuUsage = process.cpuUsage();
      const totalUsage = cpuUsage.user + cpuUsage.system;
      this.cpuUsagePercent.set(totalUsage / 10000); // Rough estimate
    }, 5000); // Every 5 seconds
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    return this.registry.export();
  }

  /**
   * Get metrics summary
   */
  getSummary(): Record<string, unknown> {
    return this.registry.getSummary();
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.registry.resetAll();
  }
}
