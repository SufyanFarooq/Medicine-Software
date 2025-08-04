import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  try {
    const medicinesCollection = await getCollection('medicines');

    switch (method) {
      case 'GET':
        const medicine = await medicinesCollection.findOne({ _id: new ObjectId(id) });
        if (!medicine) {
          return res.status(404).json({ message: 'Medicine not found' });
        }
        res.status(200).json(medicine);
        break;

      case 'PUT':
        const { name, code, quantity, purchasePrice, sellingPrice, expiryDate, batchNo } = req.body;

        // Validate required fields
        if (!name || !code || quantity === undefined || !purchasePrice || !sellingPrice || !expiryDate) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check for duplicate code (excluding current medicine)
        const existingMedicine = await medicinesCollection.findOne({ 
          code, 
          _id: { $ne: new ObjectId(id) } 
        });
        if (existingMedicine) {
          return res.status(400).json({ message: 'Medicine code already exists' });
        }

        const updateData = {
          name,
          code,
          quantity: parseInt(quantity),
          purchasePrice: parseFloat(purchasePrice),
          sellingPrice: parseFloat(sellingPrice),
          expiryDate: new Date(expiryDate),
          batchNo: batchNo || '',
          updatedAt: new Date(),
        };

        const result = await medicinesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Medicine not found' });
        }

        res.status(200).json({ message: 'Medicine updated successfully' });
        break;

      case 'DELETE':
        const deleteResult = await medicinesCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (deleteResult.deletedCount === 0) {
          return res.status(404).json({ message: 'Medicine not found' });
        }

        res.status(200).json({ message: 'Medicine deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 