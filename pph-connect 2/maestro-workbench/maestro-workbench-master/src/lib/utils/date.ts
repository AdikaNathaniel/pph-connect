const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ensureDate = (value: string | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (value: number, length = 2) => value.toString().padStart(length, '0');

const tokenMap: Record<string, (date: Date) => string> = {
  yyyy: (date) => date.getUTCFullYear().toString(),
  MM: (date) => pad(date.getUTCMonth() + 1),
  dd: (date) => pad(date.getUTCDate()),
  d: (date) => date.getUTCDate().toString(),
  MMM: (date) => MONTH_NAMES[date.getUTCMonth()]
};

export const formatDate = (value: string | Date, format: string): string => {
  const date = ensureDate(value);
  if (!date || !format) {
    return '';
  }

  const tokens = Object.keys(tokenMap).sort((a, b) => b.length - a.length);
  let result = format;

  tokens.forEach((token) => {
    if (result.includes(token)) {
      result = result.replace(new RegExp(token, 'g'), tokenMap[token](date));
    }
  });

  return result;
};

const RELATIVE_THRESHOLDS = [
  { limit: 60, unit: 'second', divisor: 1 },
  { limit: 60 * 60, unit: 'minute', divisor: 60 },
  { limit: 60 * 60 * 24, unit: 'hour', divisor: 60 * 60 },
  { limit: 60 * 60 * 24 * 7, unit: 'day', divisor: 60 * 60 * 24 },
  { limit: 60 * 60 * 24 * 30, unit: 'week', divisor: 60 * 60 * 24 * 7 },
  { limit: 60 * 60 * 24 * 365, unit: 'month', divisor: 60 * 60 * 24 * 30 },
  { limit: Infinity, unit: 'year', divisor: 60 * 60 * 24 * 365 }
];

const pluralise = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

export const formatRelativeDate = (value: string | Date, baseDate: Date = new Date()): string => {
  const date = ensureDate(value);
  if (!date || Number.isNaN(baseDate.getTime())) {
    return '';
  }

  const diffSeconds = Math.round((date.getTime() - baseDate.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  for (const threshold of RELATIVE_THRESHOLDS) {
    if (absSeconds < threshold.limit) {
      const magnitude = Math.max(1, Math.round(absSeconds / threshold.divisor));
      const phrase = pluralise(magnitude, threshold.unit);
      return diffSeconds >= 0 ? `in ${phrase}` : `${phrase} ago`;
    }
  }

  return '';
};

export const isDateInRange = (
  value: string | Date,
  start: string | Date,
  end: string | Date
): boolean => {
  const target = ensureDate(value);
  const startDate = ensureDate(start);
  const endDate = ensureDate(end);

  if (!target || !startDate || !endDate) {
    return false;
  }

  const time = target.getTime();
  return time >= startDate.getTime() && time <= endDate.getTime();
};
