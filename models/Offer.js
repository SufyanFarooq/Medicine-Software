const mongoose = require('mongoose');

const offerItemSchema = new mongoose.Schema({
  item: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [200, 'Item name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price cannot be negative']
  },
  offerPrice: {
    type: Number,
    required: [true, 'Offer price is required'],
    min: [0, 'Offer price cannot be negative']
  },
  discountPercent: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  }
}, { _id: true });

const offerSchema = new mongoose.Schema({
  // Offer Identification
  number: {
    type: String,
    required: [true, 'Offer number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Offer number cannot exceed 50 characters']
  },
  title: {
    type: String,
    required: [true, 'Offer title is required'],
    trim: true,
    maxlength: [200, 'Offer title cannot exceed 200 characters']
  },
  
  // Lead Information
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'Lead is required']
  },
  leadName: {
    type: String,
    required: [true, 'Lead name is required'],
    trim: true
  },
  leadEmail: {
    type: String,
    required: [true, 'Lead email is required'],
    trim: true,
    lowercase: true
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  // Offer Details
  offerType: {
    type: String,
    required: [true, 'Offer type is required'],
    enum: {
      values: ['Discount', 'Bundle', 'Special Price', 'Limited Time', 'Volume Discount', 'First Time Customer', 'Seasonal'],
      message: 'Invalid offer type'
    }
  },
  description: {
    type: String,
    required: [true, 'Offer description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Offer Items
  items: {
    type: [offerItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Offer must have at least one item'
    }
  },
  
  // Financial Information
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: {
      values: ['USD', 'EUR', 'GBP', 'INR', 'PKR', 'CAD', 'AUD', 'JPY', 'CNY'],
      message: 'Invalid currency'
    },
    default: 'USD'
  },
  currencySymbol: {
    type: String,
    default: '$'
  },
  
  // Totals
  originalTotal: {
    type: Number,
    required: true,
    min: [0, 'Original total cannot be negative']
  },
  offerTotal: {
    type: Number,
    required: true,
    min: [0, 'Offer total cannot be negative']
  },
  totalDiscount: {
    type: Number,
    required: true,
    min: [0, 'Total discount cannot be negative']
  },
  discountPercent: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%']
  },
  
  // Offer Validity
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    validate: {
      validator: function(validUntil) {
        return validUntil > this.validFrom;
      },
      message: 'Valid until date must be after valid from date'
    }
  },
  
  // Offer Status
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Draft', 'Sent', 'Viewed', 'Interested', 'Accepted', 'Rejected', 'Expired', 'Converted'],
      message: 'Invalid status'
    },
    default: 'Draft'
  },
  
  // Offer Conditions
  minQuantity: {
    type: Number,
    min: [1, 'Minimum quantity cannot be less than 1']
  },
  maxQuantity: {
    type: Number,
    min: [1, 'Maximum quantity cannot be less than 1']
  },
  conditions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Conditions cannot exceed 1000 characters']
  },
  
  // Lead Interaction
  sentAt: {
    type: Date
  },
  viewedAt: {
    type: Date
  },
  respondedAt: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  
  // Conversion Tracking
  convertedToQuote: {
    type: Boolean,
    default: false
  },
  quoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  convertedAt: {
    type: Date
  },
  
  // Follow-up
  followUpDate: {
    type: Date
  },
  remindersSent: {
    type: Number,
    default: 0,
    min: [0, 'Reminders sent cannot be negative']
  },
  
  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
  },
  
  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
offerSchema.index({ number: 1 });
offerSchema.index({ leadId: 1 });
offerSchema.index({ status: 1 });
offerSchema.index({ validUntil: 1 });
offerSchema.index({ createdAt: -1 });
offerSchema.index({ offerType: 1 });

// Compound indexes
offerSchema.index({ leadId: 1, status: 1, createdAt: -1 });
offerSchema.index({ status: 1, validUntil: 1 });
offerSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

// Virtual for days until expiry
offerSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.validUntil) return null;
  const now = new Date();
  const diffTime = this.validUntil - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for offer age
offerSchema.virtual('offerAge').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for formatted offer number
offerSchema.virtual('formattedNumber').get(function() {
  return `OF-${this.number.toString().padStart(4, '0')}`;
});

// Pre-save middleware to calculate totals and update timestamps
offerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate item totals and discounts
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.total = item.quantity * item.offerPrice;
      if (item.originalPrice > 0) {
        item.discountPercent = ((item.originalPrice - item.offerPrice) / item.originalPrice) * 100;
      }
    });
    
    // Calculate offer totals
    this.originalTotal = this.items.reduce((sum, item) => sum + (item.quantity * item.originalPrice), 0);
    this.offerTotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.totalDiscount = this.originalTotal - this.offerTotal;
    
    if (this.originalTotal > 0) {
      this.discountPercent = (this.totalDiscount / this.originalTotal) * 100;
    }
  }
  
  // Check if expired
  if (this.validUntil && new Date() > this.validUntil && this.status !== 'Expired' && this.status !== 'Accepted' && this.status !== 'Converted') {
    this.status = 'Expired';
  }
  
  next();
});

// Pre-update middleware
offerSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance method to send offer
offerSchema.methods.sendOffer = function() {
  this.status = 'Sent';
  this.sentAt = new Date();
  return this.save();
};

// Instance method to mark as viewed
offerSchema.methods.markAsViewed = function() {
  if (this.status === 'Sent') {
    this.status = 'Viewed';
  }
  this.viewedAt = new Date();
  return this.save();
};

// Instance method to accept offer
offerSchema.methods.acceptOffer = function() {
  this.status = 'Accepted';
  this.acceptedAt = new Date();
  this.respondedAt = new Date();
  return this.save();
};

// Instance method to reject offer
offerSchema.methods.rejectOffer = function() {
  this.status = 'Rejected';
  this.rejectedAt = new Date();
  this.respondedAt = new Date();
  return this.save();
};

// Instance method to convert to quote
offerSchema.methods.convertToQuote = function(quoteId) {
  this.convertedToQuote = true;
  this.quoteId = quoteId;
  this.convertedAt = new Date();
  this.status = 'Converted';
  return this.save();
};

// Static method to get offers by status
offerSchema.statics.getByStatus = function(status, limit = 50) {
  return this.find({ status, isActive: true })
    .populate('leadId', 'name email company')
    .populate('createdBy', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get expiring offers
offerSchema.statics.getExpiringOffers = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    validUntil: { $lte: futureDate, $gte: new Date() },
    status: { $in: ['Sent', 'Viewed', 'Interested'] },
    isActive: true
  })
    .populate('leadId', 'name email company')
    .sort({ validUntil: 1 });
};

// Static method to generate next offer number
offerSchema.statics.generateNextNumber = async function() {
  const lastOffer = await this.findOne()
    .sort({ number: -1 })
    .select('number');
  
  const nextNumber = lastOffer ? parseInt(lastOffer.number) + 1 : 1;
  return nextNumber.toString().padStart(4, '0');
};

// Export model
module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);

