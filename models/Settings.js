import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  // Business Information
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    minlength: [2, 'Business name must be at least 2 characters'],
    maxlength: [200, 'Business name cannot exceed 200 characters']
  },
  businessType: {
    type: String,
    enum: {
      values: ['retail-store', 'restaurant', 'pharmacy', 'wholesale', 'manufacturing', 'service', 'clinic', 'hospital', 'other'],
      message: 'Business type must be valid'
    },
    default: 'retail-store'
  },
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    default: 'General'
  },
  
  // Contact Information
  contactNumber: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, 'Website cannot exceed 200 characters']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  
  // Financial Settings
  currency: {
    type: String,
    enum: {
      values: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'QAR'],
      message: 'Currency must be valid'
    },
    default: 'PKR'
  },
  currencySymbol: {
    type: String,
    maxlength: [5, 'Currency symbol cannot exceed 5 characters'],
    default: 'Rs'
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100'],
    default: 0
  },
  taxRate: {
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100'],
    default: 0
  },
  
  // Inventory Settings
  lowStockThreshold: {
    type: Number,
    min: [1, 'Low stock threshold must be at least 1'],
    default: 10
  },
  hasExpiryDates: {
    type: Boolean,
    default: true
  },
  hasBatchNumbers: {
    type: Boolean,
    default: true
  },
  hasSerialNumbers: {
    type: Boolean,
    default: false
  },
  hasWarranty: {
    type: Boolean,
    default: false
  },
  autoGenerateSKU: {
    type: Boolean,
    default: true
  },
  
  // Invoice Settings
  invoicePrefix: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Invoice prefix cannot exceed 10 characters'],
    default: 'INV'
  },
  invoiceStartNumber: {
    type: Number,
    min: [1, 'Invoice start number must be at least 1'],
    default: 1
  },
  invoiceTerms: {
    type: String,
    trim: true,
    maxlength: [1000, 'Invoice terms cannot exceed 1000 characters'],
    default: 'Payment due within 30 days'
  },
  
  // Notification Settings
  notificationSettings: {
    lowStockThreshold: {
      type: Number,
      min: [1, 'Low stock threshold must be at least 1'],
      default: 20
    },
    expiryWarningDays: {
      type: Number,
      min: [1, 'Expiry warning days must be at least 1'],
      default: 30
    },
    criticalExpiryDays: {
      type: Number,
      min: [1, 'Critical expiry days must be at least 1'],
      default: 7
    },
    emailNotifications: {
      type: Boolean,
      default: false
    },
    inAppNotifications: {
      type: Boolean,
      default: true
    },
    notificationFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily'],
      default: 'realtime'
    },
    autoCleanupDays: {
      type: Number,
      min: [1, 'Auto cleanup days must be at least 1'],
      default: 30
    },
    stockoutAlert: {
      type: Boolean,
      default: true
    }
  },
  
  // Regional Settings
  timezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  language: {
    type: String,
    enum: ['en', 'ur', 'ar'],
    default: 'en'
  },
  dateFormat: {
    type: String,
    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
    default: 'DD/MM/YYYY'
  },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '24h'
  },
  
  // Feature Toggles
  features: {
    multiWarehouse: {
      type: Boolean,
      default: false
    },
    barcodeScanning: {
      type: Boolean,
      default: true
    },
    loyaltyProgram: {
      type: Boolean,
      default: false
    },
    advancedReporting: {
      type: Boolean,
      default: false
    },
    mobileApp: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    }
  },
  
  // Email Settings
  emailSettings: {
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPassword: String, // Should be encrypted
    fromEmail: String,
    fromName: String,
    enableSSL: { type: Boolean, default: true }
  },
  
  // SMS Settings
  smsSettings: {
    provider: {
      type: String,
      enum: ['twilio', 'nexmo', 'local', 'none'],
      default: 'none'
    },
    apiKey: String, // Should be encrypted
    apiSecret: String, // Should be encrypted
    fromNumber: String
  },
  
  // Backup and Security
  backupSettings: {
    autoBackup: {
      type: Boolean,
      default: false
    },
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    retentionDays: {
      type: Number,
      min: [1, 'Retention days must be at least 1'],
      default: 30
    }
  },
  
  // System Settings
  systemSettings: {
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    allowRegistration: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      min: [5, 'Session timeout must be at least 5 minutes'],
      default: 60 // minutes
    },
    maxLoginAttempts: {
      type: Number,
      min: [1, 'Max login attempts must be at least 1'],
      default: 5
    }
  },
  
  // Logo and Branding
  logo: {
    url: String,
    alt: String
  },
  favicon: {
    url: String
  },
  primaryColor: {
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code'],
    default: '#1890ff'
  },
  secondaryColor: {
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code'],
    default: '#52c41a'
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Versioning for settings changes
  version: {
    type: Number,
    default: 1
  },
  lastConfigUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'settings'
});

// Indexes
SettingsSchema.index({ businessName: 1 });
SettingsSchema.index({ businessType: 1 });
SettingsSchema.index({ version: -1 });
SettingsSchema.index({ lastConfigUpdate: -1 });

// Pre-save middleware
SettingsSchema.pre('save', function(next) {
  // Update version and last config update on changes
  if (this.isModified() && !this.isNew) {
    this.version += 1;
    this.lastConfigUpdate = new Date();
  }
  
  next();
});

// Static methods
SettingsSchema.statics.getCurrentSettings = function() {
  return this.findOne().sort({ version: -1 });
};

SettingsSchema.statics.getBusinessInfo = function() {
  return this.findOne({}, {
    businessName: 1,
    businessType: 1,
    industry: 1,
    contactNumber: 1,
    email: 1,
    address: 1,
    website: 1
  });
};

SettingsSchema.statics.getFinancialSettings = function() {
  return this.findOne({}, {
    currency: 1,
    currencySymbol: 1,
    discountPercentage: 1,
    taxRate: 1
  });
};

SettingsSchema.statics.getNotificationSettings = function() {
  return this.findOne({}, {
    notificationSettings: 1
  });
};

// Instance methods
SettingsSchema.methods.updateBusinessInfo = function(businessInfo) {
  Object.assign(this, businessInfo);
  this.lastConfigUpdate = new Date();
  return this.save();
};

SettingsSchema.methods.updateNotificationSettings = function(notificationSettings) {
  this.notificationSettings = { ...this.notificationSettings, ...notificationSettings };
  this.lastConfigUpdate = new Date();
  return this.save();
};

SettingsSchema.methods.toggleFeature = function(featureName, enabled) {
  if (this.features.hasOwnProperty(featureName)) {
    this.features[featureName] = enabled;
    this.lastConfigUpdate = new Date();
    return this.save();
  }
  throw new Error(`Feature '${featureName}' not found`);
};

// Virtuals
SettingsSchema.virtual('isConfigured').get(function() {
  return this.businessName !== 'My Business' && 
         this.contactNumber && 
         this.address;
});

SettingsSchema.virtual('notificationCount').get(function() {
  let count = 0;
  if (this.notificationSettings.emailNotifications) count++;
  if (this.notificationSettings.inAppNotifications) count++;
  return count;
});

// Ensure virtual fields are serialized
SettingsSchema.set('toJSON', { virtuals: true });

// Export model
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export default Settings;
