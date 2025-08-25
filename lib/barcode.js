// Barcode utility functions

/**
 * Generate a unique barcode
 * @param {string} prefix - Prefix for the barcode (e.g., 'BAR', 'PROD')
 * @param {number} length - Length of the random part
 * @returns {string} Generated barcode
 */
export const generateBarcode = (prefix = 'BAR', length = 8) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, length + 2).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Validate barcode format
 * @param {string} barcode - Barcode to validate
 * @param {string} format - Expected format (e.g., 'EAN13', 'CODE128')
 * @returns {boolean} True if valid
 */
export const validateBarcode = (barcode, format = 'CODE128') => {
  if (!barcode || typeof barcode !== 'string') return false;
  
  switch (format) {
    case 'EAN13':
      // EAN-13 should be exactly 13 digits
      return /^\d{13}$/.test(barcode);
    
    case 'CODE128':
      // Code 128 can contain alphanumeric characters
      return /^[A-Za-z0-9\-_]{1,50}$/.test(barcode);
    
    case 'UPC':
      // UPC should be exactly 12 digits
      return /^\d{12}$/.test(barcode);
    
    default:
      // Default validation - non-empty string
      return barcode.trim().length > 0;
  }
};

/**
 * Format barcode for display
 * @param {string} barcode - Raw barcode
 * @param {number} groupSize - Size of groups for formatting
 * @returns {string} Formatted barcode
 */
export const formatBarcode = (barcode, groupSize = 4) => {
  if (!barcode) return '';
  
  const cleaned = barcode.replace(/[^A-Za-z0-9]/g, '');
  const groups = [];
  
  for (let i = 0; i < cleaned.length; i += groupSize) {
    groups.push(cleaned.slice(i, i + groupSize));
  }
  
  return groups.join('-');
};

/**
 * Generate barcode for product
 * @param {string} productCode - Product code
 * @param {string} category - Product category
 * @returns {string} Generated barcode
 */
export const generateProductBarcode = (productCode, category = 'GEN') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const categoryCode = category.substring(0, 3).toUpperCase();
  
  return `${categoryCode}${productCode}${timestamp}${random}`;
};

/**
 * Check if barcode already exists
 * @param {string} barcode - Barcode to check
 * @param {Array} existingBarcodes - Array of existing barcodes
 * @returns {boolean} True if barcode exists
 */
export const isBarcodeDuplicate = (barcode, existingBarcodes) => {
  return existingBarcodes.includes(barcode);
};

/**
 * Generate unique barcode avoiding duplicates
 * @param {Array} existingBarcodes - Array of existing barcodes
 * @param {string} prefix - Prefix for the barcode
 * @returns {string} Unique barcode
 */
export const generateUniqueBarcode = (existingBarcodes = [], prefix = 'BAR') => {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const barcode = generateBarcode(prefix);
    if (!isBarcodeDuplicate(barcode, existingBarcodes)) {
      return barcode;
    }
    attempts++;
  }
  
  // Fallback: add timestamp to ensure uniqueness
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};
