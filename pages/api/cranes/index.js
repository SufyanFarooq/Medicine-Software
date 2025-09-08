const dbConnect = require('../../../lib/db');

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      
      // Use native MongoDB to get the data
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const cranes = await db.collection('cranes').find({}).toArray();
      
      res.status(200).json(cranes);
    } catch (error) {
      console.error('Error fetching cranes:', error);
      res.status(500).json({ error: 'Failed to fetch cranes' });
    }
  } else if (req.method === 'POST') {
    try {
      await dbConnect();
      
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const craneData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('cranes').insertOne(craneData);
      
      res.status(201).json({
        message: 'Crane added successfully',
        craneId: result.insertedId
      });
    } catch (error) {
      console.error('Error adding crane:', error);
      res.status(500).json({ error: 'Failed to add crane' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default handler;
