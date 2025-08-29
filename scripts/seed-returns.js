const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'crane_management_db';

async function seedReturns() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const returnsCollection = db.collection('returns');
    const cranesCollection = db.collection('cranes');
    
    // Get available cranes for reference
    const cranes = await cranesCollection.find({}).toArray();
    
    if (cranes.length === 0) {
      console.log('No cranes found. Please run seed-data.js first.');
      return;
    }
    
    // Sample returns data for crane maintenance
    const sampleReturns = [
      {
        returnNumber: 'RET-2024-001',
        craneId: cranes[0]._id,
        craneName: cranes[0].name,
        craneCode: cranes[0].code,
        returnType: 'Maintenance',
        returnReason: 'Scheduled maintenance due',
        returnDate: new Date('2024-01-20'),
        expectedReturnDate: new Date('2024-01-25'),
        actualReturnDate: new Date('2024-01-23'),
        status: 'Completed',
        maintenanceDetails: 'Engine oil change, hydraulic system check, boom inspection',
        cost: 2500,
        technician: 'Ahmed Al Mansouri',
        notes: 'Crane returned early, all systems functioning properly',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-002',
        craneId: cranes[1]._id,
        craneName: cranes[1].name,
        craneCode: cranes[1].code,
        returnType: 'Repair',
        returnReason: 'Hydraulic system malfunction',
        returnDate: new Date('2024-02-15'),
        expectedReturnDate: new Date('2024-02-22'),
        actualReturnDate: new Date('2024-02-20'),
        status: 'Completed',
        maintenanceDetails: 'Hydraulic pump replacement, system testing',
        cost: 8500,
        technician: 'Mohammed Al Qassimi',
        notes: 'Major repair completed, crane fully operational',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-003',
        craneId: cranes[2]._id,
        craneName: cranes[2].name,
        craneCode: cranes[2].code,
        returnType: 'Emergency',
        returnReason: 'Boom structural damage',
        returnDate: new Date('2024-02-28'),
        expectedReturnDate: new Date('2024-03-15'),
        actualReturnDate: new Date('2024-03-10'),
        status: 'Completed',
        maintenanceDetails: 'Boom section replacement, structural reinforcement',
        cost: 15000,
        technician: 'Omar Al Suwaidi',
        notes: 'Emergency repair due to construction accident',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-004',
        craneId: cranes[3]._id,
        craneName: cranes[3].name,
        craneCode: cranes[3].code,
        returnType: 'Maintenance',
        returnReason: 'Annual safety inspection',
        returnDate: new Date('2024-03-05'),
        expectedReturnDate: new Date('2024-03-08'),
        actualReturnDate: new Date('2024-03-07'),
        status: 'Completed',
        maintenanceDetails: 'Safety systems check, load testing, certification renewal',
        cost: 3200,
        technician: 'Khalid Al Zaabi',
        notes: 'All safety certifications renewed',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-005',
        craneId: cranes[4]._id,
        craneName: cranes[4].name,
        craneCode: cranes[4].code,
        returnType: 'Repair',
        returnReason: 'Electrical system failure',
        returnDate: new Date('2024-03-10'),
        expectedReturnDate: new Date('2024-03-17'),
        actualReturnDate: new Date('2024-03-15'),
        status: 'Completed',
        maintenanceDetails: 'Electrical panel replacement, wiring inspection',
        cost: 6800,
        technician: 'Hassan Al Falasi',
        notes: 'Electrical issues resolved, all systems tested',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-006',
        craneId: cranes[5]._id,
        craneName: cranes[5].name,
        craneCode: cranes[5].code,
        returnType: 'Maintenance',
        returnReason: 'Preventive maintenance',
        returnDate: new Date('2024-03-15'),
        expectedReturnDate: new Date('2024-03-18'),
        actualReturnDate: new Date('2024-03-17'),
        status: 'Completed',
        maintenanceDetails: 'Lubrication, filter replacement, minor adjustments',
        cost: 1800,
        technician: 'Youssef Al Maktoum',
        notes: 'Routine maintenance completed successfully',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-007',
        craneId: cranes[6]._id,
        craneName: cranes[6].name,
        craneCode: cranes[6].code,
        returnType: 'Repair',
        returnReason: 'Control system malfunction',
        returnDate: new Date('2024-03-20'),
        expectedReturnDate: new Date('2024-03-25'),
        actualReturnDate: new Date('2024-03-22'),
        status: 'Completed',
        maintenanceDetails: 'Control panel repair, software update, calibration',
        cost: 4200,
        technician: 'Abdullah Al Nahyan',
        notes: 'Control systems fully restored',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-008',
        craneId: cranes[7]._id,
        craneName: cranes[7].name,
        craneCode: cranes[7].code,
        returnType: 'Emergency',
        returnReason: 'Cable breakage',
        returnDate: new Date('2024-03-25'),
        expectedReturnDate: new Date('2024-04-02'),
        actualReturnDate: new Date('2024-03-30'),
        status: 'Completed',
        maintenanceDetails: 'Cable replacement, safety testing, load verification',
        cost: 9500,
        technician: 'Saeed Al Qasimi',
        notes: 'Emergency cable replacement due to wear',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-009',
        craneId: cranes[8]._id,
        craneName: cranes[8].name,
        craneCode: cranes[8].code,
        returnType: 'Maintenance',
        returnReason: 'Quarterly inspection',
        returnDate: new Date('2024-04-01'),
        expectedReturnDate: new Date('2024-04-03'),
        actualReturnDate: new Date('2024-04-02'),
        status: 'Completed',
        maintenanceDetails: 'Comprehensive inspection, minor repairs, testing',
        cost: 2800,
        technician: 'Rashid Al Maktoum',
        notes: 'Quarterly maintenance completed on schedule',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-010',
        craneId: cranes[9]._id,
        craneName: cranes[9].name,
        craneCode: cranes[9].code,
        returnType: 'Repair',
        returnReason: 'Engine overheating',
        returnDate: new Date('2024-04-05'),
        expectedReturnDate: new Date('2024-04-12'),
        actualReturnDate: new Date('2024-04-10'),
        status: 'Completed',
        maintenanceDetails: 'Cooling system repair, engine tune-up, testing',
        cost: 7200,
        technician: 'Zayed Al Nahyan',
        notes: 'Engine cooling issues resolved',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-011',
        craneId: cranes[10]._id,
        craneName: cranes[10].name,
        craneCode: cranes[10].code,
        returnType: 'Maintenance',
        returnReason: 'Scheduled service',
        returnDate: new Date('2024-04-10'),
        expectedReturnDate: new Date('2024-04-12'),
        actualReturnDate: new Date('2024-04-11'),
        status: 'Completed',
        maintenanceDetails: 'Oil change, filter replacement, general inspection',
        cost: 2100,
        technician: 'Tariq Al Qaydi',
        notes: 'Regular service completed efficiently',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-012',
        craneId: cranes[11]._id,
        craneName: cranes[11].name,
        craneCode: cranes[11].code,
        returnType: 'Repair',
        returnReason: 'Brake system failure',
        returnDate: new Date('2024-04-15'),
        expectedReturnDate: new Date('2024-04-20'),
        actualReturnDate: new Date('2024-04-18'),
        status: 'Completed',
        maintenanceDetails: 'Brake pad replacement, hydraulic brake repair',
        cost: 5800,
        technician: 'Majid Al Ali',
        notes: 'Brake system fully restored and tested',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-013',
        craneId: cranes[12]._id,
        craneName: cranes[12].name,
        craneCode: cranes[12].code,
        returnType: 'Maintenance',
        returnReason: 'Preventive maintenance',
        returnDate: new Date('2024-04-20'),
        expectedReturnDate: new Date('2024-04-22'),
        actualReturnDate: new Date('2024-04-21'),
        status: 'Completed',
        maintenanceDetails: 'Lubrication, inspection, minor adjustments',
        cost: 1600,
        technician: 'Sultan Al Nuaimi',
        notes: 'Preventive maintenance completed',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-014',
        craneId: cranes[13]._id,
        craneName: cranes[13].name,
        craneCode: cranes[13].code,
        returnType: 'Emergency',
        returnReason: 'Structural crack detection',
        returnDate: new Date('2024-04-25'),
        expectedReturnDate: new Date('2024-05-05'),
        actualReturnDate: new Date('2024-05-02'),
        status: 'Completed',
        maintenanceDetails: 'Structural repair, reinforcement, safety testing',
        cost: 18500,
        technician: 'Hamdan Al Maktoum',
        notes: 'Critical structural repair completed',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        returnNumber: 'RET-2024-015',
        craneId: cranes[14]._id,
        craneName: cranes[14].name,
        craneCode: cranes[14].code,
        returnType: 'Maintenance',
        returnReason: 'Annual certification',
        returnDate: new Date('2024-04-30'),
        expectedReturnDate: new Date('2024-05-02'),
        actualReturnDate: new Date('2024-05-01'),
        status: 'Completed',
        maintenanceDetails: 'Full inspection, certification renewal, testing',
        cost: 3500,
        technician: 'Mohammed Al Falahi',
        notes: 'Annual certification renewed successfully',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Clear existing returns
    await returnsCollection.deleteMany({});
    console.log('Cleared existing returns');

    // Insert sample returns
    await returnsCollection.insertMany(sampleReturns);
    console.log('Sample returns seeded successfully!');
    console.log('You can now view the returns in the application.');

  } catch (error) {
    console.error('Error seeding returns:', error);
  } finally {
    await client.close();
  }
}

seedReturns(); 