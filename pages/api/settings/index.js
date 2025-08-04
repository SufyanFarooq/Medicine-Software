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
    const settingsCollection = await getCollection('settings');

    switch (method) {
      case 'GET':
        // Get settings (create default if not exists)
        let settings = await settingsCollection.findOne({});
        if (!settings) {
                  // Create default settings
        const defaultSettings = {
          currency: '$',
          discountPercentage: 3,
          shopName: 'Medical Shop',
          contactNumber: '',
          address: '',
          createdAt: new Date(),
          updatedAt: new Date()
        };
          await settingsCollection.insertOne(defaultSettings);
          settings = defaultSettings;
        }
        res.status(200).json(settings);
        break;

      case 'PUT':
        const { currency, discountPercentage, shopName, contactNumber, address } = req.body;
        
        // Validate input
        if (!currency || discountPercentage === undefined || !shopName) {
          return res.status(400).json({ message: 'Currency, discount percentage, and shop name are required' });
        }

        if (discountPercentage < 0 || discountPercentage > 100) {
          return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
        }

        // Update settings
        const result = await settingsCollection.updateOne(
          {},
          { 
            $set: { 
              currency,
              discountPercentage: parseFloat(discountPercentage),
              shopName,
              contactNumber: contactNumber || '',
              address: address || '',
              updatedAt: new Date(),
              updatedBy: user.userId,
            }
          },
          { upsert: true }
        );

        res.status(200).json({ message: 'Settings updated successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 