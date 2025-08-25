const { connectToDatabase } = require('../lib/mongodb');

async function updateSettingsWithNotifications() {
  try {
    const { db } = await connectToDatabase();
    const settingsCol = db.collection('settings');
    
    // Update existing settings to include notification settings
    const result = await settingsCol.updateMany(
      { notificationSettings: { $exists: false } },
      {
        $set: {
          notificationSettings: {
            lowStockThreshold: 20,
            expiryWarningDays: 30,
            criticalExpiryDays: 7,
            emailNotifications: true,
            inAppNotifications: true,
            notificationFrequency: 'realtime',
            autoCleanupDays: 30,
            stockoutAlert: true
          }
        }
      }
    );
    
    console.log(`Updated ${result.modifiedCount} settings documents with notification settings`);
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

async function main() {
  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');
    
    // Clear existing notifications
    await notificationsCol.deleteMany({});
    console.log('Cleared existing notifications');
    
    // Create sample notifications
    const sampleNotifications = [
      {
        type: 'LOW_STOCK',
        priority: 'high',
        title: 'Low Stock Alert: Paracetamol 500mg',
        message: 'Paracetamol 500mg (PAR001) is running low on stock. Current: 15 units, Minimum: 20 units',
        entityType: 'product',
        entityId: 'sample_product_1',
        userId: null,
        isRead: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      },
      {
        type: 'EXPIRY_WARNING',
        priority: 'medium',
        title: 'Expiry Warning: Amoxicillin 250mg',
        message: 'Amoxicillin 250mg (AMX001) expires in 25 days. Consider discounting or returning to supplier',
        entityType: 'product',
        entityId: 'sample_product_2',
        userId: null,
        isRead: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        type: 'STOCKOUT',
        priority: 'critical',
        title: 'Stockout Alert: Ibuprofen 400mg',
        message: 'Ibuprofen 400mg (IBU001) is completely out of stock. Reorder immediately',
        entityType: 'product',
        entityId: 'sample_product_3',
        userId: null,
        isRead: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      },
      {
        type: 'BATCH_EXPIRY',
        priority: 'high',
        title: 'Batch Expiry: Vitamin C 500mg',
        message: 'Batch B001 of Vitamin C 500mg expires in 10 days. Quantity: 50 units',
        entityType: 'product',
        entityId: 'sample_product_4',
        userId: null,
        isRead: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      },
      {
        type: 'SYSTEM_ALERT',
        priority: 'low',
        title: 'System Maintenance Notice',
        message: 'Scheduled maintenance will occur tonight at 2:00 AM. Brief service interruption expected',
        entityType: 'system',
        entityId: null,
        userId: null,
        isRead: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    ];
    
    const result = await notificationsCol.insertMany(sampleNotifications);
    console.log(`Created ${result.insertedCount} sample notifications`);
    
    // Update existing settings to include notification settings
    await updateSettingsWithNotifications();
    
    console.log('✅ Notification system setup complete!');
    console.log('📱 Check the notification bell in the top bar');
    console.log('⚙️  Configure settings at /settings/notifications');
    
  } catch (error) {
    console.error('❌ Error setting up notifications:', error);
  } finally {
    process.exit(0);
  }
}

main();
