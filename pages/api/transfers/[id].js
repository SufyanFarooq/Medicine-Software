import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const { db } = await connectToDatabase();
    const transfersCol = db.collection('transfers');
    const warehousesCol = db.collection('warehouses');
    const inventoryCol = db.collection('inventory');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid transfer ID' });
    }

    switch (method) {
      case 'GET':
        try {
          const transfer = await transfersCol.aggregate([
            { $match: { _id: new ObjectId(id) } },
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
                totalItems: 1,
                totalQuantity: 1,
                totalValue: 1,
                createdAt: 1,
                updatedAt: 1,
                createdBy: 1
              }
            }
          ]).toArray();

          if (transfer.length === 0) {
            return res.status(404).json({ error: 'Transfer not found' });
          }

          res.status(200).json(transfer[0]);
        } catch (error) {
          console.error('Error fetching transfer:', error);
          res.status(500).json({ error: 'Failed to fetch transfer' });
        }
        break;

      case 'PUT':
        try {
          const { status, notes } = req.body;

          // Check if transfer exists
          const existingTransfer = await transfersCol.findOne({ 
            _id: new ObjectId(id) 
          });
          
          if (!existingTransfer) {
            return res.status(404).json({ error: 'Transfer not found' });
          }

          // Validate status transition
          const validStatuses = ['pending', 'approved', 'in_transit', 'completed', 'cancelled', 'rejected'];
          if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ 
              error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
          }

          // Prevent status changes for completed/cancelled transfers
          if (['completed', 'cancelled'].includes(existingTransfer.status)) {
            return res.status(400).json({ 
              error: `Cannot modify transfer with status: ${existingTransfer.status}` 
            });
          }

          const updateData = {};
          if (status !== undefined) updateData.status = status;
          if (notes !== undefined) updateData.notes = String(notes).trim();
          
          updateData.updatedAt = new Date();

          const result = await transfersCol.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Transfer not found' });
          }

          res.status(200).json({ 
            message: 'Transfer updated successfully',
            updatedCount: result.modifiedCount
          });
        } catch (error) {
          console.error('Error updating transfer:', error);
          res.status(500).json({ error: 'Failed to update transfer' });
        }
        break;

      case 'POST':
        try {
          const { action } = req.body;

          if (!action) {
            return res.status(400).json({ error: 'Action is required' });
          }

          // Check if transfer exists
          const transfer = await transfersCol.findOne({ 
            _id: new ObjectId(id) 
          });
          
          if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
          }

          switch (action) {
            case 'approve':
              if (transfer.status !== 'pending') {
                return res.status(400).json({ 
                  error: 'Only pending transfers can be approved' 
                });
              }

              await transfersCol.updateOne(
                { _id: new ObjectId(id) },
                { 
                  $set: { 
                    status: 'approved',
                    updatedAt: new Date()
                  } 
                }
              );

              res.status(200).json({ 
                message: 'Transfer approved successfully' 
              });
              break;

            case 'process':
              if (transfer.status !== 'approved') {
                return res.status(400).json({ 
                  error: 'Only approved transfers can be processed' 
                });
              }

              // Process stock movements
              const session = db.client.startSession();
              
              try {
                await session.withTransaction(async () => {
                  // Reduce stock from source warehouse
                  for (const item of transfer.items) {
                    await inventoryCol.updateOne(
                      { 
                        warehouseId: transfer.fromWarehouseId,
                        productId: item.productId
                      },
                      { 
                        $inc: { quantity: -item.quantity },
                        $set: { lastUpdated: new Date() }
                      },
                      { session }
                    );

                    // Add stock to destination warehouse
                    const existingStock = await inventoryCol.findOne({
                      warehouseId: transfer.toWarehouseId,
                      productId: item.productId
                    }, { session });

                    if (existingStock) {
                      await inventoryCol.updateOne(
                        { 
                          warehouseId: transfer.toWarehouseId,
                          productId: item.productId
                        },
                        { 
                          $inc: { quantity: item.quantity },
                          $set: { lastUpdated: new Date() }
                        },
                        { session }
                      );
                    } else {
                      await inventoryCol.insertOne({
                        warehouseId: transfer.toWarehouseId,
                        productId: item.productId,
                        quantity: item.quantity,
                        lastUpdated: new Date()
                      }, { session });
                    }

                    // Create inventory transaction records
                    await db.collection('inventory_transactions').insertOne({
                      warehouseId: transfer.fromWarehouseId,
                      productId: item.productId,
                      type: 'outflow',
                      quantity: item.quantity,
                      referenceType: 'transfer',
                      referenceId: transfer._id,
                      notes: `Transfer to ${transfer.toWarehouseId}`,
                      timestamp: new Date(),
                      createdBy: 'system'
                    }, { session });

                    await db.collection('inventory_transactions').insertOne({
                      warehouseId: transfer.toWarehouseId,
                      productId: item.productId,
                      type: 'inflow',
                      quantity: item.quantity,
                      referenceType: 'transfer',
                      referenceId: transfer._id,
                      notes: `Transfer from ${transfer.fromWarehouseId}`,
                      timestamp: new Date(),
                      createdBy: 'system'
                    }, { session });
                  }

                  // Update transfer status to completed
                  await transfersCol.updateOne(
                    { _id: new ObjectId(id) },
                    { 
                      $set: { 
                        status: 'completed',
                        completedAt: new Date(),
                        updatedAt: new Date()
                      } 
                    },
                    { session }
                  );
                });
              } finally {
                await session.endSession();
              }

              res.status(200).json({ 
                message: 'Transfer processed successfully. Stock moved between warehouses.' 
              });
              break;

            default:
              res.status(400).json({ 
                error: `Invalid action: ${action}. Valid actions: approve, process` 
              });
          }
        } catch (error) {
          console.error('Error processing transfer action:', error);
          res.status(500).json({ error: 'Failed to process transfer action' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
}
