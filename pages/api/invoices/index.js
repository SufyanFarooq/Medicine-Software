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
        const { craneId, hours, days, craneCost } = craneRental;
        
        // Get crane details for validation using Mongoose
        const crane = await Crane.findById(craneId);
        if (!crane) {
          return res.status(400).json({ error: `Crane not found: ${craneId}` });
        }

        // Use the crane cost sent from frontend (already calculated)
        craneRental.craneName = crane.name;
        craneRental.craneCode = crane.code;
        craneRental.craneType = crane.type;
        craneRental.craneCost = craneCost; // Use the calculated cost from frontend
        craneRental.hourlyRate = crane.dailyRate / 10;
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
      
      // Count invoices for this year
      const invoiceCount = await Invoice.countDocuments({
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(year + 1, 0, 1)
        }
      });
      const invoiceNumber = `INV-${year}-${String(invoiceCount + 1).padStart(6, '0')}`;

      // Create invoice using Mongoose schema
      const invoiceDate = new Date(startDate); // Use project start date as invoice date
      const dueDateObj = dueDate ? new Date(dueDate + 'T23:59:59.999Z') : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Ensure due date is end of day
      
      const invoice = new Invoice({
        invoiceNumber,
        customerId,
        craneRentalId: rentalId || undefined, // Only set if rentalId exists
        subtotal,
        discount: 0, // No discount for now
        total: totalAmount,
        date: invoiceDate,
        status: 'Draft',
        dueDate: dueDateObj,
        notes,
        items: craneDetails.map(detail => ({
          description: `${detail.craneName} (${detail.craneCode}) - ${detail.craneType}${detail.additionalNote ? ` - ${detail.additionalNote}` : ''}`,
          quantity: detail.days || detail.hours || 1,
          unitPrice: detail.craneCost / (detail.days || detail.hours || 1),
          total: detail.craneCost
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
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create invoice', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 