import dbConnect from '../../../lib/db';
import { Crane } from '../../../models';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      
      const cranes = await Crane.find({}).lean();
      
      res.status(200).json(cranes);
    } catch (error) {
      console.error('Error fetching cranes:', error);
      res.status(500).json({ error: 'Failed to fetch cranes' });
    }
  } else if (req.method === 'POST') {
    try {
      await dbConnect();
      
      const crane = new Crane({
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await crane.save();
      
      res.status(201).json({
        message: 'Crane added successfully',
        craneId: crane._id
      });
    } catch (error) {
      console.error('Error adding crane:', error);
      res.status(500).json({ error: 'Failed to add crane' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
