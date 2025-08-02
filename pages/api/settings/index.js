import { getCollection } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const { method } = req;

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
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await settingsCollection.insertOne(defaultSettings);
          settings = defaultSettings;
        }
        res.status(200).json(settings);
        break;

      case 'PUT':
        const { currency, discountPercentage, shopName } = req.body;
        
        // Validate input
        if (!currency || discountPercentage === undefined || !shopName) {
          return res.status(400).json({ message: 'All fields are required' });
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
              updatedAt: new Date()
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