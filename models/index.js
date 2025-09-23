// Central export file for all database models
// This makes it easy to import models throughout the application

// Phase 1 - Core Models
export { default as User } from './User.js';
export { default as Category } from './Category.js';
export { default as Product } from './Product.js';
export { default as Customer } from './Customer.js';
export { default as Supplier } from './Supplier.js';
export { default as Invoice } from './Invoice.js';
export { default as InvoiceItem } from './InvoiceItem.js';
export { default as Settings } from './Settings.js';

// Phase 2 - Business Logic Models
export { default as Batch } from './Batch.js';
export { default as PurchaseOrder } from './PurchaseOrder.js';
export { default as Payment } from './Payment.js';
export { default as Return } from './Return.js';

// Phase 3 - Advanced Models
export { default as Warehouse } from './Warehouse.js';
export { default as Transfer } from './Transfer.js';
export { default as Activity } from './Activity.js';
export { default as Notification } from './Notification.js';

// Model validation helper
export const validateModels = () => {
  const models = [
    // Phase 1 - Core Models
    'User', 'Category', 'Product', 'Customer', 
    'Supplier', 'Invoice', 'InvoiceItem', 'Settings',
    // Phase 2 - Business Logic Models
    'Batch', 'PurchaseOrder', 'Payment', 'Return',
    // Phase 3 - Advanced Models
    'Warehouse', 'Transfer', 'Activity', 'Notification'
  ];
  
  console.log('✅ Available Models:', models);
  return models;
};

// Database connection helper
export const getModelStats = async () => {
  try {
    const stats = {};
    
    // Get collection stats for each model
    const collections = [
      'users', 'categories', 'products', 'customers', 'suppliers', 
      'invoices', 'invoice_items', 'settings', 'batches', 'purchase_orders', 
      'payments', 'returns', 'warehouses', 'transfers', 'activities', 'notifications'
    ];
    
    for (const collection of collections) {
      try {
        const count = await mongoose.connection.db.collection(collection).countDocuments();
        stats[collection] = count;
      } catch (error) {
        stats[collection] = 'Error';
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting model stats:', error);
    return {};
  }
};
