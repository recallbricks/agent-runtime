'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface LiveIndicatorProps {
  isLive: boolean;
  lastUpdate?: string;
}

function LiveIndicator({ isLive, lastUpdate }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            isLive ? 'bg-emerald-500' : 'bg-zinc-600'
          )}
        />
        {isLive && (
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 live-indicator" />
        )}
      </div>
      <span className="text-xs font-medium text-zinc-400">
        {isLive ? 'LIVE' : 'PAUSED'}
      </span>
      {lastUpdate && (
        <span className="text-xs text-zinc-600 ml-2">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

export default memo(LiveIndicator);
