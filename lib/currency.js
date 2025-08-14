// Currency utility functions

let currentCurrency = 'Rs';

export const setCurrency = (currency) => {
  currentCurrency = currency || '$';
};

export const getCurrency = () => {
  return currentCurrency;
};

export const formatCurrency = (amount, currency = null) => {
  const symbol = currency || currentCurrency;
  return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
};

export const formatPrice = (price) => {
  return formatCurrency(price);
};

// Format a number as currency without decimal places
export const formatCurrencyWhole = (amount) => {
  return `${currentCurrency}${parseFloat(amount || 0).toFixed(0)}`;
};

// Get currency symbol only
export const getCurrencySymbol = () => {
  return currentCurrency;
}; 