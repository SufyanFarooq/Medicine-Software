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
    const warehousesCollection = await getCollection('warehouses');

    switch (method) {
      case 'GET':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          warehouseType,
          city,
          status,
          activeOnly = 'true',
          search,
          page = 1,
          limit = 50
        } = req.query;

        let filter = {};
        
        if (activeOnly === 'true') filter.isActive = true;
        if (warehouseType) filter.warehouseType = warehouseType;
        if (city) filter['address.city'] = city;
        if (status) filter.status = status;
        
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { warehouseCode: { $regex: search, $options: 'i' } },
            { 'address.city': { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const warehouses = await warehousesCollection
          .find(filter)
          .sort({ name: 1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await warehousesCollection.countDocuments(filter);

        res.status(200).json({
          warehouses,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          description,
          warehouseType,
          address,
          contactInfo,
          specifications
        } = req.body;

        if (!name || !warehouseType || !address?.city || !address?.country) {
          return res.status(400).json({ message: 'Name, type, city, and country are required' });
        }

        const existingWarehouse = await warehousesCollection.findOne({ 
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          isActive: true
        });
        if (existingWarehouse) {
          return res.status(400).json({ message: 'Warehouse name already exists' });
        }

        const newWarehouse = {
          name: name.trim(),
          description: description?.trim() || '',
          warehouseType,
          address,
          contactInfo: contactInfo || {},
          specifications: specifications || {},
          status: 'active',
          isActive: true,
          isPrimary: false,
          allowsReceiving: true,
          allowsShipping: true,
          allowsTransfers: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const result = await warehousesCollection.insertOne(newWarehouse);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_warehouse',
          details: `Created warehouse: ${name}`,
          entityType: 'Warehouse',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newWarehouse });
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