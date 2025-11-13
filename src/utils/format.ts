export function formatCurrencyUSD(n?: number): string {
  if (n == null || isNaN(n as any)) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${Math.round(n)}`;
  }
}

export function formatCurrencyUSDFixed2(n?: number): string {
  if (n == null || isNaN(n as any)) return '-';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

export function formatMiles(n?: number): string {
  if (n == null || isNaN(n as any)) return '-';
  return `${Math.round(n)} mi`;
}

export function formatHours(h?: number | string): string {
  if (h == null) return '-';
  const num = typeof h === 'string' ? parseFloat(h) : h;
  if (isNaN(num)) return '-';
  return `${Math.round(num)}h`;
}

export function formatTime(iso?: string): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

