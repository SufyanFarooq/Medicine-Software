import { getCollection } from '../../../../lib/mongodb';
import { getUserPermissions } from '../../../../lib/permissions';
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
  const { method, query: { id } } = req;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid invoice ID' });
  }

  try {
    const invoicesCollection = await getCollection('invoices');
    const paymentsCollection = await getCollection('payments');

    switch (method) {
      case 'POST':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get the invoice first
        const invoice = await invoicesCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!invoice) {
          return res.status(404).json({ message: 'Invoice not found' });
        }

        const {
          amount,
          paymentMode, // This comes from the form
          paymentDate,
          description,
          reference
        } = req.body;

        // Validate required fields
        if (!amount || !paymentMode || !paymentDate) {
          return res.status(400).json({ message: 'Amount, payment mode, and date are required' });
        }

        // Map paymentMode to paymentMethod
        const paymentMethodMap = {
          'Cash': 'cash',
          'Bank Transfer': 'bank_transfer',
          'Credit Card': 'credit_card',
          'Debit Card': 'debit_card',
          'Check': 'check',
          'Mobile Payment': 'mobile_payment'
        };

        const paymentMethod = paymentMethodMap[paymentMode] || paymentMode.toLowerCase().replace(' ', '_');

        // Create payment record
        const newPayment = {
          paymentType: 'invoice_payment',
          direction: 'incoming',
          amount: parseFloat(amount),
          currency: 'PKR',
          exchangeRate: 1,
          amountInBaseCurrency: parseFloat(amount),
          paymentMethod,
          paymentDate: new Date(paymentDate),
          referenceNumber: reference?.trim() || '',
          invoice: new ObjectId(id),
          customer: invoice.customerId ? new ObjectId(invoice.customerId) : null,
          status: 'completed',
          isReconciled: false,
          refundAmount: 0,
          notes: description?.trim() || `Payment for Invoice ${invoice.invoiceNumber}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const paymentResult = await paymentsCollection.insertOne(newPayment);

        // Update invoice payment status
        const currentPaid = invoice.paidAmount || invoice.amountPaid || 0;
        const newPaidAmount = currentPaid + parseFloat(amount);
        const total = invoice.total || 0;
        
        // Calculate payment status manually since we're using raw MongoDB
        let paymentStatus = 'Pending';  // Use existing invoice status format
        if (newPaidAmount >= total) {
          paymentStatus = 'Paid';
        } else if (newPaidAmount > 0) {
          paymentStatus = 'Partial';
        }

        // Check if overdue
        if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && paymentStatus !== 'Paid') {
          paymentStatus = 'Overdue';
        }

        // Update invoice - support both field name formats for compatibility
        await invoicesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              paidAmount: newPaidAmount,    // New model field
              amountPaid: newPaidAmount,    // Legacy field for compatibility
              paymentStatus,                // Status field
              status: paymentStatus,        // Legacy status field
              balanceDue: Math.max(0, total - newPaidAmount),
              updatedAt: new Date()
            }
          }
        );

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'record_payment',
          details: `Recorded payment of ${amount} Rs for Invoice ${invoice.invoiceNumber}`,
          entityType: 'Invoice',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        // Get updated invoice data
        const updatedInvoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });

        res.status(201).json({ 
          message: 'Payment recorded successfully',
          payment: { _id: paymentResult.insertedId, ...newPayment },
          invoice: {
            paidAmount: newPaidAmount,
            amountPaid: newPaidAmount,    // For compatibility
            balanceDue: Math.max(0, total - newPaidAmount),
            paymentStatus,
            status: paymentStatus,        // For compatibility
            total: total
          }
        });
        break;

      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get all payments for this invoice
        const payments = await paymentsCollection
          .find({ invoice: new ObjectId(id) })
          .sort({ paymentDate: -1 })
          .toArray();

        res.status(200).json({ payments });
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
