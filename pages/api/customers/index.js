import dbConnect from '../../../lib/db';
import { Customer } from '../../../models';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      
      const customers = await Customer.find({}).lean();
      
      res.status(200).json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  } else if (req.method === 'POST') {
    try {
      await dbConnect();
      
      const customer = new Customer({
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalRentals: 0,
        totalSpent: 0,
        lastRental: null
      });
      
      await customer.save();
      
      res.status(201).json({
        message: 'Customer added successfully',
        customerId: customer._id
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      res.status(500).json({ error: 'Failed to add customer' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
