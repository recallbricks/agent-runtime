import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TrendStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export function getLatencyColor(latency: number): string {
  if (latency < 200) return 'text-emerald-400';
  if (latency < 500) return 'text-amber-400';
  return 'text-red-400';
}

export function getLatencyTrend(latency: number): TrendStatus {
  if (latency < 200) return 'good';
  if (latency < 500) return 'warning';
  return 'critical';
}

export function getErrorRateTrend(rate: number): TrendStatus {
  if (rate < 1) return 'good';
  if (rate < 5) return 'warning';
  return 'critical';
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'medium':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'high':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    case 'critical':
      return 'text-red-400 bg-red-500/10 border-red-500/30';
    default:
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
  }
}

export function getMethodColor(method: string): string {
  switch (method) {
    case 'GET':
      return 'text-emerald-400';
    case 'POST':
      return 'text-blue-400';
    case 'PUT':
      return 'text-amber-400';
    case 'DELETE':
      return 'text-red-400';
    case 'PATCH':
      return 'text-purple-400';
    default:
      return 'text-zinc-400';
  }
}

export function generateMockSparkline(count: number = 20): number[] {
  const data: number[] = [];
  let value = 100 + Math.random() * 100;

  for (let i = 0; i < count; i++) {
    value += (Math.random() - 0.5) * 30;
    value = Math.max(50, Math.min(300, value));
    data.push(value);
  }

  return data;
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
