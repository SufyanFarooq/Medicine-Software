import { getCollection } from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserPermissions } from '../../../../../lib/permissions';
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
  const { id } = req.query;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const leavesCollection = await getCollection('leaves');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid leave ID' });
    }

    if (method === 'POST') {
        if (!permissions.canManageLeaves) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { approvalNotes } = req.body;

      // Check if leave exists
      const existingLeave = await leavesCollection.findOne({ 
        _id: new ObjectId(id),
        isActive: { $ne: false }
      });

      if (!existingLeave) {
        return res.status(404).json({ message: 'Leave request not found' });
      }

      if (existingLeave.status !== 'pending') {
        return res.status(400).json({ message: 'Leave request is not pending' });
      }

      const updateData = {
        status: 'rejected',
        approverId: user.userId,
        approvalNotes: approvalNotes?.trim() || '',
        approvedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: user.userId
      };

      const result = await leavesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Leave request not found' });
      }

      // Log activity
      const activitiesCollection = await getCollection('activities');
      await activitiesCollection.insertOne({
        userId: user.userId,
        username: user.username,
        action: 'reject_leave',
        details: `Rejected leave request ${id}`,
        entityType: 'Leave',
        entityId: id,
        createdAt: new Date(),
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      res.status(200).json({ message: 'Leave request rejected successfully' });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Leave Rejection API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
