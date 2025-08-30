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
        craneRentals, // New multi-crane structure
        projectName,
        projectLocation,
        startDate,
        endDate,
        startTime,
        endTime,
        billingType, // 'hourly' or 'daily'
        notes,
        operator,
        additionalServices,
        contractStatus,
        contractEndDate
      } = req.body;

      // Validate required fields
      if (!customerId || !craneRentals || !Array.isArray(craneRentals) || craneRentals.length === 0 || !startDate || !endDate || !billingType) {
        return res.status(400).json({ error: 'Missing required fields: customerId, craneRentals (array), startDate, endDate, billingType' });
      }

      // Get customer details
      const customer = await customersCollection.findOne({ _id: new ObjectId(customerId) });
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Validate and process each crane rental
      let totalAmount = 0;
      let subtotal = 0;
      const processedCraneRentals = [];

      for (const craneRental of craneRentals) {
        // Validate crane rental fields
        if (!craneRental.craneId || !craneRental.craneName || !craneRental.craneCode) {
          return res.status(400).json({ error: `Missing crane details for crane rental` });
        }

        // Get crane details
        const crane = await cranesCollection.findOne({ _id: new ObjectId(craneRental.craneId) });
        if (!crane) {
          return res.status(404).json({ error: `Crane not found: ${craneRental.craneId}` });
        }

        // Calculate billing for this crane
        let craneSubtotal = 0;
        if (billingType === 'hourly') {
          const rate = craneRental.hourlyRate || crane.dailyRate / 8;
          craneSubtotal = rate * craneRental.totalHours;
        } else {
          const rate = craneRental.dailyRate || crane.dailyRate;
          craneSubtotal = rate * craneRental.totalDays;
        }

        subtotal += craneSubtotal;

        // Process crane rental data
        processedCraneRentals.push({
          craneId: new ObjectId(craneRental.craneId),
          craneName: craneRental.craneName,
          craneCode: craneRental.craneCode,
          craneType: craneRental.craneType,
          craneCapacity: craneRental.craneCapacity,
          hourlyRate: billingType === 'hourly' ? craneRental.hourlyRate : null,
          dailyRate: billingType === 'daily' ? craneRental.dailyRate : null,
          totalHours: billingType === 'hourly' ? craneRental.totalHours : null,
          totalDays: billingType === 'daily' ? craneRental.totalDays : null,
          craneStatus: craneRental.craneStatus || 'Active',
          completionDate: craneRental.completionDate,
          individualAmount: craneSubtotal
        });
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
        craneRentals: processedCraneRentals, // New multi-crane structure
        projectName,
        projectLocation,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        startTime,
        endTime,
        billingType,
        subtotal,
        additionalServicesTotal,
        totalAmount,
        notes,
        operator: operator || '',
        additionalServices: additionalServices || [],
        contractStatus: contractStatus || 'Active', // Active, Completed, Cancelled
        status: 'Active', // Overall rental status
        paymentStatus: 'Pending', // Pending, Partial, Paid
        contractEndDate: contractEndDate || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await rentalsCollection.insertOne(rentalData);

      // Update status of all cranes to 'In Use'
      for (const craneRental of craneRentals) {
        await cranesCollection.updateOne(
          { _id: new ObjectId(craneRental.craneId) },
          { 
            $set: { 
              status: 'In Use',
              updatedAt: new Date()
            }
          }
        );
      }

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
