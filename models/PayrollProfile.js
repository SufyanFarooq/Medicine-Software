const mongoose = require('mongoose');

const payrollProfileSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true
  },
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
  bank: {
    title: {
      type: String,
      trim: true
    },
    iban: {
      type: String,
      trim: true
    },
    accountNo: {
      type: String,
      trim: true
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
payrollProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
payrollProfileSchema.index({ employeeId: 1 });
payrollProfileSchema.index({ isActive: 1 });
payrollProfileSchema.index({ createdAt: -1 });

// Virtual for total allowances
payrollProfileSchema.virtual('totalAllowances').get(function() {
  return this.allowances.reduce((total, allowance) => total + allowance.amount, 0);
});

// Virtual for total deductions
payrollProfileSchema.virtual('totalDeductions').get(function() {
  return this.deductions.reduce((total, deduction) => total + deduction.amount, 0);
});

// Virtual for gross salary
payrollProfileSchema.virtual('grossSalary').get(function() {
  return this.base + this.totalAllowances;
});

// Virtual for net salary
payrollProfileSchema.virtual('netSalary').get(function() {
  return this.grossSalary - this.totalDeductions;
});

module.exports = mongoose.model('PayrollProfile', payrollProfileSchema);
