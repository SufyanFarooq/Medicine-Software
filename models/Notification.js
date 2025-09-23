import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  // Notification Identification
  notificationId: {
    type: String,
    required: [true, 'Notification ID is required'],
    unique: true,
    trim: true
  },
  
  // Recipient Information
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  recipientType: {
    type: String,
    enum: ['user', 'role', 'group', 'all'],
    default: 'user'
  },
  // For role-based or group notifications
  recipientRole: {
    type: String,
    enum: ['admin', 'manager', 'staff', 'viewer']
  },
  recipientGroup: {
    type: String,
    trim: true,
    maxlength: [50, 'Recipient group cannot exceed 50 characters']
  },
  
  // Sender Information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderType: {
    type: String,
    enum: ['user', 'system', 'automated'],
    default: 'system'
  },
  
  // Notification Content
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  shortMessage: {
    type: String,
    trim: true,
    maxlength: [100, 'Short message cannot exceed 100 characters']
  },
  
  // Notification Type and Category
  type: {
    type: String,
    enum: {
      values: [
        // System notifications
        'system_alert', 'system_maintenance', 'system_update', 'backup_complete', 'backup_failed',
        // User notifications
        'welcome', 'password_reset', 'account_locked', 'login_alert', 'profile_updated',
        // Inventory notifications
        'low_stock', 'out_of_stock', 'expiry_alert', 'batch_expired', 'reorder_point_reached',
        // Sales notifications
        'new_order', 'order_shipped', 'payment_received', 'invoice_overdue', 'refund_processed',
        // Purchase notifications
        'po_approved', 'po_received', 'supplier_payment_due', 'delivery_delayed',
        // Quality notifications
        'quality_failed', 'recall_notice', 'compliance_issue',
        // Financial notifications
        'payment_reminder', 'credit_limit_exceeded', 'monthly_report_ready',
        // Security notifications
        'security_breach', 'unauthorized_access', 'suspicious_activity',
        // General
        'reminder', 'announcement', 'task_assigned', 'task_completed', 'other'
      ],
      message: 'Notification type must be valid'
    },
    required: [true, 'Notification type is required']
  },
  category: {
    type: String,
    enum: {
      values: ['system', 'user', 'inventory', 'sales', 'purchase', 'quality', 'financial', 'security', 'general'],
      message: 'Notification category must be valid'
    },
    required: [true, 'Notification category is required']
  },
  
  // Priority and Urgency
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be valid'
    },
    default: 'medium'
  },
  urgency: {
    type: String,
    enum: {
      values: ['normal', 'urgent', 'critical'],
      message: 'Urgency must be valid'
    },
    default: 'normal'
  },
  
  // Status and State
  status: {
    type: String,
    enum: {
      values: ['pending', 'sent', 'delivered', 'read', 'dismissed', 'failed'],
      message: 'Status must be valid'
    },
    default: 'pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isDismissed: {
    type: Boolean,
    default: false
  },
  dismissedAt: Date,
  
  // Delivery Information
  deliveryMethod: [{
    type: String,
    enum: ['in_app', 'email', 'sms', 'push', 'webhook'],
    default: 'in_app'
  }],
  sentAt: Date,
  deliveredAt: Date,
  
  // Related Information
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Product', 'Invoice', 'PurchaseOrder', 'Customer', 'Supplier', 'User', 'Batch', 'Transfer', 'Payment', 'Return', 'Other']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  },
  
  // Action Information
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    enum: ['view', 'approve', 'reject', 'update', 'delete', 'pay', 'reorder', 'acknowledge', 'other']
  },
  actionUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Action URL cannot exceed 500 characters']
  },
  actionData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Scheduling and Timing
  scheduledFor: Date,
  expiresAt: Date,
  
  // Retry and Failure Information
  retryCount: {
    type: Number,
    min: [0, 'Retry count cannot be negative'],
    default: 0
  },
  maxRetries: {
    type: Number,
    min: [0, 'Max retries cannot be negative'],
    default: 3
  },
  lastRetryAt: Date,
  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },
  
  // Template and Personalization
  template: {
    name: String,
    version: String,
    variables: mongoose.Schema.Types.Mixed
  },
  personalization: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    customData: mongoose.Schema.Types.Mixed
  },
  
  // Grouping and Batching
  groupId: {
    type: String,
    trim: true,
    maxlength: [100, 'Group ID cannot exceed 100 characters']
  },
  batchId: {
    type: String,
    trim: true,
    maxlength: [100, 'Batch ID cannot exceed 100 characters']
  },
  
  // Interaction Tracking
  interactions: [{
    action: {
      type: String,
      enum: ['viewed', 'clicked', 'dismissed', 'acted_upon'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Device and Channel Information
  deviceInfo: {
    type: String,
    enum: ['web', 'mobile', 'tablet', 'email', 'sms', 'api'],
    default: 'web'
  },
  channel: {
    type: String,
    enum: ['dashboard', 'email', 'mobile_app', 'sms', 'push_notification', 'webhook'],
    default: 'dashboard'
  },
  
  // Additional Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: [String],
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Indexes for performance
NotificationSchema.index({ notificationId: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1, createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ groupId: 1 });
NotificationSchema.index({ batchId: 1 });

// Compound indexes
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, priority: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });

// Text index for search
NotificationSchema.index({
  title: 'text',
  message: 'text',
  shortMessage: 'text'
});

// Pre-save middleware to generate notification ID
NotificationSchema.pre('save', async function(next) {
  if (this.isNew && !this.notificationId) {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.notificationId = `NOTIF-${timestamp}-${random}`;
      
      // Set short message if not provided
      if (!this.shortMessage && this.message) {
        this.shortMessage = this.message.length > 100 
          ? this.message.substring(0, 97) + '...' 
          : this.message;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Static methods
NotificationSchema.statics.findByRecipient = function(recipientId, limit = 50) {
  return this.find({ recipient: recipientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'username email')
    .populate('recipient', 'username email');
};

NotificationSchema.statics.findUnread = function(recipientId) {
  return this.find({ 
    recipient: recipientId, 
    isRead: false 
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'username email');
};

NotificationSchema.statics.findByType = function(type, limit = 100) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('recipient', 'username email');
};

NotificationSchema.statics.findByPriority = function(priority, limit = 100) {
  return this.find({ priority })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('recipient', 'username email');
};

NotificationSchema.statics.findPending = function() {
  return this.find({ 
    status: 'pending',
    $or: [
      { scheduledFor: { $lte: new Date() } },
      { scheduledFor: { $exists: false } }
    ]
  })
    .sort({ priority: -1, createdAt: 1 });
};

NotificationSchema.statics.findExpired = function() {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: { $nin: ['delivered', 'read', 'dismissed'] }
  });
};

NotificationSchema.statics.findByEntity = function(entityType, entityId) {
  return this.find({
    'relatedEntity.entityType': entityType,
    'relatedEntity.entityId': entityId
  })
    .sort({ createdAt: -1 })
    .populate('recipient', 'username email');
};

NotificationSchema.statics.getUnreadCount = function(recipientId) {
  return this.countDocuments({ 
    recipient: recipientId, 
    isRead: false 
  });
};

NotificationSchema.statics.markAllAsRead = function(recipientId) {
  return this.updateMany(
    { recipient: recipientId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date(),
      status: 'read'
    }
  );
};

NotificationSchema.statics.createSystemNotification = function(data) {
  return this.create({
    ...data,
    senderType: 'system',
    category: data.category || 'system'
  });
};

NotificationSchema.statics.createBulkNotification = function(recipientIds, notificationData) {
  const notifications = recipientIds.map(recipientId => ({
    ...notificationData,
    recipient: recipientId,
    groupId: notificationData.groupId || `BULK-${Date.now()}`
  }));
  
  return this.insertMany(notifications);
};

NotificationSchema.statics.cleanup = function(olderThanDays = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['read', 'dismissed'] }
  });
};

// Instance methods
NotificationSchema.methods.markAsRead = function(userId) {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  this.updatedBy = userId;
  
  // Add interaction
  this.interactions.push({
    action: 'viewed',
    timestamp: new Date()
  });
  
  return this.save();
};

NotificationSchema.methods.dismiss = function(userId) {
  this.isDismissed = true;
  this.dismissedAt = new Date();
  this.status = 'dismissed';
  this.updatedBy = userId;
  
  // Add interaction
  this.interactions.push({
    action: 'dismissed',
    timestamp: new Date()
  });
  
  return this.save();
};

NotificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

NotificationSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.lastRetryAt = new Date();
  this.retryCount += 1;
  return this.save();
};

NotificationSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

NotificationSchema.methods.addInteraction = function(action, metadata = {}) {
  this.interactions.push({
    action,
    timestamp: new Date(),
    metadata
  });
  
  return this.save();
};

NotificationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

NotificationSchema.methods.isScheduled = function() {
  return this.scheduledFor && this.scheduledFor > new Date();
};

// Virtuals
NotificationSchema.virtual('age').get(function() {
  const now = new Date();
  const diffTime = now - this.createdAt;
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  return diffHours;
});

NotificationSchema.virtual('isRecent').get(function() {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  return this.createdAt > oneHourAgo;
});

NotificationSchema.virtual('timeUntilExpiry').get(function() {
  if (!this.expiresAt) return null;
  
  const now = new Date();
  const diffTime = this.expiresAt - now;
  
  if (diffTime <= 0) return 'Expired';
  
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours} hours`;
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} days`;
});

NotificationSchema.virtual('hasInteractions').get(function() {
  return this.interactions.length > 0;
});

NotificationSchema.virtual('lastInteraction').get(function() {
  if (this.interactions.length === 0) return null;
  return this.interactions[this.interactions.length - 1];
});

// Ensure virtual fields are serialized
NotificationSchema.set('toJSON', { virtuals: true });

// Export model
const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
export default Notification;
