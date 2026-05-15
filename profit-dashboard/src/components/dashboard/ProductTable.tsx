import React, { useState } from 'react';
import { ProductBreakdown, SortKey, SortDir } from '../../types';
import { formatBDT } from '../../utils/formatCurrency';
import { EmptyState } from '../ui/EmptyState';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  data?: ProductBreakdown[];
  loading: boolean;
}

type Col = { key: SortKey; label: string; right?: boolean };

const COLS: Col[] = [
  { key: 'name', label: 'Product' },
  { key: 'orders', label: 'Orders', right: true },
  { key: 'qty', label: 'Qty', right: true },
  { key: 'revenue', label: 'Revenue', right: true },
  { key: 'cogs', label: 'COGS', right: true },
  { key: 'estProfit', label: 'Est. Profit', right: true },
];

export function ProductTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const av = a[sortKey] as number | string;
    const bv = b[sortKey] as number | string;
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">📦</span>
          <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Product Breakdown</span>
        </div>
        <span className="text-[#64748b] text-xs font-sans">{data?.length ?? 0} products</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-white/[0.05]">
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`py-2 px-3 text-[10px] uppercase tracking-widest text-[#64748b] font-sans cursor-pointer select-none hover:text-[#f1f5f9] transition-colors whitespace-nowrap ${col.right ? 'text-right' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key
                      ? sortDir === 'asc'
                        ? <ChevronUp size={11} />
                        : <ChevronDown size={11} />
                      : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={6}><EmptyState message="No product data for this period" /></td>
              </tr>
            )}
            {sorted.map((p) => (
              <tr key={p.productId} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3 text-sm text-[#f1f5f9] font-sans max-w-[200px] truncate">{p.name}</td>
                <td className="py-2 px-3 text-sm font-mono text-[#f1f5f9] text-right">{p.orders}</td>
                <td className="py-2 px-3 text-sm font-mono text-[#f1f5f9] text-right">{p.qty}</td>
                <td className="py-2 px-3 text-sm font-mono text-sky-400 text-right">{formatBDT(p.revenue)}</td>
                <td className="py-2 px-3 text-sm font-mono text-amber-400 text-right">{formatBDT(p.cogs)}</td>
                <td className={`py-2 px-3 text-sm font-mono font-medium text-right ${p.estProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatBDT(p.estProfit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
