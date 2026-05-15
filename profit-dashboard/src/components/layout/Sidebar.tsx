import React from 'react';
import { BarChart2, ShoppingBag, Package, BookOpen, ArrowLeft } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'https://api.amolbooks.com';
const ADMIN_URL = API_BASE.replace('api.', 'apisub.') + '/angular';

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-[#1a1d2e] border-r border-white/[0.07] min-h-screen flex flex-col py-4 hidden lg:flex">
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-400" />
          <span className="text-[#f1f5f9] font-semibold font-sans text-sm">Amolbooks</span>
        </div>
        <span className="text-[#64748b] text-[10px] font-sans uppercase tracking-widest mt-0.5 block">Admin Panel</span>
      </div>

      <div className="px-3 mb-2">
        <span className="text-[#64748b] text-[9px] uppercase tracking-widest font-sans px-1">Sales</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 mb-4">
        <a
          href={`${ADMIN_URL}/orders`}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.04] text-sm font-sans transition-colors"
        >
          <ShoppingBag size={15} />
          Orders (Angular)
        </a>
        <a
          href={`${ADMIN_URL}/amolbooks-orders`}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.04] text-sm font-sans transition-colors"
        >
          <Package size={15} />
          Amolbooks Orders
        </a>
      </nav>

      <div className="px-3 mb-2">
        <span className="text-[#64748b] text-[9px] uppercase tracking-widest font-sans px-1">Analytics</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 mb-4">
        <a
          href="#"
          className="flex items-center gap-2.5 px-3 py-2 rounded bg-emerald-500/10 text-emerald-400 text-sm font-sans"
        >
          <BarChart2 size={15} />
          Profit Dashboard
        </a>
      </nav>

      <div className="mt-auto px-2">
        <div className="px-3 mb-2">
          <span className="text-[#64748b] text-[9px] uppercase tracking-widest font-sans px-1">Navigation</span>
        </div>
        <a
          href={`${ADMIN_URL}`}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/[0.04] text-sm font-sans transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Admin
        </a>
      </div>
    </aside>
  );
}
