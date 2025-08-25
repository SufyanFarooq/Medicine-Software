const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicine_software';

async function createSampleProducts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const productsCol = db.collection('products');
    
    // Check if products already exist
    const existingProducts = await productsCol.countDocuments();
    if (existingProducts > 0) {
      console.log(`Found ${existingProducts} existing products. Skipping creation.`);
      return;
    }
    
    // Sample products data
    const sampleProducts = [
      {
        name: 'Paracetamol 500mg',
        code: 'PAR500',
        barcode: '1234567890123',
        category: 'Pain Relief',
        description: 'Pain reliever and fever reducer',
        unit: 'Tablets',
        quantity: 1000,
        purchasePrice: 2.50,
        sellingPrice: 5.00,
        adminDiscount: 10,
        minStockLevel: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Amoxicillin 250mg',
        code: 'AMX250',
        barcode: '1234567890124',
        category: 'Antibiotics',
        description: 'Broad-spectrum antibiotic',
        unit: 'Capsules',
        quantity: 500,
        purchasePrice: 8.00,
        sellingPrice: 15.00,
        adminDiscount: 5,
        minStockLevel: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Vitamin C 1000mg',
        code: 'VITC1000',
        barcode: '1234567890125',
        category: 'Vitamins',
        description: 'Immune system support',
        unit: 'Tablets',
        quantity: 800,
        purchasePrice: 1.50,
        sellingPrice: 3.50,
        adminDiscount: 15,
        minStockLevel: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Omeprazole 20mg',
        code: 'OMP20',
        barcode: '1234567890126',
        category: 'Gastrointestinal',
        description: 'Acid reflux medication',
        unit: 'Capsules',
        quantity: 300,
        purchasePrice: 12.00,
        sellingPrice: 25.00,
        adminDiscount: 8,
        minStockLevel: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Ibuprofen 400mg',
        code: 'IBU400',
        barcode: '1234567890127',
        category: 'Pain Relief',
        description: 'Anti-inflammatory pain reliever',
        unit: 'Tablets',
        quantity: 1200,
        purchasePrice: 1.80,
        sellingPrice: 4.00,
        adminDiscount: 12,
        minStockLevel: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert sample products
    const result = await productsCol.insertMany(sampleProducts);
    console.log(`Created ${result.insertedCount} sample products:`);
    
    sampleProducts.forEach(product => {
      console.log(`- ${product.name} (${product.code}): ${product.quantity} ${product.unit} at Rs${product.purchasePrice}`);
    });
    
    console.log('\nSample products created successfully!');
    
  } catch (error) {
    console.error('Error creating sample products:', error);
  } finally {
    await client.close();
  }
}

// Run the creation
createSampleProducts().catch(console.error);
