import { apiRequest } from './auth';

// Activity logger utility
export const logActivity = async (action, details = '', entityType = '', entityId = '') => {
  try {
    await apiRequest('/api/activities', {
      method: 'POST',
      body: JSON.stringify({
        action,
        details,
        entityType,
        entityId
      }),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main functionality
  }
};

// Predefined activity types
export const ACTIVITY_TYPES = {
  // Product activities
  PRODUCT_ADDED: 'PRODUCT_ADDED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  
  // Invoice activities
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  INVOICE_PRINTED: 'INVOICE_PRINTED',
  INVOICE_DELETED: 'INVOICE_DELETED',
  
  // Return activities
  RETURN_CREATED: 'RETURN_CREATED',
  RETURN_UPDATED: 'RETURN_UPDATED',
  RETURN_DELETED: 'RETURN_DELETED',
  
  // User activities
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // Settings activities
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  
  // System activities
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  SYSTEM_RESTORE: 'SYSTEM_RESTORE'
};

// Helper functions for common activities
export const logProductActivity = {
  added: (productName, productCode) => 
    logActivity(ACTIVITY_TYPES.PRODUCT_ADDED, `Added product: ${productName} (${productCode})`, 'product'),
  
  updated: (productName, productCode) => 
    logActivity(ACTIVITY_TYPES.PRODUCT_UPDATED, `Updated product: ${productName} (${productCode})`, 'product'),
  
  deleted: (productName, productCode) => 
    logActivity(ACTIVITY_TYPES.PRODUCT_DELETED, `Deleted product: ${productName} (${productCode})`, 'product')
};

export const logInvoiceActivity = {
  generated: (invoiceNumber, total) => 
    logActivity(ACTIVITY_TYPES.INVOICE_GENERATED, `Generated invoice: ${invoiceNumber} (Total: ${total})`, 'invoice', invoiceNumber),
  
  printed: (invoiceNumber) => 
    logActivity(ACTIVITY_TYPES.INVOICE_PRINTED, `Printed invoice: ${invoiceNumber}`, 'invoice', invoiceNumber),
  
  deleted: (invoiceNumber) => 
    logActivity(ACTIVITY_TYPES.INVOICE_DELETED, `Deleted invoice: ${invoiceNumber}`, 'invoice', invoiceNumber)
};

export const logReturnActivity = {
  created: (returnNumber, medicineName, quantity) => 
    logActivity(ACTIVITY_TYPES.RETURN_CREATED, `Created return: ${returnNumber} for ${medicineName} (${quantity} units)`, 'return', returnNumber),
  
  updated: (returnNumber, medicineName) => 
    logActivity(ACTIVITY_TYPES.RETURN_UPDATED, `Updated return: ${returnNumber} for ${medicineName}`, 'return', returnNumber),
  
  deleted: (returnNumber, medicineName) => 
    logActivity(ACTIVITY_TYPES.RETURN_DELETED, `Deleted return: ${returnNumber} for ${medicineName}`, 'return', returnNumber)
};

export const logUserActivity = {
  login: (username) => 
    logActivity(ACTIVITY_TYPES.USER_LOGIN, `User logged in: ${username}`, 'user'),
  
  logout: (username) => 
    logActivity(ACTIVITY_TYPES.USER_LOGOUT, `User logged out: ${username}`, 'user'),
  
  created: (username) => 
    logActivity(ACTIVITY_TYPES.USER_CREATED, `Created user: ${username}`, 'user'),
  
  updated: (username) => 
    logActivity(ACTIVITY_TYPES.USER_UPDATED, `Updated user: ${username}`, 'user'),
  
  deleted: (username) => 
    logActivity(ACTIVITY_TYPES.USER_DELETED, `Deleted user: ${username}`, 'user')
};

export const logSettingsActivity = {
  updated: (settingName, oldValue, newValue) => 
    logActivity(ACTIVITY_TYPES.SETTINGS_UPDATED, `Updated setting: ${settingName} from ${oldValue} to ${newValue}`, 'settings')
}; 