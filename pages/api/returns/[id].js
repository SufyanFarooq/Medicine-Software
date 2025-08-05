import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
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
  const { id } = req.query;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const returnsCollection = await getCollection('returns');
    const medicinesCollection = await getCollection('medicines');

    switch (method) {
      case 'GET':
        const returnItem = await returnsCollection.findOne({ _id: new ObjectId(id) });
        if (!returnItem) {
          return res.status(404).json({ message: 'Return not found' });
        }
        res.status(200).json(returnItem);
        break;

      case 'PUT':
        const { status } = req.body;

        if (!status || !['Pending', 'Approved', 'Rejected'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }

        const returnToUpdate = await returnsCollection.findOne({ _id: new ObjectId(id) });
        if (!returnToUpdate) {
          return res.status(404).json({ message: 'Return not found' });
        }

        // If approving the return, update medicine inventory
        if (status === 'Approved' && returnToUpdate.status === 'Pending') {
          // Update medicine quantity (add back to inventory)
          const medicine = await medicinesCollection.findOne({ _id: new ObjectId(returnToUpdate.medicineId) });
          if (medicine) {
            const newQuantity = medicine.quantity + returnToUpdate.quantity;
            await medicinesCollection.updateOne(
              { _id: new ObjectId(returnToUpdate.medicineId) },
              { $set: { quantity: newQuantity, updatedAt: new Date() } }
            );
          }
        }

        // Update return status
        const result = await returnsCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              status,
              updatedAt: new Date(),
              ...(status === 'Approved' && { approvedAt: new Date() }),
              ...(status === 'Rejected' && { rejectedAt: new Date() })
            } 
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Return not found' });
        }

        res.status(200).json({ message: 'Return status updated successfully' });
        break;

      case 'DELETE':
        // Check if user has permission to delete
        if (user.role !== 'super_admin') {
          return res.status(403).json({ message: 'Only Super Admin can delete returns' });
        }

        // Get return details before deletion for activity logging
        const returnToDelete = await returnsCollection.findOne({ _id: new ObjectId(id) });
        if (!returnToDelete) {
          return res.status(404).json({ message: 'Return not found' });
        }

        const deleteResult = await returnsCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'Return not found' });
        }

        // Log activity
        try {
          const activitiesCollection = await getCollection('activities');
          await activitiesCollection.insertOne({
            userId: user.userId,
            username: user.username,
            action: 'RETURN_DELETED',
            details: `Deleted return: ${returnToDelete.returnNumber} for ${returnToDelete.medicineName} (${returnToDelete.quantity} units)`,
            entityType: 'return',
            entityId: returnToDelete.returnNumber,
            createdAt: new Date(),
            ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
          });
        } catch (activityError) {
          console.error('Failed to log activity:', activityError);
          // Don't fail the main operation if activity logging fails
        }

        res.status(200).json({ message: 'Return deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 