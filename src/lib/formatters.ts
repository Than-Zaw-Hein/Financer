// Currency and date formatting helpers for MMK (Myanmar Kyat)

export function formatMMK(amount: number | null | undefined, currency: string = 'MMK'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0 ${currency}`;
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  if (currency === 'MMK') {
    return `${formatted} Ks`;
  }
  return `${currency} ${formatted}`;
}

export function formatCompactMMK(amount: number | null | undefined, currency: string = 'MMK'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0 ${currency}`;
  }
  
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 100000000) {
    return `${sign}${(abs / 100000000).toFixed(1)}B Ks`;
  }
  if (abs >= 1000000) {
    return `${sign}${(abs / 1000000).toFixed(1)}M Ks`;
  }
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(0)}k Ks`;
  }
  return `${sign}${Math.round(abs).toLocaleString('en-US')} Ks`;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function getMonthName(monthNumber: number): string {
  return MONTH_NAMES[monthNumber - 1] || `Month ${monthNumber}`;
}

export function formatDateString(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
