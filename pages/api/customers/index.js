import { getCollection } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const customersCollection = await getCollection('customers');

    switch (method) {
      case 'GET':
        const { search } = req.query;
        let filter = {};
        
        if (search) {
          filter = {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { phone: { $regex: search, $options: 'i' } },
              { email: { $regex: search, $options: 'i' } }
            ]
          };
        }

        const customers = await customersCollection
          .find(filter)
          .sort({ name: 1 })
          .toArray();
        
        res.status(200).json(customers);
        break;

      case 'POST':
        const { name, phone, address, email } = req.body;

        // Validate required fields
        if (!name || name.trim() === '') {
          return res.status(400).json({ message: 'Customer name is required' });
        }

        // Check if customer with same name already exists
        const existingCustomer = await customersCollection.findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });

        if (existingCustomer) {
          return res.status(400).json({ message: 'Customer with this name already exists' });
        }

        const newCustomer = {
          name: name.trim(),
          phone: phone || null,
          address: address || null,
          email: email || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
        };

        const result = await customersCollection.insertOne(newCustomer);
        res.status(201).json({ _id: result.insertedId, ...newCustomer });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}


