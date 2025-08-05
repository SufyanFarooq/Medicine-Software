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
    const invoicesCollection = await getCollection('invoices');

    switch (method) {
      case 'GET':
        // Get single invoice
        const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
        if (!invoice) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
        res.status(200).json(invoice);
        break;

      case 'DELETE':
        // Check if user has permission to delete
        if (user.role !== 'super_admin') {
          return res.status(403).json({ message: 'Only Super Admin can delete invoices' });
        }

        // Find the invoice first to get its items for stock restoration
        const invoiceToDelete = await invoicesCollection.findOne({ _id: new ObjectId(id) });
        if (!invoiceToDelete) {
          return res.status(404).json({ message: 'Invoice not found' });
        }

        // Restore medicine quantities (reverse the sale)
        const medicinesCollection = await getCollection('medicines');
        for (const item of invoiceToDelete.items) {
          await medicinesCollection.updateOne(
            { _id: new ObjectId(item.medicineId) },
            { $inc: { quantity: item.quantity } }
          );
        }

        // Delete the invoice
        const result = await invoicesCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Invoice not found' });
        }

        // Log activity
        try {
          const activitiesCollection = await getCollection('activities');
          await activitiesCollection.insertOne({
            userId: user.userId,
            username: user.username,
            action: 'INVOICE_DELETED',
            details: `Deleted invoice: ${invoiceToDelete.invoiceNumber} (Total: ${invoiceToDelete.total})`,
            entityType: 'invoice',
            entityId: invoiceToDelete.invoiceNumber,
            createdAt: new Date(),
            ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
          });
        } catch (activityError) {
          console.error('Failed to log activity:', activityError);
          // Don't fail the main operation if activity logging fails
        }

        res.status(200).json({ message: 'Invoice deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Invoice API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 