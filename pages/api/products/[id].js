import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method, query: { id } } = req;

  try {
    const { db } = await connectToDatabase();

    switch (method) {
      case 'GET':
        try {
          const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
          if (!product) {
            return res.status(404).json({ error: 'Product not found' });
          }
          res.status(200).json(product);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch product' });
        }
        break;

      case 'PUT':
        try {
          const {
            name,
            category,
            quantity,
            purchasePrice,
            sellingPrice,
            expiryDate,
            batchNo,
            brand,
            description,
            unit
          } = req.body;

          const updatedProduct = {
            name,
            category: category || 'General',
            quantity: parseInt(quantity) || 0,
            purchasePrice: parseFloat(purchasePrice) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            expiryDate: expiryDate || null,
            batchNo: batchNo || null,
            brand: brand || '',
            description: description || '',
            unit: unit || 'pcs',
            updatedAt: new Date()
          };

          const result = await db.collection('products').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedProduct }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
          }

          res.status(200).json({ message: 'Product updated successfully' });
        } catch (error) {
          res.status(500).json({ error: 'Failed to update product' });
        }
        break;

      case 'DELETE':
        try {
          const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
          }

          res.status(200).json({ message: 'Product deleted successfully' });
        } catch (error) {
          res.status(500).json({ error: 'Failed to delete product' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
}
