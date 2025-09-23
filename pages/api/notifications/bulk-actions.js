import { getCollection } from '../../../lib/mongodb';
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

  if (method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const notificationsCollection = await getCollection('notifications');
    const { action } = req.body;

    if (!action || !['mark_all_read', 'dismiss_all'].includes(action)) {
      return res.status(400).json({ message: 'Valid action (mark_all_read/dismiss_all) is required' });
    }

    let updateData = {
      updatedAt: new Date()
    };

    let filter = { 
      recipient: user.userId,
      isRead: false 
    };

    if (action === 'mark_all_read') {
      updateData.isRead = true;
      updateData.readAt = new Date();
      updateData.status = 'read';
    } else if (action === 'dismiss_all') {
      updateData.isDismissed = true;
      updateData.dismissedAt = new Date();
      updateData.status = 'dismissed';
      filter.isDismissed = false;
    }

    const result = await notificationsCollection.updateMany(
      filter,
      { $set: updateData }
    );

    res.status(200).json({ 
      message: `${result.modifiedCount} notifications updated`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
