import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    const { db } = await connectToDatabase();

    switch (method) {
      case 'GET':
        try {
          const categories = await db.collection('categories').find({}).toArray();
          
          // If no categories exist, create default ones
          if (categories.length === 0) {
            const defaultCategories = [
              { name: 'Electronics', description: 'Electronic devices and accessories', color: '#3B82F6' },
              { name: 'Clothing', description: 'Apparel and fashion items', color: '#EF4444' },
              { name: 'Food & Beverages', description: 'Food items and drinks', color: '#10B981' },
              { name: 'Home & Garden', description: 'Home improvement and garden supplies', color: '#8B5CF6' },
              { name: 'Sports', description: 'Sports equipment and accessories', color: '#F59E0B' },
              { name: 'Books', description: 'Books and publications', color: '#6B7280' },
              { name: 'Automotive', description: 'Automotive parts and accessories', color: '#374151' },
              { name: 'Beauty & Health', description: 'Beauty and health products', color: '#EC4899' },
              { name: 'Toys', description: 'Toys and games', color: '#F97316' },
              { name: 'Office Supplies', description: 'Office and stationery items', color: '#6366F1' }
            ];

            await db.collection('categories').insertMany(defaultCategories);
            res.status(200).json(defaultCategories);
          } else {
            res.status(200).json(categories);
          }
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch categories' });
        }
        break;

      case 'POST':
        try {
          const { name, description, color } = req.body;

          const newCategory = {
            name,
            description: description || '',
            color: color || '#6B7280',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const result = await db.collection('categories').insertOne(newCategory);
          res.status(201).json({ ...newCategory, _id: result.insertedId });
        } catch (error) {
          res.status(500).json({ error: 'Failed to create category' });
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
}
