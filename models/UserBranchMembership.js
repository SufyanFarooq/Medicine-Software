const mongoose = require('mongoose');

const userBranchMembershipSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Branch reference
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  
  // Role in this specific branch
  role: {
    type: String,
    required: true,
    enum: {
      values: ['FranchiseOwner', 'BranchManager', 'Staff', 'Viewer', 'Admin'],
      message: 'Role must be FranchiseOwner, BranchManager, Staff, Viewer, or Admin'
    }
  },
  
  // Permissions for this branch (overrides global permissions)
  permissions: {
    canManageEmployees: { type: Boolean, default: false },
    canManageAttendance: { type: Boolean, default: false },
    canManageLeaves: { type: Boolean, default: false },
    canManagePayroll: { type: Boolean, default: false },
    canManageProducts: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    canGenerateInvoices: { type: Boolean, default: false },
    canViewInvoices: { type: Boolean, default: false },
    canManageReturns: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageExpenses: { type: Boolean, default: false },
    canManageWarehouses: { type: Boolean, default: false },
    canManageTransfers: { type: Boolean, default: false },
    canManageBatches: { type: Boolean, default: false }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Access dates
  assignedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  
  // Assignment details
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // System fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'user_branch_memberships'
});

// Compound indexes for performance
userBranchMembershipSchema.index({ userId: 1, branchId: 1 }, { unique: true });
userBranchMembershipSchema.index({ userId: 1, isActive: 1 });
userBranchMembershipSchema.index({ branchId: 1, isActive: 1 });
userBranchMembershipSchema.index({ role: 1, isActive: 1 });

// Pre-save middleware to set default permissions based on role
userBranchMembershipSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('role')) {
    // Set default permissions based on role
    switch (this.role) {
      case 'FranchiseOwner':
        this.permissions = {
          canManageEmployees: true,
          canManageAttendance: true,
          canManageLeaves: true,
          canManagePayroll: true,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: true,
          canManageExpenses: true,
          canManageWarehouses: true,
          canManageTransfers: true,
          canManageBatches: true
        };
        break;
      case 'BranchManager':
        this.permissions = {
          canManageEmployees: true,
          canManageAttendance: true,
          canManageLeaves: true,
          canManagePayroll: false,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: true,
          canManageExpenses: true,
          canManageWarehouses: true,
          canManageTransfers: true,
          canManageBatches: true
        };
        break;
      case 'Staff':
        this.permissions = {
          canManageEmployees: false,
          canManageAttendance: true,
          canManageLeaves: false,
          canManagePayroll: false,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: false,
          canManageExpenses: true,
          canManageWarehouses: false,
          canManageTransfers: false,
          canManageBatches: false
        };
        break;
      case 'Viewer':
        this.permissions = {
          canManageEmployees: false,
          canManageAttendance: false,
          canManageLeaves: false,
          canManagePayroll: false,
          canManageProducts: false,
          canManageInventory: false,
          canGenerateInvoices: false,
          canViewInvoices: true,
          canManageReturns: false,
          canViewReports: true,
          canManageExpenses: false,
          canManageWarehouses: false,
          canManageTransfers: false,
          canManageBatches: false
        };
        break;
      case 'Admin':
        this.permissions = {
          canManageEmployees: true,
          canManageAttendance: true,
          canManageLeaves: true,
          canManagePayroll: true,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: true,
          canManageExpenses: true,
          canManageWarehouses: true,
          canManageTransfers: true,
          canManageBatches: true
        };
        break;
    }
  }
  next();
});

// Pre-save middleware to update timestamps
userBranchMembershipSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserBranchMembership', userBranchMembershipSchema);
