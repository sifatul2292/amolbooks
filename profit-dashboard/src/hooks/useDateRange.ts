import { useState } from 'react';
import { DateRange, DatePreset } from '../types';
import { defaultDateRange, presetToRange } from '../utils/dateHelpers';

export function useDateRange() {
  const [range, setRange] = useState<DateRange>(defaultDateRange);

  function applyPreset(preset: DatePreset) {
    if (preset === 'custom') return;
    setRange({ ...presetToRange(preset), preset });
  }

  function applyCustom(start: string, end: string) {
    setRange({ start, end, preset: 'custom' });
  }

  return { range, applyPreset, applyCustom };
}
