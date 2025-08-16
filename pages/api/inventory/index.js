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
    const inventoryCollection = await getCollection('inventory_transactions');
    const medicinesCollection = await getCollection('medicines');

    switch (method) {
      case 'GET':
        const { medicineId, type, startDate, endDate } = req.query;
        
        let filter = {};
        
        if (medicineId) {
          filter.medicineId = new ObjectId(medicineId);
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
          medicineId: transactionMedicineId, 
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
        if (!transactionMedicineId || !transactionType || !quantity || !unitPrice || !totalAmount) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate type
        if (!['inflow', 'outflow'].includes(transactionType)) {
          return res.status(400).json({ message: 'Invalid transaction type' });
        }

        // Create transaction record
        const transaction = {
          medicineId: new ObjectId(transactionMedicineId),
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

        // For outflow transactions from invoices, DON'T update medicine quantities
        // because they are already updated by the medicine update API
        if (transactionType === 'outflow' && referenceType === 'sale') {
          // Just record the transaction, don't update medicine quantity
          res.status(201).json({
            message: 'Transaction recorded successfully',
            transactionId: result.insertedId,
            newQuantity: null // No quantity change for sale transactions
          });
          break;
        }

        // For other transactions (inflow, returns, etc.), update medicine quantities
        const medicine = await medicinesCollection.findOne({ _id: new ObjectId(transactionMedicineId) });
        if (!medicine) {
          return res.status(404).json({ message: 'Medicine not found' });
        }

        let newQuantity = medicine.quantity;
        if (transactionType === 'inflow') {
          // For new medicine creation, SET the quantity instead of adding
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

        // Update medicine quantity
        await medicinesCollection.updateOne(
          { _id: new ObjectId(transactionMedicineId) },
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
