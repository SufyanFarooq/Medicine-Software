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
            code, 
            barcode, 
            category, 
            description, 
            purchasePrice, 
            sellingPrice, 
            quantity, 
            adminDiscount,
            minStockLevel, 
            supplier, 
            expiryDate, 
            batchNumber 
          } = req.body;

          const productsCol = db.collection('products');

          // Prepare unique product code
          // If client provided a code, validate uniqueness
          if (code) {
            const existingWithCode = await productsCol.findOne({ code });
            if (existingWithCode) {
              return res.status(409).json({ error: 'Duplicate product code. Please use a unique code.' });
            }
          }

          // If client provided a barcode, validate uniqueness
          if (barcode) {
            const existingWithBarcode = await productsCol.findOne({ barcode });
            if (existingWithBarcode) {
              return res.status(409).json({ error: 'Duplicate barcode. Please use a unique barcode.' });
            }
          }

          // Generate unique product code when not provided
          let nextCode = 'PROD001';
          if (!code) {
            const lastProduct = await productsCol
              .find({ code: { $regex: '^PROD\\d+$' } })
              .sort({ code: -1 })
              .limit(1)
              .toArray();

            if (lastProduct.length > 0) {
              const lastCode = lastProduct[0].code;
              const number = parseInt(lastCode.replace('PROD', ''), 10) + 1;
              nextCode = `PROD${number.toString().padStart(3, '0')}`;
            }

            // Ensure uniqueness in case of race conditions
            // Increment until we find a code that does not exist
            // (bounded loop just in case)
            let attempts = 0;
            while (attempts < 50 && (await productsCol.findOne({ code: nextCode }))) {
              const num = parseInt(nextCode.replace('PROD', ''), 10) + 1;
              nextCode = `PROD${num.toString().padStart(3, '0')}`;
              attempts += 1;
            }
          }

          const newProduct = {
            name,
            code: code || nextCode,
            barcode: barcode || `BAR${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            category: category || 'General',
            description: description || '',
            purchasePrice: parseFloat(purchasePrice) || 0,
            sellingPrice: parseFloat(sellingPrice) || 0,
            quantity: parseInt(quantity) || 0,
            adminDiscount: parseFloat(adminDiscount) || 0,
            minStockLevel: parseInt(minStockLevel) || 10,
            supplier: supplier || '',
            expiryDate: expiryDate || null,
            batchNumber: batchNumber || null,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await productsCol.insertOne(newProduct);
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
