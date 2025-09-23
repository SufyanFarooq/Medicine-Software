import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple null values
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['super_admin', 'admin', 'manager', 'staff', 'sales_man'],
      message: 'Role must be one of: super_admin, admin, manager, staff, sales_man'
    },
    default: 'sales_man'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    }
  },
  // Permissions and access
  permissions: {
    canManageUsers: { type: Boolean, default: false },
    canManageProducts: { type: Boolean, default: true },
    canManageInventory: { type: Boolean, default: true },
    canGenerateInvoices: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false }
  },
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'users'
});

// Indexes for performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to get full name
UserSchema.methods.getFullName = function() {
  if (this.profile.firstName || this.profile.lastName) {
    return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
  }
  return this.username;
};

// Static method to find active users
UserSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find by role
UserSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Virtual for user display name
UserSchema.virtual('displayName').get(function() {
  return this.getFullName();
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password; // Never send password in JSON
    return ret;
  }
});

// Export model
const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
