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
    const invoicesCollection = await getCollection('invoices');

    switch (method) {
      case 'GET':
        const { customerId } = req.query;
        let filter = {};
        if (customerId) {
          filter.customerId = customerId;
        }
        const invoices = await invoicesCollection.find(filter).sort({ createdAt: -1, date: -1 }).toArray();
        
        // Populate user data for Created By field
        const usersCollection = await getCollection('users');
        for (let invoice of invoices) {
          if (invoice.createdBy) {
            const user = await usersCollection.findOne({ 
              _id: new ObjectId(invoice.createdBy) 
            }, { 
              projection: { username: 1, role: 1, firstName: 1, lastName: 1 } 
            });
            if (user) {
              invoice.createdByUser = {
                username: user.username,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
              };
            }
          }
        }
        
        res.status(200).json(invoices);
        break;

      case 'POST':
        const { invoiceNumber, items, subtotal, discount, total, date, globalDiscountPercentage, type, customerId: postCustomerId, customer } = req.body;

        // Validate required fields
        if (!invoiceNumber || !items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const newInvoice = {
          invoiceNumber,
          items,
          subtotal: parseFloat(subtotal),
          discount: parseFloat(discount),
          total: parseFloat(total),
          globalDiscountPercentage: parseFloat(globalDiscountPercentage) || 0, // Save global discount percentage
          type: type || 'product', // Save invoice type
          date: new Date(date),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
        };

        // Store customer information directly in invoice (like crane-management branch)
        if (postCustomerId) {
          newInvoice.customerId = postCustomerId;
        }
        if (customer && typeof customer === 'object') {
          // Store customer details directly in invoice document
          newInvoice.customerName = customer.companyName || '';
          newInvoice.customerEmail = customer.email || '';
          newInvoice.customerPhone = customer.phone || '';
          newInvoice.customerContactPerson = customer.contactPerson || '';
          newInvoice.customerVatNumber = customer.vatNumber || '';
          newInvoice.customerLpoNumber = customer.lpoNumber || '';
        }

        const result = await invoicesCollection.insertOne(newInvoice);
        res.status(201).json({ _id: result.insertedId, ...newInvoice });
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