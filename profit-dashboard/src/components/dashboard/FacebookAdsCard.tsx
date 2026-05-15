import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addExpense, fetchExpenses, deleteExpense } from '../../services/api';
import { formatBDT } from '../../utils/formatCurrency';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { OtherExpense } from '../../types';

interface Props {
  startDate: string;
  endDate: string;
}

export function FacebookAdsCard({ startDate, endDate }: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState(startDate);
  const [spend, setSpend] = useState('');
  const lastSynced = localStorage.getItem('metaLastSynced') ?? '—';

  const { data: expenses = [] } = useQuery<OtherExpense[]>({
    queryKey: ['expenses-ads', startDate, endDate],
    queryFn: async () => {
      const all: OtherExpense[] = await fetchExpenses(startDate, endDate);
      return all.filter((e) => e.category === 'Ad Spend');
    },
  });

  const addMutation = useMutation({
    mutationFn: () => addExpense({ date, amount: Number(spend), category: 'Ad Spend' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-ads'] });
      qc.invalidateQueries({ queryKey: ['profit'] });
      setSpend('');
      localStorage.setItem('metaLastSynced', new Date().toLocaleString());
    },
  });

  const delMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-ads'] });
      qc.invalidateQueries({ queryKey: ['profit'] });
    },
  });

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-500 text-sm">f</span>
          <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Facebook Ads</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Connected
          </span>
        </div>
      </div>

      <div className="text-[#64748b] text-xs font-sans mb-3">
        Last synced: {lastSynced}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => {
            localStorage.setItem('metaLastSynced', new Date().toLocaleString());
            qc.invalidateQueries({ queryKey: ['profit'] });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-sans transition-colors"
        >
          <RefreshCw size={12} />
          Sync Now
        </button>
        <div className="font-mono text-base font-medium text-sky-400">
          Total: {formatBDT(totalSpend)}
        </div>
      </div>

      <div className="text-[#64748b] text-xs font-sans mb-2 uppercase tracking-wider">Manual Ad Spend</div>
      <div className="flex gap-2 mb-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 bg-[#0f1117] border border-white/10 rounded px-2 py-1.5 text-sm text-[#f1f5f9] font-sans focus:outline-none focus:border-sky-500/50"
        />
        <input
          type="number"
          placeholder="e.g. 1500"
          value={spend}
          onChange={(e) => setSpend(e.target.value)}
          className="flex-1 bg-[#0f1117] border border-white/10 rounded px-2 py-1.5 text-sm text-[#f1f5f9] font-mono focus:outline-none focus:border-sky-500/50"
        />
        <button
          onClick={() => spend && addMutation.mutate()}
          disabled={!spend || addMutation.isPending}
          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {expenses.length > 0 && (
        <div className="space-y-1">
          {expenses.map((e) => (
            <div key={e._id} className="flex items-center justify-between text-xs font-sans py-1 border-b border-white/[0.03]">
              <span className="font-mono text-[#64748b]">{e.date}</span>
              <span className="font-mono text-sky-400">{formatBDT(e.amount)}</span>
              <button
                onClick={() => delMutation.mutate(e._id)}
                className="text-[#64748b] hover:text-rose-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
