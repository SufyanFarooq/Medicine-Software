import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const { method } = req;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const paymentsCollection = await getCollection('payments');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          paymentType: paymentTypeFilter,
          direction: directionFilter,
          paymentMethod: paymentMethodFilter,
          status,
          customer: customerFilter,
          supplier: supplierFilter,
          invoice: invoiceFilter,
          purchaseOrder: purchaseOrderFilter,
          startDate,
          endDate,
          page = 1,
          limit = 50
        } = req.query;

        let filter = {};
        
        if (paymentTypeFilter) filter.paymentType = paymentTypeFilter;
        if (directionFilter) filter.direction = directionFilter;
        if (paymentMethodFilter) filter.paymentMethod = paymentMethodFilter;
        if (status) filter.status = status;
        if (customerFilter) filter.customer = customerFilter;
        if (supplierFilter) filter.supplier = supplierFilter;
        if (invoiceFilter) filter.invoice = invoiceFilter;
        if (purchaseOrderFilter) filter.purchaseOrder = purchaseOrderFilter;
        
        if (startDate || endDate) {
          filter.paymentDate = {};
          if (startDate) filter.paymentDate.$gte = new Date(startDate);
          if (endDate) filter.paymentDate.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const payments = await paymentsCollection
          .find(filter)
          .sort({ createdAt: -1, paymentDate: -1 })  // Sort by creation time first, then payment date
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        // Populate customer and supplier data
        const customersCollection = await getCollection('customers');
        const suppliersCollection = await getCollection('suppliers');
        const invoicesCollection = await getCollection('invoices');
        const usersCollection = await getCollection('users');

        for (let payment of payments) {
          // Populate customer data
          if (payment.customer) {
            const customer = await customersCollection.findOne({ 
              _id: new ObjectId(payment.customer) 
            });
            payment.customer = customer;
          }

          // Populate supplier data
          if (payment.supplier) {
            const supplier = await suppliersCollection.findOne({ 
              _id: new ObjectId(payment.supplier) 
            });
            payment.supplier = supplier;
          }

          // Get invoice number if linked to invoice
          if (payment.invoice) {
            const invoice = await invoicesCollection.findOne({ 
              _id: new ObjectId(payment.invoice) 
            });
            if (invoice) {
              payment.invoiceNumber = invoice.invoiceNumber;
              // If no payment number, use invoice number
              if (!payment.paymentNumber) {
                payment.paymentNumber = `PAY-${invoice.invoiceNumber}`;
              }
            }
          }

          // Populate user data for Created By field
          if (payment.createdBy) {
            const user = await usersCollection.findOne({ 
              _id: new ObjectId(payment.createdBy) 
            }, { 
              projection: { username: 1, role: 1, firstName: 1, lastName: 1 } 
            });
            if (user) {
              payment.createdByUser = {
                username: user.username,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName
              };
            }
          }

          // Generate payment number if not exists
          if (!payment.paymentNumber) {
            const year = new Date(payment.paymentDate).getFullYear();
            const yearStr = year.toString().slice(-2);
            payment.paymentNumber = `PAY${yearStr}-${payment._id.toString().slice(-6).toUpperCase()}`;
          }
        }

        const total = await paymentsCollection.countDocuments(filter);

        res.status(200).json({
          payments,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canViewInvoices && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          paymentType,
          direction,
          amount,
          paymentMethod,
          customer,
          supplier,
          invoice,
          purchaseOrder,
          referenceNumber,
          notes
        } = req.body;

        if (!paymentType || !direction || !amount || !paymentMethod) {
          return res.status(400).json({ message: 'Payment type, direction, amount, and method are required' });
        }

        if (direction === 'incoming' && !customer && !invoice) {
          return res.status(400).json({ message: 'Customer or invoice is required for incoming payments' });
        }

        if (direction === 'outgoing' && !supplier && !purchaseOrder) {
          return res.status(400).json({ message: 'Supplier or purchase order is required for outgoing payments' });
        }

        const newPayment = {
          paymentDate: new Date(),
          paymentType,
          direction,
          amount: parseFloat(amount),
          currency: 'PKR',
          exchangeRate: 1,
          amountInBaseCurrency: parseFloat(amount),
          paymentMethod,
          referenceNumber: referenceNumber?.trim() || '',
          customer: customer || null,
          supplier: supplier || null,
          invoice: invoice || null,
          purchaseOrder: purchaseOrder || null,
          status: 'pending',
          isReconciled: false,
          refundAmount: 0,
          notes: notes?.trim() || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const result = await paymentsCollection.insertOne(newPayment);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_payment',
          details: `Created ${direction} payment of ${amount}`,
          entityType: 'Payment',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newPayment });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}