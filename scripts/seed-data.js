const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function seedData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const medicinesCollection = db.collection('medicines');
    
    // Sample medicine data
    const sampleMedicines = [
      {
        name: 'Paracetamol 500mg',
        code: 'MED001',
        quantity: 100,
        purchasePrice: 0.50,
        sellingPrice: 1.00,
        expiryDate: new Date('2025-12-31'),
        batchNo: 'BATCH001',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ibuprofen 400mg',
        code: 'MED002',
        quantity: 75,
        purchasePrice: 0.75,
        sellingPrice: 1.50,
        expiryDate: new Date('2025-10-15'),
        batchNo: 'BATCH002',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Amoxicillin 250mg',
        code: 'MED003',
        quantity: 50,
        purchasePrice: 2.00,
        sellingPrice: 4.00,
        expiryDate: new Date('2024-08-20'),
        batchNo: 'BATCH003',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Omeprazole 20mg',
        code: 'MED004',
        quantity: 30,
        purchasePrice: 1.50,
        sellingPrice: 3.00,
        expiryDate: new Date('2025-06-30'),
        batchNo: 'BATCH004',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Cetirizine 10mg',
        code: 'MED005',
        quantity: 60,
        purchasePrice: 0.80,
        sellingPrice: 1.60,
        expiryDate: new Date('2025-09-15'),
        batchNo: 'BATCH005',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    // Clear existing data
    await medicinesCollection.deleteMany({});
    console.log('Cleared existing medicines');
    
    // Insert sample data
    const result = await medicinesCollection.insertMany(sampleMedicines);
    console.log(`Inserted ${result.insertedCount} sample medicines`);
    
    console.log('Sample data seeded successfully!');
    console.log('You can now start the application and see the sample medicines.');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedData(); 