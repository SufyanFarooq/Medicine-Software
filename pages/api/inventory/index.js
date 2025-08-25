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

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const inventoryCollection = await getCollection('inventory');
    const productsCollection = await getCollection('products');

    switch (method) {
      case 'GET':
        const { productId, type, startDate, endDate } = req.query;
        
        let filter = {};
        
        if (productId) {
          filter.productId = new ObjectId(productId);
        }
        
        if (type) {
          filter.type = type; // 'inflow' or 'outflow'
        }
        
        if (startDate && endDate) {
          filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          };
        }
        
        const transactions = await inventoryCollection
          .find(filter)
          .sort({ date: -1 })
          .toArray();
        
        res.status(200).json(transactions);
        break;

      case 'POST':
        const { 
          productId: transactionProductId, 
          type: transactionType, 
          quantity, 
          unitPrice, 
          totalAmount, 
          batchNo, 
          expiryDate, 
          supplier, 
          notes,
          referenceType, // 'purchase', 'sale', 'return', 'adjustment'
          referenceId, // ID of related invoice, purchase order, etc.
          date 
        } = req.body;

        // Validate required fields
        if (!transactionProductId || !transactionType || !quantity || !unitPrice || !totalAmount) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate type
        if (!['inflow', 'outflow'].includes(transactionType)) {
          return res.status(400).json({ message: 'Invalid transaction type' });
        }

        // Create transaction record
        const transaction = {
          productId: new ObjectId(transactionProductId),
          type: transactionType,
          quantity: parseFloat(quantity),
          unitPrice: parseFloat(unitPrice),
          totalAmount: parseFloat(totalAmount),
          batchNo: batchNo || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          supplier: supplier || null,
          notes: notes || null,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          date: date ? new Date(date) : new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await inventoryCollection.insertOne(transaction);

        // For outflow transactions from invoices, DON'T update product quantities
        // because they are already updated by the product update API
        if (transactionType === 'outflow' && referenceType === 'sale') {
          // Just record the transaction, don't update product quantity
          res.status(201).json({
            message: 'Transaction recorded successfully',
            transactionId: result.insertedId,
            newQuantity: null // No quantity change for sale transactions
          });
          break;
        }

        // For other transactions (inflow, returns, etc.), update product quantities
        const product = await productsCollection.findOne({ _id: new ObjectId(transactionProductId) });
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }

        let newQuantity = product.quantity;
        if (transactionType === 'inflow') {
          // For new product creation, SET the quantity instead of adding
          if (referenceType === 'creation') {
            newQuantity = parseFloat(quantity);
          } else {
            // For stock updates, add to existing quantity
            newQuantity += parseFloat(quantity);
          }
        } else if (transactionType === 'outflow') {
          newQuantity -= parseFloat(quantity);
          if (newQuantity < 0) {
            return res.status(400).json({ message: 'Insufficient stock for this transaction' });
          }
        }

        // Update product quantity
        await productsCollection.updateOne(
          { _id: new ObjectId(transactionProductId) },
          { 
            $set: { 
              quantity: newQuantity,
              updatedAt: new Date()
            }
          }
        );

        res.status(201).json({
          message: 'Transaction recorded successfully',
          transactionId: result.insertedId,
          newQuantity
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Inventory API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
