import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  processNotifications
} from '../../../lib/notifications';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const notificationsCol = db.collection('notifications');

    if (req.method === 'GET') {
      const { userId, limit = 50, unreadOnly = false } = req.query;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (unreadOnly === 'true') {
        const count = await getUnreadNotificationCount(userId);
        return res.status(200).json({ unreadCount: count });
      }

      const notifications = await getUserNotifications(userId, parseInt(limit));
      return res.status(200).json(notifications);
    }

    if (req.method === 'POST') {
      const { action, userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      if (action === 'mark-all-read') {
        await markAllNotificationsAsRead(userId);
        return res.status(200).json({ message: 'All notifications marked as read' });
      }

      if (action === 'process') {
        const result = await processNotifications();
        return res.status(200).json({ 
          message: 'Notifications processed successfully',
          result 
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    if (req.method === 'PUT') {
      const { notificationId, userId } = req.body;

      if (!notificationId || !userId) {
        return res.status(400).json({ error: 'Notification ID and User ID are required' });
      }

      await markNotificationAsRead(notificationId, userId);
      return res.status(200).json({ message: 'Notification marked as read' });
    }

  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
