import { NextRequest, NextResponse } from 'next/server';
import type { TelemetryResponse, TelemetryEvent, TelemetryMetrics } from '@/types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10002';

// Fallback mock data generators for when backend is unavailable
function generateMockMetrics(timeframe: string): TelemetryMetrics {
  const baseRequests = timeframe === '1h' ? 5000 : timeframe === '24h' ? 120000 : 800000;
  const variance = Math.random() * 0.2 - 0.1;

  return {
    totalRequests: Math.floor(baseRequests * (1 + variance)),
    avgLatency: 85 + Math.random() * 60,
    p95Latency: 180 + Math.random() * 120,
    errorRate: Math.random() * 2.5,
    slowQueries: Math.floor(Math.random() * 8),
    uptime: 99.95 + Math.random() * 0.05,
    activeConnections: 50 + Math.floor(Math.random() * 150),
    memoryUsage: 0.4 + Math.random() * 0.35,
    cpuUsage: 0.15 + Math.random() * 0.45,
  };
}

const endpoints = [
  '/api/memories/recall',
  '/api/memories/store',
  '/api/context/get',
  '/api/agent/identity',
  '/api/conversation/save',
  '/api/patterns/discover',
  '/api/memories/search',
  '/api/agent/register',
];

const methods: TelemetryEvent['method'][] = ['GET', 'POST', 'PUT', 'DELETE'];

function generateMockEvent(index: number): TelemetryEvent {
  const now = new Date();
  const timestamp = new Date(now.getTime() - index * (30000 + Math.random() * 30000));
  const isError = Math.random() < 0.05;
  const isSlow = !isError && Math.random() < 0.08;

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: timestamp.toISOString(),
    endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
    method: methods[Math.floor(Math.random() * methods.length)],
    latency: isError ? 0 : isSlow ? 500 + Math.random() * 1500 : 20 + Math.random() * 180,
    success: !isError,
    statusCode: isError ? (Math.random() > 0.5 ? 500 : 400) : 200,
    userId: `user-${Math.floor(Math.random() * 1000)}`,
    agentId: `agent-${Math.floor(Math.random() * 100)}`,
    error: isError ? (Math.random() > 0.5 ? 'Connection timeout' : 'Invalid request') : undefined,
  };
}

function generateMockEvents(count: number = 50): TelemetryEvent[] {
  return Array.from({ length: count }, (_, i) => generateMockEvent(i));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get('timeframe') || '1h';

  try {
    // Try to fetch from real backend
    const response = await fetch(`${BACKEND_URL}/api/v1/system/telemetry?timeframe=${timeframe}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Short timeout to fail fast if backend is down
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Transform backend response to match our frontend types if needed
    const telemetryResponse: TelemetryResponse = {
      metrics: {
        totalRequests: data.metrics?.totalRequests ?? data.totalRequests ?? 0,
        avgLatency: data.metrics?.avgLatency ?? data.avgLatency ?? 0,
        p95Latency: data.metrics?.p95Latency ?? data.p95Latency ?? 0,
        errorRate: data.metrics?.errorRate ?? data.errorRate ?? 0,
        slowQueries: data.metrics?.slowQueries ?? data.slowQueries ?? 0,
        uptime: data.metrics?.uptime ?? data.uptime ?? 99.9,
        activeConnections: data.metrics?.activeConnections ?? data.activeConnections ?? 0,
        memoryUsage: data.metrics?.memoryUsage ?? data.memoryUsage ?? 0,
        cpuUsage: data.metrics?.cpuUsage ?? data.cpuUsage ?? 0,
      },
      events: data.events || data.recentEvents || [],
      timeframe,
      generatedAt: data.generatedAt || new Date().toISOString(),
    };

    return NextResponse.json(telemetryResponse);
  } catch (error) {
    console.warn('Backend unavailable, using mock data:', error);

    // Fall back to mock data when backend is unavailable
    const mockResponse: TelemetryResponse = {
      metrics: generateMockMetrics(timeframe),
      events: generateMockEvents(50),
      timeframe,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(mockResponse);
  }
}
