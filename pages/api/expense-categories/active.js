import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
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

  // For GET requests, allow without authentication for categories dropdown
  let user = null;
  let permissions = null;
  
  if (method !== 'GET') {
    // Verify authentication for POST, PUT, DELETE
    user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    permissions = getUserPermissions(user.role);
  } else {
    // For GET requests, set default permissions
    permissions = { canViewInvoices: true };
  }

  try {
    const expenseCategoriesCollection = await getCollection('expense_categories');

    switch (method) {
      case 'GET':
        // Only return ACTIVE categories for dropdown use

        const { 
          search
        } = req.query;

        let filter = { isActive: true }; // Only active categories
        
        if (search) {
          filter.$and = [
            { isActive: true },
            {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
              ]
            }
          ];
        }

        // Performance optimization - Use projection to limit fields
        const projection = {
          name: 1,
          description: 1,
          color: 1,
          isActive: 1
        };

        const categories = await expenseCategoriesCollection
          .find(filter, { projection })
          .sort({ name: 1 }) // Sort by name for dropdown
          .toArray();

        res.status(200).json({
          categories,
          total: categories.length
        });
        break;

      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Active Expense Categories API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
