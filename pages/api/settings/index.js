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
            businessName: 'My Business',
            businessType: 'Retail Store',
            contactNumber: '',
            address: '',
            email: '',
            website: '',
            taxRate: 0,
            hasExpiryDates: true,
            hasBatchNumbers: false,
            lowStockThreshold: 10,
            // Add default notification settings
            notificationSettings: {
              lowStockThreshold: 20,
              expiryWarningDays: 30,
              criticalExpiryDays: 7,
              emailNotifications: true,
              inAppNotifications: true,
              notificationFrequency: 'realtime',
              autoCleanupDays: 30,
              stockoutAlert: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await settingsCollection.insertOne(defaultSettings);
          settings = defaultSettings;
        } else {
          // Ensure notification settings exist in existing settings
          if (!settings.notificationSettings) {
            settings.notificationSettings = {
              lowStockThreshold: 20,
              expiryWarningDays: 30,
              criticalExpiryDays: 7,
              emailNotifications: true,
              inAppNotifications: true,
              notificationFrequency: 'realtime',
              autoCleanupDays: 30,
              stockoutAlert: true
            };
          }
        }
        res.status(200).json(settings);
        break;

      case 'POST':
        // Handle business setup wizard submissions
        const postData = req.body;
        
        // Validate required fields
        if (!postData.businessName || !postData.businessType || !postData.currency) {
          return res.status(400).json({ 
            message: 'Business name, business type, and currency are required' 
          });
        }

        // Check if settings already exist
        const existingSettings = await settingsCollection.findOne({});
        
        if (existingSettings) {
          // Update existing settings
          const result = await settingsCollection.updateOne(
            { _id: existingSettings._id },
            { 
              $set: { 
                ...postData,
                updatedAt: new Date(),
                updatedBy: user.userId,
              }
            }
          );
          
          if (result.modifiedCount > 0 || result.matchedCount > 0) {
            res.status(200).json({ 
              message: 'Business setup completed successfully',
              settingsId: existingSettings._id
            });
          } else {
            res.status(500).json({ message: 'Failed to update settings' });
          }
        } else {
          // Create new settings
          const newSettings = {
            ...postData,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.userId,
            updatedBy: user.userId,
          };
          
          const result = await settingsCollection.insertOne(newSettings);
          
          if (result.insertedId) {
            res.status(201).json({ 
              message: 'Business setup completed successfully',
              settingsId: result.insertedId
            });
          } else {
            res.status(500).json({ message: 'Failed to create settings' });
          }
        }
        break;

      case 'PUT':
        const updateData = req.body;
        
        // If this is a notification settings update, handle it differently
        if (updateData.notificationSettings) {
          // Update only notification-related settings
          const result = await settingsCollection.updateOne(
            {},
            { 
              $set: { 
                ...updateData.notificationSettings,
                updatedAt: new Date(),
                updatedBy: user.userId,
              }
            },
            { upsert: true }
          );
          
          if (result.modifiedCount > 0 || result.matchedCount > 0 || result.upsertedCount > 0) {
            res.status(200).json({ message: 'Notification settings updated successfully' });
          } else {
            res.status(500).json({ message: 'Failed to update notification settings' });
          }
          break;
        }
        
        // Regular settings update - extract fields
        const { 
          currency, 
          discountPercentage, 
          businessName, 
          businessType,
          contactNumber, 
          address,
          email,
          website,
          taxRate,
          hasExpiryDates,
          hasBatchNumbers,
          lowStockThreshold
        } = updateData;
        
        // Validate input for regular settings update
        if (!currency || discountPercentage === undefined || !businessName || !businessType) {
          return res.status(400).json({ message: 'Currency, discount percentage, business name, and business type are required' });
        }

        if (discountPercentage < 0 || discountPercentage > 100) {
          return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
        }

        if (taxRate < 0 || taxRate > 100) {
          return res.status(400).json({ message: 'Tax rate must be between 0 and 100' });
        }

        // Update settings
        const result = await settingsCollection.updateOne(
          {},
          { 
            $set: { 
              currency,
              discountPercentage: parseFloat(discountPercentage),
              businessName,
              businessType,
              contactNumber: contactNumber || '',
              address: address || '',
              email: email || '',
              website: website || '',
              taxRate: parseFloat(taxRate) || 0,
              hasExpiryDates: hasExpiryDates !== undefined ? hasExpiryDates : true,
              hasBatchNumbers: hasBatchNumbers !== undefined ? hasBatchNumbers : false,
              lowStockThreshold: parseInt(lowStockThreshold) || 10,
              updatedAt: new Date(),
              updatedBy: user.userId,
            }
          },
          { upsert: true }
        );

        res.status(200).json({ message: 'Settings updated successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 