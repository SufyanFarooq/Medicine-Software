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
    return res.status(400).json({ message: 'Invalid purchase order ID' });
  }

  try {
    const purchaseOrdersCollection = await getCollection('purchase_orders');

    switch (method) {
      case 'GET':
        if (!permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const purchaseOrder = await purchaseOrdersCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!purchaseOrder) {
          return res.status(404).json({ message: 'Purchase order not found' });
        }

        res.status(200).json(purchaseOrder);
        break;

      case 'PUT':
        if (!permissions.canManagePurchaseOrders) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { status, paymentStatus, paidAmount, notes } = req.body;

        let updateData = {
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (paidAmount !== undefined) updateData.paidAmount = parseFloat(paidAmount);
        if (notes !== undefined) updateData.notes = notes.trim();

        const result = await purchaseOrdersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made' });
        }

        const updatedPO = await purchaseOrdersCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedPO);
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}