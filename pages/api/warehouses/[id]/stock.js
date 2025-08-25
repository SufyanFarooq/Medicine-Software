import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const { db } = await connectToDatabase();
    const warehousesCol = db.collection('warehouses');
    const inventoryCol = db.collection('inventory');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid warehouse ID' });
    }

    // Check if warehouse exists
    const warehouse = await warehousesCol.findOne({ 
      _id: new ObjectId(id), 
      isActive: true 
    });
    
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' });
    }

    switch (method) {
      case 'GET':
        try {
          const { productId, search, category, lowStock, criticalStock } = req.query;
          
          let matchStage = { warehouseId: new ObjectId(id) };
          
          // Add product filter
          if (productId) {
            matchStage.productId = new ObjectId(productId);
          }
          
          // Add search filter
          if (search) {
            matchStage.$or = [
              { 'product.name': { $regex: search, $options: 'i' } },
              { 'product.code': { $regex: search, $options: 'i' } },
              { 'product.barcode': { $regex: search, $options: 'i' } }
            ];
          }
          
          // Add category filter
          if (category) {
            matchStage['product.category'] = category;
          }
          
          // Add stock level filters
          if (lowStock === 'true') {
            matchStage.quantity = { $lte: warehouse.settings?.lowStockThreshold || 10 };
          }
          
          if (criticalStock === 'true') {
            matchStage.quantity = { $lte: warehouse.settings?.criticalStockThreshold || 5 };
          }

          const stockLevels = await inventoryCol.aggregate([
            { $match: matchStage },
            {
              $lookup: {
                from: 'products',
                localField: 'productId',
                foreignField: '_id',
                as: 'product'
              }
            },
            { $unwind: '$product' },
            {
              $project: {
                _id: 1,
                productId: 1,
                quantity: 1,
                product: {
                  _id: 1,
                  name: 1,
                  code: 1,
                  barcode: 1,
                  category: 1,
                  purchasePrice: 1,
                  sellingPrice: 1,
                  minStockLevel: 1
                },
                lastUpdated: 1
              }
            },
            { $sort: { 'product.name': 1 } }
          ]).toArray();

          res.status(200).json(stockLevels);
        } catch (error) {
          console.error('Error fetching stock levels:', error);
          res.status(500).json({ error: 'Failed to fetch stock levels' });
        }
        break;

      case 'POST':
        try {
          const { productId, quantity, type, notes } = req.body;

          if (!productId || !quantity || !type) {
            return res.status(400).json({ 
              error: 'Product ID, quantity, and type are required' 
            });
          }

          // Validate product exists
          const product = await db.collection('products').findOne({ 
            _id: new ObjectId(productId) 
          });
          
          if (!product) {
            return res.status(404).json({ error: 'Product not found' });
          }

          // Check if stock record exists
          let stockRecord = await inventoryCol.findOne({
            warehouseId: new ObjectId(id),
            productId: new ObjectId(productId)
          });

          if (stockRecord) {
            // Update existing stock
            const newQuantity = type === 'inflow' 
              ? stockRecord.quantity + parseInt(quantity)
              : stockRecord.quantity - parseInt(quantity);

            // Check for negative stock if not allowed
            if (newQuantity < 0 && !warehouse.settings?.allowNegativeStock) {
              return res.status(400).json({ 
                error: 'Insufficient stock. Cannot have negative quantity.' 
              });
            }

            await inventoryCol.updateOne(
              { _id: stockRecord._id },
              { 
                $set: { 
                  quantity: newQuantity,
                  lastUpdated: new Date()
                }
              }
            );
          } else {
            // Create new stock record
            if (type === 'outflow') {
              // For outflow, we need to check if there's stock available
              // First check if product has main quantity
              const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
              const availableStock = product ? (product.quantity || 0) : 0;
              
              if (availableStock < parseInt(quantity)) {
                return res.status(400).json({ 
                  error: `Insufficient stock. Product has ${availableStock} units available, but ${quantity} requested.` 
                });
              }
              
              // Create initial inventory record with available stock
              stockRecord = {
                warehouseId: new ObjectId(id),
                productId: new ObjectId(productId),
                quantity: availableStock,
                lastUpdated: new Date()
              };
              
              await inventoryCol.insertOne(stockRecord);
              
              // Now process the outflow
              const newQuantity = availableStock - parseInt(quantity);
              await inventoryCol.updateOne(
                { _id: stockRecord._id },
                { 
                  $set: { 
                    quantity: newQuantity,
                    lastUpdated: new Date()
                  }
                }
              );
            } else {
              // For inflow, create new record with the inflow quantity
              stockRecord = {
                warehouseId: new ObjectId(id),
                productId: new ObjectId(productId),
                quantity: parseInt(quantity),
                lastUpdated: new Date()
              };

              await inventoryCol.insertOne(stockRecord);
            }
          }

          // Create inventory transaction record
          await db.collection('inventory_transactions').insertOne({
            warehouseId: new ObjectId(id),
            productId: new ObjectId(productId),
            type: type,
            quantity: parseInt(quantity),
            previousQuantity: stockRecord.quantity - (type === 'inflow' ? parseInt(quantity) : -parseInt(quantity)),
            newQuantity: stockRecord.quantity,
            notes: notes || '',
            timestamp: new Date(),
            createdBy: 'system' // You can add user ID here when implementing user authentication
          });

          res.status(200).json({ 
            message: 'Stock updated successfully',
            newQuantity: stockRecord.quantity
          });
        } catch (error) {
          console.error('Error updating stock:', error);
          res.status(500).json({ error: 'Failed to update stock' });
        }
        break;

      case 'PUT':
        try {
          const { updates } = req.body;

          if (!Array.isArray(updates)) {
            return res.status(400).json({ 
              error: 'Updates must be an array' 
            });
          }

          const results = [];

          for (const update of updates) {
            const { productId, quantity, type, notes } = update;

            if (!productId || !quantity || !type) {
              results.push({ 
                productId, 
                success: false, 
                error: 'Missing required fields' 
              });
              continue;
            }

            try {
              // Validate product exists
              const product = await db.collection('products').findOne({ 
                _id: new ObjectId(productId) 
              });
              
              if (!product) {
                results.push({ 
                  productId, 
                  success: false, 
                  error: 'Product not found' 
                });
                continue;
              }

              // Check if stock record exists
              let stockRecord = await inventoryCol.findOne({
                warehouseId: new ObjectId(id),
                productId: new ObjectId(productId)
              });

              if (stockRecord) {
                // Update existing stock
                const newQuantity = type === 'inflow' 
                  ? stockRecord.quantity + parseInt(quantity)
                  : stockRecord.quantity - parseInt(quantity);

                // Check for negative stock if not allowed
                if (newQuantity < 0 && !warehouse.settings?.allowNegativeStock) {
                  results.push({ 
                    productId, 
                    success: false, 
                    error: 'Insufficient stock. Cannot have negative quantity.' 
                  });
                  continue;
                }

                await inventoryCol.updateOne(
                  { _id: stockRecord._id },
                  { 
                    $set: { 
                      quantity: newQuantity,
                      lastUpdated: new Date()
                    }
                  }
                );

                // Create inventory transaction record
                await db.collection('inventory_transactions').insertOne({
                  warehouseId: new ObjectId(id),
                  productId: new ObjectId(productId),
                  type: type,
                  quantity: parseInt(quantity),
                  previousQuantity: stockRecord.quantity - (type === 'inflow' ? parseInt(quantity) : -parseInt(quantity)),
                  newQuantity: newQuantity,
                  notes: notes || '',
                  timestamp: new Date(),
                  createdBy: 'system'
                });

                results.push({ 
                  productId, 
                  success: true, 
                  newQuantity: newQuantity 
                });
              } else {
                // Create new stock record
                if (type === 'outflow') {
                  results.push({ 
                    productId, 
                    success: false, 
                    error: 'Cannot create outflow for product with no stock' 
                  });
                  continue;
                }

                stockRecord = {
                  warehouseId: new ObjectId(id),
                  productId: new ObjectId(productId),
                  quantity: parseInt(quantity),
                  lastUpdated: new Date()
                };

                await inventoryCol.insertOne(stockRecord);

                // Create inventory transaction record
                await db.collection('inventory_transactions').insertOne({
                  warehouseId: new ObjectId(id),
                  productId: new ObjectId(productId),
                  type: type,
                  quantity: parseInt(quantity),
                  previousQuantity: 0,
                  newQuantity: parseInt(quantity),
                  notes: notes || '',
                  timestamp: new Date(),
                  createdBy: 'system'
                });

                results.push({ 
                  productId, 
                  success: true, 
                  newQuantity: parseInt(quantity) 
                });
              }
            } catch (error) {
              results.push({ 
                productId, 
                success: false, 
                error: error.message 
              });
            }
          }

          res.status(200).json({ 
            message: 'Bulk stock update completed',
            results: results
          });
        } catch (error) {
          console.error('Error updating bulk stock:', error);
          res.status(500).json({ error: 'Failed to update bulk stock' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}
