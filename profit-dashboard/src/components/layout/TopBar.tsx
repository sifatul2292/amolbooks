import React, { useState } from 'react';
import { DateRange, DatePreset } from '../../types';
import { Wifi } from 'lucide-react';

interface Props {
  range: DateRange;
  onPreset: (p: DatePreset) => void;
  onCustom: (start: string, end: string) => void;
}

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'lastMonth' },
];

export function TopBar({ range, onPreset, onCustom }: Props) {
  const [localStart, setLocalStart] = useState(range.start);
  const [localEnd, setLocalEnd] = useState(range.end);

  function handleApply() {
    onCustom(localStart, localEnd);
  }

  return (
    <div className="bg-[#1a1d2e] border-b border-white/[0.07] px-4 py-3 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#f1f5f9] text-sm font-semibold font-sans mr-2">Profit Dashboard</span>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => { onPreset(p.value); setLocalStart(''); setLocalEnd(''); }}
            className={`px-3 py-1 rounded text-xs font-sans transition-colors border ${
              range.preset === p.value
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'border-white/[0.07] text-[#64748b] hover:text-[#f1f5f9] hover:border-white/20'
            }`}
          >
            {p.label}
          </button>
        ))}
        <input
          type="date"
          value={localStart || range.start}
          onChange={(e) => setLocalStart(e.target.value)}
          className="bg-[#0f1117] border border-white/10 rounded px-2 py-1 text-xs text-[#f1f5f9] font-mono focus:outline-none focus:border-sky-500/50"
        />
        <span className="text-[#64748b] text-xs">→</span>
        <input
          type="date"
          value={localEnd || range.end}
          onChange={(e) => setLocalEnd(e.target.value)}
          className="bg-[#0f1117] border border-white/10 rounded px-2 py-1 text-xs text-[#f1f5f9] font-mono focus:outline-none focus:border-sky-500/50"
        />
        <button
          onClick={handleApply}
          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded font-sans transition-colors"
        >
          Apply
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-sans">
        <Wifi size={13} />
        <span>Meta Connected</span>
      </div>
    </div>
  );
}
