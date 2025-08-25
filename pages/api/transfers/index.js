import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const { db } = await connectToDatabase();
    const transfersCol = db.collection('transfers');
    const warehousesCol = db.collection('warehouses');
    const productsCol = db.collection('products');

    switch (method) {
      case 'GET':
        try {
          const { fromWarehouse, toWarehouse, status, type, startDate, endDate } = req.query;
          
          let filter = {};
          
          // Add warehouse filters
          if (fromWarehouse) {
            filter.fromWarehouseId = new ObjectId(fromWarehouse);
          }
          
          if (toWarehouse) {
            filter.toWarehouseId = new ObjectId(toWarehouse);
          }
          
          // Add status filter
          if (status) {
            filter.status = status;
          }
          
          // Add type filter
          if (type) {
            filter.type = type;
          }
          
          // Add date range filter
          if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
              filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
              filter.createdAt.$lte = new Date(endDate);
            }
          }

          const transfers = await transfersCol.aggregate([
            { $match: filter },
            {
              $lookup: {
                from: 'warehouses',
                localField: 'fromWarehouseId',
                foreignField: '_id',
                as: 'fromWarehouse'
              }
            },
            {
              $lookup: {
                from: 'warehouses',
                localField: 'toWarehouseId',
                foreignField: '_id',
                as: 'toWarehouse'
              }
            },
            {
              $lookup: {
                from: 'products',
                localField: 'items.productId',
                foreignField: '_id',
                as: 'products'
              }
            },
            { $unwind: '$fromWarehouse' },
            { $unwind: '$toWarehouse' },
            {
              $project: {
                _id: 1,
                transferNumber: 1,
                fromWarehouseId: 1,
                toWarehouseId: 1,
                fromWarehouse: {
                  _id: '$fromWarehouse._id',
                  name: '$fromWarehouse.name',
                  code: '$fromWarehouse.code',
                  location: '$fromWarehouse.location'
                },
                toWarehouse: {
                  _id: '$toWarehouse._id',
                  name: '$toWarehouse.name',
                  code: '$toWarehouse.code',
                  location: '$toWarehouse.location'
                },
                items: 1,
                status: 1,
                type: 1,
                reason: 1,
                notes: 1,
                createdAt: 1,
                updatedAt: 1,
                createdBy: 1
              }
            },
            { $sort: { createdAt: -1 } }
          ]).toArray();

          res.status(200).json(transfers);
        } catch (error) {
          console.error('Error fetching transfers:', error);
          res.status(500).json({ error: 'Failed to fetch transfers' });
        }
        break;

      case 'POST':
        try {
          const { 
            fromWarehouseId, 
            toWarehouseId, 
            items, 
            type, 
            reason, 
            notes 
          } = req.body;

          // Validate required fields
          if (!fromWarehouseId || !toWarehouseId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
              error: 'From warehouse, to warehouse, and items are required' 
            });
          }

          // Validate warehouses exist
          const fromWarehouse = await warehousesCol.findOne({ 
            _id: new ObjectId(fromWarehouseId), 
            isActive: true 
          });
          
          if (!fromWarehouse) {
            return res.status(404).json({ error: 'Source warehouse not found' });
          }

          const toWarehouse = await warehousesCol.findOne({ 
            _id: new ObjectId(toWarehouseId), 
            isActive: true 
          });
          
          if (!toWarehouse) {
            return res.status(404).json({ error: 'Destination warehouse not found' });
          }

          // Ensure source and destination are different
          if (fromWarehouseId === toWarehouseId) {
            return res.status(400).json({ 
              error: 'Source and destination warehouses must be different' 
            });
          }

          // Validate items and check stock availability
          const validatedItems = [];
          for (const item of items) {
            const { productId, quantity } = item;
            
            if (!productId || !quantity || quantity <= 0) {
              return res.status(400).json({ 
                error: 'Invalid item data. Product ID and positive quantity required.' 
              });
            }

            // Check if product exists
            const product = await productsCol.findOne({ _id: new ObjectId(productId) });
            if (!product) {
              return res.status(404).json({ 
                error: `Product with ID ${productId} not found` 
              });
            }

            // Check stock availability - first try warehouse-specific inventory, then fall back to product quantity
            let availableStock = 0;
            const stockRecord = await db.collection('inventory').findOne({
              warehouseId: new ObjectId(fromWarehouseId),
              productId: new ObjectId(productId)
            });

            if (stockRecord) {
              // Use warehouse-specific stock
              availableStock = stockRecord.quantity;
            } else {
              // Fall back to product's main quantity if no warehouse-specific record exists
              availableStock = product.quantity || 0;
              
              // If this is the first time accessing this product from this warehouse,
              // we should create an initial inventory record
              if (availableStock > 0) {
                await db.collection('inventory').insertOne({
                  warehouseId: new ObjectId(fromWarehouseId),
                  productId: new ObjectId(productId),
                  quantity: availableStock,
                  lastUpdated: new Date()
                });
              }
            }

            if (availableStock < quantity) {
              return res.status(400).json({ 
                error: `Insufficient stock for product ${product.name}. Available: ${availableStock}, Requested: ${quantity}` 
              });
            }

            validatedItems.push({
              productId: new ObjectId(productId),
              productName: product.name,
              productCode: product.code,
              quantity: parseInt(quantity),
              unitCost: product.purchasePrice || 0
            });
          }

          // Generate unique transfer number
          const transferNumber = `TRF${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

          const newTransfer = {
            transferNumber,
            fromWarehouseId: new ObjectId(fromWarehouseId),
            toWarehouseId: new ObjectId(toWarehouseId),
            items: validatedItems,
            type: type || 'manual',
            reason: reason || 'stock_replenishment',
            notes: notes || '',
            status: 'pending',
            totalItems: validatedItems.length,
            totalQuantity: validatedItems.reduce((sum, item) => sum + item.quantity, 0),
            totalValue: validatedItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system' // You can add user ID here when implementing user authentication
          };

          const result = await transfersCol.insertOne(newTransfer);
          res.status(201).json({ 
            ...newTransfer, 
            _id: result.insertedId 
          });
        } catch (error) {
          console.error('Error creating transfer:', error);
          res.status(500).json({ error: 'Failed to create transfer' });
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
