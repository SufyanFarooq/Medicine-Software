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
        // Allow GET without authentication for categories dropdown

        const { 
          search,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = {}; // Show all categories (active and inactive)
        
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { color: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        // Performance optimization - Use projection to limit fields
        const projection = {
          name: 1,
          description: 1,
          color: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        };

        const categories = await expenseCategoriesCollection
          .find(filter, { projection })
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await expenseCategoriesCollection.countDocuments(filter);

        res.status(200).json({
          categories,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions || !permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          description,
          color
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!description) requiredFields.push('description');
        if (!color) requiredFields.push('color');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check for duplicate name
        const existingCategory = await expenseCategoriesCollection.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') },
          isActive: { $ne: false }
        });
        if (existingCategory) {
          return res.status(400).json({ message: 'Expense category with this name already exists' });
        }

        const newCategory = {
          name: name.trim(),
          description: description.trim(),
          color: color.trim(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await expenseCategoriesCollection.insertOne(newCategory);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_expense_category',
          details: `Created expense category: ${name}`,
          entityType: 'ExpenseCategory',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newCategory });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Expense Categories API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
