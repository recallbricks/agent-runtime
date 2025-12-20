'use client';

import { memo } from 'react';
import { cn, formatRelativeTime, getSeverityColor } from '@/lib/utils';
import type { AnomalyCardProps } from '@/types';

const severityIcons: Record<string, string> = {
  low: '\u2139\uFE0F',
  medium: '\u26A0\uFE0F',
  high: '\uD83D\uDD34',
  critical: '\uD83D\uDEA8',
};

const typeIcons: Record<string, string> = {
  latency: '\u23F1\uFE0F',
  error_spike: '\uD83D\uDCA5',
  memory: '\uD83E\uDDE0',
  cpu: '\u2699\uFE0F',
  traffic: '\uD83C\uDF0A',
  other: '\uD83D\uDD0D',
};

function AnomalyCard({
  description,
  severity,
  suggestion,
  timestamp,
  type = 'other',
  resolved = false,
}: AnomalyCardProps) {
  const severityClasses = getSeverityColor(severity);

  return (
    <div
      className={cn(
        'glass rounded-xl p-5 transition-all duration-300',
        'hover:scale-[1.01]',
        resolved && 'opacity-60',
        {
          'border-l-4 border-l-blue-500': severity === 'low',
          'border-l-4 border-l-amber-500': severity === 'medium',
          'border-l-4 border-l-orange-500': severity === 'high',
          'border-l-4 border-l-red-500 animate-pulse': severity === 'critical',
        }
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[type]}</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              severityClasses
            )}
          >
            {severityIcons[severity]} {severity.toUpperCase()}
          </span>
          {resolved && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              RESOLVED
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500">{formatRelativeTime(timestamp)}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-300 mb-4 leading-relaxed">{description}</p>

      {/* Suggestion */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-zinc-800/50">
        <span className="text-sm shrink-0">\uD83D\uDCA1</span>
        <p className="text-xs text-zinc-400 leading-relaxed">{suggestion}</p>
      </div>
    </div>
  );
}

export default memo(AnomalyCard);
