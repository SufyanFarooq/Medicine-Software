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

  const permissions = getUserPermissions(user.role);

  try {
    const transfersCollection = await getCollection('transfers');

    switch (method) {
      case 'GET':
        if (!permissions.canManageTransfers) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          sourceWarehouse: sourceWarehouseFilter,
          destinationWarehouse: destinationWarehouseFilter,
          product: productFilter,
          status,
          transferType: transferTypeFilter,
          priority: priorityFilter,
          overdue,
          page = 1,
          limit = 50
        } = req.query;

        let filter = {};
        
        if (sourceWarehouseFilter) filter.sourceWarehouse = sourceWarehouseFilter;
        if (destinationWarehouseFilter) filter.destinationWarehouse = destinationWarehouseFilter;
        if (productFilter) filter.product = productFilter;
        if (status) filter.status = status;
        if (transferTypeFilter) filter.transferType = transferTypeFilter;
        if (priorityFilter) filter.priority = priorityFilter;
        
        if (overdue === 'true') {
          filter.expectedDate = { $lt: new Date() };
          filter.status = { $in: ['in_transit', 'partially_received'] };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transfers = await transfersCollection
          .find(filter)
          .sort({ transferDate: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await transfersCollection.countDocuments(filter);

        res.status(200).json({
          transfers,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageTransfers) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          transferType,
          category,
          sourceWarehouse,
          destinationWarehouse,
          product,
          batch,
          requestedQuantity,
          reason,
          priority,
          expectedDate,
          notes
        } = req.body;

        if (!transferType || !category || !sourceWarehouse || !product || !requestedQuantity || !reason) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const newTransfer = {
          transferDate: new Date(),
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          transferType,
          category,
          sourceWarehouse,
          destinationWarehouse: destinationWarehouse || null,
          product,
          batch: batch || null,
          requestedQuantity: parseInt(requestedQuantity),
          transferredQuantity: 0,
          receivedQuantity: 0,
          damagedQuantity: 0,
          shortageQuantity: 0,
          unitCost: 0,
          totalCost: 0,
          status: 'draft',
          reason,
          priority: priority || 'medium',
          notes: notes?.trim() || '',
          requestedBy: user.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const result = await transfersCollection.insertOne(newTransfer);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_transfer',
          details: `Created transfer request`,
          entityType: 'Transfer',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newTransfer });
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