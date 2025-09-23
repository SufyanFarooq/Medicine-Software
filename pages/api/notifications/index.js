import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const { method } = req;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const notificationsCollection = await getCollection('notifications');

    switch (method) {
      case 'GET':
        const { 
          unreadOnly,
          type,
          category,
          priority,
          page = 1,
          limit = 50
        } = req.query;

        let filter = { recipient: user.userId };
        
        if (unreadOnly === 'true') filter.isRead = false;
        if (type) filter.type = type;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const notifications = await notificationsCollection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await notificationsCollection.countDocuments(filter);
        const unreadCount = await notificationsCollection.countDocuments({ 
          recipient: user.userId, 
          isRead: false 
        });

        res.status(200).json({
          notifications,
          unreadCount,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        const permissions = getUserPermissions(user.role);
        if (!permissions.canManageUsers) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          recipient, 
          title, 
          message, 
          type: notificationType, 
          category: notificationCategory, 
          priority: notificationPriority, 
          actionRequired, 
          actionUrl 
        } = req.body;

        if (!recipient || !title || !message || !notificationType || !notificationCategory) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const newNotification = {
          recipient,
          recipientType: 'user',
          sender: user.userId,
          senderType: 'user',
          title: title.trim(),
          message: message.trim(),
          shortMessage: message.length > 100 ? message.substring(0, 97) + '...' : message,
          type: notificationType,
          category: notificationCategory,
          priority: notificationPriority || 'medium',
          urgency: 'normal',
          status: 'pending',
          isRead: false,
          isDismissed: false,
          deliveryMethod: ['in_app'],
          actionRequired: actionRequired || false,
          actionUrl: actionUrl?.trim() || '',
          retryCount: 0,
          maxRetries: 3,
          interactions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await notificationsCollection.insertOne(newNotification);

        res.status(201).json({ _id: result.insertedId, ...newNotification });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}