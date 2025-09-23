import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  // Payment Identification
  paymentNumber: {
    type: String,
    required: [true, 'Payment number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  
  // Payment Type and Direction
  paymentType: {
    type: String,
    enum: {
      values: ['invoice_payment', 'advance_payment', 'refund', 'supplier_payment', 'expense_payment', 'other'],
      message: 'Payment type must be valid'
    },
    required: [true, 'Payment type is required']
  },
  direction: {
    type: String,
    enum: {
      values: ['incoming', 'outgoing'],
      message: 'Payment direction must be valid'
    },
    required: [true, 'Payment direction is required']
  },
  
  // Amount Information
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0.01, 'Payment amount must be greater than 0']
  },
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
  amountInBaseCurrency: {
    type: Number,
    min: [0, 'Amount in base currency cannot be negative']
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: {
      values: ['cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'mobile_payment', 'crypto', 'other'],
      message: 'Payment method must be valid'
    },
    required: [true, 'Payment method is required']
  },
  
  // Reference Information
  referenceNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference number cannot exceed 100 characters']
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: [100, 'Transaction ID cannot exceed 100 characters']
  },
  checkNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Check number cannot exceed 50 characters']
  },
  
  // Related Documents
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  
  // Customer/Supplier Information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  
  // Payer/Payee Information (snapshot for historical accuracy)
  payer: {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  payee: {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  
  // Bank Information
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountTitle: String,
    branchCode: String,
    routingNumber: String,
    swiftCode: String
  },
  
  // Payment Status
  status: {
    type: String,
    enum: {
      values: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
      message: 'Payment status must be valid'
    },
    default: 'pending'
  },
  
  // Processing Information
  processedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processingFee: {
    type: Number,
    min: [0, 'Processing fee cannot be negative'],
    default: 0
  },
  
  // Reconciliation
  isReconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bankStatementDate: Date,
  
  // Failure Information
  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },
  failureCode: {
    type: String,
    trim: true,
    maxlength: [50, 'Failure code cannot exceed 50 characters']
  },
  
  // Refund Information
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    default: 0
  },
  refundDate: Date,
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  collection: 'payments'
});

// Indexes for performance
PaymentSchema.index({ paymentNumber: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ paymentType: 1 });
PaymentSchema.index({ direction: 1 });
PaymentSchema.index({ paymentMethod: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ customer: 1 });
PaymentSchema.index({ supplier: 1 });
PaymentSchema.index({ invoice: 1 });
PaymentSchema.index({ purchaseOrder: 1 });
PaymentSchema.index({ isReconciled: 1 });
PaymentSchema.index({ createdAt: -1 });

// Compound indexes
PaymentSchema.index({ paymentType: 1, direction: 1 });
PaymentSchema.index({ customer: 1, paymentDate: -1 });
PaymentSchema.index({ supplier: 1, paymentDate: -1 });
PaymentSchema.index({ status: 1, paymentDate: -1 });
PaymentSchema.index({ paymentMethod: 1, status: 1 });

// Pre-save middleware to generate payment number
PaymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.paymentNumber) {
    try {
      const year = new Date().getFullYear();
      const yearStr = year.toString().slice(-2);
      const prefix = this.direction === 'incoming' ? 'PAY' : 'EXP';
      
      const lastPayment = await this.constructor
        .findOne({ 
          paymentNumber: new RegExp(`^${prefix}${yearStr}`) 
        })
        .sort({ paymentNumber: -1 });
      
      let nextNumber = 1;
      if (lastPayment) {
        const lastNumber = parseInt(lastPayment.paymentNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      this.paymentNumber = `${prefix}${yearStr}-${nextNumber.toString().padStart(4, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to calculate base currency amount
PaymentSchema.pre('save', function(next) {
  this.amountInBaseCurrency = this.amount * this.exchangeRate;
  next();
});

// Static methods
PaymentSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customer: customerId }).sort({ paymentDate: -1 });
};

PaymentSchema.statics.findBySupplier = function(supplierId) {
  return this.find({ supplier: supplierId }).sort({ paymentDate: -1 });
};

PaymentSchema.statics.findByInvoice = function(invoiceId) {
  return this.find({ invoice: invoiceId }).sort({ paymentDate: -1 });
};

PaymentSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    paymentDate: { $gte: startDate, $lte: endDate }
  }).sort({ paymentDate: -1 });
};

PaymentSchema.statics.getTotalPayments = function(startDate, endDate, direction) {
  const match = {};
  if (startDate && endDate) {
    match.paymentDate = { $gte: startDate, $lte: endDate };
  }
  if (direction) {
    match.direction = direction;
  }
  match.status = 'completed';
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$direction',
        totalAmount: { $sum: '$amountInBaseCurrency' },
        paymentCount: { $sum: 1 },
        averageAmount: { $avg: '$amountInBaseCurrency' }
      }
    }
  ]);
};

PaymentSchema.statics.findPendingReconciliation = function() {
  return this.find({ 
    status: 'completed',
    isReconciled: false 
  }).sort({ paymentDate: -1 });
};

// Instance methods
PaymentSchema.methods.markAsCompleted = function(processedBy) {
  this.status = 'completed';
  this.processedAt = new Date();
  this.processedBy = processedBy;
  return this.save();
};

PaymentSchema.methods.markAsFailed = function(reason, code) {
  this.status = 'failed';
  this.failureReason = reason;
  this.failureCode = code;
  return this.save();
};

PaymentSchema.methods.processRefund = function(refundAmount, reason, refundedBy) {
  if (refundAmount > this.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  this.refundAmount = refundAmount;
  this.refundDate = new Date();
  this.refundReason = reason;
  this.refundedBy = refundedBy;
  
  if (refundAmount === this.amount) {
    this.status = 'refunded';
  }
  
  return this.save();
};

PaymentSchema.methods.reconcile = function(reconciledBy, bankStatementDate) {
  this.isReconciled = true;
  this.reconciledAt = new Date();
  this.reconciledBy = reconciledBy;
  this.bankStatementDate = bankStatementDate || new Date();
  return this.save();
};

// Virtuals
PaymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.refundAmount - this.processingFee;
});

PaymentSchema.virtual('isRefunded').get(function() {
  return this.refundAmount > 0;
});

PaymentSchema.virtual('isFullyRefunded').get(function() {
  return this.refundAmount >= this.amount;
});

// Ensure virtual fields are serialized
PaymentSchema.set('toJSON', { virtuals: true });

// Export model
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export default Payment;
