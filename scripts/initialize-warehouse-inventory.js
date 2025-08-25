const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/business_management';

async function initializeWarehouseInventory() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Get all warehouses
    const warehouses = await db.collection('warehouses').find({ isActive: true }).toArray();
    console.log(`Found ${warehouses.length} active warehouses`);
    
    if (warehouses.length === 0) {
      console.log('No warehouses found. Please create warehouses first.');
      return;
    }
    
    // Get all products
    const products = await db.collection('products').find({}).toArray();
    console.log(`Found ${products.length} products`);
    
    if (products.length === 0) {
      console.log('No products found. Please create products first.');
      return;
    }
    
    // Get existing inventory records
    const existingInventory = await db.collection('inventory').find({}).toArray();
    console.log(`Found ${existingInventory.length} existing inventory records`);
    
    // Create a map of existing inventory records
    const existingInventoryMap = new Map();
    existingInventory.forEach(record => {
      const key = `${record.warehouseId}_${record.productId}`;
      existingInventoryMap.set(key, record);
    });
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // For each warehouse, create inventory records for all products
    for (const warehouse of warehouses) {
      console.log(`\nProcessing warehouse: ${warehouse.name} (${warehouse.code})`);
      
      for (const product of products) {
        const inventoryKey = `${warehouse._id}_${product._id}`;
        
        if (existingInventoryMap.has(inventoryKey)) {
          console.log(`  ✓ Inventory record already exists for ${product.name}`);
          continue;
        }
        
        // Determine initial quantity for this warehouse
        let initialQuantity = 0;
        
        if (warehouse.type === 'main_warehouse') {
          // Main warehouse gets most of the stock
          initialQuantity = Math.floor(product.quantity * 0.7); // 70% of total stock
        } else if (warehouse.type === 'branch_office') {
          // Branch offices get some stock
          initialQuantity = Math.floor(product.quantity * 0.2); // 20% of total stock
        } else if (warehouse.type === 'retail_store') {
          // Retail stores get minimal stock
          initialQuantity = Math.floor(product.quantity * 0.1); // 10% of total stock
        } else {
          // Other warehouse types get minimal stock
          initialQuantity = Math.floor(product.quantity * 0.05); // 5% of total stock
        }
        
        // Ensure minimum quantity for products with stock
        if (product.quantity > 0 && initialQuantity === 0) {
          initialQuantity = 1;
        }
        
        // Create inventory record
        const inventoryRecord = {
          warehouseId: warehouse._id,
          productId: product._id,
          quantity: initialQuantity,
          lastUpdated: new Date(),
          createdAt: new Date(),
          notes: 'Auto-initialized from product quantity'
        };
        
        try {
          await db.collection('inventory').insertOne(inventoryRecord);
          createdCount++;
          console.log(`  ✓ Created inventory record for ${product.name}: ${initialQuantity} units`);
        } catch (error) {
          console.error(`  ✗ Failed to create inventory record for ${product.name}:`, error.message);
        }
      }
    }
    
    // Update product quantities to reflect distributed inventory
    console.log('\nUpdating product quantities...');
    for (const product of products) {
      const totalInventoryQuantity = await db.collection('inventory')
        .aggregate([
          { $match: { productId: product._id } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ])
        .toArray();
      
      const newTotalQuantity = totalInventoryQuantity.length > 0 ? totalInventoryQuantity[0].total : 0;
      
      if (newTotalQuantity !== product.quantity) {
        try {
          await db.collection('products').updateOne(
            { _id: product._id },
            { $set: { quantity: newTotalQuantity, updatedAt: new Date() } }
          );
          updatedCount++;
          console.log(`  ✓ Updated ${product.name}: ${product.quantity} → ${newTotalQuantity}`);
        } catch (error) {
          console.error(`  ✗ Failed to update ${product.name}:`, error.message);
        }
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Created ${createdCount} new inventory records`);
    console.log(`Updated ${updatedCount} product quantities`);
    console.log('Warehouse inventory initialization completed!');
    
  } catch (error) {
    console.error('Error initializing warehouse inventory:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  initializeWarehouseInventory()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeWarehouseInventory };
