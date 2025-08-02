import { getCollection } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const usersCollection = await getCollection('users');

    switch (method) {
      case 'GET':
        const users = await usersCollection.find({}, { password: 0 }).sort({ createdAt: -1 }).toArray();
        res.status(200).json(users);
        break;

      case 'POST':
        const { username, password, role } = req.body;

        // Validate required fields
        if (!username || !password || !role) {
          return res.status(400).json({ message: 'Username, password, and role are required' });
        }

        // Check if username already exists
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
          username,
          password: hashedPassword,
          role,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);
        
        // Return user without password
        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ ...userWithoutPassword, _id: result.insertedId });
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