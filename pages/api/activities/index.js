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
    const activitiesCollection = await getCollection('activities');

    switch (method) {
      case 'GET':
        // Get activities with optional filters
        const { userId, action: actionFilter, startDate, endDate, limit = 50 } = req.query;
        
        let filter = {};
        
        if (userId) {
          filter.userId = userId;
        }
        
        if (actionFilter) {
          filter.action = actionFilter;
        }
        
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
          }
          if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
          }
        }

        const activities = await activitiesCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .toArray();

        res.status(200).json(activities);
        break;

      case 'POST':
        const { action, details, entityType, entityId } = req.body;

        // Validate required fields
        if (!action) {
          return res.status(400).json({ message: 'Action is required' });
        }

        const activity = {
          userId: user.userId,
          username: user.username,
          action,
          details: details || '',
          entityType: entityType || '',
          entityId: entityId || '',
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        };

        const result = await activitiesCollection.insertOne(activity);
        res.status(201).json({ _id: result.insertedId, ...activity });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Activities API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 