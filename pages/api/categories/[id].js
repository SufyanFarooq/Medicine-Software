import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method, query: { id } } = req;

  try {
    const { db } = await connectToDatabase();

    switch (method) {
      case 'GET':
        try {
          const category = await db.collection('categories').findOne({ _id: new ObjectId(id) });
          if (!category) {
            return res.status(404).json({ error: 'Category not found' });
          }
          res.status(200).json(category);
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch category' });
        }
        break;

      case 'PUT':
        try {
          const { name, description, color } = req.body;

          if (!name || !color) {
            return res.status(400).json({ error: 'Name and color are required' });
          }

          const updatedCategory = {
            name,
            description: description || '',
            color,
            updatedAt: new Date()
          };

          const result = await db.collection('categories').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedCategory }
          );

          if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
          }

          res.status(200).json({ message: 'Category updated successfully' });
        } catch (error) {
          res.status(500).json({ error: 'Failed to update category' });
        }
        break;

      case 'DELETE':
        try {
          // Check if any products are using this category
          const productsUsingCategory = await db.collection('products').findOne({ category: id });
          
          if (productsUsingCategory) {
            // Move products to "General" category
            await db.collection('products').updateMany(
              { category: id },
              { $set: { category: 'General', updatedAt: new Date() } }
            );
          }

          const result = await db.collection('categories').deleteOne({ _id: new ObjectId(id) });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
          }

          res.status(200).json({ 
            message: 'Category deleted successfully',
            productsMoved: productsUsingCategory ? 'Products moved to General category' : 'No products affected'
          });
        } catch (error) {
          res.status(500).json({ error: 'Failed to delete category' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
}

