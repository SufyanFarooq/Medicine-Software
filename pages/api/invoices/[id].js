import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Invoice ID is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const invoicesCollection = db.collection('invoices');

    if (req.method === 'GET') {
      // Get individual invoice
      const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.status(200).json(invoice);
    } else if (req.method === 'PATCH') {
      // Update invoice
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.invoiceNumber;
      delete updateData.createdAt;

      const result = await invoicesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Return updated invoice
      const updatedInvoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
      res.status(200).json(updatedInvoice);
    } else if (req.method === 'DELETE') {
      // Delete invoice
      const result = await invoicesCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      res.status(200).json({ message: 'Invoice deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling invoice:', error);
    res.status(500).json({ error: 'Failed to process invoice request' });
  }
} 