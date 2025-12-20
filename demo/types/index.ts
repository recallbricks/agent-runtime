// System Telemetry Types
export interface TelemetryMetrics {
  totalRequests: number;
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  slowQueries: number;
  uptime: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  latency: number;
  success: boolean;
  statusCode: number;
  userId?: string;
  agentId?: string;
  error?: string;
}

export interface TelemetryResponse {
  metrics: TelemetryMetrics;
  events: TelemetryEvent[];
  timeframe: string;
  generatedAt: string;
}

// Pattern Discovery Types
export interface Pattern {
  id: string;
  name: string;
  type: 'performance' | 'error' | 'usage' | 'security';
  description: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  affectedEndpoints: string[];
  metadata?: Record<string, unknown>;
}

export interface PatternResponse {
  patterns: Pattern[];
  analysisWindow: string;
  totalPatterns: number;
}

// Anomaly Types
export interface Anomaly {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  timestamp: string;
  type: 'latency' | 'error_spike' | 'memory' | 'cpu' | 'traffic' | 'other';
  metrics?: Record<string, number>;
  resolved?: boolean;
}

export interface AnomalyResponse {
  anomalies: Anomaly[];
  systemHealthy: boolean;
  lastChecked: string;
}

// Memory Types (for RecallBricks API)
export interface Memory {
  id: string;
  content: string;
  importance: number;
  timestamp: string;
  agent_id: string;
  tags?: string[];
  metadata?: {
    severity?: string;
    suggestion?: string;
    type?: string;
    [key: string]: unknown;
  };
}

export interface RecallRequest {
  agent_id: string;
  query?: string;
  tags?: string[];
  limit?: number;
}

export interface RecallResponse {
  memories: Memory[];
  count: number;
}

// Component Props Types
export type TrendStatus = 'good' | 'warning' | 'critical';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend: TrendStatus;
  subtitle?: string;
  format?: 'number' | 'percentage' | 'duration' | 'bytes';
  previousValue?: number;
  sparklineData?: number[];
}

export interface EventItemProps {
  timestamp: string;
  endpoint: string;
  method: TelemetryEvent['method'];
  latency: number;
  success: boolean;
  statusCode: number;
  isNew?: boolean;
}

export interface AnomalyCardProps {
  description: string;
  severity: Anomaly['severity'];
  suggestion: string;
  timestamp: string;
  type?: Anomaly['type'];
  resolved?: boolean;
}

// Timeframe type
export type Timeframe = '1h' | '24h' | '7d';
