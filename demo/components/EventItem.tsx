'use client';

import { memo } from 'react';
import { cn, formatTimestamp, formatDuration, getLatencyColor, getMethodColor } from '@/lib/utils';
import type { EventItemProps } from '@/types';

function EventItem({
  timestamp,
  endpoint,
  method,
  latency,
  success,
  statusCode,
  isNew = false,
}: EventItemProps) {
  const isError = !success;
  const isSlow = success && latency > 500;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200',
        'border border-transparent',
        isNew && 'event-enter',
        {
          'bg-red-500/10 border-red-500/20': isError,
          'bg-amber-500/10 border-amber-500/20': isSlow,
          'bg-zinc-900/30 hover:bg-zinc-800/40': !isError && !isSlow,
        }
      )}
    >
      {/* Timestamp */}
      <span className="text-xs font-mono-data text-zinc-500 w-20 shrink-0">
        {formatTimestamp(timestamp)}
      </span>

      {/* Method badge */}
      <span
        className={cn(
          'text-xs font-bold font-mono-data w-14 shrink-0',
          getMethodColor(method)
        )}
      >
        {method}
      </span>

      {/* Endpoint */}
      <span className="flex-1 text-sm font-mono-data text-zinc-300 truncate">
        {endpoint}
      </span>

      {/* Status code */}
      <span
        className={cn('text-xs font-mono-data w-10 shrink-0 text-right', {
          'text-emerald-400': statusCode >= 200 && statusCode < 300,
          'text-amber-400': statusCode >= 300 && statusCode < 400,
          'text-red-400': statusCode >= 400,
        })}
      >
        {statusCode}
      </span>

      {/* Latency */}
      <span
        className={cn(
          'text-xs font-mono-data w-16 shrink-0 text-right',
          success ? getLatencyColor(latency) : 'text-zinc-600'
        )}
      >
        {success ? formatDuration(latency) : '--'}
      </span>

      {/* Status indicator */}
      <div
        className={cn('w-2 h-2 rounded-full shrink-0', {
          'bg-emerald-500 shadow-lg shadow-emerald-500/50': success && !isSlow,
          'bg-amber-500 shadow-lg shadow-amber-500/50': isSlow,
          'bg-red-500 shadow-lg shadow-red-500/50': isError,
        })}
      />
    </div>
  );
}

export default memo(EventItem);
