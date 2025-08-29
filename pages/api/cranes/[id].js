import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid crane ID' });
  }

  const { db } = await connectToDatabase();
  const cranesCollection = db.collection('cranes');

  if (req.method === 'GET') {
    try {
      const crane = await cranesCollection.findOne({ _id: new ObjectId(id) });
      
      if (!crane) {
        return res.status(404).json({ error: 'Crane not found' });
      }

      res.status(200).json(crane);
    } catch (error) {
      console.error('Error fetching crane:', error);
      res.status(500).json({ error: 'Failed to fetch crane' });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        name,
        code,
        type,
        capacity,
        boomLength,
        location,
        status,
        operator,
        purchasePrice,
        dailyRate,
        hourlyRate,
        minRentalHours,
        lastMaintenance,
        nextMaintenance,
        notes
      } = req.body;

      // Validate required fields
      if (!name || !code || !capacity || !dailyRate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate numeric fields
      if (isNaN(purchasePrice) || isNaN(dailyRate)) {
        return res.status(400).json({ error: 'Purchase price and daily rate must be valid numbers' });
      }

      const updateData = {
        name,
        code,
        type,
        capacity,
        boomLength,
        location,
        status,
        operator,
        purchasePrice: parseFloat(purchasePrice) || 0,
        dailyRate: parseFloat(dailyRate),
        hourlyRate: parseFloat(hourlyRate) || 0,
        minRentalHours: parseInt(minRentalHours) || 1,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
        nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null,
        notes,
        updatedAt: new Date()
      };

      // Auto-calculate hourly rate if not provided
      if (!hourlyRate && dailyRate) {
        updateData.hourlyRate = Math.round(dailyRate / 8);
      }

      const result = await cranesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Crane not found' });
      }

      res.status(200).json({
        message: 'Crane updated successfully',
        craneId: id
      });
    } catch (error) {
      console.error('Error updating crane:', error);
      res.status(500).json({ error: 'Failed to update crane' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await cranesCollection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Crane not found' });
      }

      res.status(200).json({
        message: 'Crane deleted successfully',
        craneId: id
      });
    } catch (error) {
      console.error('Error deleting crane:', error);
      res.status(500).json({ error: 'Failed to delete crane' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
