export type DatePreset = 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth' | 'custom';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  preset: DatePreset;
}

export interface OrderCounts {
  total: number;
  new: number;
  hold: number;
  sent: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

export interface DailyMetrics {
  date: string;
  orders: OrderCounts;
  revenue: number;
  cogs: number;
  deliveryCost: number;
  otherExpenses: number;
  cancelledValue: number;
  returnedValue: number;
  estProfit: number;
  margin: number;
}

export interface ProfitSummary {
  totalOrders: number;
  newOrders: number;
  holdOrders: number;
  sentOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  revenue: number;
  cogs: number;
  deliveryCost: number;
  otherExpenses: number;
  adSpend: number;
  cancelledValue: number;
  returnedValue: number;
  estProfit: number;
  margin: number;
}

export interface ProductBreakdown {
  name: string;
  productId: string;
  orders: number;
  qty: number;
  revenue: number;
  cogs: number;
  estProfit: number;
}

export interface ProfitDashboardData {
  summary: ProfitSummary;
  dailyBreakdown: DailyMetrics[];
  productBreakdown: ProductBreakdown[];
}

export interface OtherExpense {
  _id: string;
  date: string;
  amount: number;
  category: string;
  note?: string;
}

export type SortKey = keyof ProductBreakdown;
export type SortDir = 'asc' | 'desc';
