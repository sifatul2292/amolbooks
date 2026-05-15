import React from 'react';
import { ProfitSummary } from '../../types';
import { formatBDT } from '../../utils/formatCurrency';
import { SkeletonCard } from '../ui/SkeletonCard';

interface Props {
  summary?: ProfitSummary;
  loading: boolean;
}

function BreakdownBox({ label, value, bg, textColor }: { label: string; value: number; bg: string; textColor: string }) {
  return (
    <div className={`${bg} rounded-lg p-3 flex flex-col gap-1 flex-1 min-w-[100px]`}>
      <span className={`font-mono text-lg font-semibold ${textColor}`}>{formatBDT(value)}</span>
      <span className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans">{label}</span>
    </div>
  );
}

export function ProfitBreakdown({ summary, loading }: Props) {
  if (loading || !summary) {
    return <SkeletonCard height="h-32" />;
  }

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-400 text-sm">💰</span>
        <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Profit Breakdown</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <BreakdownBox label="Revenue" value={summary.revenue} bg="bg-sky-500/10" textColor="text-sky-400" />
        <BreakdownBox label="COGS" value={summary.cogs} bg="bg-amber-500/10" textColor="text-amber-400" />
        <BreakdownBox label="Delivery" value={summary.deliveryCost} bg="bg-purple-500/10" textColor="text-purple-400" />
        <BreakdownBox label="Other Exp" value={summary.otherExpenses} bg="bg-slate-500/10" textColor="text-slate-400" />
        <BreakdownBox
          label="Est. Profit"
          value={summary.estProfit}
          bg={summary.estProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}
          textColor={summary.estProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
      </div>
    </div>
  );
}
