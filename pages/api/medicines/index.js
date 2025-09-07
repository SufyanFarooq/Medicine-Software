import dbConnect from '../../../lib/db';
import { Crane } from '../../../models';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // For now, return cranes as medicines to prevent 404 errors
    // This is a temporary fix while we update the frontend
    const cranes = await Crane.find({}).lean();
    
    // Transform cranes to match the expected medicine format
    const medicines = cranes.map(crane => ({
      _id: crane._id,
      name: crane.name,
      code: crane.code,
      quantity: 1, // Default quantity for cranes
      sellingPrice: crane.dailyRate || 0,
      type: crane.type,
      status: crane.status
    }));
    
    res.status(200).json(medicines);
  } catch (error) {
    console.error('Medicines API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
