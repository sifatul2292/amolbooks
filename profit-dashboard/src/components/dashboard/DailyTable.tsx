import React, { useState } from 'react';
import { DailyMetrics } from '../../types';
import { formatBDT, formatPct } from '../../utils/formatCurrency';
import { EmptyState } from '../ui/EmptyState';
import { SkeletonRow } from '../ui/SkeletonCard';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  data?: DailyMetrics[];
  loading: boolean;
}

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`py-2 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-sans whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const TD = ({ children, right, className = '' }: { children: React.ReactNode; right?: boolean; className?: string }) => (
  <td className={`py-2 px-3 text-sm font-sans whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${className}`}>
    {children}
  </td>
);

export function DailyTable({ data, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  const rows = expanded ? (data ?? []) : (data ?? []).slice(-7);

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 text-sm">📅</span>
          <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Daily Breakdown</span>
        </div>
        {(data?.length ?? 0) > 7 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-sans transition-colors"
          >
            {expanded ? <><ChevronUp size={14} /> Collapse</> : <><ChevronDown size={14} /> Expand All</>}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <TH>Date</TH>
              <TH right>Orders</TH>
              <TH right>Revenue</TH>
              <TH right>Ad Spend</TH>
              <TH right>Delivery</TH>
              <TH right>Other</TH>
              <TH right>Profit</TH>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={7} className="py-1 px-3"><SkeletonRow /></td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7}><EmptyState /></td>
              </tr>
            )}
            {!loading && rows.map((d) => (
              <tr key={d.date} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <TD><span className="font-mono text-[#f1f5f9]">{d.date}</span></TD>
                <TD right><span className="font-mono text-[#f1f5f9]">{d.orders.total}</span></TD>
                <TD right><span className="font-mono text-sky-400">{formatBDT(d.revenue)}</span></TD>
                <TD right><span className="font-mono text-amber-400">{formatBDT(d.otherExpenses)}</span></TD>
                <TD right><span className="font-mono text-purple-400">{formatBDT(d.deliveryCost)}</span></TD>
                <TD right><span className="font-mono text-slate-400">{formatBDT(d.otherExpenses)}</span></TD>
                <TD right>
                  <span className={`font-mono font-medium ${d.estProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatBDT(d.estProfit)}
                  </span>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
