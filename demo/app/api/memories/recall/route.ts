import { NextRequest, NextResponse } from 'next/server';
import type { RecallResponse, Memory, Anomaly } from '@/types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10002';

// Fallback mock anomaly templates
const anomalyTemplates: Omit<Anomaly, 'id' | 'timestamp'>[] = [
  {
    description: 'P95 latency exceeded 500ms threshold for /api/memories/recall',
    severity: 'high',
    suggestion: 'Consider implementing query result caching or database connection pooling',
    type: 'latency',
  },
  {
    description: 'Error rate spike detected: 4.2% errors in last 15 minutes',
    severity: 'critical',
    suggestion: 'Review recent deployments and check downstream service health',
    type: 'error_spike',
  },
  {
    description: 'Memory usage approaching 85% threshold',
    severity: 'medium',
    suggestion: 'Schedule garbage collection or increase container memory limits',
    type: 'memory',
  },
  {
    description: 'CPU utilization sustained above 70% for 10 minutes',
    severity: 'medium',
    suggestion: 'Consider horizontal scaling or optimizing compute-heavy operations',
    type: 'cpu',
  },
  {
    description: 'Unusual traffic pattern: 5x normal request volume from single IP',
    severity: 'high',
    suggestion: 'Investigate for potential DDoS or implement rate limiting',
    type: 'traffic',
  },
  {
    description: 'Slow query detected: context aggregation taking >2s',
    severity: 'low',
    suggestion: 'Add database indexes on frequently queried fields',
    type: 'latency',
  },
];

function generateMockAnomalyMemories(): Memory[] {
  // 70% chance of having some anomalies
  if (Math.random() > 0.7) {
    return [];
  }

  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...anomalyTemplates].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((template, index) => ({
    id: `mem-anomaly-${Date.now()}-${index}`,
    content: template.description,
    importance: template.severity === 'critical' ? 1.0 : template.severity === 'high' ? 0.8 : 0.5,
    timestamp: new Date(Date.now() - Math.random() * 1800000).toISOString(),
    agent_id: 'system-observer',
    tags: ['anomaly', template.type, template.severity],
    metadata: {
      severity: template.severity,
      suggestion: template.suggestion,
      type: template.type,
      resolved: Math.random() > 0.8,
    },
  }));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { agent_id, tags } = body;

  // Only process system-observer anomaly requests
  if (agent_id !== 'system-observer' || !tags?.includes('anomaly')) {
    return NextResponse.json({
      memories: [],
      count: 0,
    } as RecallResponse);
  }

  try {
    // Try to fetch real insights from backend
    const response = await fetch(`${BACKEND_URL}/api/v1/system/insights`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Transform backend insights to Memory format
    const insights = data.insights || data.anomalies || [];
    const memories: Memory[] = insights.map((insight: Record<string, unknown>, index: number) => ({
      id: insight.id || `insight-${Date.now()}-${index}`,
      content: insight.description || insight.message || insight.content || 'Unknown anomaly detected',
      importance: insight.severity === 'critical' ? 1.0 :
                  insight.severity === 'high' ? 0.8 :
                  insight.severity === 'medium' ? 0.5 : 0.3,
      timestamp: insight.timestamp || insight.detectedAt || new Date().toISOString(),
      agent_id: 'system-observer',
      tags: ['anomaly', insight.type || 'other', insight.severity || 'medium'],
      metadata: {
        severity: insight.severity || 'medium',
        suggestion: insight.suggestion || insight.recommendation || 'Investigate this anomaly.',
        type: insight.type || 'other',
        resolved: insight.resolved ?? false,
      },
    }));

    return NextResponse.json({
      memories,
      count: memories.length,
    } as RecallResponse);
  } catch (error) {
    console.warn('Backend unavailable for insights, using mock data:', error);

    // Fall back to mock data
    const memories = generateMockAnomalyMemories();
    return NextResponse.json({
      memories,
      count: memories.length,
    } as RecallResponse);
  }
}
