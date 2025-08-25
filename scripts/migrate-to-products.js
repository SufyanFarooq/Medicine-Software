const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'medical_shop';

async function migrateData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Check if medicines collection exists
    const collections = await db.listCollections().toArray();
    const hasMedicines = collections.some(col => col.name === 'medicines');
    
    if (!hasMedicines) {
      console.log('No medicines collection found. Migration not needed.');
      return;
    }
    
    // Get medicines data
    const medicines = await db.collection('medicines').find({}).toArray();
    console.log(`Found ${medicines.length} medicines to migrate`);
    
    // Create products collection and migrate data
    const products = medicines.map(medicine => ({
      name: medicine.name,
      code: medicine.code.replace('MED', 'PROD'),
      category: 'General', // Default category
      quantity: medicine.quantity || 0,
      purchasePrice: medicine.purchasePrice || 0,
      sellingPrice: medicine.sellingPrice || 0,
      expiryDate: medicine.expiryDate || null,
      batchNo: medicine.batchNo || null,
      brand: '', // New field
      description: '', // New field
      unit: 'pcs', // Default unit
      createdAt: medicine.createdAt || new Date(),
      updatedAt: new Date()
    }));
    
    // Insert products
    if (products.length > 0) {
      await db.collection('products').insertMany(products);
      console.log(`Successfully migrated ${products.length} products`);
    }
    
    // Create default categories if they don't exist
    const categories = await db.collection('categories').find({}).toArray();
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Electronics', description: 'Electronic devices and accessories', color: '#3B82F6' },
        { name: 'Clothing', description: 'Apparel and fashion items', color: '#EF4444' },
        { name: 'Food & Beverages', description: 'Food items and drinks', color: '#10B981' },
        { name: 'Home & Garden', description: 'Home improvement and garden supplies', color: '#8B5CF6' },
        { name: 'Sports', description: 'Sports equipment and accessories', color: '#F59E0B' },
        { name: 'Books', description: 'Books and publications', color: '#6B7280' },
        { name: 'Automotive', description: 'Automotive parts and accessories', color: '#374151' },
        { name: 'Beauty & Health', description: 'Beauty and health products', color: '#EC4899' },
        { name: 'Toys', description: 'Toys and games', color: '#F97316' },
        { name: 'Office Supplies', description: 'Office and stationery items', color: '#6366F1' }
      ];
      
      await db.collection('categories').insertMany(defaultCategories);
      console.log('Created default categories');
    }
    
    // Update settings if they exist
    const settings = await db.collection('settings').findOne({});
    if (settings) {
      await db.collection('settings').updateOne(
        {},
        {
          $set: {
            businessName: settings.shopName || 'My Business',
            businessType: 'Retail Store',
            email: '',
            website: '',
            taxRate: 0,
            hasExpiryDates: true,
            hasBatchNumbers: false,
            lowStockThreshold: 10,
            updatedAt: new Date()
          }
        }
      );
      console.log('Updated settings with new business fields');
    } else {
      // Create default settings
      const defaultSettings = {
        currency: '$',
        discountPercentage: 3,
        businessName: 'My Business',
        businessType: 'Retail Store',
        contactNumber: '',
        address: '',
        email: '',
        website: '',
        taxRate: 0,
        hasExpiryDates: true,
        hasBatchNumbers: false,
        lowStockThreshold: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('settings').insertOne(defaultSettings);
      console.log('Created default settings');
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrateData();
