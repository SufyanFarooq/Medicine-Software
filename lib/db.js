const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/crane_management_db';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached;

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}
cached = global.mongoose;

async function dbConnect() {
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
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

async function dbDisconnect() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await dbDisconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await dbDisconnect();
  process.exit(0);
});

module.exports = dbConnect;
module.exports.dbConnect = dbConnect;
module.exports.dbDisconnect = dbDisconnect;
