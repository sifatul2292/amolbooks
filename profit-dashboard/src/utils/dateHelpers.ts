import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { DatePreset, DateRange } from '../types';

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function presetToRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { start: today(), end: today() };
    case 'yesterday': {
      const y = format(subDays(now, 1), 'yyyy-MM-dd');
      return { start: y, end: y };
    }
    case '7d':
      return { start: format(subDays(now, 6), 'yyyy-MM-dd'), end: today() };
    case 'month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return {
        start: format(startOfMonth(last), 'yyyy-MM-dd'),
        end: format(endOfMonth(last), 'yyyy-MM-dd'),
      };
    }
    default:
      return { start: today(), end: today() };
  }
}

export function defaultDateRange(): DateRange {
  return { ...presetToRange('today'), preset: 'today' };
}
