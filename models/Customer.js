import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    minlength: [2, 'Customer name must be at least 2 characters'],
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
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
  customerType: {
    type: String,
    enum: {
      values: ['individual', 'business', 'hospital', 'clinic', 'pharmacy', 'wholesale', 'retail'],
      message: 'Customer type must be valid'
    },
    default: 'individual'
  },
  businessName: {
    type: String,
    trim: true,
    maxlength: [200, 'Business name cannot exceed 200 characters']
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
    default: 0 // Can be negative (customer owes money) or positive (advance payment)
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit_7', 'credit_15', 'credit_30', 'credit_45', 'credit_60', 'custom'],
    default: 'cash'
  },
  customPaymentTerms: {
    type: String,
    trim: true,
    maxlength: [200, 'Custom payment terms cannot exceed 200 characters']
  },
  
  // Discount and Pricing
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100'],
    default: 0
  },
  priceCategory: {
    type: String,
    enum: ['retail', 'wholesale', 'special', 'vip'],
    default: 'retail'
  },
  
  // Status and Flags
  isActive: {
    type: Boolean,
    default: true
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
  
  // Customer Analytics
  analytics: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lastOrderDate: Date,
    firstOrderDate: Date,
    loyaltyPoints: { type: Number, default: 0 },
    customerSince: { type: Date, default: Date.now }
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
  collection: 'customers'
});

// Indexes for performance
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ customerType: 1 });
CustomerSchema.index({ isActive: 1 });
CustomerSchema.index({ isBlacklisted: 1 });
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ 'analytics.lastOrderDate': -1 });

// Compound indexes
CustomerSchema.index({ customerType: 1, isActive: 1 });
CustomerSchema.index({ isActive: 1, isBlacklisted: 1 });
CustomerSchema.index({ name: 'text', email: 'text', phone: 'text', businessName: 'text' }); // Text search

// Pre-save middleware
CustomerSchema.pre('save', function(next) {
  // Calculate average order value
  if (this.analytics.totalOrders > 0) {
    this.analytics.averageOrderValue = this.analytics.totalSpent / this.analytics.totalOrders;
  }
  
  // Set first order date if this is the first order
  if (this.analytics.totalOrders === 1 && !this.analytics.firstOrderDate) {
    this.analytics.firstOrderDate = this.analytics.lastOrderDate || new Date();
  }
  
  next();
});

// Static methods
CustomerSchema.statics.findActive = function() {
  return this.find({ isActive: true, isBlacklisted: false }).sort({ name: 1 });
};

CustomerSchema.statics.findByType = function(customerType) {
  return this.find({ customerType, isActive: true, isBlacklisted: false }).sort({ name: 1 });
};

CustomerSchema.statics.findTopCustomers = function(limit = 10) {
  return this.find({ isActive: true, isBlacklisted: false })
    .sort({ 'analytics.totalSpent': -1 })
    .limit(limit);
};

CustomerSchema.statics.searchCustomers = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    isActive: true,
    $or: [
      { name: regex },
      { email: regex },
      { phone: regex },
      { businessName: regex },
      { 'address.city': regex }
    ]
  });
};

// Instance methods
CustomerSchema.methods.getFullAddress = function() {
  const addr = this.address;
  const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean);
  return parts.join(', ');
};

CustomerSchema.methods.updateOrderAnalytics = function(orderAmount) {
  this.analytics.totalOrders += 1;
  this.analytics.totalSpent += orderAmount;
  this.analytics.lastOrderDate = new Date();
  this.analytics.averageOrderValue = this.analytics.totalSpent / this.analytics.totalOrders;
  
  // Award loyalty points (1 point per currency unit spent)
  this.analytics.loyaltyPoints += Math.floor(orderAmount);
  
  return this.save();
};

CustomerSchema.methods.canMakePurchase = function(amount) {
  if (this.isBlacklisted) return { allowed: false, reason: 'Customer is blacklisted' };
  if (!this.isActive) return { allowed: false, reason: 'Customer account is inactive' };
  
  if (this.paymentTerms === 'cash') {
    return { allowed: true, reason: 'Cash payment' };
  }
  
  const newBalance = this.currentBalance + amount;
  if (newBalance > this.creditLimit) {
    return { 
      allowed: false, 
      reason: `Credit limit exceeded. Available credit: ${this.creditLimit - this.currentBalance}` 
    };
  }
  
  return { allowed: true, reason: 'Credit approved' };
};

// Virtuals
CustomerSchema.virtual('displayName').get(function() {
  return this.businessName || this.name;
});

CustomerSchema.virtual('availableCredit').get(function() {
  return Math.max(0, this.creditLimit - this.currentBalance);
});

CustomerSchema.virtual('customerLifetimeValue').get(function() {
  return this.analytics.totalSpent;
});

// Ensure virtual fields are serialized
CustomerSchema.set('toJSON', { virtuals: true });

// Export model
const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export default Customer;
