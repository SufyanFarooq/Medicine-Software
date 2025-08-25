const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'medical_shop';

async function fixInflowRecords() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔌 Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    console.log('🔧 Fixing missing inflow records for existing products...');
    
    // Get all products
    const productsCollection = db.collection('products');
    const inventoryCollection = db.collection('inventory');
    
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Found ${products.length} products to process`);
    
    let fixedCount = 0;
    
    for (const product of products) {
      // Check if inflow record already exists for this product
      const existingInflow = await inventoryCollection.findOne({
        productId: product._id,
        type: 'inflow',
        referenceType: 'creation'
      });
      
      if (!existingInflow && product.quantity > 0) {
        // Create inflow record for initial stock
        const inflowData = {
          productId: product._id,
          type: 'inflow',
          quantity: product.quantity,
          unitPrice: product.purchasePrice || 0,
          totalAmount: (product.purchasePrice || 0) * product.quantity,
          batchNo: product.batchNo || null,
          expiryDate: product.expiryDate || null,
          supplier: 'Initial Stock',
          notes: 'Initial product stock (retroactive fix)',
          referenceType: 'creation',
          referenceId: product._id,
          date: product.createdAt || new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await inventoryCollection.insertOne(inflowData);
        console.log(`✅ Created inflow record for ${product.name} (${product.quantity} pcs)`);
        fixedCount++;
      } else if (existingInflow) {
        console.log(`ℹ️ Inflow record already exists for ${product.name}`);
      } else {
        console.log(`⚠️ Skipping ${product.name} (quantity: ${product.quantity})`);
      }
    }
    
    console.log(`\n🎉 Inflow records fix completed!`);
    console.log(`📊 Summary:`);
    console.log(`✅ Total products processed: ${products.length}`);
    console.log(`✅ New inflow records created: ${fixedCount}`);
    console.log(`✅ Existing records found: ${products.length - fixedCount}`);
    
    // Verify the fix
    const totalInflowRecords = await inventoryCollection.countDocuments({ type: 'inflow' });
    console.log(`📈 Total inflow records in inventory: ${totalInflowRecords}`);
    
  } catch (error) {
    console.error('❌ Error fixing inflow records:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixInflowRecords();
