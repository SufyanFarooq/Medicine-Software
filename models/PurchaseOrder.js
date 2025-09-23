import mongoose from 'mongoose';

const PurchaseOrderSchema = new mongoose.Schema({
  // Purchase Order Identification
  poNumber: {
    type: String,
    required: [true, 'Purchase order number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  poDate: {
    type: Date,
    required: [true, 'Purchase order date is required'],
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= this.poDate;
      },
      message: 'Expected delivery date must be after PO date'
    }
  },
  actualDeliveryDate: Date,
  
  // Supplier Information
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier is required']
  },
  // Snapshot of supplier info at time of PO
  supplierSnapshot: {
    name: String,
    companyName: String,
    contactPerson: String,
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
  
  // Status Tracking
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending', 'approved', 'sent', 'acknowledged', 'partial_received', 'received', 'cancelled', 'closed'],
      message: 'PO status must be valid'
    },
    default: 'draft'
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'partial', 'paid', 'overdue'],
      message: 'Payment status must be valid'
    },
    default: 'pending'
  },
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit_7', 'credit_15', 'credit_30', 'credit_45', 'credit_60', 'credit_90', 'custom'],
    default: 'credit_30'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'letter_of_credit', 'other'],
    default: 'bank_transfer'
  },
  paidAmount: {
    type: Number,
    min: [0, 'Paid amount cannot be negative'],
    default: 0
  },
  
  // Delivery Information
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  deliveryInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Delivery instructions cannot exceed 1000 characters']
  },
  shippingMethod: {
    type: String,
    enum: ['pickup', 'standard_delivery', 'express_delivery', 'courier', 'freight'],
    default: 'standard_delivery'
  },
  trackingNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Tracking number cannot exceed 100 characters']
  },
  
  // Currency and Exchange
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
    maxlength: [2000, 'Terms cannot exceed 2000 characters']
  },
  
  // Reference Numbers
  supplierReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Supplier reference cannot exceed 100 characters']
  },
  requisitionNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Requisition number cannot exceed 100 characters']
  },
  
  // Approval Workflow
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  
  // Receiving Information
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: Date,
  partialReceiving: {
    type: Boolean,
    default: false
  },
  receivingNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Receiving notes cannot exceed 1000 characters']
  },
  
  // Priority and Urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  urgentReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Urgent reason cannot exceed 500 characters']
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
  }
}, {
  timestamps: true,
  collection: 'purchase_orders'
});

// Indexes for performance
PurchaseOrderSchema.index({ poNumber: 1 });
PurchaseOrderSchema.index({ supplier: 1 });
PurchaseOrderSchema.index({ poDate: -1 });
PurchaseOrderSchema.index({ expectedDeliveryDate: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ paymentStatus: 1 });
PurchaseOrderSchema.index({ priority: 1 });
PurchaseOrderSchema.index({ requestedBy: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });

// Compound indexes
PurchaseOrderSchema.index({ supplier: 1, poDate: -1 });
PurchaseOrderSchema.index({ status: 1, priority: 1 });
PurchaseOrderSchema.index({ expectedDeliveryDate: 1, status: 1 });

// Pre-save middleware to generate PO number
PurchaseOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.poNumber) {
    try {
      const year = new Date().getFullYear();
      const yearStr = year.toString().slice(-2);
      
      const lastPO = await this.constructor
        .findOne({ 
          poNumber: new RegExp(`^PO${yearStr}`) 
        })
        .sort({ poNumber: -1 });
      
      let nextNumber = 1;
      if (lastPO) {
        const lastNumber = parseInt(lastPO.poNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      this.poNumber = `PO${yearStr}-${nextNumber.toString().padStart(4, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to calculate totals
PurchaseOrderSchema.pre('save', function(next) {
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
  
  next();
});

// Static methods
PurchaseOrderSchema.statics.findBySupplier = function(supplierId) {
  return this.find({ supplier: supplierId }).sort({ poDate: -1 }).populate('supplier');
};

PurchaseOrderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ poDate: -1 }).populate('supplier');
};

PurchaseOrderSchema.statics.findPending = function() {
  return this.find({ 
    status: { $in: ['pending', 'approved', 'sent', 'acknowledged'] }
  }).sort({ expectedDeliveryDate: 1 }).populate('supplier');
};

PurchaseOrderSchema.statics.findOverdue = function() {
  return this.find({
    expectedDeliveryDate: { $lt: new Date() },
    status: { $in: ['sent', 'acknowledged'] }
  }).sort({ expectedDeliveryDate: 1 }).populate('supplier');
};

PurchaseOrderSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    poDate: { $gte: startDate, $lte: endDate }
  }).sort({ poDate: -1 }).populate('supplier');
};

// Instance methods
PurchaseOrderSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

PurchaseOrderSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'cancelled';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

PurchaseOrderSchema.methods.markAsSent = function() {
  this.status = 'sent';
  return this.save();
};

PurchaseOrderSchema.methods.markAsReceived = function(receivedBy, notes) {
  this.status = 'received';
  this.receivedBy = receivedBy;
  this.receivedAt = new Date();
  this.actualDeliveryDate = new Date();
  if (notes) this.receivingNotes = notes;
  return this.save();
};

PurchaseOrderSchema.methods.markAsPartiallyReceived = function(receivedBy, notes) {
  this.status = 'partial_received';
  this.partialReceiving = true;
  this.receivedBy = receivedBy;
  this.receivedAt = new Date();
  if (notes) this.receivingNotes = notes;
  return this.save();
};

PurchaseOrderSchema.methods.addPayment = function(amount, method = 'bank_transfer') {
  this.paidAmount += amount;
  this.paymentMethod = method;
  
  if (this.paidAmount >= this.total) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
  
  return this.save();
};

// Virtuals
PurchaseOrderSchema.virtual('isOverdue').get(function() {
  return this.expectedDeliveryDate && 
         this.expectedDeliveryDate < new Date() && 
         !['received', 'cancelled', 'closed'].includes(this.status);
});

PurchaseOrderSchema.virtual('daysPastDue').get(function() {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const diffTime = today - this.expectedDeliveryDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

PurchaseOrderSchema.virtual('daysUntilDelivery').get(function() {
  if (!this.expectedDeliveryDate) return null;
  const today = new Date();
  const diffTime = this.expectedDeliveryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

PurchaseOrderSchema.virtual('remainingAmount').get(function() {
  return Math.max(0, this.total - this.paidAmount);
});

PurchaseOrderSchema.virtual('paymentProgress').get(function() {
  if (this.total === 0) return 100;
  return Math.round((this.paidAmount / this.total) * 100);
});

PurchaseOrderSchema.virtual('deliveryPerformance').get(function() {
  if (!this.actualDeliveryDate || !this.expectedDeliveryDate) return null;
  
  const expectedTime = this.expectedDeliveryDate.getTime();
  const actualTime = this.actualDeliveryDate.getTime();
  
  if (actualTime <= expectedTime) return 'on_time';
  
  const daysLate = Math.ceil((actualTime - expectedTime) / (1000 * 60 * 60 * 24));
  if (daysLate <= 3) return 'slightly_late';
  if (daysLate <= 7) return 'late';
  return 'very_late';
});

// Ensure virtual fields are serialized
PurchaseOrderSchema.set('toJSON', { virtuals: true });

// Export model
const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
export default PurchaseOrder;
