import { MongoClient } from 'mongodb';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const { db } = await connectToDatabase();
    const warehousesCol = db.collection('warehouses');

    switch (method) {
      case 'GET':
        try {
          const { search, type, status } = req.query;
          
          let filter = { isActive: true };
          
          // Add search filter
          if (search) {
            filter.$or = [
              { name: { $regex: search, $options: 'i' } },
              { code: { $regex: search, $options: 'i' } },
              { location: { $regex: search, $options: 'i' } }
            ];
          }
          
          // Add type filter
          if (type) {
            filter.type = type;
          }
          
          // Add status filter
          if (status) {
            filter.status = status;
          }

          const warehouses = await warehousesCol.find(filter).sort({ createdAt: -1 }).toArray();
          res.status(200).json(warehouses);
        } catch (error) {
          console.error('Error fetching warehouses:', error);
          res.status(500).json({ error: 'Failed to fetch warehouses' });
        }
        break;

      case 'POST':
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

          // Validate required fields
          if (!name || !code || !type) {
            return res.status(400).json({ 
              error: 'Name, code, and type are required fields' 
            });
          }

          // Check for duplicate warehouse code
          const existingWarehouse = await warehousesCol.findOne({ code });
          if (existingWarehouse) {
            return res.status(409).json({ 
              error: 'Warehouse code already exists. Please use a unique code.' 
            });
          }

          const newWarehouse = {
            name: String(name).trim(),
            code: String(code).trim().toUpperCase(),
            type: String(type).trim(),
            location: String(location || '').trim(),
            address: {
              street: String(address?.street || '').trim(),
              city: String(address?.city || '').trim(),
              state: String(address?.state || '').trim(),
              zipCode: String(address?.zipCode || '').trim(),
              country: String(address?.country || 'Pakistan').trim()
            },
            contact: {
              phone: String(contact?.phone || '').trim(),
              email: String(contact?.email || '').trim(),
              website: String(contact?.website || '').trim()
            },
            manager: {
              name: String(manager?.name || '').trim(),
              phone: String(manager?.phone || '').trim(),
              email: String(manager?.email || '').trim()
            },
            settings: {
              enableNotifications: Boolean(settings?.enableNotifications ?? true),
              lowStockThreshold: parseInt(settings?.lowStockThreshold) || 10,
              criticalStockThreshold: parseInt(settings?.criticalStockThreshold) || 5,
              allowNegativeStock: Boolean(settings?.allowNegativeStock ?? false)
            },
            isActive: true,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await warehousesCol.insertOne(newWarehouse);
          res.status(201).json({ 
            ...newWarehouse, 
            _id: result.insertedId 
          });
        } catch (error) {
          console.error('Error creating warehouse:', error);
          res.status(500).json({ error: 'Failed to create warehouse' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}
