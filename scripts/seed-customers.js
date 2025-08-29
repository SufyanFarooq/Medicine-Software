const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'crane_management_db';

async function seedCustomers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const customersCollection = db.collection('customers');
    
    // Sample customer data for UAE construction companies
    const sampleCustomers = [
      {
        companyName: 'Dubai Construction Co.',
        name: 'Ahmed Al Mansouri',
        email: 'accounts@dubaiconstruction.ae',
        phone: '+971-50-111-1111',
        address: 'Sheikh Zayed Road, Dubai',
        emirate: 'Dubai',
        industry: 'Construction',
        companySize: 'Large',
        creditLimit: 1000000,
        paymentTerms: 'Net 30',
        contactPerson: 'Ahmed Al Mansouri',
        contactPosition: 'Finance Manager',
        website: 'www.dubaiconstruction.ae',
        vatNumber: 'AE123456789',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Abu Dhabi Infrastructure Ltd.',
        name: 'Mohammed Al Qassimi',
        email: 'finance@adinfrastructure.ae',
        phone: '+971-50-222-2222',
        address: 'Corniche Street, Abu Dhabi',
        emirate: 'Abu Dhabi',
        industry: 'Infrastructure',
        companySize: 'Large',
        creditLimit: 2000000,
        paymentTerms: 'Net 45',
        contactPerson: 'Mohammed Al Qassimi',
        contactPosition: 'CFO',
        website: 'www.adinfrastructure.ae',
        vatNumber: 'AE987654321',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Sharjah Industrial Group',
        name: 'Omar Al Suwaidi',
        email: 'accounts@sharjahindustrial.ae',
        phone: '+971-50-333-3333',
        address: 'Industrial Area, Sharjah',
        emirate: 'Sharjah',
        industry: 'Industrial',
        companySize: 'Medium',
        creditLimit: 500000,
        paymentTerms: 'Net 30',
        contactPerson: 'Omar Al Suwaidi',
        contactPosition: 'Operations Manager',
        website: 'www.sharjahindustrial.ae',
        vatNumber: 'AE456789123',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Ras Al Khaimah Port Authority',
        name: 'Khalid Al Zaabi',
        email: 'finance@rakport.ae',
        phone: '+971-50-444-4444',
        address: 'Port Area, Ras Al Khaimah',
        emirate: 'Ras Al Khaimah',
        industry: 'Port Operations',
        companySize: 'Government',
        creditLimit: 5000000,
        paymentTerms: 'Net 60',
        contactPerson: 'Khalid Al Zaabi',
        contactPosition: 'Port Director',
        website: 'www.rakport.ae',
        vatNumber: 'AE789123456',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Fujairah Free Zone Company',
        name: 'Hassan Al Falasi',
        email: 'accounts@fujairahfz.ae',
        phone: '+971-50-555-5555',
        address: 'Free Zone, Fujairah',
        emirate: 'Fujairah',
        industry: 'Free Zone',
        companySize: 'Medium',
        creditLimit: 300000,
        paymentTerms: 'Net 30',
        contactPerson: 'Hassan Al Falasi',
        contactPosition: 'General Manager',
        website: 'www.fujairahfz.ae',
        vatNumber: 'AE321654987',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Dubai Hills Development',
        name: 'Youssef Al Maktoum',
        email: 'finance@dubaihills.ae',
        phone: '+971-50-666-6666',
        address: 'Dubai Hills Estate, Dubai',
        emirate: 'Dubai',
        industry: 'Real Estate',
        companySize: 'Large',
        creditLimit: 1500000,
        paymentTerms: 'Net 30',
        contactPerson: 'Youssef Al Maktoum',
        contactPosition: 'Development Manager',
        website: 'www.dubaihills.ae',
        vatNumber: 'AE147258369',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Abu Dhabi Global Market',
        name: 'Abdullah Al Nahyan',
        email: 'accounts@adgm.ae',
        phone: '+971-50-777-7777',
        address: 'Al Maryah Island, Abu Dhabi',
        emirate: 'Abu Dhabi',
        industry: 'Financial Services',
        companySize: 'Government',
        creditLimit: 3000000,
        paymentTerms: 'Net 45',
        contactPerson: 'Abdullah Al Nahyan',
        contactPosition: 'Facilities Manager',
        website: 'www.adgm.ae',
        vatNumber: 'AE963852741',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Sharjah University',
        name: 'Saeed Al Qasimi',
        email: 'facilities@sharjah.ac.ae',
        phone: '+971-50-888-8888',
        address: 'University City, Sharjah',
        emirate: 'Sharjah',
        industry: 'Education',
        companySize: 'Government',
        creditLimit: 800000,
        paymentTerms: 'Net 60',
        contactPerson: 'Saeed Al Qasimi',
        contactPosition: 'Facilities Director',
        website: 'www.sharjah.ac.ae',
        vatNumber: 'AE852963741',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Jebel Ali Port Authority',
        name: 'Rashid Al Maktoum',
        email: 'finance@jebelali.ae',
        phone: '+971-50-999-9999',
        address: 'Jebel Ali Port, Dubai',
        emirate: 'Dubai',
        industry: 'Port Operations',
        companySize: 'Government',
        creditLimit: 4000000,
        paymentTerms: 'Net 60',
        contactPerson: 'Rashid Al Maktoum',
        contactPosition: 'Port Director',
        website: 'www.jebelali.ae',
        vatNumber: 'AE741852963',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Mina Zayed Port Company',
        name: 'Zayed Al Nahyan',
        email: 'accounts@minazayed.ae',
        phone: '+971-50-000-0000',
        address: 'Mina Zayed, Abu Dhabi',
        emirate: 'Abu Dhabi',
        industry: 'Port Operations',
        companySize: 'Government',
        creditLimit: 2500000,
        paymentTerms: 'Net 45',
        contactPerson: 'Zayed Al Nahyan',
        contactPosition: 'Port Manager',
        website: 'www.minazayed.ae',
        vatNumber: 'AE369258147',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Al Ain Industrial Development',
        name: 'Tariq Al Qaydi',
        email: 'finance@alainindustrial.ae',
        phone: '+971-50-111-2222',
        address: 'Industrial City, Al Ain',
        emirate: 'Al Ain',
        industry: 'Industrial',
        companySize: 'Medium',
        creditLimit: 400000,
        paymentTerms: 'Net 30',
        contactPerson: 'Tariq Al Qaydi',
        contactPosition: 'Operations Director',
        website: 'www.alainindustrial.ae',
        vatNumber: 'AE258147369',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Umm Al Quwain Municipality',
        name: 'Majid Al Ali',
        email: 'projects@uaq.ae',
        phone: '+971-50-222-3333',
        address: 'Municipal Building, Umm Al Quwain',
        emirate: 'Umm Al Quwain',
        industry: 'Government',
        companySize: 'Government',
        creditLimit: 600000,
        paymentTerms: 'Net 60',
        contactPerson: 'Majid Al Ali',
        contactPosition: 'Municipal Engineer',
        website: 'www.uaq.ae',
        vatNumber: 'AE147369258',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Ajman Free Zone Authority',
        name: 'Sultan Al Nuaimi',
        email: 'finance@ajmanfz.ae',
        phone: '+971-50-333-4444',
        address: 'Free Zone, Ajman',
        emirate: 'Ajman',
        industry: 'Free Zone',
        companySize: 'Government',
        creditLimit: 700000,
        paymentTerms: 'Net 45',
        contactPerson: 'Sultan Al Nuaimi',
        contactPosition: 'Free Zone Director',
        website: 'www.ajmanfz.ae',
        vatNumber: 'AE963147258',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Dubai Creek Harbour Development',
        name: 'Hamdan Al Maktoum',
        email: 'accounts@creekharbour.ae',
        phone: '+971-50-444-5555',
        address: 'Dubai Creek Harbour, Dubai',
        emirate: 'Dubai',
        industry: 'Real Estate',
        companySize: 'Large',
        creditLimit: 2000000,
        paymentTerms: 'Net 30',
        contactPerson: 'Hamdan Al Maktoum',
        contactPosition: 'Development Director',
        website: 'www.creekharbour.ae',
        vatNumber: 'AE741963258',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Abu Dhabi Municipality',
        name: 'Mohammed Al Falahi',
        email: 'projects@adm.ae',
        phone: '+971-50-555-6666',
        address: 'Municipal Building, Abu Dhabi',
        emirate: 'Abu Dhabi',
        industry: 'Government',
        companySize: 'Government',
        creditLimit: 1500000,
        paymentTerms: 'Net 60',
        contactPerson: 'Mohammed Al Falahi',
        contactPosition: 'Municipal Engineer',
        website: 'www.adm.ae',
        vatNumber: 'AE852741963',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: 'Sharjah Development Authority',
        name: 'Ahmed Al Qasimi',
        email: 'finance@sda.ae',
        phone: '+971-50-666-7777',
        address: 'Government Building, Sharjah',
        emirate: 'Sharjah',
        industry: 'Government',
        companySize: 'Government',
        creditLimit: 1200000,
        paymentTerms: 'Net 60',
        contactPerson: 'Ahmed Al Qasimi',
        contactPosition: 'Development Director',
        website: 'www.sda.ae',
        vatNumber: 'AE369741852',
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Clear existing customers
    await customersCollection.deleteMany({});
    console.log('Cleared existing customers');

    // Insert sample customers
    await customersCollection.insertMany(sampleCustomers);
    console.log(`Inserted ${sampleCustomers.length} sample customers`);

    console.log('Sample customers seeded successfully!');
    console.log('Customer types included:');
    console.log('- Construction Companies (4 companies)');
    console.log('- Government Entities (8 companies)');
    console.log('- Industrial Companies (2 companies)');
    console.log('- Real Estate Developers (2 companies)');
    console.log('- Port Authorities (3 companies)');
    console.log('- Free Zone Companies (2 companies)');

  } catch (error) {
    console.error('Error seeding customers:', error);
  } finally {
    await client.close();
  }
}

seedCustomers();
