import { connectToDatabase } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const batchesCol = db.collection('batches');
    const productsCol = db.collection('products');
    const { id } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid batch ID' });
    }

    if (req.method === 'GET') {
      const batch = await batchesCol.aggregate([
        { $match: { _id: new ObjectId(id) } },
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
            batchNumber: 1,
            productId: 1,
            product: {
              _id: '$product._id',
              name: '$product.name',
              code: '$product.code',
              category: '$product.category'
            },
            quantity: 1,
            remainingQuantity: 1,
            purchasePrice: 1,
            expiryDate: 1,
            manufacturingDate: 1,
            supplier: 1,
            status: 1,
            notes: 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      ]).toArray();

      if (batch.length === 0) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      return res.status(200).json(batch[0]);
    }

    if (req.method === 'PUT') {
      const {
        batchNumber,
        quantity,
        purchasePrice,
        expiryDate,
        manufacturingDate,
        supplier,
        notes,
        status
      } = req.body;

      // Get current batch
      const currentBatch = await batchesCol.findOne({ _id: new ObjectId(id) });
      if (!currentBatch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Check if batch number already exists for this product (if changed)
      if (batchNumber && batchNumber !== currentBatch.batchNumber) {
        const existingBatch = await batchesCol.findOne({
          productId: currentBatch.productId,
          batchNumber: batchNumber,
          _id: { $ne: new ObjectId(id) }
        });
        if (existingBatch) {
          return res.status(409).json({ error: 'Batch number already exists for this product' });
        }
      }

      // Calculate quantity difference for product update
      const quantityDiff = quantity ? parseFloat(quantity) - currentBatch.quantity : 0;

      // Update batch
      const updateFields = {};
      if (batchNumber !== undefined) updateFields.batchNumber = batchNumber;
      if (quantity !== undefined) updateFields.quantity = parseFloat(quantity);
      if (remainingQuantity !== undefined) updateFields.remainingQuantity = parseFloat(remainingQuantity);
      if (purchasePrice !== undefined) updateFields.purchasePrice = parseFloat(purchasePrice);
      if (expiryDate !== undefined) updateFields.expiryDate = new Date(expiryDate);
      if (manufacturingDate !== undefined) updateFields.manufacturingDate = manufacturingDate ? new Date(manufacturingDate) : null;
      if (supplier !== undefined) updateFields.supplier = supplier;
      if (notes !== undefined) updateFields.notes = notes;
      if (status !== undefined) updateFields.status = status;
      
      updateFields.updatedAt = new Date();

      await batchesCol.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateFields }
      );

      // Update product quantity and average purchase price if quantity changed
      if (quantityDiff !== 0) {
        const currentProduct = await productsCol.findOne({ _id: currentBatch.productId });
        const newQuantity = currentProduct.quantity + quantityDiff;
        
        // Recalculate average purchase price based on all batches
        const allBatches = await batchesCol.find({ 
          productId: currentBatch.productId,
          status: 'active'
        }).toArray();
        
        let totalValue = 0;
        let totalQuantity = 0;
        
        allBatches.forEach(batch => {
          totalValue += batch.quantity * batch.purchasePrice;
          totalQuantity += batch.quantity;
        });
        
        const newAveragePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

        await productsCol.updateOne(
          { _id: currentBatch.productId },
          {
            $set: {
              quantity: newQuantity,
              purchasePrice: newAveragePrice,
              updatedAt: new Date()
            }
          }
        );
      }

      return res.status(200).json({ message: 'Batch updated successfully' });
    }

    if (req.method === 'DELETE') {
      const batch = await batchesCol.findOne({ _id: new ObjectId(id) });
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      // Check if batch has remaining quantity
      if (batch.remainingQuantity > 0) {
        return res.status(400).json({ error: 'Cannot delete batch with remaining quantity' });
      }

      // Delete batch
      await batchesCol.deleteOne({ _id: new ObjectId(id) });

      // Recalculate product average purchase price
      const remainingBatches = await batchesCol.find({ 
        productId: batch.productId,
        status: 'active'
      }).toArray();
      
      let totalValue = 0;
      let totalQuantity = 0;
      
      remainingBatches.forEach(b => {
        totalValue += b.quantity * b.purchasePrice;
        totalQuantity += b.quantity;
      });
      
      const newAveragePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;

      await productsCol.updateOne(
        { _id: batch.productId },
        {
          $set: {
            quantity: totalQuantity,
            purchasePrice: newAveragePrice,
            updatedAt: new Date()
          }
        }
      );

      return res.status(200).json({ message: 'Batch deleted successfully' });
    }
  } catch (error) {
    console.error('Batch API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
