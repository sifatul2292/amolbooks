import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

interface Props {
  label: string;
  value: number;
  formatter?: (v: number) => string;
  color?: string;
  sub?: string;
}

export function MetricCard({ label, value, formatter, color = 'text-[#f1f5f9]', sub }: Props) {
  const animated = useCountUp(value);
  const display = formatter ? formatter(animated) : animated.toLocaleString();

  return (
    <div className="bg-[#1a1d2e] border border-white/[0.07] rounded-lg p-4 flex flex-col gap-1 min-w-0">
      <span className="text-[#64748b] text-xs uppercase tracking-wide font-sans truncate">{label}</span>
      <span className={`font-mono text-2xl font-medium ${color} truncate`}>{display}</span>
      {sub && <span className="text-[#64748b] text-xs font-sans">{sub}</span>}
    </div>
  );
}
