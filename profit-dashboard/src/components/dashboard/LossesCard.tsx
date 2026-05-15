import React from 'react';
import { ProfitSummary } from '../../types';
import { formatBDT } from '../../utils/formatCurrency';
import { SkeletonCard } from '../ui/SkeletonCard';

interface Props {
  summary?: ProfitSummary;
  loading: boolean;
}

export function LossesCard({ summary, loading }: Props) {
  if (loading || !summary) {
    return <SkeletonCard height="h-40" />;
  }

  const totalLoss = summary.cancelledValue + summary.returnedValue;

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-sm">⚠</span>
        <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Losses</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-rose-500/10 rounded-lg p-3">
          <div className="font-mono text-lg font-semibold text-rose-400">{formatBDT(summary.cancelledValue)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">
            Cancelled %<br />
            <span className="normal-case">{summary.cancelledOrders} orders</span>
          </div>
        </div>
        <div className="bg-rose-500/10 rounded-lg p-3">
          <div className="font-mono text-lg font-semibold text-rose-400">{formatBDT(summary.returnedValue)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">
            Returned %<br />
            <span className="normal-case">{summary.returnedOrders} orders</span>
          </div>
        </div>
      </div>
      <div className="bg-rose-500/5 rounded-lg p-3 border border-rose-500/10">
        <div className="font-mono text-base font-semibold text-rose-400">{formatBDT(totalLoss)}</div>
        <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">
          Total Loss Exposure<br />
          <span className="normal-case">cancelled + returned</span>
        </div>
      </div>
    </div>
  );
}
