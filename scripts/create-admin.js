const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function createSuperAdmin() {
  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');

    // Check if super admin already exists
    const existingSuperAdmin = await usersCollection.findOne({ username: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('Super Admin user already exists!');
      console.log('Username: superadmin');
      console.log('Role: Super Admin');
      client.close();
      return;
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('superadmin123', 10);
    const superAdminUser = {
      username: 'superadmin',
      password: hashedPassword,
      role: 'super_admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await usersCollection.insertOne(superAdminUser);
    console.log('Super Admin user created successfully!');
    console.log('Username: superadmin');
    console.log('Password: superadmin123');
    console.log('Role: Super Admin');
    console.log('Please change the password after first login.');

    client.close();
  } catch (error) {
    console.error('Error creating super admin user:', error);
  }
}

createSuperAdmin(); 