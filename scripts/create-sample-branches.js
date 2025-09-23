const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

async function createSampleBranches() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('🏢 Creating sample branches...');
    
    const branchesCollection = db.collection('branches');
    
    // Clear existing branches
    await branchesCollection.deleteMany({});
    console.log('🧹 Cleared existing branches');
    
    const sampleBranches = [
      {
        name: 'Head Office',
        code: 'HO-001',
        description: 'Main headquarters and administrative center',
        address: {
          street: '123 Business District',
          city: 'Karachi',
          state: 'Sindh',
          postalCode: '75000',
          country: 'Pakistan'
        },
        contactInfo: {
          phone: '+92-21-1234567',
          email: 'headoffice@company.com',
          fax: '+92-21-1234568'
        },
        branchType: 'head_office',
        manager: {
          name: 'Ahmed Ali',
          email: 'ahmed.ali@company.com',
          phone: '+92-300-1234567'
        },
        businessHours: {
          monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' }
        },
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        status: 'active',
        isActive: true,
        isHeadOffice: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId('507f1f77bcf86cd799439011'), // Dummy user ID
        updatedBy: new ObjectId('507f1f77bcf86cd799439011')
      },
      {
        name: 'Lahore Branch',
        code: 'BO-001',
        description: 'Lahore regional office and retail store',
        address: {
          street: '456 Mall Road',
          city: 'Lahore',
          state: 'Punjab',
          postalCode: '54000',
          country: 'Pakistan'
        },
        contactInfo: {
          phone: '+92-42-1234567',
          email: 'lahore@company.com',
          fax: '+92-42-1234568'
        },
        branchType: 'branch_office',
        manager: {
          name: 'Fatima Khan',
          email: 'fatima.khan@company.com',
          phone: '+92-300-2345678'
        },
        businessHours: {
          monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' }
        },
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        status: 'active',
        isActive: true,
        isHeadOffice: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId('507f1f77bcf86cd799439011'),
        updatedBy: new ObjectId('507f1f77bcf86cd799439011')
      },
      {
        name: 'Islamabad Branch',
        code: 'BO-002',
        description: 'Islamabad regional office and retail store',
        address: {
          street: '789 Blue Area',
          city: 'Islamabad',
          state: 'Federal',
          postalCode: '44000',
          country: 'Pakistan'
        },
        contactInfo: {
          phone: '+92-51-1234567',
          email: 'islamabad@company.com',
          fax: '+92-51-1234568'
        },
        branchType: 'branch_office',
        manager: {
          name: 'Hassan Raza',
          email: 'hassan.raza@company.com',
          phone: '+92-300-3456789'
        },
        businessHours: {
          monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
          sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' }
        },
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        status: 'active',
        isActive: true,
        isHeadOffice: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId('507f1f77bcf86cd799439011'),
        updatedBy: new ObjectId('507f1f77bcf86cd799439011')
      },
      {
        name: 'Karachi Warehouse',
        code: 'WH-001',
        description: 'Main warehouse and distribution center',
        address: {
          street: '321 Industrial Area',
          city: 'Karachi',
          state: 'Sindh',
          postalCode: '75000',
          country: 'Pakistan'
        },
        contactInfo: {
          phone: '+92-21-9876543',
          email: 'warehouse@company.com',
          fax: '+92-21-9876544'
        },
        branchType: 'warehouse',
        manager: {
          name: 'Ali Ahmed',
          email: 'ali.ahmed@company.com',
          phone: '+92-300-4567890'
        },
        businessHours: {
          monday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
          tuesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
          wednesday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
          thursday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
          friday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
          saturday: { isOpen: true, openTime: '08:00', closeTime: '20:00' },
          sunday: { isOpen: false, openTime: '08:00', closeTime: '20:00' }
        },
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        status: 'active',
        isActive: true,
        isHeadOffice: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId('507f1f77bcf86cd799439011'),
        updatedBy: new ObjectId('507f1f77bcf86cd799439011')
      },
      {
        name: 'Rawalpindi Retail Store',
        code: 'RS-001',
        description: 'Retail store in Rawalpindi',
        address: {
          street: '654 Saddar Road',
          city: 'Rawalpindi',
          state: 'Punjab',
          postalCode: '46000',
          country: 'Pakistan'
        },
        contactInfo: {
          phone: '+92-51-9876543',
          email: 'rawalpindi@company.com',
          fax: '+92-51-9876544'
        },
        branchType: 'retail_store',
        manager: {
          name: 'Sara Ali',
          email: 'sara.ali@company.com',
          phone: '+92-300-5678901'
        },
        businessHours: {
          monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          wednesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          thursday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          friday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          saturday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          sunday: { isOpen: true, openTime: '10:00', closeTime: '22:00' }
        },
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        status: 'active',
        isActive: true,
        isHeadOffice: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: new ObjectId('507f1f77bcf86cd799439011'),
        updatedBy: new ObjectId('507f1f77bcf86cd799439011')
      }
    ];

    const result = await branchesCollection.insertMany(sampleBranches);
    console.log(`✅ Created ${result.insertedCount} sample branches`);
    
    // Display created branches
    console.log('\n📋 Created Branches:');
    sampleBranches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} (${branch.code}) - ${branch.branchType}`);
      console.log(`   📍 ${branch.address.city}, ${branch.address.country}`);
      console.log(`   👤 Manager: ${branch.manager.name}`);
      console.log(`   📞 Phone: ${branch.contactInfo.phone}`);
      console.log('');
    });

    console.log('🎉 Sample branches created successfully!');
    console.log('\n💡 You can now:');
    console.log('1. Use these branch IDs when creating employees');
    console.log('2. Test the HR module with proper branch references');
    console.log('3. View branches in the system');

  } catch (error) {
    console.error('❌ Error creating sample branches:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
createSampleBranches();
