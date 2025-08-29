import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const customersCollection = db.collection('customers');
      
      const customers = await customersCollection.find({}).toArray();
      
      res.status(200).json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  } else if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const customersCollection = db.collection('customers');
      
      const customerData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null
      };
      
      const result = await customersCollection.insertOne(customerData);
      
      res.status(201).json({
        message: 'Customer added successfully',
        customerId: result.insertedId
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      res.status(500).json({ error: 'Failed to add customer' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
