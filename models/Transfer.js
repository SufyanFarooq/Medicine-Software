import mongoose from 'mongoose';

const TransferSchema = new mongoose.Schema({
  // Transfer Identification
  transferNumber: {
    type: String,
    required: [true, 'Transfer number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  transferDate: {
    type: Date,
    required: [true, 'Transfer date is required'],
    default: Date.now
  },
  expectedDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value >= this.transferDate;
      },
      message: 'Expected date must be after transfer date'
    }
  },
  actualDate: Date,
  
  // Transfer Type and Category
  transferType: {
    type: String,
    enum: {
      values: ['warehouse_to_warehouse', 'location_adjustment', 'damage_adjustment', 'expiry_adjustment', 'return_to_supplier', 'customer_return', 'stock_correction'],
      message: 'Transfer type must be valid'
    },
    required: [true, 'Transfer type is required']
  },
  category: {
    type: String,
    enum: ['internal', 'external', 'adjustment'],
    required: [true, 'Transfer category is required']
  },
  
  // Source and Destination
  sourceWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Source warehouse is required']
  },
  destinationWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  sourceLocation: {
    aisle: String,
    shelf: String,
    bin: String,
    zone: String
  },
  destinationLocation: {
    aisle: String,
    shelf: String,
    bin: String,
    zone: String
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
  // Snapshot of product info at time of transfer
  productSnapshot: {
    name: String,
    sku: String,
    batchNumber: String,
    expiryDate: Date,
    unitCost: Number,
    category: String
  },
  
  // Quantity Information
  requestedQuantity: {
    type: Number,
    required: [true, 'Requested quantity is required'],
    min: [0.01, 'Requested quantity must be greater than 0']
  },
  transferredQuantity: {
    type: Number,
    min: [0, 'Transferred quantity cannot be negative'],
    default: 0
  },
  receivedQuantity: {
    type: Number,
    min: [0, 'Received quantity cannot be negative'],
    default: 0
  },
  damagedQuantity: {
    type: Number,
    min: [0, 'Damaged quantity cannot be negative'],
    default: 0
  },
  shortageQuantity: {
    type: Number,
    min: [0, 'Shortage quantity cannot be negative'],
    default: 0
  },
  
  // Financial Information
  unitCost: {
    type: Number,
    min: [0, 'Unit cost cannot be negative'],
    default: 0
  },
  totalCost: {
    type: Number,
    min: [0, 'Total cost cannot be negative'],
    default: 0
  },
  transportationCost: {
    type: Number,
    min: [0, 'Transportation cost cannot be negative'],
    default: 0
  },
  handlingCost: {
    type: Number,
    min: [0, 'Handling cost cannot be negative'],
    default: 0
  },
  totalTransferCost: {
    type: Number,
    min: [0, 'Total transfer cost cannot be negative'],
    default: 0
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending_approval', 'approved', 'in_transit', 'partially_received', 'completed', 'cancelled', 'rejected'],
      message: 'Transfer status must be valid'
    },
    default: 'draft'
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
  
  // Processing Information
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: Date,
  
  // Transportation Details
  transportationMethod: {
    type: String,
    enum: ['internal_transport', 'courier', 'freight', 'pickup', 'direct_delivery'],
    default: 'internal_transport'
  },
  carrier: {
    name: String,
    contactNumber: String,
    vehicleNumber: String,
    driverName: String,
    driverContact: String
  },
  trackingNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Tracking number cannot exceed 100 characters']
  },
  
  // Quality and Condition
  qualityCheck: {
    required: {
      type: Boolean,
      default: false
    },
    performed: {
      type: Boolean,
      default: false
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: Date,
    result: {
      type: String,
      enum: ['passed', 'failed', 'conditional'],
      default: 'passed'
    },
    notes: String,
    photos: [String] // URLs to photos
  },
  
  // Reason and Documentation
  reason: {
    type: String,
    enum: [
      'stock_rebalancing', 'demand_fulfillment', 'expiry_management', 
      'damage_control', 'quality_issue', 'customer_request', 
      'supplier_return', 'location_optimization', 'emergency_transfer', 'other'
    ],
    required: [true, 'Transfer reason is required']
  },
  detailedReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Detailed reason cannot exceed 1000 characters']
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
  
  // Temperature and Special Requirements
  temperatureRequirements: {
    required: {
      type: Boolean,
      default: false
    },
    minTemperature: Number,
    maxTemperature: Number,
    maintained: {
      type: Boolean,
      default: true
    }
  },
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [1000, 'Special instructions cannot exceed 1000 characters']
  },
  
  // Discrepancy Management
  discrepancies: [{
    type: {
      type: String,
      enum: ['quantity_shortage', 'quantity_overage', 'damage', 'quality_issue', 'missing_item', 'wrong_item'],
      required: true
    },
    description: String,
    quantity: Number,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolution: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }],
  
  // Related Documents
  relatedDocuments: {
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder'
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    },
    return: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Return'
    }
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
  collection: 'transfers'
});

