'use client';

import { memo, useEffect, useState } from 'react';
import { cn, formatNumber, formatDuration, formatPercentage, formatBytes } from '@/lib/utils';
import type { MetricCardProps, TrendStatus } from '@/types';

const trendConfig: Record<TrendStatus, { bg: string; border: string; glow: string; text: string }> = {
  good: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    text: 'text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    text: 'text-amber-400',
  },
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    text: 'text-red-400',
  },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 80;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${width},${height} L 0,${height} Z`}
        fill={`url(#sparkline-gradient-${color})`}
      />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  format = 'number',
  previousValue,
  sparklineData,
}: MetricCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value !== displayValue) {
      setIsUpdating(true);
      setDisplayValue(value);
      const timer = setTimeout(() => setIsUpdating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'percentage':
        return formatPercentage(val);
      case 'duration':
        return formatDuration(val);
      case 'bytes':
        return formatBytes(val);
      default:
        return formatNumber(val);
    }
  };

  const config = trendConfig[trend];
  const sparklineColor =
    trend === 'good' ? '#10b981' : trend === 'warning' ? '#f59e0b' : '#ef4444';

  // Calculate change from previous value
  const change =
    previousValue !== undefined && typeof value === 'number'
      ? ((value - previousValue) / previousValue) * 100
      : null;

  return (
    <div
      className={cn(
        'glass rounded-xl p-5 transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-lg',
        config.glow,
        config.border,
        isUpdating && 'ring-2 ring-purple-500/50'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {title}
          </span>
        </div>
        {sparklineData && <Sparkline data={sparklineData} color={sparklineColor} />}
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-3xl font-bold font-mono-data tracking-tight',
              config.text,
              isUpdating && 'animate-number-update'
            )}
          >
            {formatValue(displayValue)}
          </span>
          {change !== null && (
            <span
              className={cn(
                'text-xs font-medium',
                change > 0 ? 'text-red-400' : change < 0 ? 'text-emerald-400' : 'text-zinc-500'
              )}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-zinc-500">{subtitle}</p>
        )}
      </div>

      {/* Trend indicator bar */}
      <div className="mt-4 h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', {
            'bg-gradient-to-r from-emerald-500 to-emerald-400 w-full': trend === 'good',
            'bg-gradient-to-r from-amber-500 to-amber-400 w-2/3': trend === 'warning',
            'bg-gradient-to-r from-red-500 to-red-400 w-1/3': trend === 'critical',
          })}
        />
      </div>
    </div>
  );
}

export default memo(MetricCard);
