// Currency utility functions

let currentCurrency = '$';

// Set the current currency symbol
export const setCurrency = (currency) => {
  currentCurrency = currency;
};

// Get the current currency symbol
export const getCurrency = () => {
  return currentCurrency;
};

// Format a number as currency
export const formatCurrency = (amount) => {
  return `${currentCurrency}${parseFloat(amount || 0).toFixed(2)}`;
};

// Format a number as currency without decimal places
export const formatCurrencyWhole = (amount) => {
  return `${currentCurrency}${parseFloat(amount || 0).toFixed(0)}`;
};

// Get currency symbol only
export const getCurrencySymbol = () => {
  return currentCurrency;
}; 