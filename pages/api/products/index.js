import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const { db } = await connectToDatabase();

    switch (method) {
      case 'GET':
        try {
          const products = await db.collection('products').find({}).toArray();
          res.status(200).json(products);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch products' });
        }
        break;

      case 'POST':
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

          // Generate unique product code
          const lastProduct = await db.collection('products')
            .find({})
            .sort({ code: -1 })
            .limit(1)
            .toArray();

          let nextCode = 'PROD001';
          if (lastProduct.length > 0) {
            const lastCode = lastProduct[0].code;
            const number = parseInt(lastCode.replace('PROD', '')) + 1;
            nextCode = `PROD${number.toString().padStart(3, '0')}`;
          }

          const newProduct = {
            name,
            code: nextCode,
            category: category || 'General',
            quantity: parseInt(quantity) || 0,
            purchasePrice: parseFloat(purchasePrice) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            expiryDate: expiryDate || null,
            batchNo: batchNo || null,
            brand: brand || '',
            description: description || '',
            unit: unit || 'pcs',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await db.collection('products').insertOne(newProduct);
          res.status(201).json({ ...newProduct, _id: result.insertedId });
        } catch (error) {
          res.status(500).json({ error: 'Failed to create product' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
}
