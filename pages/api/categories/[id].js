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

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  try {
    const categoriesCollection = await getCollection('categories');

    switch (method) {
      case 'GET':
        if (!permissions.canManageProducts && !permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const category = await categoriesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }

        res.status(200).json(category);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const existingCategory = await categoriesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!existingCategory) {
          return res.status(404).json({ message: 'Category not found' });
        }

        const {
          name,
          description,
          color,
          icon,
          parentCategory,
          businessType
        } = req.body;

        // Check for duplicate name (excluding current category)
        if (name && name !== existingCategory.name) {
          const duplicateName = await categoriesCollection.findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            isActive: true,
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateName) {
            return res.status(400).json({ message: 'Category name already exists' });
          }
        }

        // Validate parent category if provided
        if (parentCategory) {
          const parentExists = await categoriesCollection.findOne({ 
            _id: new ObjectId(parentCategory),
            isActive: true 
          });
          if (!parentExists) {
            return res.status(400).json({ message: 'Parent category not found' });
          }

          // Prevent circular reference
          if (parentCategory === id) {
            return res.status(400).json({ message: 'Category cannot be its own parent' });
          }
        }

        const updateData = {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(color && { color }),
          ...(icon && { icon }),
          ...(parentCategory !== undefined && { parentCategory: parentCategory || null }),
          ...(businessType && { businessType }),
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await categoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to category' });
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_category',
          details: `Updated category: ${name || existingCategory.name}`,
          entityType: 'Category',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const updatedCategory = await categoriesCollection.findOne({ _id: new ObjectId(id) });
        res.status(200).json(updatedCategory);
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const categoryToDelete = await categoriesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: true 
        });

        if (!categoryToDelete) {
          return res.status(404).json({ message: 'Category not found' });
        }

        // Check if category has products
        const productsCollection = await getCollection('products');
        const productsInCategory = await productsCollection.countDocuments({ 
          category: id,
          isActive: true 
        });

        if (productsInCategory > 0) {
          return res.status(400).json({ 
            message: `Cannot delete category. It has ${productsInCategory} products assigned to it.` 
          });
        }

        // Check if category has subcategories
        const subcategories = await categoriesCollection.countDocuments({ 
          parentCategory: id,
          isActive: true 
        });

        if (subcategories > 0) {
          return res.status(400).json({ 
            message: `Cannot delete category. It has ${subcategories} subcategories.` 
          });
        }

        // Soft delete - set isActive to false
        await categoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date(),
              updatedBy: user.userId
            }
          }
        );

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_category',
          details: `Deleted category: ${categoryToDelete.name}`,
          entityType: 'Category',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Category deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}