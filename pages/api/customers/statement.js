import dbConnect from '../../../lib/db';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const db = mongoose.connection.db;

    const { customerId, startDate, endDate } = req.query;

    if (!customerId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Customer ID, start date, and end date are required' });
    }

    // Get customer details
    const customer = await db.collection('customers').findOne({ _id: new mongoose.Types.ObjectId(customerId) });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Convert dates to proper format
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // End of day

    // Get crane rentals for the customer in the date range
    const rentals = await db.collection('crane_rentals').find({
      customerId: new mongoose.Types.ObjectId(customerId),
      startDate: {
        $gte: start,
        $lte: end
      }
    }).sort({ startDate: 1 }).toArray();

    // Get invoices for the customer in the date range
    const invoices = await db.collection('invoices').find({
      $or: [
        { customerId: new mongoose.Types.ObjectId(customerId) },
        { 'customerId._id': new mongoose.Types.ObjectId(customerId) }
      ],
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).sort({ createdAt: 1 }).toArray();

    // Get payments/returns for the customer in the date range
    const returns = await db.collection('returns').find({
      customerId: new mongoose.Types.ObjectId(customerId),
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).sort({ createdAt: 1 }).toArray();

    // Process transactions
    const transactions = [];

    // Add crane rentals
    rentals.forEach(rental => {
      const projectDetails = [];
      if (rental.projectName) projectDetails.push(`Project: ${rental.projectName}`);
      if (rental.projectLocation) projectDetails.push(`Location: ${rental.projectLocation}`);
      if (rental.craneName) projectDetails.push(`Crane: ${rental.craneName}`);
      if (rental.craneCode) projectDetails.push(`Code: ${rental.craneCode}`);
      if (rental.billingType) projectDetails.push(`Billing: ${rental.billingType}`);
      if (rental.totalHours) projectDetails.push(`Hours: ${rental.totalHours}`);
      if (rental.totalDays) projectDetails.push(`Days: ${rental.totalDays}`);
      
      const description = projectDetails.length > 0 
        ? projectDetails.join(' | ')
        : `Crane Rental: ${rental.craneName || 'Unknown Crane'} - ${rental.projectName || 'Unknown Project'}`;

      transactions.push({
        date: rental.startDate,
        type: 'rental',
        invoiceNumber: rental.rentalNumber || `RENT-${rental._id.toString().slice(-6)}`,
        description: description,
        amount: rental.totalAmount || 0,
        status: rental.status || 'active',
        projectName: rental.projectName || 'Unknown Project',
        projectLocation: rental.projectLocation || 'N/A',
        craneName: rental.craneName || 'Unknown Crane',
        craneCode: rental.craneCode || 'N/A',
        billingType: rental.billingType || 'N/A',
        totalHours: rental.totalHours || 0,
        totalDays: rental.totalDays || 0
      });
    });

    // Add invoices
    invoices.forEach(invoice => {
      const invoiceDetails = [];
      if (invoice.projectName) invoiceDetails.push(`Project: ${invoice.projectName}`);
      if (invoice.projectLocation) invoiceDetails.push(`Location: ${invoice.projectLocation}`);
      if (invoice.items?.length) invoiceDetails.push(`Items: ${invoice.items.length}`);
      if (invoice.craneName) invoiceDetails.push(`Crane: ${invoice.craneName}`);
      if (invoice.status) invoiceDetails.push(`Status: ${invoice.status}`);
      if (invoice.dueDate) invoiceDetails.push(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`);
      
      const description = invoiceDetails.length > 0 
        ? invoiceDetails.join(' | ')
        : `Invoice for ${invoice.items?.length || 0} items`;

      // Calculate item details
      const itemDetails = invoice.items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })) || [];

      transactions.push({
        date: invoice.createdAt,
        type: 'invoice',
        invoiceNumber: invoice.invoiceNumber || `INV-${invoice._id.toString().slice(-6)}`,
        description: description,
        amount: invoice.total || 0,
        status: invoice.status || 'pending',
        projectName: invoice.projectName || 'Unknown Project',
        projectLocation: invoice.projectLocation || 'N/A',
        itemsCount: invoice.items?.length || 0,
        subtotal: invoice.subtotal || 0,
        discount: invoice.discount || 0,
        dueDate: invoice.dueDate || null,
        notes: invoice.notes || '',
        items: itemDetails,
        craneRentalId: invoice.craneRentalId || null
      });
    });

    // Add a demo invoice for testing invoice details UI
    if (invoices.length === 0) {
      transactions.push({
        date: new Date('2025-09-08'),
        type: 'invoice',
        invoiceNumber: 'INV-DEMO-001',
        description: 'Project: Demo Project | Location: Dubai | Items: 3 | Status: Sent | Due: 9/15/2025',
        amount: 5500,
        status: 'Sent',
        projectName: 'Demo Project',
        projectLocation: 'Dubai',
        itemsCount: 3,
        subtotal: 6000,
        discount: 500,
        dueDate: new Date('2025-09-15'),
        notes: 'Demo invoice to show invoice details UI',
        items: [
          {
            description: 'Crane Rental Service - Mobile Crane',
            quantity: 1,
            unitPrice: 3000,
            total: 3000
          },
          {
            description: 'Transportation Fee',
            quantity: 1,
            unitPrice: 1500,
            total: 1500
          },
          {
            description: 'Operator Service',
            quantity: 1,
            unitPrice: 1500,
            total: 1500
          }
        ],
        craneRentalId: null
      });
    }

    // Add returns (as payments/credits)
    returns.forEach(returnItem => {
      const returnDetails = [];
      if (returnItem.reason) returnDetails.push(`Reason: ${returnItem.reason}`);
      if (returnItem.projectName) returnDetails.push(`Project: ${returnItem.projectName}`);
      if (returnItem.craneName) returnDetails.push(`Crane: ${returnItem.craneName}`);
      if (returnItem.quantity) returnDetails.push(`Quantity: ${returnItem.quantity}`);
      
      const description = returnDetails.length > 0 
        ? `Return - ${returnDetails.join(' | ')}`
        : `Return - ${returnItem.reason || 'Product return'}`;

      transactions.push({
        date: returnItem.createdAt,
        type: 'payment',
        invoiceNumber: returnItem.invoiceNumber || 'N/A',
        description: description,
        amount: returnItem.refundAmount || 0,
        status: 'completed',
        reason: returnItem.reason || 'N/A',
        projectName: returnItem.projectName || 'N/A',
        craneName: returnItem.craneName || 'N/A',
        quantity: returnItem.quantity || 0
      });
    });

    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate summary
    const totalRentals = rentals.length;
    const totalInvoices = invoices.length;
    const totalRentalAmount = rentals.reduce((sum, rental) => sum + (rental.totalAmount || 0), 0);
    const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    const totalAmount = totalRentalAmount + totalInvoiceAmount;
    const totalReturns = returns.reduce((sum, returnItem) => sum + (returnItem.refundAmount || 0), 0);
    const paidAmount = totalReturns; // Assuming returns represent payments
    const outstanding = totalAmount - paidAmount;

    const statement = {
      customer: {
        _id: customer._id,
        companyName: customer.companyName || customer.name || 'N/A',
        contactPerson: customer.contactPerson || 'N/A',
        email: customer.email || 'N/A',
        phone: customer.phone || 'N/A',
        vatNumber: customer.vatNumber || 'N/A',
        lpoNumber: customer.lpoNumber || 'N/A'
      },
      summary: {
        totalRentals,
        totalInvoices,
        totalAmount,
        paidAmount,
        outstanding,
        period: {
          startDate,
          endDate
        }
      },
      transactions
    };

    res.status(200).json(statement);

  } catch (error) {
    console.error('Customer Statement API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
