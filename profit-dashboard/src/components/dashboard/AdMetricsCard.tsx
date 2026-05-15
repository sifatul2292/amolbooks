import React from 'react';
import { ProfitSummary } from '../../types';
import { formatBDT, formatPct } from '../../utils/formatCurrency';
import { SkeletonCard } from '../ui/SkeletonCard';

interface Props {
  summary?: ProfitSummary;
  loading: boolean;
}

export function AdMetricsCard({ summary, loading }: Props) {
  if (loading || !summary) {
    return <SkeletonCard height="h-40" />;
  }

  const cpo = summary.totalOrders > 0 ? summary.adSpend / summary.totalOrders : 0;
  const acos = summary.revenue > 0 ? (summary.adSpend / summary.revenue) * 100 : 0;
  const adPerDelivery = summary.deliveredOrders > 0 ? summary.adSpend / summary.deliveredOrders : 0;

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400 text-sm">📊</span>
        <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Ad Metrics</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-500/5 rounded-lg p-3">
          <div className="font-mono text-lg font-semibold text-sky-400">{formatBDT(summary.adSpend)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">Ad Spend BDT</div>
        </div>
        <div className="bg-blue-500/5 rounded-lg p-3">
          <div className="font-mono text-lg font-semibold text-sky-400">{formatBDT(cpo)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">Cost per Order</div>
        </div>
        <div className="bg-blue-500/5 rounded-lg p-3">
          <div className="font-mono text-lg font-semibold text-sky-400">{formatPct(acos)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">CPS adrevenue %</div>
        </div>
        <div className="bg-blue-500/5 rounded-lg p-3">
          <div className="font-mono text-lg font-semibold text-sky-400">{formatBDT(adPerDelivery)}</div>
          <div className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans mt-1">Ad/Delivery</div>
        </div>
      </div>
    </div>
  );
}
