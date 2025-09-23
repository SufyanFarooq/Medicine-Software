import mongoose from 'mongoose';

const ExpenseCategorySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  color: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  enabled: {
    type: Boolean,
    default: true
  },
  
  // Status and Activity
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'expense_categories'
});

// Indexes for performance
ExpenseCategorySchema.index({ name: 1 });
ExpenseCategorySchema.index({ color: 1 });
ExpenseCategorySchema.index({ enabled: 1 });
ExpenseCategorySchema.index({ isActive: 1 });
ExpenseCategorySchema.index({ createdAt: -1 });

// Compound indexes
ExpenseCategorySchema.index({ isActive: 1, enabled: 1 });
ExpenseCategorySchema.index({ name: 1, isActive: 1 });

// Text index for search
ExpenseCategorySchema.index({ 
  name: 'text', 
  description: 'text', 
  color: 'text' 
});

// Virtual for display name
ExpenseCategorySchema.virtual('displayName').get(function() {
  return this.name;
});

// Pre-save middleware
ExpenseCategorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  if (this.isModified('description')) {
    this.description = this.description.trim();
  }
  next();
});

// Instance methods
ExpenseCategorySchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static methods
ExpenseCategorySchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

ExpenseCategorySchema.statics.findEnabled = function() {
  return this.find({ enabled: true, isActive: true });
};

ExpenseCategorySchema.statics.findByColor = function(color) {
  return this.find({ color, isActive: true });
};

ExpenseCategorySchema.statics.searchCategories = function(searchTerm) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { color: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  });
};

export default mongoose.models.ExpenseCategory || mongoose.model('ExpenseCategory', ExpenseCategorySchema);
