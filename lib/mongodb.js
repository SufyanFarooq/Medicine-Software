import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

let cachedClient = null;
let cachedDb = null;

// Performance optimized connection options (compatible with MongoDB driver)
const connectionOptions = {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long a send or receive on a socket can take
  connectTimeoutMS: 10000, // How long to wait for a connection
  retryWrites: true, // Retry writes on network errors
  retryReads: true, // Retry reads on network errors
  readPreference: 'primary', // Read from primary replica
  writeConcern: { w: 'majority' }, // Write concern for data safety
};

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(MONGODB_URI, connectionOptions);
    await client.connect();

    const db = client.db(MONGODB_DB);

    cachedClient = client;
    cachedDb = db;

    console.log('🚀 MongoDB connected with performance optimizations');
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function getCollection(collectionName) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
} 