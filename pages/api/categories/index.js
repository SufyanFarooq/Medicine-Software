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
    const categoriesCollection = await getCollection('categories');

    switch (method) {
      case 'GET':
        if (!permissions.canManageProducts && !permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          businessType: businessTypeFilter,
          parentCategory: parentCategoryFilter,
          search,
          activeOnly = 'true',
          page = 1,
          limit = 50,
          sortBy = 'name',
          sortOrder = 'asc'
        } = req.query;

        let filter = {};
        
        // Show active categories (including those without isActive field)
        if (activeOnly !== 'false') {
          filter.$or = [{ isActive: true }, { isActive: { $exists: false } }];
        }
        
        if (businessTypeFilter) filter.businessType = businessTypeFilter;
        if (parentCategoryFilter) filter.parentCategory = parentCategoryFilter;
        
        if (search) {
          const searchFilter = {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          };
          
          // Combine with existing filter
          if (Object.keys(filter).length > 0) {
            filter = { $and: [filter, searchFilter] };
          } else {
            filter = searchFilter;
          }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const categories = await categoriesCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await categoriesCollection.countDocuments(filter);

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
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          description,
          color,
          icon,
          parentCategory,
          businessType
        } = req.body;

        // Validate required fields
        if (!name || !businessType) {
          return res.status(400).json({ message: 'Name and business type are required' });
        }

        // Check for duplicate name
        const existingCategory = await categoriesCollection.findOne({ 
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          isActive: true
        });
        if (existingCategory) {
          return res.status(400).json({ message: 'Category name already exists' });
        }

        // Validate parent category if provided
        if (parentCategory) {
          const parentExists = await categoriesCollection.findOne({ 
            _id: parentCategory,
            isActive: true 
          });
          if (!parentExists) {
            return res.status(400).json({ message: 'Parent category not found' });
          }
        }

        const newCategory = {
          name: name.trim(),
          description: description?.trim() || '',
          color: color || '#1890ff',
          icon: icon || 'TagOutlined',
          parentCategory: parentCategory || null,
          businessType,
          productCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await categoriesCollection.insertOne(newCategory);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_category',
          details: `Created category: ${name}`,
          entityType: 'Category',
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
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}