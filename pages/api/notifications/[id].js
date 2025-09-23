import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
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
  const { method, query: { id } } = req;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  try {
    const notificationsCollection = await getCollection('notifications');

    switch (method) {
      case 'PUT':
        const { action } = req.body;

        if (!action || !['read', 'dismiss'].includes(action)) {
          return res.status(400).json({ message: 'Valid action (read/dismiss) is required' });
        }

        const notification = await notificationsCollection.findOne({ 
          _id: new ObjectId(id),
          recipient: user.userId
        });

        if (!notification) {
          return res.status(404).json({ message: 'Notification not found' });
        }

        let updateData = {
          updatedAt: new Date()
        };

        if (action === 'read') {
          updateData.isRead = true;
          updateData.readAt = new Date();
          updateData.status = 'read';
          updateData.$push = {
            interactions: {
              action: 'viewed',
              timestamp: new Date()
            }
          };
        } else if (action === 'dismiss') {
          updateData.isDismissed = true;
          updateData.dismissedAt = new Date();
          updateData.status = 'dismissed';
          updateData.$push = {
            interactions: {
              action: 'dismissed',
              timestamp: new Date()
            }
          };
        }

        await notificationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData, ...(updateData.$push && { $push: updateData.$push }) }
        );

        const updatedNotification = await notificationsCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedNotification);
        break;

      default:
        res.setHeader('Allow', ['PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
