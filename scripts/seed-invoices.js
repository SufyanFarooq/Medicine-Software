const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function seedInvoices() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const invoicesCollection = db.collection('invoices');
    const medicinesCollection = db.collection('medicines');
    
    // Get medicines for creating realistic invoices
    const medicines = await medicinesCollection.find({}).toArray();
    
    if (medicines.length === 0) {
      console.log('No medicines found. Please run seed-data.js first.');
      return;
    }
    
    // Sample invoices data
    const sampleInvoices = [];
    
    // Generate 20 sample invoices
    for (let i = 1; i <= 20; i++) {
      const invoiceNumber = `INV${String(i).padStart(6, '0')}`;
      const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items per invoice
      const items = [];
      let subtotal = 0;
      
      // Select random medicines for this invoice
      const selectedMedicines = [];
      for (let j = 0; j < numItems; j++) {
        const medicine = medicines[Math.floor(Math.random() * medicines.length)];
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 quantity
        const total = medicine.sellingPrice * quantity;
        
        items.push({
          medicineId: medicine._id,
          name: medicine.name,
          code: medicine.code,
          quantity: quantity,
          price: medicine.sellingPrice,
          total: total
        });
        
        subtotal += total;
        selectedMedicines.push({ medicine, quantity });
      }
      
      // Apply 3% discount (admin default)
      const discount = subtotal * 0.03;
      const total = subtotal - discount;
      
      // Generate random date within last 30 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      sampleInvoices.push({
        invoiceNumber,
        items,
        subtotal,
        discount,
        total,
        date,
        createdAt: date,
        updatedAt: date,
        createdBy: 'admin'
      });
    }
    
    // Clear existing invoices
    await invoicesCollection.deleteMany({});
    console.log('Cleared existing invoices');
    
    // Insert sample invoices
    const result = await invoicesCollection.insertMany(sampleInvoices);
    console.log(`Inserted ${result.insertedCount} sample invoices`);
    
    console.log('Sample invoices seeded successfully!');
    console.log('You can now view the invoices in the application.');
    
  } catch (error) {
    console.error('Error seeding invoices:', error);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedInvoices(); 