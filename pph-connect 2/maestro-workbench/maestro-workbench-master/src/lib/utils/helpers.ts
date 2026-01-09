export const cn = (...inputs: Array<string | false | null | undefined>) =>
  inputs.filter(Boolean).join(' ');

export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
};

export const formatCurrency = (
  amount: number | string,
  currency: string,
  locale: string = 'en-US'
): string => {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return '';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(numericAmount);
  } catch {
    return '';
  }
};

export const truncate = (value: string, length: number, suffix = '…'): string => {
  if (!value) {
    return '';
  }

  if (value.length <= length) {
    return value;
  }

  const sliceLength = Math.max(0, length);
  return `${value.slice(0, sliceLength)}${suffix}`;
};
