import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const rentalsCollection = db.collection('crane_rentals');
      
      const rentals = await rentalsCollection.find({}).toArray();
      
      res.status(200).json(rentals);
    } catch (error) {
      console.error('Error fetching crane rentals:', error);
      res.status(500).json({ error: 'Failed to fetch crane rentals' });
    }
  } else if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const rentalsCollection = db.collection('crane_rentals');
      const cranesCollection = db.collection('cranes');
      const customersCollection = db.collection('customers');
      
      const {
        customerId,
        craneId,
        projectName,
        projectLocation,
        startDate,
        endDate,
        startTime,
        endTime,
        billingType, // 'hourly' or 'daily'
        hourlyRate,
        dailyRate,
        totalHours,
        totalDays,
        notes,
        operator,
        additionalServices
      } = req.body;

      // Validate required fields
      if (!customerId || !craneId || !startDate || !endDate || !billingType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get crane details
      const crane = await cranesCollection.findOne({ _id: new ObjectId(craneId) });
      if (!crane) {
        return res.status(404).json({ error: 'Crane not found' });
      }

      // Get customer details
      const customer = await customersCollection.findOne({ _id: new ObjectId(customerId) });
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Calculate billing
      let totalAmount = 0;
      let subtotal = 0;
      
      if (billingType === 'hourly') {
        const rate = hourlyRate || crane.dailyRate / 8; // Default hourly rate
        subtotal = rate * totalHours;
      } else {
        const rate = dailyRate || crane.dailyRate;
        subtotal = rate * totalDays;
      }

      // Add additional services
      let additionalServicesTotal = 0;
      if (additionalServices && additionalServices.length > 0) {
        additionalServicesTotal = additionalServices.reduce((sum, service) => sum + service.cost, 0);
      }

      totalAmount = subtotal + additionalServicesTotal;

      // Create rental record
      const rentalData = {
        rentalNumber: `RENT-${Date.now()}`,
        customerId: new ObjectId(customerId),
        customerName: customer.companyName || customer.contactPerson,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        craneId: new ObjectId(craneId),
        craneName: crane.name,
        craneCode: crane.code,
        projectName,
        projectLocation,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        billingType,
        hourlyRate: billingType === 'hourly' ? hourlyRate : null,
        dailyRate: billingType === 'daily' ? dailyRate : null,
        totalHours: billingType === 'hourly' ? totalHours : null,
        totalDays: billingType === 'daily' ? totalDays : null,
        subtotal,
        additionalServicesTotal,
        totalAmount,
        notes,
        operator: operator || crane.operator,
        additionalServices: additionalServices || [],
        status: 'Active', // Active, Completed, Cancelled
        paymentStatus: 'Pending', // Pending, Partial, Paid
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await rentalsCollection.insertOne(rentalData);

      // Update crane status to 'In Use'
      await cranesCollection.updateOne(
        { _id: new ObjectId(craneId) },
        { 
          $set: { 
            status: 'In Use',
            updatedAt: new Date()
          }
        }
      );

      // Update customer statistics
      await customersCollection.updateOne(
        { _id: new ObjectId(customerId) },
        { 
          $inc: { 
            totalRentals: 1,
            totalSpent: totalAmount
          },
          $set: { 
            lastRental: new Date(),
            updatedAt: new Date()
          }
        }
      );

      res.status(201).json({
        message: 'Crane rental created successfully',
        rentalId: result.insertedId,
        rentalNumber: rentalData.rentalNumber
      });

    } catch (error) {
      console.error('Error creating crane rental:', error);
      res.status(500).json({ error: 'Failed to create crane rental' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
