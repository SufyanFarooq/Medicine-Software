import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017/business_management';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// @ts-ignore
let cached: CachedConnection = (global as any).mongoose;

if (!cached) {
  // @ts-ignore
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      dbName: process.env.MONGODB_DB || 'business_management',
    } as any;

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;


