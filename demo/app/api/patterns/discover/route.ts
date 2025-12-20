import { NextRequest, NextResponse } from 'next/server';
import type { PatternResponse, Pattern } from '@/types';

const patternTemplates: Omit<Pattern, 'id' | 'detectedAt' | 'frequency'>[] = [
  {
    name: 'Latency Spike Pattern',
    type: 'performance',
    description: 'Detected periodic latency increases during peak hours',
    severity: 'medium',
    affectedEndpoints: ['/api/memories/recall', '/api/context/get'],
  },
  {
    name: 'Memory Pressure',
    type: 'performance',
    description: 'Memory usage trending upward over last 6 hours',
    severity: 'low',
    affectedEndpoints: ['/api/memories/store'],
  },
  {
    name: 'Error Clustering',
    type: 'error',
    description: 'Errors clustering around specific user sessions',
    severity: 'high',
    affectedEndpoints: ['/api/conversation/save'],
  },
  {
    name: 'Unusual Traffic Pattern',
    type: 'usage',
    description: 'Traffic volume 3x normal for this time period',
    severity: 'low',
    affectedEndpoints: ['/api/memories/search'],
  },
  {
    name: 'Auth Retry Storm',
    type: 'security',
    description: 'Multiple failed authentication attempts detected',
    severity: 'critical',
    affectedEndpoints: ['/api/agent/identity', '/api/agent/register'],
  },
];

function generatePatterns(): Pattern[] {
  // Randomly select 0-3 patterns to show
  const count = Math.floor(Math.random() * 4);
  const shuffled = [...patternTemplates].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((template, index) => ({
    ...template,
    id: `pattern-${Date.now()}-${index}`,
    detectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    frequency: Math.floor(Math.random() * 50) + 5,
    metadata: {
      confidence: 0.7 + Math.random() * 0.3,
      sampleSize: Math.floor(Math.random() * 1000) + 100,
    },
  }));
}

export async function GET(request: NextRequest) {
  await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 100));

  const patterns = generatePatterns();

  const response: PatternResponse = {
    patterns,
    analysisWindow: '1h',
    totalPatterns: patterns.length,
  };

  return NextResponse.json(response);
}
