const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const MONGODB_DB = 'crane_management_db';

async function checkUsers() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({}).toArray();
    console.log('Total users found:', users.length);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      });
    });
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
