const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function seedInventory() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const medicinesCollection = db.collection('medicines');
    const inventoryCollection = db.collection('inventory_transactions');
    
    // Get all medicines
    const medicines = await medicinesCollection.find({}).toArray();
    console.log(`Found ${medicines.length} medicines`);
    
    // Clear existing inventory transactions
    await inventoryCollection.deleteMany({});
    console.log('Cleared existing inventory transactions');
    
    // Create inventory transactions for each medicine
    const inventoryTransactions = medicines.map(medicine => ({
      medicineId: medicine._id,
      type: 'inflow', // This represents inventory being added
      quantity: medicine.quantity,
      unitPrice: medicine.purchasePrice,
      totalAmount: medicine.quantity * medicine.purchasePrice,
      batchNo: medicine.batchNo,
      expiryDate: medicine.expiryDate,
      supplier: 'Initial Stock',
      notes: 'Initial inventory from seed data',
      referenceType: 'creation',
      referenceId: medicine._id,
      date: medicine.createdAt,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    // Insert inventory transactions
    const result = await inventoryCollection.insertMany(inventoryTransactions);
    console.log(`Inserted ${result.insertedCount} inventory transactions`);
    
    console.log('Inventory seeding completed successfully!');
    console.log('Now the Inventory Report will show the actual inventory added.');
    
  } catch (error) {
    console.error('Error seeding inventory:', error);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedInventory();
