// Universal Business Management System Configuration
// This file contains all configurable settings for different business types

export const SYSTEM_CONFIG = {
  // System Information
  systemName: 'Universal Business Management System',
  version: '2.0.0',
  developer: 'Codebridge',
  supportContact: '+92 308 2283845',
  supportEmail: 'support@codebridge.com',
  
  // Default Business Settings
  defaultBusiness: {
    name: 'Your Business Name',
    type: 'Retail Store',
    industry: 'General',
    currency: 'Rs',
    currencySymbol: '₹',
    timezone: 'Asia/Karachi',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  
  // Business Types Configuration
  businessTypes: {
    'retail-store': {
      name: 'Retail Store',
      description: 'General retail store with inventory management',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports'],
      categories: ['General', 'Electronics', 'Clothing', 'Food', 'Home', 'Sports', 'Books', 'Automotive', 'Beauty', 'Toys', 'Office'],
      defaultDiscount: 3,
      hasExpiryDates: true,
      hasBatchNumbers: true,
      hasSerialNumbers: false,
      hasWarranty: false
    },
    'pharmacy': {
      name: 'Pharmacy',
      description: 'Pharmacy and medical store management',
      features: ['inventory', 'sales', 'prescriptions', 'customers', 'suppliers', 'reports', 'expiry-tracking'],
      categories: ['Medicines', 'Supplements', 'Medical Devices', 'Personal Care', 'First Aid', 'Baby Care'],
      defaultDiscount: 5,
      hasExpiryDates: true,
      hasBatchNumbers: true,
      hasSerialNumbers: false,
      hasWarranty: false
    },
    'electronics-store': {
      name: 'Electronics Store',
      description: 'Electronics and gadgets store',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports', 'warranty-tracking'],
      categories: ['Mobile Phones', 'Laptops', 'Accessories', 'Gaming', 'Audio', 'Cameras', 'TVs', 'Home Appliances'],
      defaultDiscount: 2,
      hasExpiryDates: false,
      hasBatchNumbers: true,
      hasSerialNumbers: true,
      hasWarranty: true
    },
    'clothing-store': {
      name: 'Clothing Store',
      description: 'Fashion and apparel store',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports', 'size-management'],
      categories: ['Men\'s Wear', 'Women\'s Wear', 'Kids Wear', 'Footwear', 'Accessories', 'Sports Wear'],
      defaultDiscount: 10,
      hasExpiryDates: false,
      hasBatchNumbers: false,
      hasSerialNumbers: false,
      hasWarranty: false
    },
    'supermarket': {
      name: 'Supermarket',
      description: 'Grocery and supermarket management',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports', 'expiry-tracking'],
      categories: ['Groceries', 'Fresh Produce', 'Dairy', 'Beverages', 'Snacks', 'Household', 'Personal Care'],
      defaultDiscount: 1,
      hasExpiryDates: true,
      hasBatchNumbers: true,
      hasSerialNumbers: false,
      hasWarranty: false
    },
    'hardware-store': {
      name: 'Hardware Store',
      description: 'Hardware and construction materials',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports', 'project-management'],
      categories: ['Tools', 'Building Materials', 'Electrical', 'Plumbing', 'Paint', 'Garden', 'Safety Equipment'],
      defaultDiscount: 5,
      hasExpiryDates: false,
      hasBatchNumbers: true,
      hasSerialNumbers: false,
      hasWarranty: true
    },
    'automotive-parts': {
      name: 'Automotive Parts',
      description: 'Automotive parts and accessories',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports', 'vehicle-compatibility'],
      categories: ['Engine Parts', 'Brake System', 'Suspension', 'Electrical', 'Interior', 'Exterior', 'Tools'],
      defaultDiscount: 3,
      hasExpiryDates: false,
      hasBatchNumbers: true,
      hasSerialNumbers: true,
      hasWarranty: true
    },
    'bookstore': {
      name: 'Bookstore',
      description: 'Books and publications store',
      features: ['inventory', 'sales', 'customers', 'suppliers', 'reports', 'genre-management'],
      categories: ['Fiction', 'Non-Fiction', 'Academic', 'Children', 'Reference', 'Magazines', 'Stationery'],
      defaultDiscount: 15,
      hasExpiryDates: false,
      hasBatchNumbers: false,
      hasSerialNumbers: false,
      hasWarranty: false
    }
  },
  
  // Feature Configuration
  features: {
    inventory: {
      name: 'Inventory Management',
      description: 'Complete inventory tracking and management',
      enabled: true,
      modules: ['stock', 'categories', 'suppliers', 'purchases', 'returns']
    },
    sales: {
      name: 'Sales Management',
      description: 'Sales tracking and invoice generation',
      enabled: true,
      modules: ['invoices', 'customers', 'payments', 'discounts']
    },
    customers: {
      name: 'Customer Management',
      description: 'Customer database and relationship management',
      enabled: true,
      modules: ['profiles', 'history', 'loyalty', 'communications']
    },
    suppliers: {
      name: 'Supplier Management',
      description: 'Supplier database and purchase management',
      enabled: true,
      modules: ['profiles', 'purchases', 'payments', 'ratings']
    },
    reports: {
      name: 'Reporting & Analytics',
      description: 'Comprehensive business reports and analytics',
      enabled: true,
      modules: ['sales', 'inventory', 'financial', 'custom']
    },
    users: {
      name: 'User Management',
      description: 'Multi-user access and role management',
      enabled: true,
      modules: ['roles', 'permissions', 'activity-logs']
    }
  },
  
  // UI Configuration
  ui: {
    theme: 'light', // light, dark, auto
    colorScheme: 'blue', // blue, green, purple, red, orange
    sidebarCollapsed: false,
    showNotifications: true,
    showActivityLogs: true,
    showHelpTooltips: true
  },
  
  // Security Configuration
  security: {
    passwordMinLength: 8,
    requireStrongPasswords: true,
    sessionTimeout: 24, // hours
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    requireTwoFactor: false,
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'],
    maxFileSize: 5 // MB
  },
  
  // Notification Configuration
  notifications: {
    email: {
      enabled: false,
      smtp: {
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: ''
      }
    },
    sms: {
      enabled: false,
      provider: '',
      apiKey: '',
      apiSecret: ''
    },
    push: {
      enabled: true,
      vapidPublicKey: '',
      vapidPrivateKey: ''
    }
  },
  
  // Backup Configuration
  backup: {
    autoBackup: true,
    backupFrequency: 'daily', // daily, weekly, monthly
    backupTime: '02:00',
    retentionDays: 30,
    includeFiles: true,
    includeDatabase: true,
    cloudStorage: {
      enabled: false,
      provider: '', // aws, google, azure
      bucket: '',
      region: ''
    }
  },
  
  // Warehouse/Location Configuration
  warehouse: {
    defaultSettings: {
      enableMultiLocation: true,
      requireTransferApproval: false,
      allowNegativeStock: false,
      defaultLocation: 'main',
      transferTypes: ['manual', 'automatic', 'emergency'],
      stockThresholds: {
        lowStock: 10,
        criticalStock: 5,
        overstock: 100
      }
    },
    
    locationTypes: [
      'main_warehouse',
      'branch_office', 
      'retail_store',
      'distribution_center',
      'supplier_warehouse'
    ],
    
    transferStatuses: [
      'pending',
      'approved',
      'in_transit',
      'completed',
      'cancelled',
      'rejected'
    ],
    
    transferReasons: [
      'stock_replenishment',
      'seasonal_adjustment',
      'damage_replacement',
      'new_branch_setup',
      'inventory_optimization',
      'emergency_supply'
    ]
  }
};

// Helper functions for configuration
export const getBusinessTypeConfig = (businessType) => {
  return SYSTEM_CONFIG.businessTypes[businessType] || SYSTEM_CONFIG.businessTypes['retail-store'];
};

export const isFeatureEnabled = (featureName) => {
  return SYSTEM_CONFIG.features[featureName]?.enabled || false;
};

export const getDefaultCategories = (businessType) => {
  const config = getBusinessTypeConfig(businessType);
  return config.categories || SYSTEM_CONFIG.businessTypes['retail-store'].categories;
};

export const getDefaultDiscount = (businessType) => {
  const config = getBusinessTypeConfig(businessType);
  return config.defaultDiscount || 3;
};

export default SYSTEM_CONFIG;
