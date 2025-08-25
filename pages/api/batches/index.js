import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const batchesCol = db.collection('batches');
    const productsCol = db.collection('products');

    if (req.method === 'GET') {
      const { productId, status, sortBy = 'expiryDate', sortOrder = 'asc' } = req.query;
      
      let filter = {};
      if (productId) filter.productId = new ObjectId(productId);
      if (status) filter.status = status;

      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      const sortField = sortBy === 'expiryDate' ? 'expiryDate' : 'createdAt';

      const batches = await batchesCol.aggregate([
        { $match: filter },
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
        },
        { $sort: { [sortField]: sortDirection } }
      ]).toArray();

      return res.status(200).json(batches);
    }

    if (req.method === 'POST') {
      const {
        productId,
        batchNumber,
        quantity,
        purchasePrice,
        expiryDate,
        manufacturingDate,
        supplier,
        notes
      } = req.body;

      // Validation
      if (!productId || !batchNumber || !quantity || !purchasePrice || !expiryDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if product exists
      const product = await productsCol.findOne({ _id: new ObjectId(productId) });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if batch number already exists for this product
      const existingBatch = await batchesCol.findOne({
        productId: new ObjectId(productId),
        batchNumber: batchNumber
      });
      if (existingBatch) {
        return res.status(409).json({ error: 'Batch number already exists for this product' });
      }

      // Create new batch
      const newBatch = {
        productId: new ObjectId(productId),
        batchNumber,
        quantity: parseFloat(quantity),
        remainingQuantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        expiryDate: new Date(expiryDate),
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
        supplier: supplier || '',
        notes: notes || '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await batchesCol.insertOne(newBatch);

      // Update product quantity and average purchase price
      const currentProduct = await productsCol.findOne({ _id: new ObjectId(productId) });
      const currentQuantity = currentProduct.quantity || 0;
      const currentPurchasePrice = currentProduct.purchasePrice || 0;
      
      // Calculate weighted average purchase price
      const totalValue = (currentQuantity * currentPurchasePrice) + (parseFloat(quantity) * parseFloat(purchasePrice));
      const totalQuantity = currentQuantity + parseFloat(quantity);
      const newAveragePrice = totalValue / totalQuantity;

      await productsCol.updateOne(
        { _id: new ObjectId(productId) },
        {
          $set: {
            quantity: totalQuantity,
            purchasePrice: newAveragePrice,
            updatedAt: new Date()
          }
        }
      );

      return res.status(201).json({
        message: 'Batch created successfully',
        batchId: result.insertedId
      });
    }
  } catch (error) {
    console.error('Batches API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
