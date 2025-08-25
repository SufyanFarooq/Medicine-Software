import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const { db } = await connectToDatabase();
    const warehousesCol = db.collection('warehouses');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }

    switch (method) {
      case 'GET':
        try {
          const warehouse = await warehousesCol.findOne({ 
            _id: new ObjectId(id), 
            isActive: true 
          });
          
          if (!warehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
          }
          
          res.status(200).json(warehouse);
        } catch (error) {
          console.error('Error fetching warehouse:', error);
          res.status(500).json({ error: 'Failed to fetch warehouse' });
        }
        break;

      case 'PUT':
        try {
          const { 
            name, 
            code, 
            type, 
            location, 
            address, 
            contact, 
            manager, 
            settings 
          } = req.body;

          // Check if warehouse exists
          const existingWarehouse = await warehousesCol.findOne({ 
            _id: new ObjectId(id), 
            isActive: true 
          });
          
          if (!existingWarehouse) {
            return res.status(404).json({ error: 'Warehouse not found' });
          }

          // If code is being changed, check for duplicates
          if (code && code !== existingWarehouse.code) {
            const duplicateCode = await warehousesCol.findOne({ 
              code, 
              _id: { $ne: new ObjectId(id) } 
            });
            
            if (duplicateCode) {
              return res.status(409).json({ 
                error: 'Warehouse code already exists. Please use a unique code.' 
              });
            }
          }

          const updateData = {};
          
          // Only update provided fields
          if (name !== undefined) updateData.name = String(name).trim();
          if (code !== undefined) updateData.code = String(code).trim().toUpperCase();
          if (type !== undefined) updateData.type = String(type).trim();
          if (location !== undefined) updateData.location = String(location).trim();
          
          if (address !== undefined) {
            updateData.address = {
              street: String(address?.street || '').trim(),
              city: String(address?.city || '').trim(),
              state: String(address?.state || '').trim(),
              zipCode: String(address?.zipCode || '').trim(),
              country: String(address?.country || 'Pakistan').trim()
            };
          }
          
          if (contact !== undefined) {
            updateData.contact = {
              phone: String(contact?.phone || '').trim(),
              email: String(contact?.email || '').trim(),
              website: String(contact?.website || '').trim()
            };
          }
          
          if (manager !== undefined) {
            updateData.manager = {
              name: String(manager?.name || '').trim(),
              phone: String(manager?.phone || '').trim(),
              email: String(manager?.email || '').trim()
            };
          }
          
          if (settings !== undefined) {
            updateData.settings = {
              enableNotifications: Boolean(settings?.enableNotifications ?? true),
              lowStockThreshold: parseInt(settings?.lowStockThreshold) || 10,
              criticalStockThreshold: parseInt(settings?.criticalStockThreshold) || 5,
              allowNegativeStock: Boolean(settings?.allowNegativeStock ?? false)
            };
          }

          updateData.updatedAt = new Date();

          const result = await warehousesCol.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Warehouse not found' });
          }

          res.status(200).json({ 
            message: 'Warehouse updated successfully',
            updatedCount: result.modifiedCount
          });
        } catch (error) {
          console.error('Error updating warehouse:', error);
          res.status(500).json({ error: 'Failed to update warehouse' });
        }
        break;

      case 'DELETE':
        try {
          // Soft delete - set isActive to false
          const result = await warehousesCol.updateOne(
            { _id: new ObjectId(id) },
            { 
              $set: { 
                isActive: false, 
                deletedAt: new Date(),
                updatedAt: new Date()
              } 
            }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Warehouse not found' });
          }

          res.status(200).json({ 
            message: 'Warehouse deleted successfully' 
          });
        } catch (error) {
          console.error('Error deleting warehouse:', error);
          res.status(500).json({ error: 'Failed to delete warehouse' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}
