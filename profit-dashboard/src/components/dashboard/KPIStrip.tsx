import React from 'react';
import { ProfitSummary } from '../../types';
import { formatBDT, formatPct } from '../../utils/formatCurrency';
import { useCountUp } from '../../hooks/useCountUp';
import { SkeletonCard } from '../ui/SkeletonCard';

interface Props {
  summary?: ProfitSummary;
  loading: boolean;
}

function KPIItem({ label, value, formatter, color, sub }: {
  label: string;
  value: number;
  formatter: (v: number) => string;
  color: string;
  sub?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4 flex flex-col gap-1 min-w-0 flex-1">
      <span className="text-[#64748b] text-[10px] uppercase tracking-widest font-sans">{label}</span>
      <span className={`font-mono text-xl font-medium ${color}`}>{formatter(animated)}</span>
      {sub && <span className="text-[#64748b] text-xs font-sans">{sub}</span>}
    </div>
  );
}

export function KPIStrip({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height="h-20" />)}
      </div>
    );
  }

  const activeOrders = summary.totalOrders - summary.cancelledOrders - summary.returnedOrders;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KPIItem
        label="Total Orders"
        value={summary.totalOrders}
        formatter={(v) => String(v)}
        color="text-[#f1f5f9]"
        sub={`${activeOrders} delivered`}
      />
      <KPIItem
        label="Revenue"
        value={summary.revenue}
        formatter={formatBDT}
        color="text-sky-400"
        sub={`${summary.deliveredOrders} active orders`}
      />
      <KPIItem
        label="Ad Spend"
        value={summary.adSpend}
        formatter={formatBDT}
        color="text-amber-400"
        sub="CPO: —"
      />
      <KPIItem
        label="Return Loss"
        value={summary.returnedValue + summary.cancelledValue}
        formatter={formatBDT}
        color="text-rose-400"
        sub={`${summary.returnedOrders} returned`}
      />
      <KPIItem
        label="Est. Profit"
        value={summary.estProfit}
        formatter={formatBDT}
        color={summary.estProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        sub="revenue − all costs"
      />
      <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4 flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[#64748b] text-[10px] uppercase tracking-widest font-sans">Margin</span>
        <span className={`font-mono text-xl font-medium ${summary.margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatPct(summary.margin)}
        </span>
        <span className="text-[#64748b] text-xs font-sans">profit ÷ revenue</span>
      </div>
    </div>
  );
}
