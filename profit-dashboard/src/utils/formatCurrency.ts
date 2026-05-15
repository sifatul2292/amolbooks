export function formatBDT(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return '৳' + (amount / 1000).toFixed(1) + 'k';
  }
  return '৳' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatPct(value: number): string {
  return value.toFixed(1) + '%';
}
