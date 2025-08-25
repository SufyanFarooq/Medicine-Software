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
            code,
            barcode,
            category,
            quantity,
            purchasePrice,
            sellingPrice,
            adminDiscount,
            expiryDate,
            batchNo,
            brand,
            description,
            unit
          } = req.body;

          const productsCol = db.collection('products');

          // Enforce unique product code if provided/changed
          if (code) {
            const clash = await productsCol.findOne({ code, _id: { $ne: new ObjectId(id) } });
            if (clash) {
              return res.status(409).json({ error: 'Duplicate product code. Please use a unique code.' });
            }
          }

          // Enforce unique barcode if provided/changed
          if (barcode) {
            const clashBarcode = await productsCol.findOne({ barcode, _id: { $ne: new ObjectId(id) } });
            if (clashBarcode) {
              return res.status(409).json({ error: 'Duplicate barcode. Please use a unique barcode.' });
            }
          }

          // Build update object with only provided fields
          const updateFields = {};
          
          if (name !== undefined) updateFields.name = name;
          if (code !== undefined) updateFields.code = code;
          if (barcode !== undefined) updateFields.barcode = barcode;
          if (category !== undefined) updateFields.category = category;
          if (quantity !== undefined) updateFields.quantity = parseInt(quantity) || 0;
          if (purchasePrice !== undefined) updateFields.purchasePrice = parseFloat(purchasePrice) || 0;
          if (sellingPrice !== undefined) updateFields.sellingPrice = parseFloat(sellingPrice) || 0;
          if (adminDiscount !== undefined) updateFields.adminDiscount = parseFloat(adminDiscount) || 0;
          if (expiryDate !== undefined) updateFields.expiryDate = expiryDate;
          if (batchNo !== undefined) updateFields.batchNo = batchNo;
          if (brand !== undefined) updateFields.brand = brand;
          if (description !== undefined) updateFields.description = description;
          if (unit !== undefined) updateFields.unit = unit;
          
          // Always update the updatedAt timestamp
          updateFields.updatedAt = new Date();

          const result = await productsCol.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateFields }
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
