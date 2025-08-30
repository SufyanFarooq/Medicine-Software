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
  // Crane activities
  CRANE_ADDED: 'CRANE_ADDED',
  CRANE_UPDATED: 'CRANE_UPDATED',
  CRANE_DELETED: 'CRANE_DELETED',
  CRANE_STATUS_CHANGED: 'CRANE_STATUS_CHANGED',
  
  // Crane rental activities
  CRANE_RENTAL_CREATED: 'CRANE_RENTAL_CREATED',
  CRANE_RENTAL_UPDATED: 'CRANE_RENTAL_UPDATED',
  CRANE_RENTAL_DELETED: 'CRANE_RENTAL_DELETED',
  CRANE_RENTAL_COMPLETED: 'CRANE_RENTAL_COMPLETED',
  CRANE_RENTAL_CANCELLED: 'CRANE_RENTAL_CANCELLED',
  
  // Customer activities
  CUSTOMER_ADDED: 'CUSTOMER_ADDED',
  CUSTOMER_UPDATED: 'CUSTOMER_UPDATED',
  CUSTOMER_DELETED: 'CUSTOMER_DELETED',
  
  // Invoice activities
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  INVOICE_PRINTED: 'INVOICE_PRINTED',
  INVOICE_DELETED: 'INVOICE_DELETED',
  
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
export const logCraneActivity = {
  added: (craneName, craneCode) => 
    logActivity(ACTIVITY_TYPES.CRANE_ADDED, `Added crane: ${craneName} (${craneCode})`, 'crane'),
  
  updated: (craneName, craneCode) => 
    logActivity(ACTIVITY_TYPES.CRANE_UPDATED, `Updated crane: ${craneName} (${craneCode})`, 'crane'),
  
  deleted: (craneName, craneCode) => 
    logActivity(ACTIVITY_TYPES.CRANE_DELETED, `Deleted crane: ${craneName} (${craneCode})`, 'crane'),
    
  statusChanged: (craneName, oldStatus, newStatus) => 
    logActivity(ACTIVITY_TYPES.CRANE_STATUS_CHANGED, `Changed crane status: ${craneName} from ${oldStatus} to ${newStatus}`, 'crane')
};

export const logCraneRentalActivity = {
  created: (rentalNumber, customerName, craneCount) => 
    logActivity(ACTIVITY_TYPES.CRANE_RENTAL_CREATED, `Created crane rental: ${rentalNumber} for ${customerName} (${craneCount} cranes)`, 'crane_rental', rentalNumber),
  
  updated: (rentalNumber, customerName) => 
    logActivity(ACTIVITY_TYPES.CRANE_RENTAL_UPDATED, `Updated crane rental: ${rentalNumber} for ${customerName}`, 'crane_rental', rentalNumber),
  
  deleted: (rentalNumber, customerName) => 
    logActivity(ACTIVITY_TYPES.CRANE_RENTAL_DELETED, `Deleted crane rental: ${rentalNumber} for ${customerName}`, 'crane_rental', rentalNumber),
    
  completed: (rentalNumber, customerName) => 
    logActivity(ACTIVITY_TYPES.CRANE_RENTAL_COMPLETED, `Completed crane rental: ${rentalNumber} for ${customerName}`, 'crane_rental', rentalNumber),
    
  cancelled: (rentalNumber, customerName) => 
    logActivity(ACTIVITY_TYPES.CRANE_RENTAL_CANCELLED, `Cancelled crane rental: ${rentalNumber} for ${customerName}`, 'crane_rental', rentalNumber)
};

export const logCustomerActivity = {
  added: (customerName, customerEmail) => 
    logActivity(ACTIVITY_TYPES.CUSTOMER_ADDED, `Added customer: ${customerName} (${customerEmail})`, 'customer'),
  
  updated: (customerName, customerEmail) => 
    logActivity(ACTIVITY_TYPES.CUSTOMER_UPDATED, `Updated customer: ${customerName} (${customerEmail})`, 'customer'),
  
  deleted: (customerName, customerEmail) => 
    logActivity(ACTIVITY_TYPES.CUSTOMER_DELETED, `Deleted customer: ${customerName} (${customerEmail})`, 'customer')
};

export const logInvoiceActivity = {
  generated: (invoiceNumber, total) => 
    logActivity(ACTIVITY_TYPES.INVOICE_GENERATED, `Generated invoice: ${invoiceNumber} (Total: ${total})`, 'invoice', invoiceNumber),
  
  printed: (invoiceNumber) => 
    logActivity(ACTIVITY_TYPES.INVOICE_PRINTED, `Printed invoice: ${invoiceNumber}`, 'invoice', invoiceNumber),
  
  deleted: (invoiceNumber) => 
    logActivity(ACTIVITY_TYPES.INVOICE_DELETED, `Deleted invoice: ${invoiceNumber}`, 'invoice', invoiceNumber)
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