const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function addDiscountToExisting() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const medicinesCollection = db.collection('medicines');
    
    // Find all medicines that don't have discountPercentage field
    const medicinesWithoutDiscount = await medicinesCollection.find({
      discountPercentage: { $exists: false }
    }).toArray();
    
    if (medicinesWithoutDiscount.length === 0) {
      console.log('All medicines already have discount percentage field');
      return;
    }
    
    console.log(`Found ${medicinesWithoutDiscount.length} medicines without discount percentage`);
    
    // Update all medicines to add discountPercentage field with default value 0
    const result = await medicinesCollection.updateMany(
      { discountPercentage: { $exists: false } },
      { $set: { discountPercentage: 0 } }
    );
    
    console.log(`Updated ${result.modifiedCount} medicines with default discount percentage`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
addDiscountToExisting(); 