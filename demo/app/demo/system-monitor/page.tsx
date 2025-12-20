'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MetricCard,
  EventItem,
  AnomalyCard,
  LiveIndicator,
  TimeframeSelector,
  HealthySystem,
} from '@/components';
import {
  cn,
  getLatencyTrend,
  getErrorRateTrend,
  generateMockSparkline,
  downloadJSON,
} from '@/lib/utils';
import type {
  TelemetryResponse,
  TelemetryEvent,
  TelemetryMetrics,
  Timeframe,
  Memory,
  Anomaly,
} from '@/types';

const MAX_VISIBLE_EVENTS = 50;

function parseAnomaliesFromMemories(memories: Memory[]): Anomaly[] {
  return memories.map((m) => ({
    id: m.id,
    description: m.content,
    severity: (m.metadata?.severity as Anomaly['severity']) || 'medium',
    suggestion: (m.metadata?.suggestion as string) || 'Investigate the issue.',
    timestamp: m.timestamp,
    type: (m.metadata?.type as Anomaly['type']) || 'other',
    resolved: m.metadata?.resolved as boolean | undefined,
  }));
}

export default function SystemMonitorPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<TelemetryMetrics | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [sparklineData, setSparklineData] = useState<number[]>(generateMockSparkline(20));

  // Fetch data function
  async function fetchData(tf: Timeframe) {
    try {
      const [telemetryRes, anomaliesRes] = await Promise.all([
        fetch(`/api/system/telemetry?timeframe=${tf}`),
        fetch('/api/memories/recall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: 'system-observer',
            tags: ['anomaly'],
            limit: 10,
          }),
        }),
      ]);

      if (telemetryRes.ok) {
        const data: TelemetryResponse = await telemetryRes.json();
        setPreviousMetrics(metrics);
        setMetrics(data.metrics);
        setEvents(data.events.slice(0, MAX_VISIBLE_EVENTS));
        setLastUpdate(data.generatedAt);
        setSparklineData((prev) => [...prev, data.metrics.p95Latency].slice(-20));
      }

      if (anomaliesRes.ok) {
        const data = await anomaliesRes.json();
        setAnomalies(parseAnomaliesFromMemories(data.memories || []));
      }

      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch data');
    }
  }

  // Initial load
  useEffect(() => {
    let mounted = true;

    async function load() {
      await fetchData(timeframe);
      if (mounted) {
        setIsLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh
  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchData(timeframe);
    setIsRefreshing(false);
  }

  // Timeframe change
  async function handleTimeframeChange(tf: Timeframe) {
    setTimeframe(tf);
    setIsRefreshing(true);
    await fetchData(tf);
    setIsRefreshing(false);
  }

  // Export
  function handleExport() {
    downloadJSON(
      { exportedAt: new Date().toISOString(), timeframe, metrics, events, anomalies },
      `recallbricks-metrics-${timeframe}-${Date.now()}.json`
    );
  }

  // Metric cards
  const metricCards = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        title: 'Total Requests',
        value: metrics.totalRequests,
        icon: '📊',
        trend: 'good' as const,
        subtitle: `${timeframe} window`,
        format: 'number' as const,
        previousValue: previousMetrics?.totalRequests,
      },
      {
        title: 'Avg Latency',
        value: metrics.avgLatency,
        icon: '⚡',
        trend: getLatencyTrend(metrics.avgLatency),
        subtitle: 'Response time',
        format: 'duration' as const,
        previousValue: previousMetrics?.avgLatency,
      },
      {
        title: 'P95 Latency',
        value: metrics.p95Latency,
        icon: '📈',
        trend: getLatencyTrend(metrics.p95Latency),
        subtitle: '95th percentile',
        format: 'duration' as const,
        previousValue: previousMetrics?.p95Latency,
        sparklineData,
      },
      {
        title: 'Error Rate',
        value: metrics.errorRate,
        icon: '❌',
        trend: getErrorRateTrend(metrics.errorRate),
        subtitle: 'Failure percentage',
        format: 'percentage' as const,
        previousValue: previousMetrics?.errorRate,
      },
      {
        title: 'Slow Queries',
        value: metrics.slowQueries,
        icon: '🐢',
        trend: metrics.slowQueries > 0 ? ('warning' as const) : ('good' as const),
        subtitle: '>500ms responses',
        format: 'number' as const,
        previousValue: previousMetrics?.slowQueries,
      },
    ];
  }, [metrics, previousMetrics, sparklineData, timeframe]);

  const criticalAnomalies = useMemo(
    () => anomalies.filter((a) => a.severity === 'critical' && !a.resolved),
    [anomalies]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Loading system telemetry...</p>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg shadow-lg shadow-purple-500/25">
                🧠
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">System Monitor</h1>
                <p className="text-xs text-zinc-400"><span className="text-white font-medium">RecallBricks</span> Infrastructure</p>
              </div>
            </div>
            <LiveIndicator isLive={false} lastUpdate={lastUpdate ?? undefined} />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <TimeframeSelector
              value={timeframe}
              onChange={handleTimeframeChange}
              disabled={isRefreshing}
            />

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200',
                'bg-purple-600/20 text-purple-400 border border-purple-500/30',
                'hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isRefreshing ? '⟳ Loading...' : '⟳ Refresh'}
            </button>

            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200 transition-all duration-200"
            >
              ⬇ Export
            </button>
          </div>
        </div>
      </header>

      {/* Critical Alert Banner */}
      {criticalAnomalies.length > 0 && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="text-lg animate-pulse">🚨</span>
            <span className="text-sm text-red-400 font-medium">
              {criticalAnomalies.length} critical anomal{criticalAnomalies.length === 1 ? 'y' : 'ies'} detected
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metrics Grid */}
        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
            System Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metricCards.map((card) => (
              <MetricCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Stream */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
                Event Stream
              </h2>
              <span className="text-xs text-zinc-600">
                {events.length} events
              </span>
            </div>
            <div className="glass rounded-xl p-2 flex-1 max-h-[500px] overflow-y-auto">
              <div className="space-y-1">
                {events.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-sm">
                    No events to display
                  </div>
                ) : (
                  events.map((event) => (
                    <EventItem
                      key={event.id}
                      timestamp={event.timestamp}
                      endpoint={event.endpoint}
                      method={event.method}
                      latency={event.latency}
                      success={event.success}
                      statusCode={event.statusCode}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Anomalies */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
                Anomaly Insights
              </h2>
              <span className="text-xs text-zinc-600">
                {anomalies.filter((a) => !a.resolved).length} active
              </span>
            </div>
            <div className="flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {anomalies.length === 0 ? (
                <HealthySystem />
              ) : (
                anomalies.map((anomaly) => (
                  <AnomalyCard
                    key={anomaly.id}
                    description={anomaly.description}
                    severity={anomaly.severity}
                    suggestion={anomaly.suggestion}
                    timestamp={anomaly.timestamp}
                    type={anomaly.type}
                    resolved={anomaly.resolved}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Footer Stats */}
        <section className="glass rounded-xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-400 font-mono-data">
                {metrics?.uptime.toFixed(2)}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">Uptime</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400 font-mono-data">
                {metrics?.activeConnections}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Active Connections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-400 font-mono-data">
                {((metrics?.memoryUsage ?? 0) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">Memory Usage</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400 font-mono-data">
                {((metrics?.cpuUsage ?? 0) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">CPU Usage</div>
            </div>
          </div>
        </section>

        {/* Branding */}
        <div className="text-center py-8">
          <p className="text-xs text-zinc-500">
            Powered by <span className="text-white font-semibold">RecallBricks</span> Cognitive Infrastructure
          </p>
        </div>
      </main>
    </div>
  );
}
