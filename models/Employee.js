const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Basic Info
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  cnicOrPassport: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Job Info
  department: {
    type: String,
    required: true,
    enum: ['HR', 'Finance', 'Sales', 'Warehouse', 'Operations', 'IT', 'Admin']
  },
  designation: {
    type: String,
    required: true,
    trim: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  
  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relation: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  
  // Documents
  documents: [{
    type: {
      type: String,
      required: true,
      trim: true
    },
    number: {
      type: String,
      trim: true
    },
    issueDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    fileUrl: {
      type: String,
      trim: true
    }
  }],
  
  // Status
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  joinedAt: {
    type: Date,
    required: true
  },
  leftAt: {
    type: Date
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
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Pre-save middleware
employeeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
employeeSchema.index({ code: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ branchId: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ phone: 1 });
employeeSchema.index({ cnicOrPassport: 1 });

// Text search index
employeeSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  designation: 'text'
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
employeeSchema.virtual('age').get(function() {
  if (this.dob) {
    const today = new Date();
    const birthDate = new Date(this.dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
});

module.exports = mongoose.model('Employee', employeeSchema);
