import mongoose from 'mongoose';

const WarehouseSchema = new mongoose.Schema({
  // Warehouse Identification
  warehouseCode: {
    type: String,
    required: [true, 'Warehouse code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Warehouse code cannot exceed 20 characters']
  },
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [100, 'Warehouse name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Location Information
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
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
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters']
    },
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    }
  },
  
  // Contact Information
  contactInfo: {
    manager: {
      type: String,
      trim: true,
      maxlength: [100, 'Manager name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone cannot exceed 20 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email cannot exceed 100 characters'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    alternatePhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Alternate phone cannot exceed 20 characters']
    }
  },
  
  // Warehouse Type and Classification
  warehouseType: {
    type: String,
    enum: {
      values: ['main', 'branch', 'distribution', 'cold_storage', 'pharmacy', 'retail', 'transit', 'quarantine'],
      message: 'Warehouse type must be valid'
    },
    required: [true, 'Warehouse type is required']
  },
  category: {
    type: String,
    enum: ['primary', 'secondary', 'tertiary'],
    default: 'secondary'
  },
  
  // Physical Specifications
  specifications: {
    totalArea: {
      type: Number,
      min: [0, 'Total area cannot be negative']
    },
    storageArea: {
      type: Number,
      min: [0, 'Storage area cannot be negative']
    },
    officeArea: {
      type: Number,
      min: [0, 'Office area cannot be negative']
    },
    loadingDocks: {
      type: Number,
      min: [0, 'Loading docks cannot be negative'],
      default: 0
    },
    maxCapacity: {
      type: Number,
      min: [0, 'Max capacity cannot be negative']
    },
    currentUtilization: {
      type: Number,
      min: [0, 'Current utilization cannot be negative'],
      default: 0
    }
  },
  
  // Storage Organization
  storageStructure: {
    aisles: {
      type: Number,
      min: [0, 'Number of aisles cannot be negative'],
      default: 0
    },
    shelves: {
      type: Number,
      min: [0, 'Number of shelves cannot be negative'],
      default: 0
    },
    bins: {
      type: Number,
      min: [0, 'Number of bins cannot be negative'],
      default: 0
    },
    zones: [{
      name: String,
      code: String,
      description: String,
      temperature: {
        min: Number,
        max: Number
      },
      humidity: {
        min: Number,
        max: Number
      },
      specialRequirements: [String]
    }]
  },
  
  // Environmental Controls
  environmentalControls: {
    hasTemperatureControl: {
      type: Boolean,
      default: false
    },
    temperatureRange: {
      min: Number, // Celsius
      max: Number  // Celsius
    },
    hasHumidityControl: {
      type: Boolean,
      default: false
    },
    humidityRange: {
      min: Number, // Percentage
      max: Number  // Percentage
    },
    hasVentilation: {
      type: Boolean,
      default: true
    },
    hasSecuritySystem: {
      type: Boolean,
      default: false
    },
    hasFireSafety: {
      type: Boolean,
      default: false
    }
  },
  
  // Operating Information
  operatingHours: {
    monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isClosed: { type: Boolean, default: true } }
  },
  timezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  
  // Staff Information
  staff: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['manager', 'supervisor', 'operator', 'security', 'maintenance'],
      required: true
    },
    shift: {
      type: String,
      enum: ['morning', 'evening', 'night', 'rotational'],
      default: 'morning'
    },
    permissions: [String],
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Inventory Tracking
  inventorySettings: {
    trackBatches: {
      type: Boolean,
      default: true
    },
    trackSerialNumbers: {
      type: Boolean,
      default: false
    },
    trackExpiryDates: {
      type: Boolean,
      default: true
    },
    autoReorderEnabled: {
      type: Boolean,
      default: false
    },
    reorderThreshold: {
      type: Number,
      min: [0, 'Reorder threshold cannot be negative'],
      default: 10
    }
  },
  
  // Financial Information
  costs: {
    monthlyCost: {
      type: Number,
      min: [0, 'Monthly cost cannot be negative'],
      default: 0
    },
    currency: {
      type: String,
      enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'],
      default: 'PKR'
    },
    costPerSquareFoot: {
      type: Number,
      min: [0, 'Cost per square foot cannot be negative'],
      default: 0
    }
  },
  
  // Status and Flags
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'maintenance', 'closed', 'under_construction'],
      message: 'Warehouse status must be valid'
    },
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  allowsReceiving: {
    type: Boolean,
    default: true
  },
  allowsShipping: {
    type: Boolean,
    default: true
  },
  allowsTransfers: {
    type: Boolean,
    default: true
  },
  
  // Certifications and Compliance
  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateNumber: String,
    status: {
      type: String,
      enum: ['valid', 'expired', 'pending_renewal', 'suspended'],
      default: 'valid'
    }
  }],
  
  // Integration and Technology
  technology: {
    hasWMS: {
      type: Boolean,
      default: false
    }, // Warehouse Management System
    hasBarcodeScanning: {
      type: Boolean,
      default: false
    },
    hasRFID: {
      type: Boolean,
      default: false
    },
    hasAutomation: {
      type: Boolean,
      default: false
    },
    integrationSystems: [String]
  },
  
  // Performance Metrics
  metrics: {
    totalProductsStored: {
      type: Number,
      min: [0, 'Total products stored cannot be negative'],
      default: 0
    },
    totalValue: {
      type: Number,
      min: [0, 'Total value cannot be negative'],
      default: 0
    },
    utilizationPercentage: {
      type: Number,
      min: [0, 'Utilization percentage cannot be negative'],
      max: [100, 'Utilization percentage cannot exceed 100'],
      default: 0
    },
    lastInventoryDate: Date,
    averageOrderProcessingTime: Number, // in hours
    accuracyRate: {
      type: Number,
      min: [0, 'Accuracy rate cannot be negative'],
      max: [100, 'Accuracy rate cannot exceed 100'],
      default: 100
    }
  },
  
  // Additional Information
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
  collection: 'warehouses'
});

