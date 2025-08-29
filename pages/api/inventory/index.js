import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const inventoryCollection = db.collection('inventory_transactions');
      
      const transactions = await inventoryCollection.find({}).toArray();
      
      res.status(200).json(transactions);
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      res.status(500).json({ error: 'Failed to fetch inventory transactions' });
    }
  } else if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const inventoryCollection = db.collection('inventory_transactions');
      
      const transactionData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await inventoryCollection.insertOne(transactionData);
      
      res.status(201).json({
        message: 'Inventory transaction added successfully',
        transactionId: result.insertedId
      });
    } catch (error) {
      console.error('Error adding inventory transaction:', error);
      res.status(500).json({ error: 'Failed to add inventory transaction' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
