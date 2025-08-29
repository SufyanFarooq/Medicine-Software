const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'crane_management_db';

async function testSettings() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const settingsCollection = db.collection('settings');
    
    // Check if settings exist
    const settings = await settingsCollection.findOne({});
    console.log('Current settings:', settings);
    
    if (!settings) {
      console.log('No settings found, creating default settings...');
      const defaultSettings = {
        currency: '$',
        discountPercentage: 3,
        shopName: 'Medical Shop',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await settingsCollection.insertOne(defaultSettings);
      console.log('Default settings created');
    } else {
      console.log('Settings found with discount percentage:', settings.discountPercentage);
    }
    
  } catch (error) {
    console.error('Error testing settings:', error);
  } finally {
    await client.close();
  }
}

testSettings(); 