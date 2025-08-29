const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'crane_management_db';

async function seedInvoices() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const invoicesCollection = db.collection('invoices');
    const cranesCollection = db.collection('cranes');
    
    // Get available cranes for reference
    const cranes = await cranesCollection.find({}).toArray();
    
    if (cranes.length === 0) {
      console.log('No cranes found. Please run seed-data.js first.');
      return;
    }
    
    // Sample invoice data for crane rentals
    const sampleInvoices = [
      {
        invoiceNumber: 'INV-2024-001',
        clientName: 'Dubai Construction Co.',
        clientEmail: 'accounts@dubaiconstruction.ae',
        clientPhone: '+971-50-111-1111',
        projectName: 'Dubai Marina Tower',
        projectLocation: 'Dubai Marina',
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        status: 'Paid',
        craneDetails: [
          {
            craneId: cranes[0]._id,
            craneName: cranes[0].name,
            craneCode: cranes[0].code,
            rentalDays: 15,
            dailyRate: cranes[0].dailyRate,
            totalAmount: cranes[0].dailyRate * 15
          }
        ],
        subtotal: cranes[0].dailyRate * 15,
        taxRate: 5,
        taxAmount: (cranes[0].dailyRate * 15) * 0.05,
        totalAmount: (cranes[0].dailyRate * 15) * 1.05,
        paymentMethod: 'Bank Transfer',
        notes: 'Crane rental for foundation work',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-002',
        clientName: 'Abu Dhabi Infrastructure Ltd.',
        clientEmail: 'finance@adinfrastructure.ae',
        clientPhone: '+971-50-222-2222',
        projectName: 'Abu Dhabi Central Station',
        projectLocation: 'Abu Dhabi Downtown',
        invoiceDate: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        status: 'Pending',
        craneDetails: [
          {
            craneId: cranes[1]._id,
            craneName: cranes[1].name,
            craneCode: cranes[1].code,
            rentalDays: 20,
            dailyRate: cranes[1].dailyRate,
            totalAmount: cranes[1].dailyRate * 20
          }
        ],
        subtotal: cranes[1].dailyRate * 20,
        taxRate: 5,
        taxAmount: (cranes[1].dailyRate * 20) * 0.05,
        totalAmount: (cranes[1].dailyRate * 20) * 1.05,
        paymentMethod: 'Credit Card',
        notes: 'Tower crane for station construction',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-003',
        clientName: 'Sharjah Industrial Group',
        clientEmail: 'accounts@sharjahindustrial.ae',
        clientPhone: '+971-50-333-3333',
        projectName: 'Sharjah Industrial Complex',
        projectLocation: 'Sharjah Industrial',
        invoiceDate: new Date('2024-01-25'),
        dueDate: new Date('2024-02-25'),
        status: 'Overdue',
        craneDetails: [
          {
            craneId: cranes[2]._id,
            craneName: cranes[2].name,
            craneCode: cranes[2].code,
            rentalDays: 30,
            dailyRate: cranes[2].dailyRate,
            totalAmount: cranes[2].dailyRate * 30
          }
        ],
        subtotal: cranes[2].dailyRate * 30,
        taxRate: 5,
        taxAmount: (cranes[2].dailyRate * 30) * 0.05,
        totalAmount: (cranes[2].dailyRate * 30) * 1.05,
        paymentMethod: 'Cash',
        notes: 'Heavy crane for industrial construction',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-004',
        clientName: 'Ras Al Khaimah Port Authority',
        clientEmail: 'finance@rakport.ae',
        clientPhone: '+971-50-444-4444',
        projectName: 'Port Expansion Project',
        projectLocation: 'Ras Al Khaimah Port',
        invoiceDate: new Date('2024-02-01'),
        dueDate: new Date('2024-03-01'),
        status: 'Paid',
        craneDetails: [
          {
            craneId: cranes[3]._id,
            craneName: cranes[3].name,
            craneCode: cranes[3].code,
            rentalDays: 25,
            dailyRate: cranes[3].dailyRate,
            totalAmount: cranes[3].dailyRate * 25
          }
        ],
        subtotal: cranes[3].dailyRate * 25,
        taxRate: 5,
        taxAmount: (cranes[3].dailyRate * 25) * 0.05,
        totalAmount: (cranes[3].dailyRate * 25) * 1.05,
        paymentMethod: 'Bank Transfer',
        notes: 'Port crane for container handling',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-005',
        clientName: 'Fujairah Free Zone Company',
        clientEmail: 'accounts@fujairahfz.ae',
        clientPhone: '+971-50-555-5555',
        projectName: 'Free Zone Development',
        projectLocation: 'Fujairah Free Zone',
        invoiceDate: new Date('2024-02-05'),
        dueDate: new Date('2024-03-05'),
        status: 'Pending',
        craneDetails: [
          {
            craneId: cranes[4]._id,
            craneName: cranes[4].name,
            craneCode: cranes[4].code,
            rentalDays: 18,
            dailyRate: cranes[4].dailyRate,
            totalAmount: cranes[4].dailyRate * 18
          }
        ],
        subtotal: cranes[4].dailyRate * 18,
        taxRate: 5,
        taxAmount: (cranes[4].dailyRate * 18) * 0.05,
        totalAmount: (cranes[4].dailyRate * 18) * 1.05,
        paymentMethod: 'Credit Card',
        notes: 'Truck crane for warehouse construction',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-006',
        clientName: 'Dubai Hills Development',
        clientEmail: 'finance@dubaihills.ae',
        clientPhone: '+971-50-666-6666',
        projectName: 'Residential Complex Phase 2',
        projectLocation: 'Dubai Hills Estate',
        invoiceDate: new Date('2024-02-10'),
        dueDate: new Date('2024-03-10'),
        status: 'Paid',
        craneDetails: [
          {
            craneId: cranes[5]._id,
            craneName: cranes[5].name,
            craneCode: cranes[5].code,
            rentalDays: 45,
            dailyRate: cranes[5].dailyRate,
            totalAmount: cranes[5].dailyRate * 45
          }
        ],
        subtotal: cranes[5].dailyRate * 45,
        taxRate: 5,
        taxAmount: (cranes[5].dailyRate * 45) * 0.05,
        totalAmount: (cranes[5].dailyRate * 45) * 1.05,
        paymentMethod: 'Bank Transfer',
        notes: 'Long-term tower crane rental',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-007',
        clientName: 'Abu Dhabi Global Market',
        clientEmail: 'accounts@adgm.ae',
        clientPhone: '+971-50-777-7777',
        projectName: 'Financial District Tower',
        projectLocation: 'Abu Dhabi Global Market',
        invoiceDate: new Date('2024-02-15'),
        dueDate: new Date('2024-03-15'),
        status: 'Pending',
        craneDetails: [
          {
            craneId: cranes[6]._id,
            craneName: cranes[6].name,
            craneCode: cranes[6].code,
            rentalDays: 60,
            dailyRate: cranes[6].dailyRate,
            totalAmount: cranes[6].dailyRate * 60
          }
        ],
        subtotal: cranes[6].dailyRate * 60,
        taxRate: 5,
        taxAmount: (cranes[6].dailyRate * 60) * 0.05,
        totalAmount: (cranes[6].dailyRate * 60) * 1.05,
        paymentMethod: 'Credit Card',
        notes: 'Premium tower crane for high-rise',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-008',
        clientName: 'Sharjah University',
        clientEmail: 'facilities@sharjah.ac.ae',
        clientPhone: '+971-50-888-8888',
        projectName: 'New Engineering Building',
        projectLocation: 'Sharjah University City',
        invoiceDate: new Date('2024-02-20'),
        dueDate: new Date('2024-03-20'),
        status: 'Paid',
        craneDetails: [
          {
            craneId: cranes[7]._id,
            craneName: cranes[7].name,
            craneCode: cranes[7].code,
            rentalDays: 40,
            dailyRate: cranes[7].dailyRate,
            totalAmount: cranes[7].dailyRate * 40
          }
        ],
        subtotal: cranes[7].dailyRate * 40,
        taxRate: 5,
        taxAmount: (cranes[7].dailyRate * 40) * 0.05,
        totalAmount: (cranes[7].dailyRate * 40) * 1.05,
        paymentMethod: 'Bank Transfer',
        notes: 'University construction project',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-009',
        clientName: 'Jebel Ali Port Authority',
        clientEmail: 'finance@jebelali.ae',
        clientPhone: '+971-50-999-9999',
        projectName: 'Port Terminal Expansion',
        projectLocation: 'Jebel Ali Port',
        invoiceDate: new Date('2024-02-25'),
        dueDate: new Date('2024-03-25'),
        status: 'Pending',
        craneDetails: [
          {
            craneId: cranes[8]._id,
            craneName: cranes[8].name,
            craneCode: cranes[8].code,
            rentalDays: 35,
            dailyRate: cranes[8].dailyRate,
            totalAmount: cranes[8].dailyRate * 35
          }
        ],
        subtotal: cranes[8].dailyRate * 35,
        taxRate: 5,
        taxAmount: (cranes[8].dailyRate * 35) * 0.05,
        totalAmount: (cranes[8].dailyRate * 35) * 1.05,
        paymentMethod: 'Bank Transfer',
        notes: 'Heavy port crane for terminal work',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        invoiceNumber: 'INV-2024-010',
        clientName: 'Mina Zayed Port Company',
        clientEmail: 'accounts@minazayed.ae',
        clientPhone: '+971-50-000-0000',
        projectName: 'Container Terminal Upgrade',
        projectLocation: 'Mina Zayed Port',
        invoiceDate: new Date('2024-03-01'),
        dueDate: new Date('2024-04-01'),
        status: 'Overdue',
        craneDetails: [
          {
            craneId: cranes[9]._id,
            craneName: cranes[9].name,
            craneCode: cranes[9].code,
            rentalDays: 28,
            dailyRate: cranes[9].dailyRate,
            totalAmount: cranes[9].dailyRate * 28
          }
        ],
        subtotal: cranes[9].dailyRate * 28,
        taxRate: 5,
        taxAmount: (cranes[9].dailyRate * 28) * 0.05,
        totalAmount: (cranes[9].dailyRate * 28) * 1.05,
        paymentMethod: 'Credit Card',
        notes: 'Port infrastructure upgrade',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Clear existing invoices
    await invoicesCollection.deleteMany({});
    console.log('Cleared existing invoices');

    // Insert sample invoices
    await invoicesCollection.insertMany(sampleInvoices);
    console.log('Sample invoices seeded successfully!');
    console.log('You can now view the invoices in the application.');

  } catch (error) {
    console.error('Error seeding invoices:', error);
  } finally {
    await client.close();
  }
}

seedInvoices(); 