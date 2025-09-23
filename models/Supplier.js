import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    minlength: [2, 'Supplier name must be at least 2 characters'],
    maxlength: [200, 'Supplier name cannot exceed 200 characters']
  },
  companyName: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters']
  },
  contactPerson: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  
  // Contact Information
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  alternatePhone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid alternate phone number']
  },
  fax: {
    type: String,
    trim: true,
    maxlength: [20, 'Fax cannot exceed 20 characters']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, 'Website cannot exceed 200 characters']
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters']
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
      default: 'Pakistan'
    }
  },
  
  // Business Information
  supplierType: {
    type: String,
    enum: {
      values: ['manufacturer', 'distributor', 'wholesaler', 'importer', 'local_supplier', 'international'],
      message: 'Supplier type must be valid'
    },
    default: 'local_supplier'
  },
  businessRegistrationNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Business registration number cannot exceed 50 characters']
  },
  taxNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Tax number cannot exceed 50 characters']
  },
  licenseNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'License number cannot exceed 50 characters']
  },
  
  // Financial Information
  creditLimit: {
    type: Number,
    min: [0, 'Credit limit cannot be negative'],
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0 // Positive = we owe supplier, Negative = supplier owes us
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit_7', 'credit_15', 'credit_30', 'credit_45', 'credit_60', 'credit_90', 'custom'],
    default: 'credit_30'
  },
  customPaymentTerms: {
    type: String,
    trim: true,
    maxlength: [200, 'Custom payment terms cannot exceed 200 characters']
  },
  currency: {
    type: String,
    enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'],
    default: 'PKR'
  },
  
  // Supplier Performance
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    default: 3
  },
  reliability: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    default: 'good'
  },
  
  // Categories and Products
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  specializations: [String], // e.g., ['antibiotics', 'pain_relief', 'vitamins']
  
  // Delivery and Logistics
  deliveryTerms: {
    type: String,
    enum: ['pickup', 'delivery', 'both'],
    default: 'both'
  },
  minimumOrderAmount: {
    type: Number,
    min: [0, 'Minimum order amount cannot be negative'],
    default: 0
  },
  leadTime: {
    type: Number, // in days
    min: [0, 'Lead time cannot be negative'],
    default: 7
  },
  
  // Status and Flags
  isActive: {
    type: Boolean,
    default: true
  },
  isPreferred: {
    type: Boolean,
    default: false
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Blacklist reason cannot exceed 500 characters']
  },
  
  // Analytics and Performance
  analytics: {
    totalPurchaseOrders: { type: Number, default: 0 },
    totalPurchaseValue: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastOrderDate: Date,
    firstOrderDate: Date,
    onTimeDeliveryRate: { type: Number, default: 100 }, // percentage
    qualityRating: { type: Number, default: 5, min: 1, max: 5 },
    responseTime: { type: Number, default: 24 } // hours
  },
  
  // Documents and Certifications
  documents: [{
    type: {
      type: String,
      enum: ['license', 'certificate', 'tax_document', 'contract', 'other'],
      required: true
    },
    name: String,
    url: String,
    expiryDate: Date,
    isVerified: { type: Boolean, default: false }
  }],
  
  // Bank Information
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountTitle: String,
    branchCode: String,
    iban: String,
    swiftCode: String
  },
  
  // Notes and Additional Info
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  tags: [String],
  
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
  }
}, {
  timestamps: true,
  collection: 'suppliers'
});

// Indexes for performance
SupplierSchema.index({ name: 1 });
SupplierSchema.index({ email: 1 });
SupplierSchema.index({ phone: 1 });
SupplierSchema.index({ supplierType: 1 });
SupplierSchema.index({ isActive: 1 });
SupplierSchema.index({ isPreferred: 1 });
SupplierSchema.index({ isBlacklisted: 1 });
SupplierSchema.index({ rating: -1 });
SupplierSchema.index({ createdAt: -1 });

// Compound indexes
SupplierSchema.index({ supplierType: 1, isActive: 1 });
SupplierSchema.index({ isActive: 1, isBlacklisted: 1 });
SupplierSchema.index({ name: 'text', companyName: 'text', email: 'text' }); // Text search

// Pre-save middleware
SupplierSchema.pre('save', function(next) {
  // Calculate average order value
  if (this.analytics.totalPurchaseOrders > 0) {
    this.analytics.averageOrderValue = this.analytics.totalPurchaseValue / this.analytics.totalPurchaseOrders;
  }
  
  // Set first order date if this is the first order
  if (this.analytics.totalPurchaseOrders === 1 && !this.analytics.firstOrderDate) {
    this.analytics.firstOrderDate = this.analytics.lastOrderDate || new Date();
  }
  
  next();
});

// Static methods
SupplierSchema.statics.findActive = function() {
  return this.find({ isActive: true, isBlacklisted: false }).sort({ name: 1 });
};

SupplierSchema.statics.findPreferred = function() {
  return this.find({ isActive: true, isPreferred: true, isBlacklisted: false }).sort({ rating: -1 });
};

SupplierSchema.statics.findByType = function(supplierType) {
  return this.find({ supplierType, isActive: true, isBlacklisted: false }).sort({ name: 1 });
};

SupplierSchema.statics.findTopPerformers = function(limit = 10) {
  return this.find({ isActive: true, isBlacklisted: false })
    .sort({ rating: -1, 'analytics.onTimeDeliveryRate': -1 })
    .limit(limit);
};

// Instance methods
SupplierSchema.methods.getFullAddress = function() {
  const addr = this.address;
  const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
  return parts.join(', ');
};

SupplierSchema.methods.updateOrderAnalytics = function(orderAmount) {
  this.analytics.totalPurchaseOrders += 1;
  this.analytics.totalPurchaseValue += orderAmount;
  this.analytics.lastOrderDate = new Date();
  this.analytics.averageOrderValue = this.analytics.totalPurchaseValue / this.analytics.totalPurchaseOrders;
  
  return this.save();
};

SupplierSchema.methods.updateDeliveryPerformance = function(wasOnTime) {
  const totalDeliveries = this.analytics.totalPurchaseOrders;
  const currentOnTimeRate = this.analytics.onTimeDeliveryRate;
  
  // Calculate new on-time delivery rate
  const onTimeDeliveries = Math.round((currentOnTimeRate / 100) * totalDeliveries);
  const newOnTimeDeliveries = onTimeDeliveries + (wasOnTime ? 1 : 0);
  this.analytics.onTimeDeliveryRate = (newOnTimeDeliveries / totalDeliveries) * 100;
  
  return this.save();
};

// Virtuals
SupplierSchema.virtual('displayName').get(function() {
  return this.companyName || this.name;
});

SupplierSchema.virtual('outstandingBalance').get(function() {
  return Math.max(0, this.currentBalance);
});

SupplierSchema.virtual('performanceScore').get(function() {
  // Calculate performance score based on rating, delivery rate, and quality
  const ratingScore = (this.rating / 5) * 40;
  const deliveryScore = (this.analytics.onTimeDeliveryRate / 100) * 30;
  const qualityScore = (this.analytics.qualityRating / 5) * 30;
  
  return Math.round(ratingScore + deliveryScore + qualityScore);
});

// Ensure virtual fields are serialized
SupplierSchema.set('toJSON', { virtuals: true });

// Export model
const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
export default Supplier;
