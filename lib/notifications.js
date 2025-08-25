import { connectToDatabase } from './mongodb';

// Notification types
export const NOTIFICATION_TYPES = {
  LOW_STOCK: 'LOW_STOCK',
  EXPIRY_WARNING: 'EXPIRY_WARNING',
  STOCKOUT: 'STOCKOUT',
  BATCH_EXPIRY: 'BATCH_EXPIRY',
  SYSTEM_ALERT: 'SYSTEM_ALERT'
};

// Notification priorities
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Create notification
export async function createNotification(data) {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    const notification = {
      type: data.type,
      priority: data.priority || PRIORITIES.MEDIUM,
      title: data.title,
      message: data.message,
      entityType: data.entityType, // 'product', 'batch', 'warehouse'
      entityId: data.entityId,
      userId: data.userId, // null for all users
      isRead: false,
      isEmailSent: false,
      createdAt: new Date(),
      expiresAt: data.expiresAt || null
    };
    
    const result = await notificationsCol.insertOne(notification);
    return result.insertedId;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Get notifications for user
export async function getUserNotifications(userId, limit = 50) {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    const notifications = await notificationsCol.find({
      $or: [
        { userId: userId },
        { userId: null } // Global notifications
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    await notificationsCol.updateOne(
      { _id: notificationId },
      { $set: { isRead: true } }
    );
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read for user
export async function markAllNotificationsAsRead(userId) {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    await notificationsCol.updateMany(
      { 
        $or: [
          { userId: userId },
          { userId: null }
        ],
        isRead: false
      },
      { $set: { isRead: true } }
    );
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Delete old notifications
export async function cleanupOldNotifications(daysOld = 30) {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await notificationsCol.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });
    
    console.log(`Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    throw error;
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId) {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    const count = await notificationsCol.countDocuments({
      $or: [
        { userId: userId },
        { userId: null }
      ],
      isRead: false
    });
    
    return count;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
}

// Low stock alert functions
export async function checkLowStockAlerts() {
  try {
    const { db } = await connectToDatabase();
    const productsCol = db.collection('products');
    const notificationsCol = db.collection('notifications');
    
    // Get products with low stock
    const lowStockProducts = await productsCol.find({
      quantity: { $lte: '$minStockLevel' }
    }).toArray();
    
    for (const product of lowStockProducts) {
      // Check if notification already exists
      const existingNotification = await notificationsCol.findOne({
        type: NOTIFICATION_TYPES.LOW_STOCK,
        entityType: 'product',
        entityId: product._id,
        isRead: false
      });
      
      if (!existingNotification) {
        // Create low stock notification
        await createNotification({
          type: NOTIFICATION_TYPES.LOW_STOCK,
          priority: product.quantity === 0 ? PRIORITIES.CRITICAL : PRIORITIES.HIGH,
          title: `Low Stock Alert: ${product.name}`,
          message: `${product.name} (${product.code}) is running low on stock. Current: ${product.quantity} ${product.unit}, Minimum: ${product.minStockLevel} ${product.unit}`,
          entityType: 'product',
          entityId: product._id,
          userId: null // Global notification
        });
      }
    }
    
    return lowStockProducts.length;
  } catch (error) {
    console.error('Error checking low stock alerts:', error);
    throw error;
  }
}

// Expiry warning alerts
export async function checkExpiryAlerts() {
  try {
    const { db } = await connectToDatabase();
    const batchesCol = db.collection('batches');
    const notificationsCol = db.collection('notifications');
    
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    // Get batches expiring soon
    const expiringBatches = await batchesCol.aggregate([
      {
        $match: {
          status: 'active',
          remainingQuantity: { $gt: 0 },
          expiryDate: { $lte: thirtyDaysFromNow }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]).toArray();
    
    for (const batch of expiringBatches) {
      const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate) - today) / (1000 * 60 * 60 * 24));
      
      // Check if notification already exists
      const existingNotification = await notificationsCol.findOne({
        type: NOTIFICATION_TYPES.EXPIRY_WARNING,
        entityType: 'batch',
        entityId: batch._id,
        isRead: false
      });
      
      if (!existingNotification) {
        const priority = daysUntilExpiry <= 7 ? PRIORITIES.CRITICAL : 
                        daysUntilExpiry <= 15 ? PRIORITIES.HIGH : 
                        daysUntilExpiry <= 30 ? PRIORITIES.MEDIUM : PRIORITIES.LOW;
        
        await createNotification({
          type: NOTIFICATION_TYPES.EXPIRY_WARNING,
          priority,
          title: `Expiry Warning: ${batch.product.name}`,
          message: `Batch ${batch.batchNumber} of ${batch.product.name} expires in ${daysUntilExpiry} days. Quantity remaining: ${batch.remainingQuantity} ${batch.product.unit}`,
          entityType: 'batch',
          entityId: batch._id,
          userId: null,
          expiresAt: batch.expiryDate
        });
      }
    }
    
    return expiringBatches.length;
  } catch (error) {
    console.error('Error checking expiry alerts:', error);
    throw error;
  }
}

// Send email notification (placeholder - integrate with your email service)
export async function sendEmailNotification(notification) {
  try {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log('Email notification would be sent:', {
      to: 'admin@yourbusiness.com',
      subject: notification.title,
      body: notification.message
    });
    
    // Mark as email sent
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    await notificationsCol.updateOne(
      { _id: notification._id },
      { $set: { isEmailSent: true } }
    );
    
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

// Process all pending notifications
export async function processNotifications() {
  try {
    // Check low stock
    const lowStockCount = await checkLowStockAlerts();
    
    // Check expiry warnings
    const expiryCount = await checkExpiryAlerts();
    
    console.log(`Processed notifications: ${lowStockCount} low stock, ${expiryCount} expiry warnings`);
    
    return { lowStockCount, expiryCount };
  } catch (error) {
    console.error('Error processing notifications:', error);
    throw error;
  }
}
