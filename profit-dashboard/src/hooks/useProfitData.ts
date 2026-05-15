import { useQuery } from '@tanstack/react-query';
import { fetchProfitDashboard } from '../services/api';
import { ProfitDashboardData } from '../types';

export function useProfitData(startDate: string, endDate: string) {
  return useQuery<ProfitDashboardData>({
    queryKey: ['profit', startDate, endDate],
    queryFn: () => fetchProfitDashboard(startDate, endDate),
    staleTime: 60_000,
    retry: 1,
  });
}
