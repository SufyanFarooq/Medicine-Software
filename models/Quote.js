const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative'],
    default: 0
  }
}, { _id: true });

const quoteSchema = new mongoose.Schema({
  // Quote Identification
  number: {
    type: String,
    required: [true, 'Quote number is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Quote number cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2020, 'Year must be 2020 or later'],
    max: [2050, 'Year cannot exceed 2050'],
    default: () => new Date().getFullYear()
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
    trim: true,
    maxlength: [100, 'Lead name cannot exceed 100 characters']
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
  
  // Quote Dates
  date: {
    type: Date,
    required: [true, 'Quote date is required'],
    default: Date.now
  },
  expireDate: {
    type: Date,
    required: [true, 'Expire date is required'],
    validate: {
      validator: function(expireDate) {
        return expireDate > this.date;
      },
      message: 'Expire date must be after quote date'
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
  
  // Quote Items
  items: {
    type: [quoteItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'Quote must have at least one item'
    }
  },
  
  // Financial Calculations
  subTotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative'],
    default: 0
  },
  taxRate: {
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%'],
    default: 0
  },
  taxAmount: {
    type: Number,
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  discountRate: {
    type: Number,
    min: [0, 'Discount rate cannot be negative'],
    max: [100, 'Discount rate cannot exceed 100%'],
    default: 0
  },
  discountAmount: {
    type: Number,
    min: [0, 'Discount amount cannot be negative'],
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative'],
    default: 0
  },
  
  // Quote Status and Workflow
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Rejected', 'Expired', 'Converted'],
      message: 'Invalid status'
    },
    default: 'Draft'
  },
  
  // Additional Information
  note: {
    type: String,
    trim: true,
    maxlength: [1000, 'Note cannot exceed 1000 characters']
  },
  terms: {
    type: String,
    trim: true,
    maxlength: [2000, 'Terms cannot exceed 2000 characters']
  },
  
  // Conversion Tracking
  convertedToInvoice: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  convertedAt: {
    type: Date
  },
  
  // Client Interaction
  sentAt: {
    type: Date
  },
  viewedAt: {
    type: Date
  },
  acceptedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  
  // Validity and Follow-up
  isExpired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  remindersSent: {
    type: Number,
    default: 0,
    min: [0, 'Reminders sent cannot be negative']
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
quoteSchema.index({ number: 1 });
quoteSchema.index({ leadId: 1 });
quoteSchema.index({ status: 1 });
quoteSchema.index({ date: -1 });
quoteSchema.index({ expireDate: 1 });
quoteSchema.index({ createdAt: -1 });
quoteSchema.index({ year: 1, number: 1 });

// Compound indexes
quoteSchema.index({ status: 1, expireDate: 1 });
quoteSchema.index({ leadId: 1, status: 1, createdAt: -1 });
quoteSchema.index({ createdBy: 1, status: 1, date: -1 });

// Virtual for days until expiry
quoteSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expireDate) return null;
  const now = new Date();
  const diffTime = this.expireDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for quote age (days since creation)
quoteSchema.virtual('quoteAge').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for formatted quote number
quoteSchema.virtual('formattedNumber').get(function() {
  return `QT-${this.year}-${this.number.toString().padStart(4, '0')}`;
});

// Pre-save middleware to calculate totals and update timestamps
quoteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate item totals
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.total = item.quantity * item.price;
    });
    
    // Calculate subtotal
    this.subTotal = this.items.reduce((sum, item) => sum + item.total, 0);
  }
  
  // Calculate tax amount
  this.taxAmount = (this.subTotal * this.taxRate) / 100;
  
  // Calculate discount amount
  this.discountAmount = (this.subTotal * this.discountRate) / 100;
  
  // Calculate final total
  this.total = this.subTotal + this.taxAmount - this.discountAmount;
  
  // Check if expired
  if (this.expireDate && new Date() > this.expireDate && this.status !== 'Expired' && this.status !== 'Accepted' && this.status !== 'Converted') {
    this.isExpired = true;
    this.status = 'Expired';
  }
  
  next();
});

// Pre-update middleware
quoteSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance method to send quote
quoteSchema.methods.sendQuote = function() {
  this.status = 'Sent';
  this.sentAt = new Date();
  return this.save();
};

// Instance method to mark as viewed
quoteSchema.methods.markAsViewed = function() {
  if (this.status === 'Sent') {
    this.status = 'Viewed';
  }
  this.viewedAt = new Date();
  return this.save();
};

// Instance method to accept quote
quoteSchema.methods.acceptQuote = function() {
  this.status = 'Accepted';
  this.acceptedAt = new Date();
  return this.save();
};

// Instance method to reject quote
quoteSchema.methods.rejectQuote = function() {
  this.status = 'Rejected';
  this.rejectedAt = new Date();
  return this.save();
};

// Instance method to convert to invoice
quoteSchema.methods.convertToInvoice = function(invoiceId) {
  this.convertedToInvoice = true;
  this.invoiceId = invoiceId;
  this.convertedAt = new Date();
  this.status = 'Converted';
  return this.save();
};

// Static method to get quotes by status
quoteSchema.statics.getByStatus = function(status, limit = 50) {
  return this.find({ status, isActive: true })
    .populate('leadId', 'name email company')
    .populate('createdBy', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get expiring quotes
quoteSchema.statics.getExpiringQuotes = function(days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    expireDate: { $lte: futureDate, $gte: new Date() },
    status: { $in: ['Sent', 'Viewed'] },
    isActive: true
  })
    .populate('leadId', 'name email company')
    .sort({ expireDate: 1 });
};

// Static method to get quote statistics
quoteSchema.statics.getStatistics = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$total' },
        avgValue: { $avg: '$total' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to generate next quote number for a year
quoteSchema.statics.generateNextNumber = async function(year) {
  const lastQuote = await this.findOne({ year })
    .sort({ number: -1 })
    .select('number');
  
  const nextNumber = lastQuote ? parseInt(lastQuote.number) + 1 : 1;
  return nextNumber.toString().padStart(4, '0');
};

// Export model
module.exports = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);

