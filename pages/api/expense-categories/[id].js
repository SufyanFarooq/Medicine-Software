import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
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
  const { id } = req.query;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const expenseCategoriesCollection = await getCollection('expense_categories');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid expense category ID' });
    }

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const category = await expenseCategoriesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!category) {
          return res.status(404).json({ message: 'Expense category not found' });
        }

        res.status(200).json(category);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          description,
          color,
          isActive
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

        // Check if category exists
        const existingCategory = await expenseCategoriesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!existingCategory) {
          return res.status(404).json({ message: 'Expense category not found' });
        }

        // Check for duplicate name (excluding current category)
        const duplicateCategory = await expenseCategoriesCollection.findOne({ 
          name: { $regex: new RegExp(`^${name}$`, 'i') },
          _id: { $ne: new ObjectId(id) },
          isActive: { $ne: false }
        });
        if (duplicateCategory) {
          return res.status(400).json({ message: 'Expense category with this name already exists' });
        }

        const updateData = {
          name: name.trim(),
          description: description.trim(),
          color: color.trim(),
          isActive: Boolean(isActive),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await expenseCategoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Expense category not found' });
        }

        // Log activity
        const activitiesCollectionUpdate = await getCollection('activities');
        await activitiesCollectionUpdate.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_expense_category',
          details: `Updated expense category: ${name}`,
          entityType: 'ExpenseCategory',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Expense category updated successfully' });
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const categoryToDelete = await expenseCategoriesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!categoryToDelete) {
          return res.status(404).json({ message: 'Expense category not found' });
        }

        // Soft delete - mark as inactive
        const deleteResult = await expenseCategoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              deletedAt: new Date(),
              deletedBy: user.userId
            }
          }
        );

        if (deleteResult.matchedCount === 0) {
          return res.status(404).json({ message: 'Expense category not found' });
        }

        // Log activity
        const activitiesCollectionDelete = await getCollection('activities');
        await activitiesCollectionDelete.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_expense_category',
          details: `Deleted expense category: ${categoryToDelete.name}`,
          entityType: 'ExpenseCategory',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Expense category deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Expense Category API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
