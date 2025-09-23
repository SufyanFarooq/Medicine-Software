import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  // Activity Identification
  activityId: {
    type: String,
    required: [true, 'Activity ID is required'],
    unique: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now,
    index: true
  },
  
  // Activity Classification
  type: {
    type: String,
    enum: {
      values: [
        // User activities
        'user_login', 'user_logout', 'user_created', 'user_updated', 'user_deleted',
        // Product activities
        'product_created', 'product_updated', 'product_deleted', 'stock_updated', 'price_changed',
        // Inventory activities
        'stock_added', 'stock_removed', 'stock_transfer', 'stock_adjustment', 'batch_created', 'batch_expired',
        // Sales activities
        'invoice_created', 'invoice_updated', 'invoice_paid', 'invoice_cancelled', 'payment_received', 'refund_processed',
        // Purchase activities
        'purchase_order_created', 'purchase_order_approved', 'purchase_order_received', 'supplier_payment',
        // Customer activities
        'customer_created', 'customer_updated', 'customer_order', 'customer_payment', 'customer_return',
        // System activities
        'system_backup', 'system_maintenance', 'data_import', 'data_export', 'report_generated',
        // Warehouse activities
        'warehouse_created', 'warehouse_updated', 'transfer_created', 'transfer_completed',
        // Quality activities
        'quality_check', 'recall_initiated', 'compliance_check',
        // Security activities
        'security_alert', 'unauthorized_access', 'password_changed', 'permission_changed',
        // Other
        'other'
      ],
      message: 'Activity type must be valid'
    },
    required: [true, 'Activity type is required']
  },
  category: {
    type: String,
    enum: {
      values: ['user', 'product', 'inventory', 'sales', 'purchase', 'customer', 'system', 'warehouse', 'quality', 'security', 'other'],
      message: 'Activity category must be valid'
    },
    required: [true, 'Activity category is required']
  },
  action: {
    type: String,
    enum: {
      values: ['create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'process', 'complete', 'cancel', 'transfer', 'payment', 'refund', 'export', 'import', 'backup', 'other'],
      message: 'Activity action must be valid'
    },
    required: [true, 'Activity action is required']
  },
  
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  // Snapshot of user info for historical accuracy
  userSnapshot: {
    username: String,
    email: String,
    role: String,
    firstName: String,
    lastName: String
  },
  
  // Target Information (what was acted upon)
  targetType: {
    type: String,
    enum: ['User', 'Product', 'Category', 'Customer', 'Supplier', 'Invoice', 'PurchaseOrder', 'Batch', 'Transfer', 'Warehouse', 'Payment', 'Return', 'Settings', 'System', 'Other'],
    required: [true, 'Target type is required']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.targetType !== 'System' && this.targetType !== 'Other';
    }
  },
  targetName: {
    type: String,
    trim: true,
    maxlength: [200, 'Target name cannot exceed 200 characters']
  },
  
  // Activity Details
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for activity-specific data
    default: {}
  },
  
  // Changes Made (for update activities)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String] // Array of field names that changed
  },
  
  // Request Information
  ipAddress: {
    type: String,
    trim: true,
    maxlength: [45, 'IP address cannot exceed 45 characters'] // IPv6 support
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  sessionId: {
    type: String,
    trim: true,
    maxlength: [100, 'Session ID cannot exceed 100 characters']
  },
  
  // Location and Device Information
  location: {
    country: String,
    city: String,
    region: String,
    timezone: String
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'api', 'system', 'unknown'],
    default: 'unknown'
  },
  browser: {
    name: String,
    version: String
  },
  
  // Status and Flags
  status: {
    type: String,
    enum: {
      values: ['success', 'failed', 'warning', 'info'],
      message: 'Activity status must be valid'
    },
    default: 'success'
  },
  severity: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Activity severity must be valid'
    },
    default: 'low'
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  },
  isSecurityRelevant: {
    type: Boolean,
    default: false
  },
  isAuditable: {
    type: Boolean,
    default: true
  },
  
  // Error Information (for failed activities)
  error: {
    code: String,
    message: String,
    stack: String
  },
  
  // Performance Metrics
  duration: {
    type: Number, // in milliseconds
    min: [0, 'Duration cannot be negative']
  },
  
  // Related Activities
  parentActivity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  relatedActivities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  
  // Batch Information (for bulk operations)
  batchId: {
    type: String,
    trim: true,
    maxlength: [100, 'Batch ID cannot exceed 100 characters']
  },
  batchSize: {
    type: Number,
    min: [0, 'Batch size cannot be negative']
  },
  batchIndex: {
    type: Number,
    min: [0, 'Batch index cannot be negative']
  },
  
  // Tags and Labels
  tags: [String],
  labels: [{
    key: String,
    value: String
  }],
  
  // Additional Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Retention Information
  retentionDate: {
    type: Date,
    default: function() {
      // Default retention period: 2 years
      const date = new Date();
      date.setFullYear(date.getFullYear() + 2);
      return date;
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'activities'
});

