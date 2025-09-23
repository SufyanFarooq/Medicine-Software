import mongoose from 'mongoose';

const BatchSchema = new mongoose.Schema({
  // Batch Identification
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters']
  },
  
  // Product Information
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: [true, 'Supplier reference is required']
  },
  
  // Quantity and Inventory
  initialQuantity: {
    type: Number,
    required: [true, 'Initial quantity is required'],
    min: [0, 'Initial quantity cannot be negative']
  },
  currentQuantity: {
    type: Number,
    required: [true, 'Current quantity is required'],
    min: [0, 'Current quantity cannot be negative']
  },
  soldQuantity: {
    type: Number,
    min: [0, 'Sold quantity cannot be negative'],
    default: 0
  },
  returnedQuantity: {
    type: Number,
    min: [0, 'Returned quantity cannot be negative'],
    default: 0
  },
  damagedQuantity: {
    type: Number,
    min: [0, 'Damaged quantity cannot be negative'],
    default: 0
  },
  
  // Dates
  manufacturingDate: {
    type: Date,
    required: [true, 'Manufacturing date is required'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Manufacturing date cannot be in the future'
    }
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
    validate: {
      validator: function(value) {
        return value > this.manufacturingDate;
      },
      message: 'Expiry date must be after manufacturing date'
    }
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  
  // Pricing Information
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  mrp: {
    type: Number,
    min: [0, 'MRP cannot be negative']
  },
  
  // Quality and Testing
  qualityStatus: {
    type: String,
    enum: {
      values: ['pending', 'passed', 'failed', 'quarantine'],
      message: 'Quality status must be valid'
    },
    default: 'pending'
  },
  qualityTestDate: Date,
  qualityNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Quality notes cannot exceed 1000 characters']
  },
  
  // Storage Information
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  location: {
    aisle: {
      type: String,
      trim: true,
      maxlength: [20, 'Aisle cannot exceed 20 characters']
    },
    shelf: {
      type: String,
      trim: true,
      maxlength: [20, 'Shelf cannot exceed 20 characters']
    },
    bin: {
      type: String,
      trim: true,
      maxlength: [20, 'Bin cannot exceed 20 characters']
    }
  },
  
  // Status and Flags
  status: {
    type: String,
    enum: {
      values: ['active', 'expired', 'recalled', 'damaged', 'sold_out', 'quarantine'],
      message: 'Batch status must be valid'
    },
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isRecalled: {
    type: Boolean,
    default: false
  },
  recallReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Recall reason cannot exceed 500 characters']
  },
  recallDate: Date,
  
  // Purchase Order Reference
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  purchaseOrderNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Purchase order number cannot exceed 50 characters']
  },
  
  // Cost Analysis
  totalCost: {
    type: Number,
    min: [0, 'Total cost cannot be negative'],
    default: 0
  },
  costPerUnit: {
    type: Number,
    min: [0, 'Cost per unit cannot be negative'],
    default: 0
  },
  
  // Temperature and Storage Requirements
  storageRequirements: {
    temperature: {
      min: Number, // Celsius
      max: Number  // Celsius
    },
    humidity: {
      min: Number, // Percentage
      max: Number  // Percentage
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Special instructions cannot exceed 500 characters']
    }
  },
  
  // Regulatory Information
  regulatoryInfo: {
    approvalNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Approval number cannot exceed 100 characters']
    },
    regulatoryBody: {
      type: String,
      trim: true,
      maxlength: [100, 'Regulatory body cannot exceed 100 characters']
    },
    certificationDate: Date,
    certificationExpiry: Date
  },
  
  // Notes and Additional Information
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
  collection: 'batches'
});

// Indexes for performance
BatchSchema.index({ batchNumber: 1 });
BatchSchema.index({ product: 1 });
BatchSchema.index({ supplier: 1 });
BatchSchema.index({ expiryDate: 1 });
BatchSchema.index({ manufacturingDate: 1 });
BatchSchema.index({ status: 1 });
BatchSchema.index({ isActive: 1 });
BatchSchema.index({ qualityStatus: 1 });
BatchSchema.index({ currentQuantity: 1 });
BatchSchema.index({ createdAt: -1 });

