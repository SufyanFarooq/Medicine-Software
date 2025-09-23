import mongoose from 'mongoose';

const ReturnSchema = new mongoose.Schema({
  // Return Identification
  returnNumber: {
    type: String,
    required: [true, 'Return number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  returnDate: {
    type: Date,
    required: [true, 'Return date is required'],
    default: Date.now
  },
  
  // Return Type
  returnType: {
    type: String,
    enum: {
      values: ['customer_return', 'supplier_return', 'internal_return', 'damaged_goods', 'expired_goods', 'quality_issue'],
      message: 'Return type must be valid'
    },
    required: [true, 'Return type is required']
  },
  
  // Related Documents
  originalInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  originalInvoiceNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Original invoice number cannot exceed 50 characters']
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
  
  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  // Snapshot of product info at time of return
  productSnapshot: {
    name: String,
    sku: String,
    batchNumber: String,
    expiryDate: Date,
    originalPrice: Number,
    category: String
  },
  
  // Quantity and Pricing
  quantity: {
    type: Number,
    required: [true, 'Return quantity is required'],
    min: [0.01, 'Return quantity must be greater than 0']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  
  // Return Reason and Details
  reason: {
    type: String,
    enum: {
      values: [
        'defective_product', 'wrong_product', 'expired', 'damaged_in_transit', 
        'customer_dissatisfaction', 'quality_issue', 'overstock', 'recall',
        'pricing_error', 'duplicate_order', 'other'
      ],
      message: 'Return reason must be valid'
    },
    required: [true, 'Return reason is required']
  },
  detailedReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Detailed reason cannot exceed 1000 characters']
  },
  
  // Return Condition
  condition: {
    type: String,
    enum: {
      values: ['new', 'like_new', 'good', 'fair', 'poor', 'damaged', 'expired'],
      message: 'Return condition must be valid'
    },
    required: [true, 'Return condition is required']
  },
  
  // Financial Information
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    default: 0
  },
  restockingFee: {
    type: Number,
    min: [0, 'Restocking fee cannot be negative'],
    default: 0
  },
  processingFee: {
    type: Number,
    min: [0, 'Processing fee cannot be negative'],
    default: 0
  },
  netRefundAmount: {
    type: Number,
    min: [0, 'Net refund amount cannot be negative'],
    default: 0
  },
  
  // Return Status and Processing
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected', 'processed', 'completed', 'cancelled'],
      message: 'Return status must be valid'
    },
    default: 'pending'
  },
  
  // Approval Workflow
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  
  // Processing Information
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  
  // Refund Processing
  refundMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'credit_card_refund', 'store_credit', 'exchange', 'other'],
    default: 'cash'
  },
  refundProcessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundProcessedAt: Date,
  refundReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Refund reference cannot exceed 100 characters']
  },
  
  // Inventory Impact
  restockable: {
    type: Boolean,
    default: true
  },
  restocked: {
    type: Boolean,
    default: false
  },
  restockedAt: Date,
  restockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  newLocation: {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    aisle: String,
    shelf: String,
    bin: String
  },
  
  // Quality Assessment
  qualityAssessment: {
    assessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assessedAt: Date,
    notes: String,
    photos: [String], // URLs to photos
    recommendation: {
      type: String,
      enum: ['restock', 'dispose', 'return_to_supplier', 'repair', 'discount_sale'],
      default: 'restock'
    }
  },
  
  // Communication
  customerNotified: {
    type: Boolean,
    default: false
  },
  customerNotifiedAt: Date,
  supplierNotified: {
    type: Boolean,
    default: false
  },
  supplierNotifiedAt: Date,
  
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
  collection: 'returns'
});

// Indexes for performance
ReturnSchema.index({ returnNumber: 1 });
ReturnSchema.index({ returnDate: -1 });
ReturnSchema.index({ returnType: 1 });
ReturnSchema.index({ status: 1 });
ReturnSchema.index({ customer: 1 });
ReturnSchema.index({ supplier: 1 });
ReturnSchema.index({ product: 1 });
ReturnSchema.index({ originalInvoice: 1 });
ReturnSchema.index({ batch: 1 });
ReturnSchema.index({ reason: 1 });
ReturnSchema.index({ condition: 1 });
ReturnSchema.index({ createdAt: -1 });

// Compound indexes
ReturnSchema.index({ returnType: 1, status: 1 });
ReturnSchema.index({ customer: 1, returnDate: -1 });
ReturnSchema.index({ supplier: 1, returnDate: -1 });
ReturnSchema.index({ product: 1, returnDate: -1 });
ReturnSchema.index({ status: 1, returnDate: -1 });

