import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  sku: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    uppercase: true,
    maxlength: [50, 'SKU cannot exceed 50 characters']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: [100, 'Barcode cannot exceed 100 characters']
  },
  
  // Category and Classification
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand cannot exceed 100 characters']
  },
  manufacturer: {
    type: String,
    trim: true,
    maxlength: [100, 'Manufacturer cannot exceed 100 characters']
  },
  
  // Pricing
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  mrp: {
    type: Number,
    min: [0, 'MRP cannot be negative']
  },
  
  // Inventory
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  minStockLevel: {
    type: Number,
    min: [0, 'Minimum stock level cannot be negative'],
    default: 10
  },
  maxStockLevel: {
    type: Number,
    min: [0, 'Maximum stock level cannot be negative'],
    default: 1000
  },
  reorderPoint: {
    type: Number,
    min: [0, 'Reorder point cannot be negative'],
    default: 20
  },
  
  // Product Details
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: {
      values: ['piece', 'box', 'bottle', 'packet', 'strip', 'vial', 'tablet', 'capsule', 'ml', 'gm', 'kg', 'liter', 'other'],
      message: 'Unit must be a valid unit type'
    },
    default: 'piece'
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  },
  
  // Medicine/Pharmacy specific fields
  expiryDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > new Date();
      },
      message: 'Expiry date must be in the future'
    }
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters']
  },
  genericName: {
    type: String,
    trim: true,
    maxlength: [200, 'Generic name cannot exceed 200 characters']
  },
  composition: {
    type: String,
    trim: true,
    maxlength: [500, 'Composition cannot exceed 500 characters']
  },
  dosage: {
    type: String,
    trim: true,
    maxlength: [100, 'Dosage cannot exceed 100 characters']
  },
  
  // Supplier Information
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  supplierPrice: {
    type: Number,
    min: [0, 'Supplier price cannot be negative']
  },
  
  // Status and Flags
  isActive: {
    type: Boolean,
    default: true
  },
  isDiscontinued: {
    type: Boolean,
    default: false
  },
  requiresPrescription: {
    type: Boolean,
    default: false
  },
  isControlledSubstance: {
    type: Boolean,
    default: false
  },
  
  // Storage and Location
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  location: {
    aisle: String,
    shelf: String,
    bin: String
  },
  
  // Images and Media
  images: [{
    url: String,
    alt: String,
    isPrimary: { type: Boolean, default: false }
  }],
  
  // Tags and Search
  tags: [String],
  searchTerms: [String], // For better search functionality
  
  // Audit and Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Analytics
  analytics: {
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    lastSaleDate: Date,
    popularityScore: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'products'
});

// Indexes for performance
ProductSchema.index({ name: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ supplier: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ quantity: 1 });
ProductSchema.index({ expiryDate: 1 });
ProductSchema.index({ batchNumber: 1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ supplier: 1, isActive: 1 });
ProductSchema.index({ quantity: 1, minStockLevel: 1 }); // For low stock queries
ProductSchema.index({ expiryDate: 1, isActive: 1 }); // For expiry alerts
ProductSchema.index({ name: 'text', description: 'text', genericName: 'text' }); // Text search

// Pre-save middleware
ProductSchema.pre('save', function(next) {
  // Generate SKU if not provided
  if (!this.sku) {
    const timestamp = Date.now().toString().slice(-6);
    const nameCode = this.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    this.sku = `${nameCode}${timestamp}`;
  }
  
  // Update search terms
  this.searchTerms = [
    this.name.toLowerCase(),
    this.genericName?.toLowerCase(),
    this.brand?.toLowerCase(),
    this.manufacturer?.toLowerCase(),
    this.sku?.toLowerCase(),
    this.barcode?.toLowerCase()
  ].filter(Boolean);
  
  next();
});

// Static methods
ProductSchema.statics.findActive = function() {
  return this.find({ isActive: true }).populate('category supplier');
};

ProductSchema.statics.findLowStock = function() {
  return this.find({
    isActive: true,
    $expr: { $lte: ['$quantity', '$minStockLevel'] }
  }).populate('category supplier');
};

ProductSchema.statics.findExpiringSoon = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    isActive: true,
    expiryDate: { $lte: futureDate, $gte: new Date() }
  }).populate('category supplier');
};

ProductSchema.statics.findByCategory = function(categoryId) {
  return this.find({ category: categoryId, isActive: true }).populate('category supplier');
};

ProductSchema.statics.searchProducts = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    isActive: true,
    $or: [
      { name: regex },
      { description: regex },
      { genericName: regex },
      { brand: regex },
      { manufacturer: regex },
      { sku: regex },
      { barcode: regex },
      { searchTerms: { $in: [regex] } }
    ]
  }).populate('category supplier');
};

// Instance methods
ProductSchema.methods.isLowStock = function() {
  return this.quantity <= this.minStockLevel;
};

ProductSchema.methods.isExpiringSoon = function(days = 30) {
  if (!this.expiryDate) return false;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return this.expiryDate <= futureDate && this.expiryDate >= new Date();
};

ProductSchema.methods.isExpired = function() {
  if (!this.expiryDate) return false;
  return this.expiryDate < new Date();
};

ProductSchema.methods.getProfitMargin = function() {
  if (this.purchasePrice === 0) return 0;
  return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice) * 100;
};

ProductSchema.methods.updateAnalytics = function(soldQuantity, saleAmount) {
  this.analytics.totalSold += soldQuantity;
  this.analytics.totalRevenue += saleAmount;
  this.analytics.lastSaleDate = new Date();
  this.analytics.popularityScore += 1;
  return this.save();
};

// Virtuals
ProductSchema.virtual('profitMargin').get(function() {
  return this.getProfitMargin();
});

ProductSchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.isLowStock()) return 'low_stock';
  if (this.quantity >= this.maxStockLevel) return 'overstock';
  return 'in_stock';
});

ProductSchema.virtual('expiryStatus').get(function() {
  if (!this.expiryDate) return 'no_expiry';
  if (this.isExpired()) return 'expired';
  if (this.isExpiringSoon(7)) return 'expiring_critical';
  if (this.isExpiringSoon(30)) return 'expiring_soon';
  return 'fresh';
});

// Ensure virtual fields are serialized
ProductSchema.set('toJSON', { virtuals: true });

// Export model
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export default Product;
