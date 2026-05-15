import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addExpense, fetchExpenses, deleteExpense } from '../../services/api';
import { formatBDT } from '../../utils/formatCurrency';
import { Plus, Trash2 } from 'lucide-react';
import { OtherExpense } from '../../types';

const CATEGORIES = ['Other', 'Packaging', 'Salary', 'Tools', 'Utilities', 'Ad Spend'];

interface Props {
  startDate: string;
  endDate: string;
}

export function OtherExpensesCard({ startDate, endDate }: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState(startDate);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [note, setNote] = useState('');

  const { data: expenses = [] } = useQuery<OtherExpense[]>({
    queryKey: ['expenses-other', startDate, endDate],
    queryFn: async () => {
      const all: OtherExpense[] = await fetchExpenses(startDate, endDate);
      return all.filter((e) => e.category !== 'Ad Spend');
    },
  });

  const addMutation = useMutation({
    mutationFn: () => addExpense({ date, amount: Number(amount), category, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-other'] });
      qc.invalidateQueries({ queryKey: ['profit'] });
      setAmount('');
      setNote('');
    },
  });

  const delMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-other'] });
      qc.invalidateQueries({ queryKey: ['profit'] });
    },
  });

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-sm">💸</span>
        <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Other Expenses</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0f1117] border border-white/10 rounded px-2 py-1.5 text-sm text-[#f1f5f9] font-sans focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans block mb-1">Amount (BDT)</label>
          <input
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0f1117] border border-white/10 rounded px-2 py-1.5 text-sm text-[#f1f5f9] font-mono focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      <div className="mb-2">
        <label className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans block mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-[#0f1117] border border-white/10 rounded px-2 py-1.5 text-sm text-[#f1f5f9] font-sans focus:outline-none focus:border-amber-500/50"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-[10px] uppercase tracking-widest text-[#64748b] font-sans block mb-1">Note</label>
        <input
          type="text"
          placeholder="optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-[#0f1117] border border-white/10 rounded px-2 py-1.5 text-sm text-[#f1f5f9] font-sans focus:outline-none focus:border-amber-500/50"
        />
      </div>

      <button
        onClick={() => amount && addMutation.mutate()}
        disabled={!amount || addMutation.isPending}
        className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm rounded font-sans transition-colors"
      >
        <Plus size={14} />
        Add
      </button>

      {expenses.length === 0 && (
        <p className="text-[#64748b] text-xs font-sans text-center mt-3">No expenses for this period</p>
      )}

      {expenses.length > 0 && (
        <div className="mt-3 space-y-1">
          {expenses.map((e) => (
            <div key={e._id} className="flex items-center justify-between text-xs font-sans py-1 border-b border-white/[0.03]">
              <div>
                <span className="font-mono text-[#64748b]">{e.date}</span>
                <span className="text-[#64748b] ml-2">{e.category}</span>
                {e.note && <span className="text-[#64748b] ml-1">· {e.note}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-400">{formatBDT(e.amount)}</span>
                <button
                  onClick={() => delMutation.mutate(e._id)}
                  className="text-[#64748b] hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