// Pre-save middleware to generate return number
ReturnSchema.pre('save', async function(next) {
  if (this.isNew && !this.returnNumber) {
    try {
      const year = new Date().getFullYear();
      const yearStr = year.toString().slice(-2);
      
      const lastReturn = await this.constructor
        .findOne({ 
          returnNumber: new RegExp(`^RET${yearStr}`) 
        })
        .sort({ returnNumber: -1 });
      
      let nextNumber = 1;
      if (lastReturn) {
        const lastNumber = parseInt(lastReturn.returnNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      this.returnNumber = `RET${yearStr}-${nextNumber.toString().padStart(4, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to calculate amounts
ReturnSchema.pre('save', function(next) {
  // Calculate total amount
  this.totalAmount = this.quantity * this.unitPrice;
  
  // Calculate net refund amount
  this.netRefundAmount = this.refundAmount - this.restockingFee - this.processingFee;
  
  next();
});

// Static methods
ReturnSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customer: customerId }).sort({ returnDate: -1 }).populate('product originalInvoice');
};

ReturnSchema.statics.findBySupplier = function(supplierId) {
  return this.find({ supplier: supplierId }).sort({ returnDate: -1 }).populate('product purchaseOrder');
};

ReturnSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId }).sort({ returnDate: -1 }).populate('customer supplier');
};

ReturnSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ returnDate: -1 }).populate('product customer supplier');
};

ReturnSchema.statics.findPendingApproval = function() {
  return this.find({ status: 'pending' }).sort({ returnDate: 1 }).populate('product customer supplier');
};

ReturnSchema.statics.findByReason = function(reason) {
  return this.find({ reason }).sort({ returnDate: -1 }).populate('product customer supplier');
};

ReturnSchema.statics.getReturnAnalytics = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.returnDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          reason: '$reason',
          returnType: '$returnType'
        },
        totalReturns: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalAmount: { $sum: '$totalAmount' },
        totalRefunded: { $sum: '$refundAmount' }
      }
    },
    { $sort: { totalReturns: -1 } }
  ]);
};

// Instance methods
ReturnSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

ReturnSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

ReturnSchema.methods.process = function(processedBy) {
  this.status = 'processed';
  this.processedBy = processedBy;
  this.processedAt = new Date();
  return this.save();
};

ReturnSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

ReturnSchema.methods.processRefund = function(refundAmount, method, processedBy, reference) {
  this.refundAmount = refundAmount;
  this.refundMethod = method;
  this.refundProcessedBy = processedBy;
  this.refundProcessedAt = new Date();
  this.refundReference = reference;
  
  // Calculate net refund amount
  this.netRefundAmount = refundAmount - this.restockingFee - this.processingFee;
  
  return this.save();
};

ReturnSchema.methods.restockItem = function(restockedBy, newLocation) {
  if (!this.restockable) {
    throw new Error('This item is not restockable');
  }
  
  this.restocked = true;
  this.restockedAt = new Date();
  this.restockedBy = restockedBy;
  
  if (newLocation) {
    this.newLocation = newLocation;
  }
  
  return this.save();
};

ReturnSchema.methods.assessQuality = function(assessedBy, notes, recommendation, photos) {
  this.qualityAssessment = {
    assessedBy,
    assessedAt: new Date(),
    notes,
    recommendation,
    photos: photos || []
  };
  
  // Update restockable status based on recommendation
  this.restockable = ['restock', 'discount_sale'].includes(recommendation);
  
  return this.save();
};

ReturnSchema.methods.notifyCustomer = function() {
  this.customerNotified = true;
  this.customerNotifiedAt = new Date();
  return this.save();
};

ReturnSchema.methods.notifySupplier = function() {
  this.supplierNotified = true;
  this.supplierNotifiedAt = new Date();
  return this.save();
};

// Virtuals
ReturnSchema.virtual('isApproved').get(function() {
  return this.status === 'approved';
});

ReturnSchema.virtual('isProcessed').get(function() {
  return ['processed', 'completed'].includes(this.status);
});

ReturnSchema.virtual('isRefunded').get(function() {
  return this.refundAmount > 0 && this.refundProcessedAt;
});

ReturnSchema.virtual('daysSinceReturn').get(function() {
  const today = new Date();
  const diffTime = today - this.returnDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

ReturnSchema.virtual('financialImpact').get(function() {
  return {
    returnValue: this.totalAmount,
    refundGiven: this.refundAmount,
    feesCollected: this.restockingFee + this.processingFee,
    netLoss: this.refundAmount - (this.restockingFee + this.processingFee)
  };
});

ReturnSchema.virtual('canBeRestocked').get(function() {
  return this.restockable && 
         this.status === 'approved' && 
         ['new', 'like_new', 'good'].includes(this.condition) &&
         !this.restocked;
});

ReturnSchema.virtual('returnAge').get(function() {
  if (!this.originalInvoice || !this.originalInvoice.invoiceDate) return null;
  
  const returnTime = this.returnDate.getTime();
  const invoiceTime = this.originalInvoice.invoiceDate.getTime();
  const diffTime = returnTime - invoiceTime;
  
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtual fields are serialized
ReturnSchema.set('toJSON', { virtuals: true });

// Export model
const Return = mongoose.models.Return || mongoose.model('Return', ReturnSchema);
export default Return;
