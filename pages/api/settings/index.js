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
        {
          const updateData = req.body;

          // Build a flexible $set object to allow partial updates in a single call
          const setFields = {
            updatedAt: new Date(),
            updatedBy: user.userId,
          };

          // Regular fields (only set if provided)
          if (updateData.currency !== undefined) setFields.currency = updateData.currency;
          if (updateData.discountPercentage !== undefined) {
            const dp = parseFloat(updateData.discountPercentage);
            if (isNaN(dp) || dp < 0 || dp > 100) {
              return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
            }
            setFields.discountPercentage = dp;
          }
          if (updateData.businessName !== undefined) setFields.businessName = updateData.businessName;
          if (updateData.businessType !== undefined) setFields.businessType = updateData.businessType;
          if (updateData.contactNumber !== undefined) setFields.contactNumber = updateData.contactNumber || '';
          if (updateData.address !== undefined) setFields.address = updateData.address || '';
          if (updateData.email !== undefined) setFields.email = updateData.email || '';
          if (updateData.website !== undefined) setFields.website = updateData.website || '';
          if (updateData.taxRate !== undefined) {
            const tr = parseFloat(updateData.taxRate);
            if (isNaN(tr) || tr < 0 || tr > 100) {
              return res.status(400).json({ message: 'Tax rate must be between 0 and 100' });
            }
            setFields.taxRate = tr;
          }
          if (updateData.hasExpiryDates !== undefined) setFields.hasExpiryDates = !!updateData.hasExpiryDates;
          if (updateData.hasBatchNumbers !== undefined) setFields.hasBatchNumbers = !!updateData.hasBatchNumbers;
          if (updateData.lowStockThreshold !== undefined) {
            const lst = parseInt(updateData.lowStockThreshold);
            setFields.lowStockThreshold = isNaN(lst) ? 10 : lst;
          }

          // Nested notification settings (flatten with dot-notation)
          if (updateData.notificationSettings && typeof updateData.notificationSettings === 'object') {
            const ns = updateData.notificationSettings;
            if (ns.lowStockThreshold !== undefined) setFields['notificationSettings.lowStockThreshold'] = parseInt(ns.lowStockThreshold);
            if (ns.expiryWarningDays !== undefined) setFields['notificationSettings.expiryWarningDays'] = parseInt(ns.expiryWarningDays);
            if (ns.criticalExpiryDays !== undefined) setFields['notificationSettings.criticalExpiryDays'] = parseInt(ns.criticalExpiryDays);
            if (ns.emailNotifications !== undefined) setFields['notificationSettings.emailNotifications'] = !!ns.emailNotifications;
            if (ns.inAppNotifications !== undefined) setFields['notificationSettings.inAppNotifications'] = !!ns.inAppNotifications;
            if (ns.notificationFrequency !== undefined) setFields['notificationSettings.notificationFrequency'] = ns.notificationFrequency;
            if (ns.autoCleanupDays !== undefined) setFields['notificationSettings.autoCleanupDays'] = parseInt(ns.autoCleanupDays);
            if (ns.stockoutAlert !== undefined) setFields['notificationSettings.stockoutAlert'] = !!ns.stockoutAlert;
          }

          if (Object.keys(setFields).length === 2) { // only updatedAt/updatedBy present
            return res.status(400).json({ message: 'No valid fields provided to update' });
          }

          await settingsCollection.updateOne(
            {},
            { $set: setFields },
            { upsert: true }
          );

          res.status(200).json({ message: 'Settings updated successfully' });
          break;
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 