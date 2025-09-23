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

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const expensesCollection = await getCollection('expenses');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          search,
          category: categoryFilter,
          currency: currencyFilter,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } }; // Show active expenses
        
        if (categoryFilter) filter.category = categoryFilter;
        if (currencyFilter) filter.currency = currencyFilter;
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { ref: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        // Performance optimization - Use projection to limit fields
        const projection = {
          name: 1,
          category: 1,
          currency: 1,
          total: 1,
          description: 1,
          ref: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        };

        const expenses = await expensesCollection
          .find(filter, { projection })
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await expensesCollection.countDocuments(filter);

        res.status(200).json({
          expenses,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
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

        const newExpense = {
          name: name.trim(),
          category: category.trim(),
          currency: currency.trim(),
          total: totalValue,
          description: description?.trim() || '',
          ref: ref?.trim() || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await expensesCollection.insertOne(newExpense);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_expense',
          details: `Created expense: ${name} - ${currency} ${totalValue}`,
          entityType: 'Expense',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newExpense });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Expenses API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
