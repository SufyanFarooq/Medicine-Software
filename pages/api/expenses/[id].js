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
    const expensesCollection = await getCollection('expenses');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid expense ID' });
    }

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const expense = await expensesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!expense) {
          return res.status(404).json({ message: 'Expense not found' });
        }

        res.status(200).json(expense);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          category,
          currency,
          total: totalAmount,
          description,
          ref
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!category) requiredFields.push('category');
        if (!currency) requiredFields.push('currency');
        if (!totalAmount) requiredFields.push('total');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Validate total is a number
        const totalValue = parseFloat(totalAmount);
        if (isNaN(totalValue) || totalValue <= 0) {
          return res.status(400).json({ message: 'Total must be a positive number' });
        }

        // Check if expense exists
        const existingExpense = await expensesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!existingExpense) {
          return res.status(404).json({ message: 'Expense not found' });
        }

        const updateData = {
          name: name.trim(),
          category: category.trim(),
          currency: currency.trim(),
          total: totalValue,
          description: description?.trim() || '',
          ref: ref?.trim() || '',
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await expensesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Expense not found' });
        }

        // Log activity
        const activitiesCollectionUpdate = await getCollection('activities');
        await activitiesCollectionUpdate.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_expense',
          details: `Updated expense: ${name} - ${currency} ${totalValue}`,
          entityType: 'Expense',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Expense updated successfully' });
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const expenseToDelete = await expensesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!expenseToDelete) {
          return res.status(404).json({ message: 'Expense not found' });
        }

        // Soft delete - mark as inactive
        const deleteResult = await expensesCollection.updateOne(
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
          return res.status(404).json({ message: 'Expense not found' });
        }

        // Log activity
        const activitiesCollectionDelete = await getCollection('activities');
        await activitiesCollectionDelete.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_expense',
          details: `Deleted expense: ${expenseToDelete.name} - ${expenseToDelete.currency} ${expenseToDelete.total}`,
          entityType: 'Expense',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Expense deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Expense API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
