import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const batchesCol = db.collection('batches');
    const { productId, quantity, pickingMethod = 'FIFO' } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get all active batches for the product, sorted by picking method
    let sortField = 'createdAt'; // FIFO by default
    let sortOrder = 1; // ascending

    if (pickingMethod === 'FEFO') {
      sortField = 'expiryDate';
      sortOrder = 1; // earliest expiry first
    } else if (pickingMethod === 'LIFO') {
      sortField = 'createdAt';
      sortOrder = -1; // newest first
    }

    const batches = await batchesCol.find({
      productId: new ObjectId(productId),
      status: 'active',
      remainingQuantity: { $gt: 0 }
    }).sort({ [sortField]: sortOrder }).toArray();

    if (batches.length === 0) {
      return res.status(404).json({ error: 'No active batches found for this product' });
    }

    let remainingToPick = parseFloat(quantity);
    const pickedBatches = [];
    let totalCost = 0;

    // Pick from batches according to the method
    for (const batch of batches) {
      if (remainingToPick <= 0) break;

      const availableInBatch = Math.min(batch.remainingQuantity, remainingToPick);
      const pickedFromBatch = Math.min(availableInBatch, remainingToPick);

      pickedBatches.push({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        quantity: pickedFromBatch,
        purchasePrice: batch.purchasePrice,
        expiryDate: batch.expiryDate,
        cost: pickedFromBatch * batch.purchasePrice
      });

      totalCost += pickedFromBatch * batch.purchasePrice;
      remainingToPick -= pickedFromBatch;

      // Update batch remaining quantity
      const newRemainingQuantity = batch.remainingQuantity - pickedFromBatch;
      await batchesCol.updateOne(
        { _id: batch._id },
        { 
          $set: { 
            remainingQuantity: newRemainingQuantity,
            updatedAt: new Date()
          }
        }
      );

      // Mark batch as expired if no quantity remaining
      if (newRemainingQuantity <= 0) {
        await batchesCol.updateOne(
          { _id: batch._id },
          { 
            $set: { 
              status: 'expired',
              updatedAt: new Date()
            }
          }
        );
      }
    }

    if (remainingToPick > 0) {
      return res.status(400).json({ 
        error: `Insufficient stock. Only ${parseFloat(quantity) - remainingToPick} available.`,
        available: parseFloat(quantity) - remainingToPick,
        pickedBatches
      });
    }

    return res.status(200).json({
      message: 'Stock picked successfully',
      pickingMethod,
      pickedBatches,
      totalCost,
      totalQuantity: parseFloat(quantity)
    });

  } catch (error) {
    console.error('Batch picking API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
