import dbConnect from '../../../lib/db';
import { Invoice, Crane, Customer } from '../../../models';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      await dbConnect();
      
      const invoices = await Invoice.find({})
        .populate('customerId', 'name email phone')
        .populate('craneRentalId')
        .sort({ createdAt: -1 })
        .lean();
      
      res.status(200).json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  } else if (req.method === 'POST') {
    try {
      await dbConnect();
      
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
        
        // Get crane details for pricing using Mongoose
        const crane = await Crane.findById(craneId);
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
      const invoiceCount = await Invoice.countDocuments({
        createdAt: {
          $gte: new Date(year, today.getMonth(), 1),
          $lt: new Date(year, today.getMonth() + 1, 1)
        }
      });
      const invoiceNumber = `INV-${year}${month}-${String(invoiceCount + 1).padStart(3, '0')}`;

      // Create invoice using Mongoose schema
      const invoice = new Invoice({
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
        craneDetails,
        subtotal,
        vatAmount,
        totalAmount,
        notes,
        paymentTerms,
        dueDate: dueDate ? new Date(dueDate) : null,
        rentalId,
        status: 'pending',
        items: craneDetails.map(detail => ({
          name: detail.craneName,
          code: detail.craneCode,
          type: detail.craneType,
          quantity: detail.days || detail.hours,
          price: detail.craneCost,
          medicineId: detail.craneId // Keep for compatibility
        }))
      });

      await invoice.save();
      
      // Update customer statistics using Mongoose
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { 
          totalRentals: 1,
          totalSpent: totalAmount
        },
        $set: { 
          lastRental: new Date(),
          updatedAt: new Date()
        }
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 