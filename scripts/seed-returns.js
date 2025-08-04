const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function seedReturns() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const returnsCollection = db.collection('returns');
    const medicinesCollection = db.collection('medicines');
    
    // Get medicines for creating realistic returns
    const medicines = await medicinesCollection.find({}).toArray();
    
    if (medicines.length === 0) {
      console.log('No medicines found. Please run seed-data.js first.');
      return;
    }
    
    // Sample returns data
    const sampleReturns = [];
    
    const returnReasons = [
      'Expired',
      'Damaged',
      'Wrong Medicine',
      'Allergic Reaction',
      'Side Effects',
      'Not Needed',
      'Other'
    ];
    
    // Generate 15 sample returns
    for (let i = 1; i <= 15; i++) {
      const returnNumber = `RET${String(i).padStart(6, '0')}`;
      const medicine = medicines[Math.floor(Math.random() * medicines.length)];
      const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
      const returnValue = medicine.sellingPrice * quantity * 0.8; // 80% of selling price
      const reason = returnReasons[Math.floor(Math.random() * returnReasons.length)];
      
      // Generate random date within last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      sampleReturns.push({
        returnNumber,
        medicineId: medicine._id,
        medicineName: medicine.name,
        medicineCode: medicine.code,
        quantity,
        reason,
        notes: `Sample return note for ${medicine.name}`,
        returnValue,
        date,
        status: 'Approved',
        createdAt: date,
        updatedAt: date,
        createdBy: 'admin'
      });
    }
    
    // Clear existing returns
    await returnsCollection.deleteMany({});
    console.log('Cleared existing returns');
    
    // Insert sample returns
    const result = await returnsCollection.insertMany(sampleReturns);
    console.log(`Inserted ${result.insertedCount} sample returns`);
    
    console.log('Sample returns seeded successfully!');
    console.log('You can now view the returns in the application.');
    
  } catch (error) {
    console.error('Error seeding returns:', error);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedReturns(); 