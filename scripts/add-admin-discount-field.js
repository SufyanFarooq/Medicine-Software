const { MongoClient } = require('mongodb');

async function addAdminDiscountField() {
  try {
    console.log('🔧 Adding adminDiscount field to existing products...');
    
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_management';
    const MONGODB_DB = 'medical_shop';
    
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(MONGODB_DB);
    
    console.log('✅ Connected to MongoDB');
    
    // Update all existing products to add adminDiscount field
    const result = await db.collection('products').updateMany(
      { adminDiscount: { $exists: false } }, // Find products without adminDiscount field
      { $set: { adminDiscount: 0 } } // Set default value to 0
    );
    
    console.log(`✅ Updated ${result.modifiedCount} products with adminDiscount field`);
    
    // Verify the update
    const products = await db.collection('products').find({}).toArray();
    console.log(`📊 Total products: ${products.length}`);
    
    const productsWithDiscount = products.filter(p => p.adminDiscount !== undefined);
    console.log(`🎯 Products with adminDiscount: ${productsWithDiscount.length}`);
    
    // Show sample products
    console.log('\n📋 Sample products:');
    products.slice(0, 3).forEach(product => {
      console.log(`  - ${product.name}: adminDiscount = ${product.adminDiscount || 0}%`);
    });
    
    console.log('\n🎉 Admin discount field added successfully!');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error adding admin discount field:', error);
  } finally {
    process.exit(0);
  }
}

addAdminDiscountField();
