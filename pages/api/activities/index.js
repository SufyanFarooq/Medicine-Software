import dbConnect from '../../../lib/db';
import { Activity } from '../../../models';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { action, userId, startDate, endDate, limit = 100 } = req.query;

    // Build filter object
    const filter = {};
    
    if (action) {
      filter.action = action;
    }
    
    if (userId) {
      filter.userId = userId;
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

    // Fetch activities with population
    const activities = await Activity.find(filter)
      .populate('userId', 'username fullName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Transform data to match expected format
    const transformedActivities = activities.map(activity => ({
      _id: activity._id,
      userId: activity.userId._id,
      username: activity.userId.username || activity.username,
      action: activity.action,
      details: activity.details,
      entityType: activity.entityType,
      entityId: activity.entityId,
      createdAt: activity.createdAt,
    }));

    res.status(200).json(transformedActivities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 