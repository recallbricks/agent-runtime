'use client';

import { memo } from 'react';

function HealthySystem() {
  return (
    <div className="glass rounded-xl p-8 text-center">
      <div className="text-5xl mb-4 animate-pulse">\u2705</div>
      <h3 className="text-xl font-semibold text-emerald-400 mb-2">System Healthy</h3>
      <p className="text-sm text-zinc-500">
        No anomalies detected. All systems operating within normal parameters.
      </p>
      <div className="mt-6 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-xs text-zinc-400">Memory</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-xs text-zinc-400">CPU</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-xs text-zinc-400">Network</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          <span className="text-xs text-zinc-400">Latency</span>
        </div>
      </div>
    </div>
  );
}

export default memo(HealthySystem);