// Indexes for performance and queries
ActivitySchema.index({ timestamp: -1 }); // Most common query
ActivitySchema.index({ user: 1, timestamp: -1 });
ActivitySchema.index({ type: 1, timestamp: -1 });
ActivitySchema.index({ category: 1, timestamp: -1 });
ActivitySchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
ActivitySchema.index({ status: 1, timestamp: -1 });
ActivitySchema.index({ severity: 1, timestamp: -1 });
ActivitySchema.index({ isSecurityRelevant: 1, timestamp: -1 });
ActivitySchema.index({ retentionDate: 1 });
ActivitySchema.index({ isArchived: 1 });
ActivitySchema.index({ batchId: 1 });

// Compound indexes for complex queries
ActivitySchema.index({ user: 1, category: 1, timestamp: -1 });
ActivitySchema.index({ targetType: 1, action: 1, timestamp: -1 });
ActivitySchema.index({ category: 1, status: 1, timestamp: -1 });
ActivitySchema.index({ isSecurityRelevant: 1, severity: 1, timestamp: -1 });

// Text index for search functionality
ActivitySchema.index({
  description: 'text',
  targetName: 'text',
  'userSnapshot.username': 'text',
  'userSnapshot.email': 'text'
});

// Pre-save middleware to generate activity ID
ActivitySchema.pre('save', async function(next) {
  if (this.isNew && !this.activityId) {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.activityId = `ACT-${timestamp}-${random}`;
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Static methods
ActivitySchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findByTarget = function(targetType, targetId, limit = 50) {
  return this.find({ targetType, targetId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findByType = function(type, limit = 100) {
  return this.find({ type })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findByCategory = function(category, limit = 100) {
  return this.find({ category })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findByDateRange = function(startDate, endDate, limit = 1000) {
  return this.find({
    timestamp: { $gte: startDate, $lte: endDate }
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findSecurityRelevant = function(limit = 100) {
  return this.find({ isSecurityRelevant: true })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findFailedActivities = function(limit = 100) {
  return this.find({ status: 'failed' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.findHighSeverity = function(limit = 100) {
  return this.find({ severity: { $in: ['high', 'critical'] } })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'username email role');
};

ActivitySchema.statics.getActivityStats = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.timestamp = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          category: '$category',
          status: '$status'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

ActivitySchema.statics.getUserActivityStats = function(userId, startDate, endDate) {
  const match = { user: userId };
  if (startDate && endDate) {
    match.timestamp = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

ActivitySchema.statics.archiveOldActivities = function(olderThanDays = 730) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  return this.updateMany(
    { 
      timestamp: { $lt: cutoffDate },
      isArchived: false
    },
    { 
      isArchived: true,
      archivedAt: new Date()
    }
  );
};

ActivitySchema.statics.deleteExpiredActivities = function() {
  return this.deleteMany({
    retentionDate: { $lt: new Date() }
  });
};

// Instance methods
ActivitySchema.methods.markAsArchived = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

ActivitySchema.methods.addRelatedActivity = function(activityId) {
  if (!this.relatedActivities.includes(activityId)) {
    this.relatedActivities.push(activityId);
    return this.save();
  }
  return Promise.resolve(this);
};

ActivitySchema.methods.setError = function(error) {
  this.status = 'failed';
  this.error = {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    stack: error.stack
  };
  return this.save();
};

ActivitySchema.methods.setDuration = function(startTime) {
  this.duration = Date.now() - startTime;
  return this.save();
};

// Static helper methods for creating activities
ActivitySchema.statics.createUserActivity = function(type, user, description, details = {}) {
  return this.create({
    type,
    category: 'user',
    action: type.split('_')[1] || 'other',
    user: user._id,
    userSnapshot: {
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    targetType: 'User',
    targetId: user._id,
    targetName: user.username,
    description,
    details
  });
};

ActivitySchema.statics.createProductActivity = function(type, user, product, description, details = {}) {
  return this.create({
    type,
    category: 'product',
    action: type.split('_')[1] || 'other',
    user: user._id,
    userSnapshot: {
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    targetType: 'Product',
    targetId: product._id,
    targetName: product.name,
    description,
    details
  });
};

ActivitySchema.statics.createSystemActivity = function(type, user, description, details = {}) {
  return this.create({
    type,
    category: 'system',
    action: type.split('_')[1] || 'other',
    user: user._id,
    userSnapshot: {
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    targetType: 'System',
    targetName: 'System',
    description,
    details,
    isSystemGenerated: true
  });
};

// Virtuals
ActivitySchema.virtual('age').get(function() {
  const now = new Date();
  const diffTime = now - this.timestamp;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

ActivitySchema.virtual('isRecent').get(function() {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  return this.timestamp > oneDayAgo;
});

ActivitySchema.virtual('isExpired').get(function() {
  return this.retentionDate < new Date();
});

ActivitySchema.virtual('durationInSeconds').get(function() {
  return this.duration ? Math.round(this.duration / 1000) : null;
});

ActivitySchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return null;
  
  const seconds = Math.floor(this.duration / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
});

// Ensure virtual fields are serialized
ActivitySchema.set('toJSON', { virtuals: true });

// Export model
const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
export default Activity;
