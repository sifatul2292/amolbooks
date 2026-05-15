import React from 'react';
import { useProfitData } from '../hooks/useProfitData';
import { DateRange } from '../types';
import { KPIStrip } from '../components/dashboard/KPIStrip';
import { OrderStatusRow } from '../components/dashboard/OrderStatusRow';
import { ProfitBreakdown } from '../components/dashboard/ProfitBreakdown';
import { LossesCard } from '../components/dashboard/LossesCard';
import { AdMetricsCard } from '../components/dashboard/AdMetricsCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { DailyTable } from '../components/dashboard/DailyTable';
import { ProductTable } from '../components/dashboard/ProductTable';
import { FacebookAdsCard } from '../components/dashboard/FacebookAdsCard';
import { OtherExpensesCard } from '../components/dashboard/OtherExpensesCard';

interface Props {
  range: DateRange;
}

export function Dashboard({ range }: Props) {
  const { data, isLoading, isError } = useProfitData(range.start, range.end);
  const summary = data?.summary;
  const daily = data?.dailyBreakdown;
  const products = data?.productBreakdown;

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-400 text-sm font-sans">
        Failed to load dashboard data. Check API connection.
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto">
      {/* KPI Strip */}
      <KPIStrip summary={summary} loading={isLoading} />

      {/* Orders + Ad Metrics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sky-400 text-sm">📦</span>
            <span className="text-[#f1f5f9] text-sm font-semibold font-sans">Orders</span>
          </div>
          <OrderStatusRow summary={summary} loading={isLoading} />
        </div>
        <AdMetricsCard summary={summary} loading={isLoading} />
      </div>

      {/* Profit Breakdown + Losses row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <ProfitBreakdown summary={summary} loading={isLoading} />
        </div>
        <LossesCard summary={summary} loading={isLoading} />
      </div>

      {/* Revenue Chart */}
      <RevenueChart data={daily} loading={isLoading} />

      {/* Daily Table */}
      <DailyTable data={daily} loading={isLoading} />

      {/* Product Table */}
      <ProductTable data={products} loading={isLoading} />

      {/* Facebook Ads + Other Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FacebookAdsCard startDate={range.start} endDate={range.end} />
        <OtherExpensesCard startDate={range.start} endDate={range.end} />
      </div>
    </div>
  );
}
