const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'medical_shop';

async function cleanDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    console.log('🧹 Starting Database Cleanup...');
    
    // Step 1: Remove old collections
    console.log('\n📋 Step 1: Removing old collections...');
    
    const collectionsToRemove = ['medicines', 'old_products', 'temp_data'];
    for (const collectionName of collectionsToRemove) {
      try {
        await db.collection(collectionName).drop();
        console.log(`✅ Removed collection: ${collectionName}`);
      } catch (error) {
        console.log(`ℹ️ Collection ${collectionName} not found or already removed`);
      }
    }
    
    // Step 2: Clean products collection
    console.log('\n📦 Step 2: Cleaning products collection...');
    
    const productsCollection = db.collection('products');
    const existingProducts = await productsCollection.find({}).toArray();
    
    if (existingProducts.length > 0) {
      // Remove all existing products
      await productsCollection.deleteMany({});
      console.log(`🗑️ Removed ${existingProducts.length} existing products`);
    }
    
    // Step 3: Clean categories collection
    console.log('\n🏷️ Step 3: Cleaning categories collection...');
    
    const categoriesCollection = db.collection('categories');
    await categoriesCollection.deleteMany({});
    console.log('🗑️ Removed existing categories');
    
    // Step 4: Clean invoices collection
    console.log('\n🧾 Step 4: Cleaning invoices collection...');
    
    const invoicesCollection = db.collection('invoices');
    await invoicesCollection.deleteMany({});
    console.log('🗑️ Removed existing invoices');
    
    // Step 5: Clean inventory collection
    console.log('\n📊 Step 5: Cleaning inventory collection...');
    
    const inventoryCollection = db.collection('inventory');
    await inventoryCollection.deleteMany({});
    console.log('🗑️ Removed existing inventory records');
    
    // Step 6: Clean returns collection
    console.log('\n🔄 Step 6: Cleaning returns collection...');
    
    const returnsCollection = db.collection('returns');
    await returnsCollection.deleteMany({});
    console.log('🗑️ Removed existing returns');
    
    // Step 7: Clean activities collection
    console.log('\n📝 Step 7: Cleaning activities collection...');
    
    const activitiesCollection = db.collection('activities');
    await activitiesCollection.deleteMany({});
    console.log('🗑️ Removed existing activities');
    
    // Step 8: Create fresh categories
    console.log('\n🏷️ Step 8: Creating fresh categories...');
    
    const freshCategories = [
      { 
        name: 'General', 
        description: 'General products and items', 
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Electronics', 
        description: 'Electronic devices and accessories', 
        color: '#10B981',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Clothing', 
        description: 'Apparel and fashion items', 
        color: '#EF4444',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Food & Beverages', 
        description: 'Food items and drinks', 
        color: '#F59E0B',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Home & Garden', 
        description: 'Home improvement and garden supplies', 
        color: '#8B5CF6',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Sports', 
        description: 'Sports equipment and accessories', 
        color: '#EC4899',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Books', 
        description: 'Books and publications', 
        color: '#6B7280',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Automotive', 
        description: 'Automotive parts and accessories', 
        color: '#374151',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Beauty & Health', 
        description: 'Beauty and health products', 
        color: '#F97316',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Toys', 
        description: 'Toys and games', 
        color: '#6366F1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        name: 'Office Supplies', 
        description: 'Office and stationery items', 
        color: '#059669',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await categoriesCollection.insertMany(freshCategories);
    console.log(`✅ Created ${freshCategories.length} fresh categories`);
    
    // Step 9: Create fresh settings
    console.log('\n⚙️ Step 9: Creating fresh settings...');
    
    const freshSettings = {
      currency: 'Rs',
      discountPercentage: 3,
      businessName: 'SALEEMI SURGICAL STORE JOHAR TOWN',
      businessType: 'Surgical Store',
      contactNumber: '0321xxxxxxxxx',
      address: 'N block Johar town Lahore',
      email: '',
      website: '',
      taxRate: 0,
      hasExpiryDates: true,
      hasBatchNumbers: true,
      lowStockThreshold: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('settings').deleteMany({});
    await db.collection('settings').insertOne(freshSettings);
    console.log('✅ Created fresh business settings');
    
    // Step 10: Create sample products (clean data)
    console.log('\n📦 Step 10: Creating sample products...');
    
    const sampleProducts = [
      {
        name: 'Ibuprofen 400mg',
        code: 'PROD001',
        category: 'General',
        quantity: 1000,
        purchasePrice: 0.45,
        sellingPrice: 0.90,
        totalBuyingPrice: 450.00,
        expiryDate: new Date('2025-12-31'),
        batchNo: 'BATCH001',
        brand: 'Generic',
        description: 'Pain relief medication',
        unit: 'pcs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Aspirin 100mg',
        code: 'PROD002',
        category: 'General',
        quantity: 500,
        purchasePrice: 0.25,
        sellingPrice: 0.50,
        totalBuyingPrice: 125.00,
        expiryDate: new Date('2025-10-15'),
        batchNo: 'BATCH002',
        brand: 'Generic',
        description: 'Pain relief and blood thinner',
        unit: 'pcs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Diclofenac 50mg',
        code: 'PROD003',
        category: 'General',
        quantity: 300,
        purchasePrice: 0.80,
        sellingPrice: 1.80,
        totalBuyingPrice: 240.00,
        expiryDate: new Date('2025-08-20'),
        batchNo: 'BATCH003',
        brand: 'Generic',
        description: 'Anti-inflammatory medication',
        unit: 'pcs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Naproxen 250mg',
        code: 'PROD004',
        category: 'General',
        quantity: 200,
        purchasePrice: 1.20,
        sellingPrice: 2.40,
        totalBuyingPrice: 240.00,
        expiryDate: new Date('2025-09-15'),
        batchNo: 'BATCH004',
        brand: 'Generic',
        description: 'Pain relief and anti-inflammatory',
        unit: 'pcs',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Amoxicillin 250mg',
        code: 'PROD005',
        category: 'General',
        quantity: 150,
        purchasePrice: 20.00,
        sellingPrice: 25.00,
        totalBuyingPrice: 3000.00,
        expiryDate: new Date('2025-06-30'),
        batchNo: 'BATCH005',
        brand: 'Generic',
        description: 'Antibiotic medication',
        unit: 'pcs',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await productsCollection.insertMany(sampleProducts);
    console.log(`✅ Created ${sampleProducts.length} sample products`);
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('✅ Removed old collections');
    console.log('✅ Cleaned all data');
    console.log('✅ Created fresh categories');
    console.log('✅ Created fresh settings');
    console.log('✅ Created sample products');
    console.log('\n🚀 Your database is now ready for the new system!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanDatabase();
