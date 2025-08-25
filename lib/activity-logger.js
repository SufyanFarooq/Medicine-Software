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

// Activity types
export const ACTIVITY_TYPES = {
	// Product activities
	PRODUCT_ADDED: 'PRODUCT_ADDED',
	PRODUCT_UPDATED: 'PRODUCT_UPDATED',
	PRODUCT_DELETED: 'PRODUCT_DELETED',
	
	// Inventory activities
	INVENTORY_INFLOW: 'INVENTORY_INFLOW',
	INVENTORY_OUTFLOW: 'INVENTORY_OUTFLOW',
	
	// Invoice activities
	INVOICE_CREATED: 'INVOICE_CREATED',
	INVOICE_UPDATED: 'INVOICE_UPDATED',
	INVOICE_DELETED: 'INVOICE_DELETED',
	
	// Return activities
	RETURN_PROCESSED: 'RETURN_PROCESSED',
	RETURN_UPDATED: 'RETURN_UPDATED',
	RETURN_DELETED: 'RETURN_DELETED',
	
	// Business setup activities
	BUSINESS_SETUP_COMPLETED: 'BUSINESS_SETUP_COMPLETED',
	BUSINESS_SETUP_UPDATED: 'BUSINESS_SETUP_UPDATED',
	
	// Supplier activities
	SUPPLIER_ADDED: 'SUPPLIER_ADDED',
	SUPPLIER_UPDATED: 'SUPPLIER_UPDATED',
	SUPPLIER_DELETED: 'SUPPLIER_DELETED',
	
	// Purchase Order activities
	PURCHASE_ORDER_CREATED: 'PURCHASE_ORDER_CREATED',
	PURCHASE_ORDER_UPDATED: 'PURCHASE_ORDER_UPDATED',
	PURCHASE_ORDER_RECEIVED: 'PURCHASE_ORDER_RECEIVED',
	PURCHASE_ORDER_CANCELLED: 'PURCHASE_ORDER_CANCELLED',
	
	// User activities
	USER_LOGIN: 'USER_LOGIN',
	USER_LOGOUT: 'USER_LOGOUT',
	USER_CREATED: 'USER_CREATED',
	USER_UPDATED: 'USER_UPDATED',
	USER_DELETED: 'USER_DELETED'
};

// Helper functions (generic product)
export const logProductActivity = {
  added: (productName, productCode, productId = '') => 
    logActivity(ACTIVITY_TYPES.PRODUCT_ADDED, `Added product: ${productName} (${productCode})`, 'product', productId),
  
  updated: (productName, productCode, productId = '') => 
    logActivity(ACTIVITY_TYPES.PRODUCT_UPDATED, `Updated product: ${productName} (${productCode})`, 'product', productId),
  
  deleted: (productName, productCode, productId = '') => 
    logActivity(ACTIVITY_TYPES.PRODUCT_DELETED, `Deleted product: ${productName} (${productCode})`, 'product', productId)
};

// Backward-compatible medicine helpers (map to medicine actions if emitted elsewhere)
export const logMedicineActivity = {
  added: (medicineName, medicineCode) => 
    logActivity(ACTIVITY_TYPES.MEDICINE_ADDED, `Added medicine: ${medicineName} (${medicineCode})`, 'medicine'),
  
  updated: (medicineName, medicineCode) => 
    logActivity(ACTIVITY_TYPES.MEDICINE_UPDATED, `Updated medicine: ${medicineName} (${medicineCode})`, 'medicine'),
  
  deleted: (medicineName, medicineCode) => 
    logActivity(ACTIVITY_TYPES.MEDICINE_DELETED, `Deleted medicine: ${medicineName} (${medicineCode})`, 'medicine')
};

export const logInvoiceActivity = {
  generated: (invoiceNumber, total) => 
    logActivity(ACTIVITY_TYPES.INVOICE_GENERATED, `Generated invoice: ${invoiceNumber} (Total: ${total})`, 'invoice', invoiceNumber),
  
  printed: (invoiceNumber) => 
    logActivity(ACTIVITY_TYPES.INVOICE_PRINTED, `Printed invoice: ${invoiceNumber}`, 'invoice', invoiceNumber),
  
  deleted: (invoiceNumber) => 
    logActivity(ACTIVITY_TYPES.INVOICE_DELETED, `Deleted invoice: ${invoiceNumber}`, 'invoice', invoiceNumber)
};

export const logInventoryActivity = {
  inflow: (productName, quantity, reference = '') => 
    logActivity(ACTIVITY_TYPES.INVENTORY_INFLOW, `Inflow: ${quantity} units of ${productName}`, 'inventory', reference),
  
  outflow: (productName, quantity, reference = '') => 
    logActivity(ACTIVITY_TYPES.INVENTORY_OUTFLOW, `Outflow: ${quantity} units of ${productName}`, 'inventory', reference),

  stockUpdated: (productName, quantity, reason = '') =>
    logActivity(ACTIVITY_TYPES.STOCK_UPDATED, `Stock updated: ${productName} → ${quantity} (${reason})`, 'inventory')
};

export const logReturnActivity = {
  created: (returnNumber, productName, quantity) => 
    logActivity(ACTIVITY_TYPES.RETURN_CREATED, `Created return: ${returnNumber} for ${productName} (${quantity} units)`, 'return', returnNumber),
  
  updated: (returnNumber, productName) => 
    logActivity(ACTIVITY_TYPES.RETURN_UPDATED, `Updated return: ${returnNumber} for ${productName}`, 'return', returnNumber),
  
  deleted: (returnNumber, productName) => 
    logActivity(ACTIVITY_TYPES.RETURN_DELETED, `Deleted return: ${returnNumber} for ${productName}`, 'return', returnNumber)
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
    logActivity(ACTIVITY_TYPES.SETTINGS_UPDATED, `Updated setting: ${settingName} from ${oldValue} to ${newValue}`, 'settings'),

  businessSetupSaved: (businessName) => 
    logActivity(ACTIVITY_TYPES.BUSINESS_SETUP_SAVED, `Business setup saved for ${businessName}`, 'settings'),

  businessSetupUpdated: (businessName) => 
    logActivity(ACTIVITY_TYPES.BUSINESS_SETUP_UPDATED, `Business setup updated for ${businessName}`, 'settings')
}; 

// Supplier helpers
export const logSupplierActivity = {
  added: (supplierName, supplierId = '') =>
    logActivity(ACTIVITY_TYPES.SUPPLIER_ADDED, `Added supplier: ${supplierName}`,'supplier', supplierId),
  updated: (supplierName, supplierId = '') =>
    logActivity(ACTIVITY_TYPES.SUPPLIER_UPDATED, `Updated supplier: ${supplierName}`,'supplier', supplierId),
  deleted: (supplierName, supplierId = '') =>
    logActivity(ACTIVITY_TYPES.SUPPLIER_DELETED, `Deleted supplier: ${supplierName}`,'supplier', supplierId)
};