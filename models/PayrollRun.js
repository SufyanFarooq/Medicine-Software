const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  period: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  earnings: {
    type: Number,
    required: true,
    min: 0
  },
  deductions: {
    type: Number,
    required: true,
    min: 0
  },
  net: {
    type: Number,
    required: true
  },
  generatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  paidAt: {
    type: Date
  },
  paymentRef: {
    type: String,
    trim: true
  },
  
  // Breakdown details
  breakdown: {
    base: {
      type: Number,
      required: true,
      min: 0
    },
    allowances: [{
      label: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    deductions: [{
      label: {
        type: String,
        required: true,
        trim: true
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    overtime: {
      type: Number,
      default: 0,
      min: 0
    }
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
payrollRunSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
payrollRunSchema.index({ period: 1, employeeId: 1 }, { unique: true });
payrollRunSchema.index({ period: 1 });
payrollRunSchema.index({ employeeId: 1 });
payrollRunSchema.index({ generatedAt: -1 });
payrollRunSchema.index({ isActive: 1 });

// Virtual for is paid
payrollRunSchema.virtual('isPaid').get(function() {
  return !!this.paidAt;
});

// Virtual for payment status
payrollRunSchema.virtual('paymentStatus').get(function() {
  if (this.paidAt) {
    return 'paid';
  } else {
    return 'pending';
  }
});

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
