import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { method } = req;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Invoice ID is required' });
  }

  try {
    const invoicesCollection = await getCollection('invoices');

    switch (method) {
      case 'GET':
        const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
        if (!invoice) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
        res.status(200).json(invoice);
        break;

      case 'PUT':
        const updateData = req.body;
        const result = await invoicesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              ...updateData,
              updatedAt: new Date(),
              updatedBy: user.userId
            }
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
        res.status(200).json({ message: 'Invoice updated successfully' });
        break;

      case 'DELETE':
        const deleteResult = await invoicesCollection.deleteOne({ _id: new ObjectId(id) });
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
        res.status(200).json({ message: 'Invoice deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Invoice API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}