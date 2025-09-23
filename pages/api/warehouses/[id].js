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

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid warehouse ID' });
  }

  try {
    const warehousesCollection = await getCollection('warehouses');

    switch (method) {
      case 'GET':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const warehouse = await warehousesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!warehouse) {
          return res.status(404).json({ message: 'Warehouse not found' });
        }

        res.status(200).json(warehouse);
        break;

      case 'PUT':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const existingWarehouse = await warehousesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!existingWarehouse) {
          return res.status(404).json({ message: 'Warehouse not found' });
        }

        const {
          name,
          description,
          address,
          contactInfo,
          specifications,
          status,
          allowsReceiving,
          allowsShipping,
          allowsTransfers
        } = req.body;

        const updateData = {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(address && { address }),
          ...(contactInfo && { contactInfo }),
          ...(specifications && { specifications }),
          ...(status && { status }),
          ...(allowsReceiving !== undefined && { allowsReceiving }),
          ...(allowsShipping !== undefined && { allowsShipping }),
          ...(allowsTransfers !== undefined && { allowsTransfers }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await warehousesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to warehouse' });
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_warehouse',
          details: `Updated warehouse: ${name || existingWarehouse.name}`,
          entityType: 'Warehouse',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const updatedWarehouse = await warehousesCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedWarehouse);
        break;

      case 'DELETE':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const warehouseToDelete = await warehousesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!warehouseToDelete) {
          return res.status(404).json({ message: 'Warehouse not found' });
        }

        // Check if warehouse has products
        const productsCollection = await getCollection('products');
        const warehouseProducts = await productsCollection.countDocuments({ 
          warehouse: id,
          isActive: true 
        });

        if (warehouseProducts > 0) {
          return res.status(400).json({ 
            message: `Cannot delete warehouse. It has ${warehouseProducts} products.` 
          });
        }

        // Soft delete
        await warehousesCollection.updateOne(
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
          action: 'delete_warehouse',
          details: `Deleted warehouse: ${warehouseToDelete.name}`,
          entityType: 'Warehouse',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Warehouse deleted successfully' });
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