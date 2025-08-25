const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine_software';

async function initializeBatches() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const productsCol = db.collection('products');
    const batchesCol = db.collection('batches');
    
    // Get some products to create batches for
    const products = await productsCol.find({}).limit(5).toArray();
    
    if (products.length === 0) {
      console.log('No products found. Please add some products first.');
      return;
    }
    
    console.log(`Found ${products.length} products to create batches for`);
    
    // Create sample batches for each product
    for (const product of products) {
      const today = new Date();
      
      // Create 2-3 batches per product with different expiry dates
      const batchCount = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < batchCount; i++) {
        const batchNumber = `B${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        const quantity = Math.floor(Math.random() * 100) + 50;
        const purchasePrice = product.purchasePrice * (0.8 + Math.random() * 0.4); // Vary price by ±20%
        
        // Create expiry dates: 30 days, 90 days, 180 days from now
        const expiryDays = [30, 90, 180][i % 3];
        const expiryDate = new Date(today.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
        
        // Manufacturing date: 30-60 days before expiry
        const manufacturingDate = new Date(expiryDate.getTime() - ((30 + Math.random() * 30) * 24 * 60 * 60 * 1000));
        
        const batch = {
          productId: new ObjectId(product._id),
          batchNumber,
          quantity: parseFloat(quantity),
          remainingQuantity: parseFloat(quantity),
          purchasePrice: parseFloat(purchasePrice.toFixed(2)),
          expiryDate,
          manufacturingDate,
          supplier: `Supplier ${String.fromCharCode(65 + i)}`, // A, B, C...
          notes: `Sample batch ${i + 1} for testing`,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await batchesCol.insertOne(batch);
        console.log(`Created batch ${batchNumber} for ${product.name}: ${quantity} units, expires ${expiryDate.toLocaleDateString()}`);
      }
    }
    
    console.log('Batch initialization completed successfully!');
    
  } catch (error) {
    console.error('Error initializing batches:', error);
  } finally {
    await client.close();
  }
}

// Run the initialization
initializeBatches().catch(console.error);
