import dbConnect from '../../../lib/db';
import { User } from '../../../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');
    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/crane_management_db');
    
    const { username, password } = req.body;

    console.log('Login attempt for username:', username);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Try Mongoose first
    console.log('Searching for user with Mongoose...');
    let user = await User.findOne({ username, isActive: true }).lean();
    console.log('User found with Mongoose:', user ? 'Yes' : 'No');
    
    // If Mongoose doesn't work, try native MongoDB driver
    if (!user) {
      console.log('Trying native MongoDB driver...');
      const client = new MongoClient('mongodb://localhost:27017');
      await client.connect();
      const db = client.db('crane_management_db');
      const usersCollection = db.collection('users');
      
      user = await usersCollection.findOne({ username, isActive: true });
      console.log('User found with native driver:', user ? 'Yes' : 'No');
      
      await client.close();
    }
    
    console.log('User details:', user ? { username: user.username, role: user.role, isActive: user.isActive } : 'No user found');

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 