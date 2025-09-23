const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Branch code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Branch code cannot exceed 10 characters']
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
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
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
      maxlength: [50, 'Country name cannot exceed 50 characters']
    }
  },
  
  // Contact Information
  contactInfo: {
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    fax: {
      type: String,
      trim: true,
      maxlength: [20, 'Fax number cannot exceed 20 characters']
    }
  },
  
  // Branch Details
  branchType: {
    type: String,
    required: [true, 'Branch type is required'],
    enum: {
      values: ['head_office', 'branch_office', 'retail_store', 'warehouse', 'distribution_center', 'service_center'],
      message: 'Branch type must be valid'
    },
    default: 'branch_office'
  },
  
  // Manager Information
  manager: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Manager name cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Manager phone cannot exceed 20 characters']
    }
  },
  
  // Business Hours
  businessHours: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '18:00' }
    }
  },
  
  // Status and Flags
  status: {
    type: String,
    required: [true, 'Branch status is required'],
    enum: {
      values: ['active', 'inactive', 'temporarily_closed', 'under_maintenance'],
      message: 'Branch status must be valid'
    },
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHeadOffice: {
    type: Boolean,
    default: false
  },
  
  // Financial Information
  currency: {
    type: String,
    enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED'],
    default: 'PKR'
  },
  timezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  
  // System Fields
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
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'branches'
});

// Indexes for performance
branchSchema.index({ code: 1 }, { unique: true });
branchSchema.index({ name: 1 });
branchSchema.index({ 'address.city': 1 });
branchSchema.index({ branchType: 1 });
branchSchema.index({ status: 1 });
branchSchema.index({ isActive: 1 });

// Pre-save middleware to generate branch code if not provided
branchSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    try {
      const typePrefix = {
        'head_office': 'HO',
        'branch_office': 'BO',
        'retail_store': 'RS',
        'warehouse': 'WH',
        'distribution_center': 'DC',
        'service_center': 'SC'
      };
      
      const prefix = typePrefix[this.branchType] || 'BR';
      
      const lastBranch = await this.constructor
        .findOne({ 
          code: new RegExp(`^${prefix}`) 
        })
        .sort({ code: -1 });
      
      let nextNumber = 1;
      if (lastBranch) {
        const lastNumber = parseInt(lastBranch.code.slice(-3));
        nextNumber = lastNumber + 1;
      }
      
      this.code = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to update timestamps
branchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Branch', branchSchema);
