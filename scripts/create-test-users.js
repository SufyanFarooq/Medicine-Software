const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'medical_shop';

async function createTestUsers() {
  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');

    const testUsers = [
      {
        username: 'manager',
        password: 'manager123',
        role: 'manager',
        displayName: 'Manager'
      },
      {
        username: 'salesman',
        password: 'salesman123',
        role: 'sales_man',
        displayName: 'Sales Man'
      }
    ];

    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ username: user.username });
      if (existingUser) {
        console.log(`${user.displayName} user already exists!`);
        console.log(`Username: ${user.username}`);
        console.log(`Role: ${user.displayName}`);
        console.log('---');
        continue;
      }

      // Create user
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = {
        username: user.username,
        password: hashedPassword,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await usersCollection.insertOne(newUser);
      console.log(`${user.displayName} user created successfully!`);
      console.log(`Username: ${user.username}`);
      console.log(`Password: ${user.password}`);
      console.log(`Role: ${user.displayName}`);
      console.log('---');
    }

    client.close();
    console.log('Test users creation completed!');
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

createTestUsers(); 