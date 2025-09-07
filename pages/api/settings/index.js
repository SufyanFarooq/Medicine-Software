import dbConnect from '../../../lib/db';
import { Settings } from '../../../models';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      // Get current settings
      let settings = await Settings.findOne().lean();
      
      if (!settings) {
        // Create default settings if none exist
        settings = await Settings.create({
          currency: '$',
          discountPercentage: 3,
          shopName: 'Medical Shop',
        });
      }
      
      res.status(200).json(settings);
    } else if (req.method === 'PUT') {
      const { currency, discountPercentage, shopName } = req.body;
      
      // Validate input
      if (discountPercentage !== undefined && (discountPercentage < 0 || discountPercentage > 100)) {
        return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
      }
      
      // Update or create settings
      const settings = await Settings.findOneAndUpdate(
        {}, // Find any document (since we only have one)
        {
          ...(currency !== undefined && { currency }),
          ...(discountPercentage !== undefined && { discountPercentage }),
          ...(shopName !== undefined && { shopName }),
        },
        {
          new: true,
          upsert: true, // Create if doesn't exist
          runValidators: true,
        }
      ).lean();
      
      res.status(200).json(settings);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 