import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const usersCollection = await getCollection('users');

    switch (method) {
      case 'PUT':
        // Update user
        const updateData = req.body;
        const userToUpdate = await usersCollection.findOne({ _id: new ObjectId(id) });
        
        if (!userToUpdate) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Prepare update object
        const updateObject = {};
        
        if (updateData.username && updateData.username !== userToUpdate.username) {
          // Check if username already exists
          const existingUser = await usersCollection.findOne({ 
            username: updateData.username,
            _id: { $ne: new ObjectId(id) }
          });
          if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
          }
          updateObject.username = updateData.username;
        }
        
        if (updateData.role && updateData.role !== userToUpdate.role) {
          updateObject.role = updateData.role;
        }
        
        if (updateData.password && updateData.password.trim() !== '') {
          // Hash the new password
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(updateData.password, saltRounds);
          updateObject.password = hashedPassword;
        }

        if (Object.keys(updateObject).length === 0) {
          return res.status(400).json({ message: 'No changes to update' });
        }

        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateObject }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully' });
        break;

      case 'DELETE':
        // Check if user exists and is not admin
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
          return res.status(403).json({ message: 'Cannot delete admin user' });
        }

        const deleteResult = await usersCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('User API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 