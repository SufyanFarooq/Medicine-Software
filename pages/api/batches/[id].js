import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
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

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid batch ID' });
  }

  try {
    const batchesCollection = await getCollection('batches');

    switch (method) {
      case 'GET':
        if (!permissions.canManageBatches && !permissions.canManageInventory) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const batch = await batchesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!batch) {
          return res.status(404).json({ message: 'Batch not found' });
        }

        res.status(200).json(batch);
        break;

      case 'PUT':
        if (!permissions.canManageBatches) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const existingBatch = await batchesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!existingBatch) {
          return res.status(404).json({ message: 'Batch not found' });
        }

        const {
          currentQuantity,
          qualityStatus,
          qualityNotes,
          warehouse,
          location,
          storageRequirements,
          notes
        } = req.body;

        const updateData = {
          ...(currentQuantity !== undefined && { currentQuantity: parseInt(currentQuantity) }),
          ...(qualityStatus && { qualityStatus }),
          ...(qualityNotes !== undefined && { qualityNotes: qualityNotes.trim() }),
          ...(warehouse !== undefined && { warehouse }),
          ...(location && { location }),
          ...(storageRequirements && { storageRequirements }),
          ...(notes !== undefined && { notes: notes.trim() }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        // Update quality test date if quality status is being changed
        if (qualityStatus && qualityStatus !== existingBatch.qualityStatus) {
          updateData.qualityTestDate = new Date();
        }

        const result = await batchesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to batch' });
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_batch',
          details: `Updated batch: ${existingBatch.batchNumber}`,
          entityType: 'Batch',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const updatedBatch = await batchesCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedBatch);
        break;

      case 'DELETE':
        if (!permissions.canManageBatches) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const batchToDelete = await batchesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!batchToDelete) {
          return res.status(404).json({ message: 'Batch not found' });
        }

        // Check if batch has current quantity
        if (batchToDelete.currentQuantity > 0) {
          return res.status(400).json({ 
            message: `Cannot delete batch. It still has ${batchToDelete.currentQuantity} units in stock.` 
          });
        }

        // Soft delete - set isActive to false
        await batchesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date(),
              updatedBy: user.userId
            }
          }
        );

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_batch',
          details: `Deleted batch: ${batchToDelete.batchNumber}`,
          entityType: 'Batch',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Batch deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}