// Indexes for performance
WarehouseSchema.index({ warehouseCode: 1 });
WarehouseSchema.index({ name: 1 });
WarehouseSchema.index({ warehouseType: 1 });
WarehouseSchema.index({ status: 1 });
WarehouseSchema.index({ isActive: 1 });
WarehouseSchema.index({ isPrimary: 1 });
WarehouseSchema.index({ 'address.city': 1 });
WarehouseSchema.index({ 'address.country': 1 });
WarehouseSchema.index({ createdAt: -1 });

// Compound indexes
WarehouseSchema.index({ warehouseType: 1, status: 1 });
WarehouseSchema.index({ isActive: 1, status: 1 });
WarehouseSchema.index({ 'address.city': 1, warehouseType: 1 });

// Pre-save middleware to generate warehouse code
WarehouseSchema.pre('save', async function(next) {
  if (this.isNew && !this.warehouseCode) {
    try {
      const typePrefix = {
        'main': 'MN',
        'branch': 'BR',
        'distribution': 'DS',
        'cold_storage': 'CS',
        'pharmacy': 'PH',
        'retail': 'RT',
        'transit': 'TR',
        'quarantine': 'QR'
      };
      
      const prefix = typePrefix[this.warehouseType] || 'WH';
      
      const lastWarehouse = await this.constructor
        .findOne({ 
          warehouseCode: new RegExp(`^${prefix}`) 
        })
        .sort({ warehouseCode: -1 });
      
      let nextNumber = 1;
      if (lastWarehouse) {
        const lastNumber = parseInt(lastWarehouse.warehouseCode.slice(-3));
        nextNumber = lastNumber + 1;
      }
      
      this.warehouseCode = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to calculate utilization
WarehouseSchema.pre('save', function(next) {
  if (this.specifications.maxCapacity && this.specifications.currentUtilization) {
    this.metrics.utilizationPercentage = Math.round(
      (this.specifications.currentUtilization / this.specifications.maxCapacity) * 100
    );
  }
  next();
});

// Static methods
WarehouseSchema.statics.findActive = function() {
  return this.find({ isActive: true, status: 'active' }).populate('staff.user');
};

WarehouseSchema.statics.findByType = function(type) {
  return this.find({ warehouseType: type, isActive: true }).sort({ name: 1 });
};

WarehouseSchema.statics.findByCity = function(city) {
  return this.find({ 'address.city': city, isActive: true }).sort({ name: 1 });
};

WarehouseSchema.statics.findPrimary = function() {
  return this.findOne({ isPrimary: true, isActive: true });
};

WarehouseSchema.statics.findWithCapacity = function(minCapacity) {
  return this.find({
    'specifications.maxCapacity': { $gte: minCapacity },
    isActive: true,
    status: 'active'
  }).sort({ 'specifications.maxCapacity': -1 });
};

WarehouseSchema.statics.getUtilizationReport = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$warehouseType',
        totalWarehouses: { $sum: 1 },
        totalCapacity: { $sum: '$specifications.maxCapacity' },
        totalUtilization: { $sum: '$specifications.currentUtilization' },
        avgUtilizationRate: { $avg: '$metrics.utilizationPercentage' }
      }
    },
    { $sort: { totalCapacity: -1 } }
  ]);
};

