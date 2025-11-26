import { getCollection } from '../../../lib/mongodb';
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

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const productsCollection = await getCollection('products');

    switch (method) {
      case 'GET':
        const products = await productsCollection.find({}).toArray();
        res.status(200).json(products);
        break;

      case 'POST':
        const { name, code, quantity, purchasePrice, sellingPrice, expiryDate, batchNo } = req.body;

        // Validate required fields
        if (!name || !code || quantity === undefined || !purchasePrice || !sellingPrice || !expiryDate) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check for duplicate code
        const existingProductByCode = await productsCollection.findOne({ code });
        if (existingProductByCode) {
          return res.status(400).json({ message: 'Product code already exists' });
        }

        // Check for duplicate name (case insensitive)
        const existingProductByName = await productsCollection.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });
        if (existingProductByName) {
          return res.status(400).json({ message: 'Product with this name already exists' });
        }

        const newProduct = {
          name,
          code,
          quantity: parseInt(quantity),
          purchasePrice: parseFloat(purchasePrice),
          sellingPrice: parseFloat(sellingPrice),
          expiryDate: new Date(expiryDate),
          batchNo: batchNo || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
        };

        const result = await productsCollection.insertOne(newProduct);
        res.status(201).json({ _id: result.insertedId, ...newProduct });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 