import { connectToDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const invoicesCollection = db.collection('invoices');
      
      const invoices = await invoicesCollection.find({}).sort({ createdAt: -1 }).toArray();
      
      res.status(200).json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  } else if (req.method === 'POST') {
    try {
      const { db } = await connectToDatabase();
      const invoicesCollection = db.collection('invoices');
      const customersCollection = db.collection('customers');
      const cranesCollection = db.collection('cranes');
      
      const {
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        projectName,
        projectLocation,
        startDate,
        endDate,
        billingType, // 'hourly' or 'daily' - updated field name
        craneDetails,
        notes,
        paymentTerms,
        dueDate,
        rentalId // Add rental ID for reference
      } = req.body;

      // Validate required fields
      if (!customerId || !projectName || !startDate || !endDate || !billingType || !craneDetails || !Array.isArray(craneDetails) || craneDetails.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: customerId, projectName, startDate, endDate, billingType, craneDetails' });
      }

      // Calculate rental duration and costs
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationMs = end - start;
      
      let totalAmount = 0;
      let subtotal = 0;
      
      // Process each crane rental
      for (const craneRental of craneDetails) {
        const { craneId, hours, days } = craneRental;
        
        // Get crane details for pricing
        const crane = await cranesCollection.findOne({ _id: new ObjectId(craneId) });
        if (!crane) {
          return res.status(400).json({ error: `Crane not found: ${craneId}` });
        }

        let craneCost = 0;
        if (billingType === 'hourly') {
          const hourlyRate = crane.dailyRate / 8; // Assume 8-hour work day
          craneCost = hourlyRate * hours;
        } else {
          craneCost = crane.dailyRate * days;
        }
        
        craneRental.craneName = crane.name;
        craneRental.craneCode = crane.code;
        craneRental.craneType = crane.type;
        craneRental.craneCost = craneCost;
        craneRental.hourlyRate = crane.dailyRate / 8;
        craneRental.dailyRate = crane.dailyRate;
        
        subtotal += craneCost;
      }

      // Calculate VAT (5% UAE standard)
      const vatRate = 0.05;
      const vatAmount = subtotal * vatRate;
      totalAmount = subtotal + vatAmount;

      // Generate invoice number
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const invoiceCount = await invoicesCollection.countDocuments({
        createdAt: {
          $gte: new Date(year, today.getMonth(), 1),
          $lt: new Date(year, today.getMonth() + 1, 1)
        }
      });
      const invoiceNumber = `INV-${year}${month}-${String(invoiceCount + 1).padStart(3, '0')}`;

      // Create invoice
      const newInvoice = {
        invoiceNumber,
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        projectName,
        projectLocation,
        startDate: start,
        endDate: end,
        billingType,
        duration: {
          hours: billingType === 'hourly' ? Math.ceil(durationMs / (1000 * 60 * 60)) : 0,
          days: billingType === 'daily' ? Math.ceil(durationMs / (1000 * 60 * 60 * 24)) : 0
        },
        craneDetails,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        paymentTerms: paymentTerms || 'Net 30',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'Pending',
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await invoicesCollection.insertOne(newInvoice);

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
        message: 'Crane rental invoice created successfully',
        invoiceId: result.insertedId,
        invoiceNumber,
        totalAmount
      });

    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 