// Compound indexes
BatchSchema.index({ product: 1, expiryDate: 1 });
BatchSchema.index({ product: 1, status: 1 });
BatchSchema.index({ supplier: 1, receivedDate: -1 });
BatchSchema.index({ expiryDate: 1, status: 1 });
BatchSchema.index({ status: 1, isActive: 1 });

// Pre-save middleware
BatchSchema.pre('save', function(next) {
  // Calculate total cost
  this.totalCost = this.initialQuantity * this.purchasePrice;
  this.costPerUnit = this.purchasePrice;
  
  // Update status based on quantity and expiry
  if (this.currentQuantity === 0) {
    this.status = 'sold_out';
  } else if (this.expiryDate < new Date()) {
    this.status = 'expired';
  } else if (this.isRecalled) {
    this.status = 'recalled';
  } else if (this.qualityStatus === 'failed') {
    this.status = 'quarantine';
  } else {
    this.status = 'active';
  }
  
  next();
});

// Static methods
BatchSchema.statics.findActive = function() {
  return this.find({ isActive: true, status: 'active' }).populate('product supplier');
};

BatchSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId, isActive: true }).sort({ expiryDate: 1 }).populate('supplier');
};

BatchSchema.statics.findExpiring = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    isActive: true,
    status: 'active',
    expiryDate: { $lte: futureDate, $gte: new Date() }
  }).populate('product supplier');
};

BatchSchema.statics.findExpired = function() {
  return this.find({
    isActive: true,
    expiryDate: { $lt: new Date() }
  }).populate('product supplier');
};

BatchSchema.statics.findLowStock = function(threshold = 10) {
  return this.find({
    isActive: true,
    status: 'active',
    currentQuantity: { $lte: threshold }
  }).populate('product supplier');
};

BatchSchema.statics.findBySupplier = function(supplierId) {
  return this.find({ supplier: supplierId, isActive: true }).sort({ receivedDate: -1 }).populate('product');
};

// Instance methods
BatchSchema.methods.isExpired = function() {
  return this.expiryDate < new Date();
};

BatchSchema.methods.isExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return this.expiryDate <= futureDate && this.expiryDate >= new Date();
};

BatchSchema.methods.isLowStock = function(threshold = 10) {
  return this.currentQuantity <= threshold;
};

BatchSchema.methods.updateQuantity = function(quantityChange, reason = 'manual_adjustment') {
  const oldQuantity = this.currentQuantity;
  this.currentQuantity += quantityChange;
  
  if (this.currentQuantity < 0) {
    throw new Error('Insufficient stock in batch');
  }
  
  // Track the change
  if (quantityChange < 0) {
    this.soldQuantity += Math.abs(quantityChange);
  }
  
  return this.save();
};

BatchSchema.methods.processReturn = function(returnQuantity) {
  if (returnQuantity > this.soldQuantity) {
    throw new Error('Return quantity cannot exceed sold quantity');
  }
  
  this.returnedQuantity += returnQuantity;
  this.currentQuantity += returnQuantity;
  this.soldQuantity -= returnQuantity;
  
  return this.save();
};

BatchSchema.methods.markAsRecalled = function(reason) {
  this.isRecalled = true;
  this.recallReason = reason;
  this.recallDate = new Date();
  this.status = 'recalled';
  
  return this.save();
};

// Virtuals
BatchSchema.virtual('availableQuantity').get(function() {
  return Math.max(0, this.currentQuantity - this.damagedQuantity);
});

BatchSchema.virtual('utilizationRate').get(function() {
  if (this.initialQuantity === 0) return 0;
  return Math.round(((this.soldQuantity + this.damagedQuantity) / this.initialQuantity) * 100);
});

BatchSchema.virtual('daysUntilExpiry').get(function() {
  const today = new Date();
  const diffTime = this.expiryDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

BatchSchema.virtual('profitMargin').get(function() {
  if (this.purchasePrice === 0) return 0;
  return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice) * 100;
});

BatchSchema.virtual('totalValue').get(function() {
  return this.currentQuantity * this.sellingPrice;
});

BatchSchema.virtual('expiryStatus').get(function() {
  if (this.isExpired()) return 'expired';
  if (this.isExpiringSoon(7)) return 'critical';
  if (this.isExpiringSoon(30)) return 'warning';
  return 'fresh';
});

// Ensure virtual fields are serialized
BatchSchema.set('toJSON', { virtuals: true });

// Export model
const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
export default Batch;
