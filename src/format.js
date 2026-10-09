export const formatPrice = (price, currency) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 4 }).format(Number(price));
  } catch {
    return `${price} ${currency}`;
  }
};

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');

export const formatBytes = (n = 0) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
