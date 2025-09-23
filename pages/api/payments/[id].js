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
  const { method, query: { id } } = req;

  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid payment ID' });
  }

  try {
    const paymentsCollection = await getCollection('payments');
    const activitiesCollection = await getCollection('activities');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const payment = await paymentsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!payment) {
          return res.status(404).json({ message: 'Payment not found' });
        }

        // Populate customer and supplier data if available
        if (payment.customer) {
          const customersCollection = await getCollection('customers');
          const customer = await customersCollection.findOne({ 
            _id: new ObjectId(payment.customer) 
          });
          payment.customer = customer;
        }

        if (payment.supplier) {
          const suppliersCollection = await getCollection('suppliers');
          const supplier = await suppliersCollection.findOne({ 
            _id: new ObjectId(payment.supplier) 
          });
          payment.supplier = supplier;
        }

        res.status(200).json(payment);
        break;

      case 'PUT':
        if (!permissions.canViewInvoices && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const existingPayment = await paymentsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!existingPayment) {
          return res.status(404).json({ message: 'Payment not found' });
        }

        const {
          paymentType,
          direction,
          amount,
          paymentDate,
          paymentMethod,
          referenceNumber,
          status,
          notes
        } = req.body;

        const updateData = {
          ...(paymentType && { paymentType }),
          ...(direction && { direction }),
          ...(amount !== undefined && { 
            amount: parseFloat(amount),
            amountInBaseCurrency: parseFloat(amount) * (existingPayment.exchangeRate || 1)
          }),
          ...(paymentDate && { paymentDate: new Date(paymentDate) }),
          ...(paymentMethod && { paymentMethod }),
          ...(referenceNumber !== undefined && { referenceNumber: referenceNumber.trim() }),
          ...(status && { status }),
          ...(notes !== undefined && { notes: notes.trim() }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await paymentsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to payment' });
        }

        // Log activity
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_payment',
          details: `Updated payment: ${existingPayment.paymentNumber || id}`,
          entityType: 'Payment',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const updatedPayment = await paymentsCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedPayment);
        break;

      case 'DELETE':
        if (!permissions.canViewInvoices && !permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const paymentToDelete = await paymentsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!paymentToDelete) {
          return res.status(404).json({ message: 'Payment not found' });
        }

        // Check if payment can be deleted (allow all statuses for now)
        // Note: In production, you might want to restrict this based on business rules
        if (paymentToDelete.status === 'refunded') {
          return res.status(400).json({ 
            message: 'Cannot delete refunded payments' 
          });
        }

        await paymentsCollection.deleteOne({ _id: new ObjectId(id) });

        // Log activity
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_payment',
          details: `Deleted payment: ${paymentToDelete.paymentNumber || id}`,
          entityType: 'Payment',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Payment deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
