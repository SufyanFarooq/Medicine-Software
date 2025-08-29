const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'crane_management_db';

async function createSuperAdmin() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Check if super admin already exists
    const existingAdmin = await usersCollection.findOne({ role: 'Super Admin' });
    
    if (existingAdmin) {
      console.log('Super Admin user already exists!');
      console.log(`Username: ${existingAdmin.username}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }
    
    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const superAdminUser = {
      username: 'superadmin',
      email: 'admin@cranemanagement.ae',
      password: hashedPassword,
      role: 'Super Admin',
      fullName: 'System Administrator',
      phone: '+971-50-123-4567',
      department: 'IT Management',
      permissions: [
        'manage_users',
        'manage_cranes',
        'manage_projects',
        'manage_maintenance',
        'manage_finances',
        'view_reports',
        'system_settings'
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await usersCollection.insertOne(superAdminUser);
    console.log('Super Admin user created successfully!');
    console.log('Username: superadmin');
    console.log('Password: admin123');
    console.log('Role: Super Admin');
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await client.close();
  }
}

createSuperAdmin(); 