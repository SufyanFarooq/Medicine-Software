import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    default: '#1890ff',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code']
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  // Parent category for subcategories (optional)
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  // Business type this category belongs to
  businessType: {
    type: String,
    enum: ['retail-store', 'restaurant', 'pharmacy', 'wholesale', 'manufacturing', 'service', 'other'],
    default: 'retail-store'
  },
  // Category metadata
  metadata: {
    productCount: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
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
  collection: 'categories'
});

// Indexes for performance
CategorySchema.index({ name: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ businessType: 1 });
CategorySchema.index({ parentCategory: 1 });
CategorySchema.index({ sortOrder: 1 });
CategorySchema.index({ createdAt: -1 });

// Compound indexes
CategorySchema.index({ businessType: 1, isActive: 1 });
CategorySchema.index({ parentCategory: 1, sortOrder: 1 });

// Pre-save middleware
CategorySchema.pre('save', function(next) {
  // Update metadata timestamp
  this.metadata.lastUpdated = new Date();
  next();
});

// Static method to find active categories
CategorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find by business type
CategorySchema.statics.findByBusinessType = function(businessType) {
  return this.find({ businessType, isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Static method to find root categories (no parent)
CategorySchema.statics.findRootCategories = function() {
  return this.find({ parentCategory: null, isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Instance method to get subcategories
CategorySchema.methods.getSubcategories = function() {
  return this.model('Category').find({ parentCategory: this._id, isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Instance method to update product count
CategorySchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ category: this._id, isActive: true });
  this.metadata.productCount = count;
  this.metadata.lastUpdated = new Date();
  return this.save();
};

// Virtual for full category path (if subcategory)
CategorySchema.virtual('fullPath').get(function() {
  // This would need to be populated to work properly
  if (this.parentCategory && this.parentCategory.name) {
    return `${this.parentCategory.name} > ${this.name}`;
  }
  return this.name;
});

// Ensure virtual fields are serialized
CategorySchema.set('toJSON', { virtuals: true });

// Export model
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export default Category;
