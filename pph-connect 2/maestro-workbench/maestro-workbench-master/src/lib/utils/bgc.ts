const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_THRESHOLD_DAYS = 30;

const toStartOfDay = (input: string | Date) => {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return NaN;
  }
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const getDaysUntilExpiration = (expirationDate?: string | Date | null): number => {
  if (!expirationDate) {
    return Number.POSITIVE_INFINITY;
  }

  const targetTime = toStartOfDay(expirationDate);
  if (Number.isNaN(targetTime)) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date(Date.now());
  today.setHours(0, 0, 0, 0);
  const diff = targetTime - today.getTime();
  return Math.round(diff / MS_PER_DAY);
};

export const getBGCStatus = (expirationDate?: string | Date | null): 'valid' | 'expiring' | 'expired' => {
  const days = getDaysUntilExpiration(expirationDate);

  if (days === Number.POSITIVE_INFINITY) {
    return 'valid';
  }

  if (days <= 0) {
    return 'expired';
  }

  if (days <= EXPIRING_THRESHOLD_DAYS) {
    return 'expiring';
  }

  return 'valid';
};

export const formatBGCWarning = (expirationDate?: string | Date | null): string => {
  if (!expirationDate) {
    return 'Background check status unavailable';
  }

  const days = getDaysUntilExpiration(expirationDate);

  if (days === Number.POSITIVE_INFINITY) {
    return 'Background check status unavailable';
  }

  if (days <= 0) {
    const daysAgo = Math.abs(days);
    return `Background check expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
  }

  if (days <= EXPIRING_THRESHOLD_DAYS) {
    return `Background check expires in ${days} day${days === 1 ? '' : 's'}`;
  }

  const expiration = expirationDate instanceof Date ? expirationDate : new Date(expirationDate);
  const formatted = expiration.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `Background check valid until ${formatted}`;
};
