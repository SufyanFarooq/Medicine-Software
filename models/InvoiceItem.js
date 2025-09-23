import mongoose from 'mongoose';

const InvoiceItemSchema = new mongoose.Schema({
  // Invoice Reference
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice reference is required']
  },
  
  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  // Snapshot of product info at time of sale (for historical accuracy)
  productSnapshot: {
    name: String,
    sku: String,
    barcode: String,
    category: String,
    unit: String,
    batchNumber: String,
    expiryDate: Date
  },
  
  // Quantity and Pricing
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  
  // Discounts
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'none'],
    default: 'none'
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
  
  // Tax Information
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
  
  // Calculated Fields
  lineTotal: {
    type: Number,
    required: [true, 'Line total is required'],
    min: [0, 'Line total cannot be negative']
  },
  
  // Batch and Inventory Tracking
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters']
  },
  expiryDate: Date,
  serialNumbers: [String], // For items that require serial number tracking
  
  // Warehouse and Location
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  location: {
    aisle: String,
    shelf: String,
    bin: String
  },
  
  // Return Information
  returnedQuantity: {
    type: Number,
    min: [0, 'Returned quantity cannot be negative'],
    default: 0
  },
  returnedAmount: {
    type: Number,
    min: [0, 'Returned amount cannot be negative'],
    default: 0
  },
  isReturned: {
    type: Boolean,
    default: false
  },
  returnDate: Date,
  returnReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Return reason cannot exceed 500 characters']
  },
  
  // Additional Item Details
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Item notes cannot exceed 500 characters']
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
  collection: 'invoice_items'
});

// Indexes for performance
InvoiceItemSchema.index({ invoice: 1 });
InvoiceItemSchema.index({ product: 1 });
InvoiceItemSchema.index({ batch: 1 });
InvoiceItemSchema.index({ batchNumber: 1 });
InvoiceItemSchema.index({ expiryDate: 1 });
InvoiceItemSchema.index({ isReturned: 1 });
InvoiceItemSchema.index({ createdAt: -1 });

// Compound indexes
InvoiceItemSchema.index({ invoice: 1, product: 1 });
InvoiceItemSchema.index({ product: 1, createdAt: -1 });
InvoiceItemSchema.index({ batch: 1, expiryDate: 1 });

// Pre-save middleware to calculate totals
InvoiceItemSchema.pre('save', function(next) {
  // Calculate discount amount
  if (this.discountType === 'percentage') {
    this.discountAmount = (this.quantity * this.unitPrice * this.discountValue) / 100;
  } else if (this.discountType === 'fixed') {
    this.discountAmount = this.discountValue;
  } else {
    this.discountAmount = 0;
  }
  
  // Calculate subtotal after discount
  const subtotal = (this.quantity * this.unitPrice) - this.discountAmount;
  
  // Calculate tax amount
  this.taxAmount = (subtotal * this.taxRate) / 100;
  
  // Calculate line total
  this.lineTotal = subtotal + this.taxAmount;
  
  // Set original price if not set
  if (!this.originalPrice) {
    this.originalPrice = this.unitPrice;
  }
  
  next();
});

// Static methods
InvoiceItemSchema.statics.findByInvoice = function(invoiceId) {
  return this.find({ invoice: invoiceId }).populate('product batch');
};

InvoiceItemSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId }).populate('invoice product');
};

InvoiceItemSchema.statics.findByBatch = function(batchId) {
  return this.find({ batch: batchId }).populate('invoice product');
};

InvoiceItemSchema.statics.getTopSellingProducts = function(limit = 10, startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$product',
        totalQuantity: { $sum: '$quantity' },
        totalRevenue: { $sum: '$lineTotal' },
        orderCount: { $sum: 1 },
        avgPrice: { $avg: '$unitPrice' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo'
      }
    }
  ]);
};

// Instance methods
InvoiceItemSchema.methods.calculateTotals = function() {
  // Recalculate all totals
  if (this.discountType === 'percentage') {
    this.discountAmount = (this.quantity * this.unitPrice * this.discountValue) / 100;
  } else if (this.discountType === 'fixed') {
    this.discountAmount = this.discountValue;
  } else {
    this.discountAmount = 0;
  }
  
  const subtotal = (this.quantity * this.unitPrice) - this.discountAmount;
  this.taxAmount = (subtotal * this.taxRate) / 100;
  this.lineTotal = subtotal + this.taxAmount;
  
  return this;
};

InvoiceItemSchema.methods.processReturn = function(returnQuantity, returnReason) {
  if (returnQuantity > (this.quantity - this.returnedQuantity)) {
    throw new Error('Return quantity cannot exceed available quantity');
  }
  
  this.returnedQuantity += returnQuantity;
  this.returnedAmount += (returnQuantity * this.unitPrice);
  this.returnDate = new Date();
  this.returnReason = returnReason;
  this.isReturned = this.returnedQuantity > 0;
  
  return this.save();
};

// Virtuals
InvoiceItemSchema.virtual('availableForReturn').get(function() {
  return this.quantity - this.returnedQuantity;
});

InvoiceItemSchema.virtual('netQuantity').get(function() {
  return this.quantity - this.returnedQuantity;
});

InvoiceItemSchema.virtual('netAmount').get(function() {
  return this.lineTotal - this.returnedAmount;
});

InvoiceItemSchema.virtual('profitPerUnit').get(function() {
  if (this.productSnapshot && this.productSnapshot.purchasePrice) {
    return this.unitPrice - this.productSnapshot.purchasePrice;
  }
  return 0;
});

InvoiceItemSchema.virtual('totalProfit').get(function() {
  return this.profitPerUnit * this.netQuantity;
});

// Ensure virtual fields are serialized
InvoiceItemSchema.set('toJSON', { virtuals: true });

// Export model
const InvoiceItem = mongoose.models.InvoiceItem || mongoose.model('InvoiceItem', InvoiceItemSchema);
export default InvoiceItem;
