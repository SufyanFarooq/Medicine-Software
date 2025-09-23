import { getCollection } from '../../../lib/mongodb';
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

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only allow super_admin to run migrations
  if (user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super admin required.' });
  }

  try {
    console.log('🚀 Starting migration to add isActive field...');
    
    // Update products collection
    console.log('📦 Updating products collection...');
    const productsCollection = await getCollection('products');
    const productsResult = await productsCollection.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true, updatedAt: new Date() } }
    );
    
    // Update medicines collection (legacy)
    console.log('💊 Updating medicines collection...');
    const medicinesCollection = await getCollection('medicines');
    const medicinesResult = await medicinesCollection.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true, updatedAt: new Date() } }
    );
    
    // Update categories collection
    console.log('📂 Updating categories collection...');
    const categoriesCollection = await getCollection('categories');
    const categoriesResult = await categoriesCollection.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true, updatedAt: new Date() } }
    );
    
    // Get counts for verification
    const activeProductsCount = await productsCollection.countDocuments({ isActive: true });
    const activeMedicinesCount = await medicinesCollection.countDocuments({ isActive: true });
    const activeCategoriesCount = await categoriesCollection.countDocuments({ isActive: true });
    
    const summary = {
      message: 'Migration completed successfully',
      updated: {
        products: productsResult.modifiedCount,
        medicines: medicinesResult.modifiedCount,
        categories: categoriesResult.modifiedCount
      },
      totals: {
        activeProducts: activeProductsCount,
        activeMedicines: activeMedicinesCount,
        activeCategories: activeCategoriesCount
      }
    };
    
    console.log('✅ Migration completed:', summary);
    res.status(200).json(summary);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      message: 'Migration failed', 
      error: error.message 
    });
  }
}

