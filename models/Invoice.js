import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  // Invoice Identification
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= this.invoiceDate;
      },
      message: 'Due date must be after invoice date'
    }
  },
  
  // Customer Information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  // Snapshot of customer info at time of invoice (for historical accuracy)
  customerSnapshot: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  
  // Financial Information
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
    default: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    min: [0, 'Discount value cannot be negative'],
    default: 0
  },
  discountAmount: {
    type: Number,
    min: [0, 'Discount amount cannot be negative'],
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
  shippingCost: {
    type: Number,
    min: [0, 'Shipping cost cannot be negative'],
    default: 0
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative']
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      message: 'Payment status must be valid'
    },
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'check', 'credit', 'other'],
    default: 'cash'
  },
  paidAmount: {
    type: Number,
    min: [0, 'Paid amount cannot be negative'],
    default: 0
  },
  remainingAmount: {
    type: Number,
    min: [0, 'Remaining amount cannot be negative'],
    default: 0
  },
  
  // Invoice Status
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'sent', 'viewed', 'approved', 'rejected', 'cancelled'],
      message: 'Invoice status must be valid'
    },
    default: 'draft'
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
  terms: {
    type: String,
    trim: true,
    maxlength: [1000, 'Terms cannot exceed 1000 characters']
  },
  
  // Reference Numbers
  referenceNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference number cannot exceed 100 characters']
  },
  purchaseOrderNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Purchase order number cannot exceed 100 characters']
  },
  
  // Delivery Information
  deliveryDate: Date,
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  deliveryNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Delivery notes cannot exceed 500 characters']
  },
  
  // Currency and Locale
  currency: {
    type: String,
    enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'],
    default: 'PKR'
  },
  exchangeRate: {
    type: Number,
    min: [0, 'Exchange rate cannot be negative'],
    default: 1
  },
  
  // Audit and Tracking
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
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // Email and Communication
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  emailSentTo: String,
  viewedAt: Date,
  
  // Recurring Invoice (if applicable)
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly']
  },
  parentInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }
}, {
  timestamps: true,
  collection: 'invoices'
});

// Indexes for performance
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ customer: 1 });
InvoiceSchema.index({ invoiceDate: -1 });
InvoiceSchema.index({ dueDate: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ paymentStatus: 1 });
InvoiceSchema.index({ total: -1 });
InvoiceSchema.index({ createdAt: -1 });

// Compound indexes
InvoiceSchema.index({ customer: 1, invoiceDate: -1 });
InvoiceSchema.index({ status: 1, paymentStatus: 1 });
InvoiceSchema.index({ paymentStatus: 1, dueDate: 1 });
InvoiceSchema.index({ invoiceDate: -1, total: -1 });

// Pre-save middleware
InvoiceSchema.pre('save', function(next) {
  // Calculate remaining amount
  this.remainingAmount = Math.max(0, this.total - this.paidAmount);
  
  // Update payment status based on paid amount
  if (this.paidAmount === 0) {
    this.paymentStatus = 'pending';
  } else if (this.paidAmount >= this.total) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
  
  // Check if overdue
  if (this.dueDate && this.dueDate < new Date() && this.paymentStatus !== 'paid') {
    this.paymentStatus = 'overdue';
  }
  
  next();
});

// Pre-save middleware to generate invoice number
InvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      // Get the current year
      const year = new Date().getFullYear();
      const yearStr = year.toString().slice(-2);
      
      // Find the last invoice number for this year
      const lastInvoice = await this.constructor
        .findOne({ 
          invoiceNumber: new RegExp(`^INV${yearStr}`) 
        })
        .sort({ invoiceNumber: -1 });
      
      let nextNumber = 1;
      if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.invoiceNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      // Generate new invoice number: INV23-0001
      this.invoiceNumber = `INV${yearStr}-${nextNumber.toString().padStart(4, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Static methods
InvoiceSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customer: customerId }).sort({ invoiceDate: -1 }).populate('customer');
};

InvoiceSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ invoiceDate: -1 }).populate('customer');
};

InvoiceSchema.statics.findByPaymentStatus = function(paymentStatus) {
  return this.find({ paymentStatus }).sort({ dueDate: 1 }).populate('customer');
};

InvoiceSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    paymentStatus: { $in: ['pending', 'partial'] }
  }).sort({ dueDate: 1 }).populate('customer');
};

InvoiceSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    invoiceDate: { $gte: startDate, $lte: endDate }
  }).sort({ invoiceDate: -1 }).populate('customer');
};

InvoiceSchema.statics.getTotalSales = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.invoiceDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$total' },
        totalPaid: { $sum: '$paidAmount' },
        totalPending: { $sum: '$remainingAmount' },
        invoiceCount: { $sum: 1 }
      }
    }
  ]);
};

// Instance methods
InvoiceSchema.methods.calculateTotals = function() {
  // Calculate discount amount
  if (this.discountType === 'percentage') {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else {
    this.discountAmount = this.discountValue;
  }
  
  // Calculate tax amount
  const afterDiscount = this.subtotal - this.discountAmount;
  this.taxAmount = (afterDiscount * this.taxRate) / 100;
  
  // Calculate total
  this.total = afterDiscount + this.taxAmount + this.shippingCost;
  this.remainingAmount = this.total - this.paidAmount;
  
  return this;
};

InvoiceSchema.methods.addPayment = function(amount, method = 'cash') {
  this.paidAmount += amount;
  this.paymentMethod = method;
  
  // Update payment status
  if (this.paidAmount >= this.total) {
    this.paymentStatus = 'paid';
    this.remainingAmount = 0;
  } else {
    this.paymentStatus = 'partial';
    this.remainingAmount = this.total - this.paidAmount;
  }
  
  return this.save();
};

InvoiceSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.emailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

// Virtuals
InvoiceSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.paymentStatus !== 'paid';
});

InvoiceSchema.virtual('daysPastDue').get(function() {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const diffTime = today - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

InvoiceSchema.virtual('paymentProgress').get(function() {
  if (this.total === 0) return 100;
  return Math.round((this.paidAmount / this.total) * 100);
});

// Ensure virtual fields are serialized
InvoiceSchema.set('toJSON', { virtuals: true });

// Export model
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
export default Invoice;
