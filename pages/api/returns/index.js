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
    const returnsCollection = await getCollection('returns');
    const medicinesCollection = await getCollection('medicines');
    const invoicesCollection = await getCollection('invoices');

    switch (method) {
      case 'GET':
        const returns = await returnsCollection.find({}).sort({ date: -1 }).toArray();
        res.status(200).json(returns);
        break;

      case 'POST':
        const { 
          returnNumber, 
          medicineId, 
          medicineName, 
          medicineCode, 
          customerName, 
          customerPhone, 
          quantity, 
          reason, 
          notes, 
          date,
          invoiceId,
          invoiceNumber
        } = req.body;

        // Validate required fields
        if (!returnNumber || !medicineId || !medicineName || !quantity || !reason) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get medicine price for return value calculation
        const medicineData = await medicinesCollection.findOne({ _id: new ObjectId(medicineId) });
        let returnValue = 0;
        
        // If return is from an invoice, calculate return value with discount applied
        if (invoiceId) {
          try {
            const invoice = await invoicesCollection.findOne({ _id: new ObjectId(invoiceId) });
            if (invoice) {
              const item = invoice.items.find(item => item.medicineId === medicineId);
              if (item) {
                                 // Calculate the proportion of the item being returned
                 const returnProportion = parseInt(quantity) / item.quantity;
                 // Apply the same discount proportion to the return value
                 const originalItemTotal = item.price * item.quantity;
                 const originalItemWithDiscount = originalItemTotal * (1 - 0.03); // 3% discount
                 returnValue = originalItemWithDiscount * returnProportion;
                 

              }
            }
          } catch (error) {
            console.error('Error calculating return value with discount:', error);
            // Fallback to simple calculation
            returnValue = medicineData ? (medicineData.sellingPrice * parseInt(quantity)) : 0;
          }
        } else {
          // For returns not from invoice, use simple calculation
          returnValue = medicineData ? (medicineData.sellingPrice * parseInt(quantity)) : 0;
        }

        const newReturn = {
          returnNumber,
          medicineId,
          medicineName,
          medicineCode,
          customerName: customerName || '',
          customerPhone: customerPhone || '',
          quantity: parseInt(quantity),
          price: medicineData ? medicineData.sellingPrice : 0,
          returnValue: returnValue,
          reason,
          notes: notes || '',
          date: new Date(date),
          status: 'Approved',
          invoiceId: invoiceId || null,
          invoiceNumber: invoiceNumber || null,
          createdAt: new Date(),
          createdBy: user.userId,
        };

        const result = await returnsCollection.insertOne(newReturn);
        
        // Update original invoice if return is from an invoice
        if (invoiceId) {
          try {
            const invoice = await invoicesCollection.findOne({ _id: new ObjectId(invoiceId) });
            if (invoice) {
              // Find the item in the invoice and update its quantity
              const updatedItems = invoice.items.map(item => {
                if (item.medicineId === medicineId) {
                  const newQuantity = Math.max(0, item.quantity - parseInt(quantity));
                  return {
                    ...item,
                    quantity: newQuantity,
                    total: item.price * newQuantity
                  };
                }
                return item;
              });

              // Recalculate invoice totals
              const newSubtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
              const newDiscount = newSubtotal * 0.03; // 3% discount
              const newTotal = newSubtotal - newDiscount;

              // Update the invoice
              await invoicesCollection.updateOne(
                { _id: new ObjectId(invoiceId) },
                { 
                  $set: { 
                    items: updatedItems,
                    subtotal: newSubtotal,
                    discount: newDiscount,
                    total: newTotal,
                    updatedAt: new Date()
                  }
                }
              );
            }
          } catch (invoiceError) {
            console.error('Error updating invoice:', invoiceError);
            // Continue with return processing even if invoice update fails
          }
        }
        
        // Automatically update medicine inventory (add back to stock)
        if (medicineData) {
          const newQuantity = medicineData.quantity + parseInt(quantity);
          await medicinesCollection.updateOne(
            { _id: new ObjectId(medicineId) },
            { $set: { quantity: newQuantity, updatedAt: new Date() } }
          );
        }
        
        res.status(201).json({ _id: result.insertedId, ...newReturn });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 