// Indexes for performance
TransferSchema.index({ transferNumber: 1 });
TransferSchema.index({ transferDate: -1 });
TransferSchema.index({ transferType: 1 });
TransferSchema.index({ category: 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ priority: 1 });
TransferSchema.index({ sourceWarehouse: 1 });
TransferSchema.index({ destinationWarehouse: 1 });
TransferSchema.index({ product: 1 });
TransferSchema.index({ batch: 1 });
TransferSchema.index({ requestedBy: 1 });
TransferSchema.index({ createdAt: -1 });

// Compound indexes
TransferSchema.index({ sourceWarehouse: 1, status: 1 });
TransferSchema.index({ destinationWarehouse: 1, status: 1 });
TransferSchema.index({ product: 1, transferDate: -1 });
TransferSchema.index({ status: 1, priority: 1 });
TransferSchema.index({ transferType: 1, status: 1 });

// Pre-save middleware to generate transfer number
TransferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferNumber) {
    try {
      const year = new Date().getFullYear();
      const yearStr = year.toString().slice(-2);
      
      const typePrefix = {
        'warehouse_to_warehouse': 'TRF',
        'location_adjustment': 'ADJ',
        'damage_adjustment': 'DMG',
        'expiry_adjustment': 'EXP',
        'return_to_supplier': 'RTS',
        'customer_return': 'CRT',
        'stock_correction': 'COR'
      };
      
      const prefix = typePrefix[this.transferType] || 'TRF';
      
      const lastTransfer = await this.constructor
        .findOne({ 
          transferNumber: new RegExp(`^${prefix}${yearStr}`) 
        })
        .sort({ transferNumber: -1 });
      
      let nextNumber = 1;
      if (lastTransfer) {
        const lastNumber = parseInt(lastTransfer.transferNumber.slice(-4));
        nextNumber = lastNumber + 1;
      }
      
      this.transferNumber = `${prefix}${yearStr}-${nextNumber.toString().padStart(4, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to calculate costs
TransferSchema.pre('save', function(next) {
  // Calculate total cost
  this.totalCost = this.requestedQuantity * this.unitCost;
  
  // Calculate total transfer cost
  this.totalTransferCost = this.totalCost + this.transportationCost + this.handlingCost;
  
  // Calculate shortage quantity
  this.shortageQuantity = Math.max(0, this.requestedQuantity - this.receivedQuantity - this.damagedQuantity);
  
  next();
});

// Static methods
TransferSchema.statics.findByWarehouse = function(warehouseId, direction = 'both') {
  const query = {};
  
  if (direction === 'outgoing') {
    query.sourceWarehouse = warehouseId;
  } else if (direction === 'incoming') {
    query.destinationWarehouse = warehouseId;
  } else {
    query.$or = [
      { sourceWarehouse: warehouseId },
      { destinationWarehouse: warehouseId }
    ];
  }
  
  return this.find(query).sort({ transferDate: -1 }).populate('sourceWarehouse destinationWarehouse product');
};

TransferSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId }).sort({ transferDate: -1 }).populate('sourceWarehouse destinationWarehouse');
};

TransferSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ transferDate: -1 }).populate('sourceWarehouse destinationWarehouse product');
};

TransferSchema.statics.findPendingApproval = function() {
  return this.find({ status: 'pending_approval' }).sort({ transferDate: 1 }).populate('sourceWarehouse destinationWarehouse product requestedBy');
};

TransferSchema.statics.findInTransit = function() {
  return this.find({ status: 'in_transit' }).sort({ expectedDate: 1 }).populate('sourceWarehouse destinationWarehouse product');
};

TransferSchema.statics.findOverdue = function() {
  return this.find({
    expectedDate: { $lt: new Date() },
    status: { $in: ['in_transit', 'partially_received'] }
  }).sort({ expectedDate: 1 }).populate('sourceWarehouse destinationWarehouse product');
};

TransferSchema.statics.getTransferAnalytics = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.transferDate = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          transferType: '$transferType',
          status: '$status'
        },
        totalTransfers: { $sum: 1 },
        totalQuantity: { $sum: '$requestedQuantity' },
        totalCost: { $sum: '$totalTransferCost' },
        avgProcessingTime: { $avg: { $subtract: ['$receivedAt', '$transferDate'] } }
      }
    },
    { $sort: { totalTransfers: -1 } }
  ]);
};

// Instance methods
TransferSchema.methods.approve = function(approvedBy) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

TransferSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

TransferSchema.methods.markInTransit = function(processedBy, carrier) {
  this.status = 'in_transit';
  this.processedBy = processedBy;
  this.processedAt = new Date();
  
  if (carrier) {
    this.carrier = carrier;
  }
  
  return this.save();
};

TransferSchema.methods.receiveTransfer = function(receivedBy, receivedQuantity, damagedQuantity = 0) {
  this.receivedBy = receivedBy;
  this.receivedAt = new Date();
  this.actualDate = new Date();
  this.receivedQuantity = receivedQuantity;
  this.damagedQuantity = damagedQuantity;
  
  if (receivedQuantity + damagedQuantity >= this.requestedQuantity) {
    this.status = 'completed';
  } else {
    this.status = 'partially_received';
  }
  
  return this.save();
};

TransferSchema.methods.addDiscrepancy = function(discrepancyData, reportedBy) {
  this.discrepancies.push({
    ...discrepancyData,
    reportedBy,
    reportedAt: new Date()
  });
  
  return this.save();
};

TransferSchema.methods.resolveDiscrepancy = function(discrepancyId, resolution, resolvedBy) {
  const discrepancy = this.discrepancies.id(discrepancyId);
  if (discrepancy) {
    discrepancy.resolved = true;
    discrepancy.resolution = resolution;
    discrepancy.resolvedBy = resolvedBy;
    discrepancy.resolvedAt = new Date();
  }
  
  return this.save();
};

TransferSchema.methods.performQualityCheck = function(performedBy, result, notes, photos) {
  this.qualityCheck = {
    required: true,
    performed: true,
    performedBy,
    performedAt: new Date(),
    result,
    notes,
    photos: photos || []
  };
  
  return this.save();
};

// Virtuals
TransferSchema.virtual('isOverdue').get(function() {
  return this.expectedDate && 
         this.expectedDate < new Date() && 
         !['completed', 'cancelled', 'rejected'].includes(this.status);
});

TransferSchema.virtual('daysPastDue').get(function() {
  if (!this.isOverdue) return 0;
  const today = new Date();
  const diffTime = today - this.expectedDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

TransferSchema.virtual('daysUntilExpected').get(function() {
  if (!this.expectedDate) return null;
  const today = new Date();
  const diffTime = this.expectedDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

TransferSchema.virtual('transferEfficiency').get(function() {
  if (this.requestedQuantity === 0) return 100;
  return Math.round((this.receivedQuantity / this.requestedQuantity) * 100);
});

TransferSchema.virtual('hasDiscrepancies').get(function() {
  return this.discrepancies.length > 0;
});

TransferSchema.virtual('unresolvedDiscrepancies').get(function() {
  return this.discrepancies.filter(d => !d.resolved);
});

TransferSchema.virtual('processingTime').get(function() {
  if (!this.receivedAt || !this.transferDate) return null;
  
  const diffTime = this.receivedAt - this.transferDate;
  return Math.ceil(diffTime / (1000 * 60 * 60)); // in hours
});

TransferSchema.virtual('isInternal').get(function() {
  return this.category === 'internal';
});

TransferSchema.virtual('isExternal').get(function() {
  return this.category === 'external';
});

TransferSchema.virtual('isAdjustment').get(function() {
  return this.category === 'adjustment';
});

// Ensure virtual fields are serialized
TransferSchema.set('toJSON', { virtuals: true });

// Export model
const Transfer = mongoose.models.Transfer || mongoose.model('Transfer', TransferSchema);
export default Transfer;
