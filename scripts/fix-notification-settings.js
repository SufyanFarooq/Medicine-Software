const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine_software';

async function fixNotificationSettings() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
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
    
    // Check if settings exist
    const settings = await settingsCol.findOne({});
    if (settings) {
      console.log('Current settings structure:', Object.keys(settings));
      if (settings.notificationSettings) {
        console.log('Notification settings found:', settings.notificationSettings);
      }
    } else {
      console.log('No settings found, creating default...');
      const defaultSettings = {
        currency: '$',
        discountPercentage: 3,
        businessName: 'SALEEMI SURGICAL STORE',
        businessType: 'Retail Store',
        contactNumber: '',
        address: '',
        email: '',
        website: '',
        taxRate: 0,
        hasExpiryDates: true,
        hasBatchNumbers: false,
        lowStockThreshold: 10,
        notificationSettings: {
          lowStockThreshold: 20,
          expiryWarningDays: 30,
          criticalExpiryDays: 7,
          emailNotifications: true,
          inAppNotifications: true,
          notificationFrequency: 'realtime',
          autoCleanupDays: 30,
          stockoutAlert: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await settingsCol.insertOne(defaultSettings);
      console.log('Default settings created successfully');
    }
    
    console.log('✅ Notification settings fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing notification settings:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

fixNotificationSettings();
