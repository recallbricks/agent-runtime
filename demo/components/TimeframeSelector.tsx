'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { Timeframe } from '@/types';

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
  disabled?: boolean;
}

const timeframes: { value: Timeframe; label: string }[] = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
];

function TimeframeSelector({ value, onChange, disabled = false }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/50 border border-zinc-800">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onChange(tf.value)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value === tf.value
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}

export default memo(TimeframeSelector);
