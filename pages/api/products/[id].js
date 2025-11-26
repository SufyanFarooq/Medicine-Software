import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const productsCollection = await getCollection('products');

    switch (method) {
      case 'GET':
        const product = await productsCollection.findOne({ _id: new ObjectId(id) });
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
        break;

      case 'PUT':
        const { name, code, quantity, purchasePrice, sellingPrice, expiryDate, batchNo } = req.body;

        // Validate required fields
        if (!name || !code || quantity === undefined || !purchasePrice || !sellingPrice || !expiryDate) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get current product to compare quantities
        const currentProduct = await productsCollection.findOne({ _id: new ObjectId(id) });
        if (!currentProduct) {
          return res.status(404).json({ message: 'Product not found' });
        }

        // Check for duplicate code (excluding current product)
        const existingProduct = await productsCollection.findOne({ 
          code, 
          _id: { $ne: new ObjectId(id) } 
        });
        if (existingProduct) {
          return res.status(400).json({ message: 'Product code already exists' });
        }

        const updateData = {
          name,
          code,
          quantity: parseInt(quantity),
          purchasePrice: parseFloat(purchasePrice),
          sellingPrice: parseFloat(sellingPrice),
          expiryDate: new Date(expiryDate),
          batchNo: batchNo || '',
          updatedAt: new Date(),
        };

        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Product not found' });
        }

        // Track inventory change if quantity changed
        const newQuantity = parseInt(quantity);
        const oldQuantity = currentProduct.quantity;
        
        if (newQuantity !== oldQuantity) {
          try {
            const inventoryCollection = await getCollection('inventory');
            const quantityDifference = newQuantity - oldQuantity;
            
            await inventoryCollection.insertOne({
              productId: id,
              productName: name,
              productCode: code,
              type: quantityDifference > 0 ? 'add' : 'adjustment',
              quantity: Math.abs(quantityDifference),
              previousStock: oldQuantity,
              newStock: newQuantity,
              reason: quantityDifference > 0 ? 'Stock Addition' : 'Stock Adjustment',
              batchNo: batchNo || '',
              expiryDate: new Date(expiryDate),
              purchasePrice: parseFloat(purchasePrice),
              notes: `Stock ${quantityDifference > 0 ? 'added' : 'adjusted'} via product update`,
              userId: user.userId,
              username: user.username,
              createdAt: new Date()
            });
          } catch (inventoryError) {
            console.error('Error logging inventory change:', inventoryError);
            // Don't fail the update if inventory logging fails
          }
        }

        res.status(200).json({ message: 'Product updated successfully' });
        break;

      case 'DELETE':
        // Get product details before deletion for activity logging
        const productToDelete = await productsCollection.findOne({ _id: new ObjectId(id) });
        if (!productToDelete) {
          return res.status(404).json({ message: 'Product not found' });
        }

        const deleteResult = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'Product not found' });
        }

        // Log activity
        try {
          const activitiesCollection = await getCollection('activities');
          await activitiesCollection.insertOne({
            userId: user.userId,
            username: user.username,
            action: 'PRODUCT_DELETED',
            details: `Deleted product: ${productToDelete.name} (${productToDelete.code})`,
            entityType: 'product',
            entityId: productToDelete.code,
            createdAt: new Date(),
            ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
          });
        } catch (activityError) {
          console.error('Failed to log activity:', activityError);
          // Don't fail the main operation if activity logging fails
        }

        res.status(200).json({ message: 'Product deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 