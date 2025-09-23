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

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const batchesCollection = await getCollection('batches');

    switch (method) {
      case 'GET':
        if (!permissions.canManageBatches && !permissions.canManageInventory) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          product: productFilter,
          supplier: supplierFilter,
          warehouse: warehouseFilter,
          status,
          qualityStatus,
          expiring,
          expired,
          lowStock,
          search,
          page = 1,
          limit = 50,
          sortBy = 'expiryDate',
          sortOrder = 'asc'
        } = req.query;

        let filter = { isActive: true };
        
        if (productFilter) filter.product = productFilter;
        if (supplierFilter) filter.supplier = supplierFilter;
        if (warehouseFilter) filter.warehouse = warehouseFilter;
        if (status) filter.status = status;
        if (qualityStatus) filter.qualityStatus = qualityStatus;
        
        if (search) {
          filter.$or = [
            { batchNumber: { $regex: search, $options: 'i' } }
          ];
        }

        // Expiring batches filter (next 30 days)
        if (expiring === 'true') {
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          filter.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
        }

        // Expired batches filter
        if (expired === 'true') {
          filter.expiryDate = { $lt: new Date() };
        }

        // Low stock filter
        if (lowStock === 'true') {
          filter.currentQuantity = { $lte: 10 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const batches = await batchesCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await batchesCollection.countDocuments(filter);

        res.status(200).json({
          batches,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageBatches) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          batchNumber,
          product,
          supplier,
          initialQuantity,
          manufacturingDate,
          expiryDate,
          purchasePrice,
          sellingPrice,
          mrp,
          warehouse,
          location,
          purchaseOrder,
          storageRequirements
        } = req.body;

        // Validate required fields
        if (!batchNumber || !product || !supplier || !initialQuantity || !manufacturingDate || !expiryDate || !purchasePrice || !sellingPrice) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check for duplicate batch number
        const existingBatch = await batchesCollection.findOne({ 
          batchNumber: batchNumber.toUpperCase(),
          isActive: true
        });
        if (existingBatch) {
          return res.status(400).json({ message: 'Batch number already exists' });
        }

        // Validate dates
        const mfgDate = new Date(manufacturingDate);
        const expDate = new Date(expiryDate);
        
        if (mfgDate >= expDate) {
          return res.status(400).json({ message: 'Expiry date must be after manufacturing date' });
        }

        if (mfgDate > new Date()) {
          return res.status(400).json({ message: 'Manufacturing date cannot be in the future' });
        }

        const newBatch = {
          batchNumber: batchNumber.toUpperCase().trim(),
          product,
          supplier,
          initialQuantity: parseInt(initialQuantity),
          currentQuantity: parseInt(initialQuantity),
          soldQuantity: 0,
          returnedQuantity: 0,
          damagedQuantity: 0,
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          receivedDate: new Date(),
          purchasePrice: parseFloat(purchasePrice),
          sellingPrice: parseFloat(sellingPrice),
          mrp: mrp ? parseFloat(mrp) : parseFloat(sellingPrice),
          qualityStatus: 'pending',
          warehouse: warehouse || null,
          location: location || {},
          status: 'active',
          isActive: true,
          isRecalled: false,
          purchaseOrder: purchaseOrder || null,
          totalCost: parseInt(initialQuantity) * parseFloat(purchasePrice),
          costPerUnit: parseFloat(purchasePrice),
          storageRequirements: storageRequirements || {},
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const result = await batchesCollection.insertOne(newBatch);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_batch',
          details: `Created batch: ${batchNumber}`,
          entityType: 'Batch',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newBatch });
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