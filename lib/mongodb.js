import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI ||'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'retail_shop';


let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      connectTimeoutMS: 5000,
    });

    const db = client.db(MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Provide helpful error message
    if (error.message && error.message.includes('ECONNREFUSED')) {
      throw new Error(
        'MongoDB connection failed. Please ensure MongoDB is running.\n' +
        'Windows: Run setup-mongodb-service.bat as Administrator to install MongoDB as a service.\n' +
        'Or start MongoDB manually: mongod --dbpath C:\\data\\db'
      );
    }
    
    throw error;
  }
}

export async function getCollection(collectionName) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
} 