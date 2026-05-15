import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { DailyMetrics } from '../../types';
import { aggregateForChart, ChartGranularity } from '../../utils/aggregateChart';
import { formatBDT } from '../../utils/formatCurrency';
import { SkeletonCard } from '../ui/SkeletonCard';

interface Props {
  data?: DailyMetrics[];
  loading: boolean;
}

const TOGGLES: { label: string; value: ChartGranularity }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-xs font-sans shadow-xl">
      <div className="text-[#64748b] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.name}: {formatBDT(p.value)}
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data, loading }: Props) {
  const [granularity, setGranularity] = useState<ChartGranularity>('daily');

  if (loading || !data) {
    return <SkeletonCard height="h-72" />;
  }

  const chartData = aggregateForChart(data, granularity);

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 text-sm">📈</span>
          <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Revenue vs Profit</span>
        </div>
        <div className="flex gap-1">
          {TOGGLES.map((t) => (
            <button
              key={t.value}
              onClick={() => setGranularity(t.value)}
              className={`px-3 py-1 rounded text-xs font-sans transition-colors ${
                granularity === t.value
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-[#64748b] hover:text-[#f1f5f9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatBDT(v, true)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
            formatter={(value) => value === 'revenue' ? 'Revenue' : 'Est. Profit'}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#gradRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: '#38bdf8' }}
          />
          <Area
            type="monotone"
            dataKey="estProfit"
            name="Est. Profit"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradProfit)"
            dot={false}
            activeDot={{ r: 4, fill: '#10b981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
