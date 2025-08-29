import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const cranesCollection = db.collection('cranes');
      
      const cranes = await cranesCollection.find({}).toArray();
      
      res.status(200).json(cranes);
    } catch (error) {
      console.error('Error fetching cranes:', error);
      res.status(500).json({ error: 'Failed to fetch cranes' });
    }
  } else if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const cranesCollection = db.collection('cranes');
      
      const craneData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await cranesCollection.insertOne(craneData);
      
      res.status(201).json({
        message: 'Crane added successfully',
        craneId: result.insertedId
      });
    } catch (error) {
      console.error('Error adding crane:', error);
      res.status(500).json({ error: 'Failed to add crane' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
