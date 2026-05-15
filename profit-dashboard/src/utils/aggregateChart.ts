import { DailyMetrics } from '../types';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';

export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

export interface ChartPoint {
  label: string;
  revenue: number;
  estProfit: number;
}

export function aggregateForChart(data: DailyMetrics[], granularity: ChartGranularity): ChartPoint[] {
  if (granularity === 'daily') {
    return data.map((d) => ({
      label: d.date,
      revenue: d.revenue,
      estProfit: d.estProfit,
    }));
  }

  const buckets = new Map<string, { revenue: number; estProfit: number }>();

  for (const d of data) {
    const date = parseISO(d.date);
    let key: string;
    if (granularity === 'weekly') {
      key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    } else {
      key = format(startOfMonth(date), 'yyyy-MM');
    }
    const existing = buckets.get(key) ?? { revenue: 0, estProfit: 0 };
    existing.revenue += d.revenue;
    existing.estProfit += d.estProfit;
    buckets.set(key, existing);
  }

  return Array.from(buckets.entries()).map(([label, vals]) => ({ label, ...vals }));
}
