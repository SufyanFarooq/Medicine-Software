import { getCollection } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

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
    const customersCollection = await getCollection('customers');
    const invoicesCollection = await getCollection('invoices');

    switch (method) {
      case 'GET':
        const customer = await customersCollection.findOne({ _id: new ObjectId(id) });
        
        if (!customer) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        // Get date filter from query
        const { filter, fromDate, toDate } = req.query;
        let dateFilter = {};
        
        if (filter === 'custom' && fromDate && toDate) {
          const startDate = new Date(fromDate);
          const endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
          dateFilter = {
            date: {
              $gte: startDate,
              $lte: endDate
            }
          };
        } else if (filter && filter !== 'all') {
          const now = new Date();
          let startDate = new Date();
          
          switch (filter) {
            case 'daily':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'weekly':
              startDate.setDate(startDate.getDate() - 7);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'monthly':
              startDate.setDate(startDate.getDate() - 30);
              startDate.setHours(0, 0, 0, 0);
              break;
          }
          
          dateFilter = {
            date: {
              $gte: startDate,
              $lte: now
            }
          };
        }

        // Get all invoices for this customer with date filter
        const invoiceQuery = {
          $and: [
            {
              $or: [
                { customerId: new ObjectId(id) },
                { customerName: customer.name }
              ]
            },
            Object.keys(dateFilter).length > 0 ? dateFilter : {}
          ]
        };

        const invoices = await invoicesCollection
          .find(invoiceQuery)
          .sort({ date: -1 })
          .toArray();

        // Calculate total purchases
        const totalPurchases = invoices.reduce((sum, invoice) => sum + (parseFloat(invoice.total) || 0), 0);

        res.status(200).json({
          ...customer,
          invoices,
          totalPurchases,
          invoiceCount: invoices.length
        });
        break;

      case 'PUT':
        const { name, phone, address, email } = req.body;

        // Validate required fields
        if (!name || name.trim() === '') {
          return res.status(400).json({ message: 'Customer name is required' });
        }

        const currentCustomer = await customersCollection.findOne({ _id: new ObjectId(id) });
        if (!currentCustomer) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        // Check if another customer with same name exists
        const existingCustomer = await customersCollection.findOne({
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          _id: { $ne: new ObjectId(id) }
        });

        if (existingCustomer) {
          return res.status(400).json({ message: 'Customer with this name already exists' });
        }

        const updatedCustomer = {
          name: name.trim(),
          phone: phone || null,
          address: address || null,
          email: email || null,
          updatedAt: new Date(),
        };

        await customersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedCustomer }
        );

        res.status(200).json({ message: 'Customer updated successfully' });
        break;

      case 'DELETE':
        const customerToDelete = await customersCollection.findOne({ _id: new ObjectId(id) });
        if (!customerToDelete) {
          return res.status(404).json({ message: 'Customer not found' });
        }

        await customersCollection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ message: 'Customer deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

