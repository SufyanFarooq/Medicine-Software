import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const usersCollection = await getCollection('users');

    switch (method) {
      case 'DELETE':
        // Check if user exists and is not admin
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
          return res.status(403).json({ message: 'Cannot delete admin user' });
        }

        const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('User API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 