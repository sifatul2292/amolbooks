import React from 'react';
import { ProfitSummary } from '../../types';
import { SkeletonCard } from '../ui/SkeletonCard';

interface Props {
  summary?: ProfitSummary;
  loading: boolean;
}

function StatusBox({ label, value, bg, textColor }: { label: string; value: number; bg: string; textColor: string }) {
  return (
    <div className={`${bg} rounded-lg p-3 flex flex-col items-center gap-1 flex-1 min-w-[80px]`}>
      <span className={`font-mono text-2xl font-semibold ${textColor}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans">{label}</span>
    </div>
  );
}

export function OrderStatusRow({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} height="h-16" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      <StatusBox label="All" value={summary.totalOrders} bg="bg-sky-500/10" textColor="text-sky-400" />
      <StatusBox label="New" value={summary.newOrders} bg="bg-blue-500/10" textColor="text-blue-400" />
      <StatusBox label="Hold" value={summary.holdOrders} bg="bg-amber-500/10" textColor="text-amber-400" />
      <StatusBox label="Sent" value={summary.sentOrders} bg="bg-purple-500/10" textColor="text-purple-400" />
      <StatusBox label="Delivered" value={summary.deliveredOrders} bg="bg-emerald-500/10" textColor="text-emerald-400" />
      <StatusBox label="Cancelled" value={summary.cancelledOrders} bg="bg-rose-500/10" textColor="text-rose-400" />
      <StatusBox label="Returns" value={summary.returnedOrders} bg="bg-orange-500/10" textColor="text-orange-400" />
    </div>
  );
}