// Instance methods
WarehouseSchema.methods.updateUtilization = function(newUtilization) {
  this.specifications.currentUtilization = newUtilization;
  
  if (this.specifications.maxCapacity) {
    this.metrics.utilizationPercentage = Math.round(
      (newUtilization / this.specifications.maxCapacity) * 100
    );
  }
  
  return this.save();
};

WarehouseSchema.methods.addStaffMember = function(userId, role, shift, permissions) {
  this.staff.push({
    user: userId,
    role,
    shift,
    permissions: permissions || [],
    assignedDate: new Date()
  });
  
  return this.save();
};

WarehouseSchema.methods.removeStaffMember = function(userId) {
  this.staff = this.staff.filter(member => !member.user.equals(userId));
  return this.save();
};

WarehouseSchema.methods.addCertification = function(certData) {
  this.certifications.push({
    ...certData,
    status: 'valid'
  });
  
  return this.save();
};

WarehouseSchema.methods.isOperational = function() {
  return this.isActive && this.status === 'active';
};

WarehouseSchema.methods.canReceiveProducts = function() {
  return this.isOperational() && this.allowsReceiving;
};

WarehouseSchema.methods.canShipProducts = function() {
  return this.isOperational() && this.allowsShipping;
};

WarehouseSchema.methods.canTransferProducts = function() {
  return this.isOperational() && this.allowsTransfers;
};

WarehouseSchema.methods.updateMetrics = function(metrics) {
  this.metrics = { ...this.metrics, ...metrics };
  this.metrics.lastInventoryDate = new Date();
  return this.save();
};

// Virtuals
WarehouseSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
    .filter(Boolean)
    .join(', ');
});

WarehouseSchema.virtual('availableCapacity').get(function() {
  return Math.max(0, this.specifications.maxCapacity - this.specifications.currentUtilization);
});

WarehouseSchema.virtual('capacityStatus').get(function() {
  const utilization = this.metrics.utilizationPercentage;
  if (utilization >= 95) return 'critical';
  if (utilization >= 80) return 'high';
  if (utilization >= 60) return 'moderate';
  return 'low';
});

WarehouseSchema.virtual('staffCount').get(function() {
  return this.staff.length;
});

WarehouseSchema.virtual('totalZones').get(function() {
  return this.storageStructure.zones.length;
});

WarehouseSchema.virtual('totalStorageUnits').get(function() {
  return this.storageStructure.aisles * this.storageStructure.shelves * this.storageStructure.bins;
});

WarehouseSchema.virtual('activeCertifications').get(function() {
  return this.certifications.filter(cert => 
    cert.status === 'valid' && 
    (!cert.expiryDate || cert.expiryDate > new Date())
  );
});

WarehouseSchema.virtual('expiringSoonCertifications').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  return this.certifications.filter(cert => 
    cert.status === 'valid' && 
    cert.expiryDate && 
    cert.expiryDate <= thirtyDaysFromNow
  );
});

// Ensure virtual fields are serialized
WarehouseSchema.set('toJSON', { virtuals: true });

// Export model
const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
export default Warehouse;
