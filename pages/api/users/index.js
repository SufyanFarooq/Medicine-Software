import dbConnect from '../../../lib/db';
import { User } from '../../../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Check if user can manage other users
const canManageUsers = (userRole) => {
  return userRole === 'super_admin';
};

// Check if user can create users
const canCreateUsers = (userRole) => {
  return userRole === 'super_admin';
};

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Check permissions based on user role
  if (!canManageUsers(user.role)) {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }

  try {
    await dbConnect();

    switch (method) {
      case 'GET':
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean();
        res.status(200).json(users);
        break;

      case 'POST':
        // Check if user can create other users
        if (!canCreateUsers(user.role)) {
          return res.status(403).json({ message: 'Access denied. Cannot create users.' });
        }

        const { username, password, role } = req.body;

        // Validate required fields
        if (!username || !password || !role) {
          return res.status(400).json({ message: 'Username, password, and role are required' });
        }

        // Validate role
        const validRoles = ['super_admin', 'manager', 'sales_man'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ message: 'Invalid role. Must be super_admin, manager, or sales_man' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new user using Mongoose schema
        const newUser = new User({
          username,
          password, // Password will be hashed by the schema pre-save hook
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
        });

        await newUser.save();
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser.toObject();
        res.status(201).json(userWithoutPassword);
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Users API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 