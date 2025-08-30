import { getCollection } from '../../../lib/mongodb';
import jwt from 'jsonwebtoken';
import XLSX from 'xlsx';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to verify token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { filter = 'all', fromDate, toDate } = req.body;

    // Calculate date range
    let startDate, endDate;
    const now = new Date();
    
    switch (filter) {
      case 'daily':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
        endDate = now;
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - (12 * 7 * 24 * 60 * 60 * 1000)); // 12 weeks ago
        endDate = now;
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - (12 * 30 * 24 * 60 * 60 * 1000)); // 12 months ago
        endDate = now;
        break;
      case 'custom':
        startDate = fromDate ? new Date(fromDate) : new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        endDate = toDate ? new Date(toDate) : now;
        break;
      default: // 'all'
        startDate = new Date(0); // Beginning of time
        endDate = now;
    }

    // Get collections
    const cranesCollection = await getCollection('cranes');
    const craneRentalsCollection = await getCollection('crane_rentals');
    const invoicesCollection = await getCollection('invoices');
    const customersCollection = await getCollection('customers');
    const activitiesCollection = await getCollection('activities');

    // Fetch data
    const cranes = await cranesCollection.find({}).toArray();
    const craneRentals = await craneRentalsCollection.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).toArray();
    const invoices = await invoicesCollection.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).toArray();
    const customers = await customersCollection.find({}).toArray();
    const activities = await activitiesCollection.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).toArray();

    // Filter crane activities for tracking
    const craneActivities = activities.filter(activity => 
      activity.action === 'CRANE_ADDED' || 
      activity.action === 'CRANE_UPDATED' || 
      activity.action === 'CRANE_STATUS_CHANGED' ||
      activity.action === 'CRANE_RENTAL_CREATED' ||
      activity.action === 'CRANE_RENTAL_COMPLETED'
    );

    // Calculate basic stats
    const totalCranes = cranes.length;
    const availableCranes = cranes.filter(c => c.status === 'Available').length;
    const inUseCranes = cranes.filter(c => c.status === 'In Use').length;
    const maintenanceCranes = cranes.filter(c => c.status === 'Maintenance').length;
    
    const totalRentals = craneRentals.length;
    const activeRentals = craneRentals.filter(r => r.contractStatus === 'Active').length;
    const completedRentals = craneRentals.filter(r => r.contractStatus === 'Completed').length;
    const cancelledRentals = craneRentals.filter(r => r.contractStatus === 'Cancelled').length;
    
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total || invoice.totalAmount || 0), 0);
    const totalInvoices = invoices.length;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Determine report period label
    const periodLabel = filter === 'all' ? 'All Time' : 
                       filter === 'daily' ? 'Last 30 Days' :
                       filter === 'weekly' ? 'Last 12 Weeks' : 
                       filter === 'monthly' ? 'Last 12 Months' :
                       'Custom Date Range';

    // Sheet 1: Basic Stats
    const statsData = [
      ['Crane Management Report', ''],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Report Period', periodLabel],
      ['', ''],
      ['CRANE INVENTORY STATISTICS', ''],
      ['Total Cranes', totalCranes],
      ['Available Cranes', availableCranes],
      ['Cranes In Use', inUseCranes],
      ['Cranes Under Maintenance', maintenanceCranes],
      ['', ''],
      ['RENTAL OPERATIONS (Period)', ''],
      ['Total Rentals', totalRentals],
      ['Active Rentals', activeRentals],
      ['Completed Rentals', completedRentals],
      ['Cancelled Rentals', cancelledRentals],
      ['', ''],
      ['FINANCIAL SUMMARY (Period)', ''],
      ['Total Revenue', `AED${totalRevenue.toFixed(2)}`],
      ['Total Invoices', totalInvoices],
      ['Average Revenue per Invoice', `AED${totalInvoices > 0 ? (totalRevenue / totalInvoices).toFixed(2) : '0.00'}`],
      ['', ''],
      ['OPERATIONAL STATS (Period)', ''],
      ['New Cranes Added', craneActivities.filter(a => a.action === 'CRANE_ADDED').length],
      ['Crane Updates', craneActivities.filter(a => a.action === 'CRANE_UPDATED').length],
      ['Status Changes', craneActivities.filter(a => a.action === 'CRANE_STATUS_CHANGED').length],
      ['New Rentals Created', craneActivities.filter(a => a.action === 'CRANE_RENTAL_CREATED').length]
    ];

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Basic Stats');

    // Sheet 2: Crane Inventory
    const craneInventory = [
      ['Crane Code', 'Crane Name', 'Type', 'Capacity', 'Status', 'Location', 'Operator', 'Daily Rate', 'Last Maintenance', 'Next Maintenance']
    ];

    cranes.forEach(crane => {
      craneInventory.push([
        crane.code,
        crane.name,
        crane.type,
        crane.capacity,
        crane.status,
        crane.location,
        crane.operator || 'N/A',
        `AED${crane.dailyRate?.toFixed(2) || '0.00'}`,
        crane.lastMaintenance ? new Date(crane.lastMaintenance).toLocaleDateString() : 'N/A',
        crane.nextMaintenance ? new Date(crane.nextMaintenance).toLocaleDateString() : 'N/A'
      ]);
    });

    const craneSheet = XLSX.utils.aoa_to_sheet(craneInventory);
    XLSX.utils.book_append_sheet(workbook, craneSheet, 'Crane Inventory');

    // Sheet 3: Rental History
    const rentalHistory = [
      ['Rental Number', 'Customer Name', 'Project Name', 'Start Date', 'End Date', 'Crane Count', 'Total Amount', 'Status', 'Payment Status']
    ];

    craneRentals.forEach(rental => {
      rentalHistory.push([
        rental.rentalNumber,
        rental.customerName,
        rental.projectName,
        new Date(rental.startDate).toLocaleDateString(),
        new Date(rental.endDate).toLocaleDateString(),
        rental.craneRentals?.length || 0,
        `AED${rental.totalAmount?.toFixed(2) || '0.00'}`,
        rental.contractStatus || rental.status || 'Active',
        rental.paymentStatus || 'Pending'
      ]);
    });

    const rentalSheet = XLSX.utils.aoa_to_sheet(rentalHistory);
    XLSX.utils.book_append_sheet(workbook, rentalSheet, 'Rental History');

    // Sheet 4: Invoice History
    const invoiceHistory = [
      ['Invoice Number', 'Date', 'Customer Name', 'Type', 'Items Count', 'Subtotal', 'VAT', 'Total Amount', 'Payment Status']
    ];

    invoices.forEach(invoice => {
      invoiceHistory.push([
        invoice.invoiceNumber,
        new Date(invoice.date || invoice.createdAt).toLocaleDateString(),
        invoice.customerName || 'N/A',
        invoice.craneDetails ? 'Crane Rental' : 'Standard',
        invoice.craneDetails ? invoice.craneDetails.length : (invoice.items ? invoice.items.length : 0),
        `AED${invoice.subtotal?.toFixed(2) || '0.00'}`,
        `AED${invoice.vat?.toFixed(2) || '0.00'}`,
        `AED${invoice.total?.toFixed(2) || invoice.totalAmount?.toFixed(2) || '0.00'}`,
        invoice.paymentStatus || 'Pending'
      ]);
    });

    const invoiceSheet = XLSX.utils.aoa_to_sheet(invoiceHistory);
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoice History');

    // Sheet 5: Customer Summary
    const customerSummary = [
      ['Customer Name', 'Email', 'Phone', 'Total Rentals', 'Total Spent', 'Last Rental Date']
    ];

    customers.forEach(customer => {
      const customerRentals = craneRentals.filter(r => r.customerId === customer._id.toString());
      const customerInvoices = invoices.filter(i => i.customerId === customer._id.toString());
      const totalSpent = customerInvoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || 0), 0);
      const lastRental = customerRentals.length > 0 ? 
        new Date(Math.max(...customerRentals.map(r => new Date(r.createdAt)))) : null;

      customerSummary.push([
        customer.name,
        customer.email,
        customer.phone,
        customerRentals.length,
        `AED${totalSpent.toFixed(2)}`,
        lastRental ? lastRental.toLocaleDateString() : 'N/A'
      ]);
    });

    const customerSheet = XLSX.utils.aoa_to_sheet(customerSummary);
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Summary');

    // Sheet 6: Activity Log
    const activityLog = [
      ['Date', 'User', 'Action', 'Details', 'Entity Type', 'Entity ID']
    ];

    craneActivities.forEach(activity => {
      activityLog.push([
        new Date(activity.createdAt).toLocaleDateString(),
        activity.username,
        activity.action.replace(/_/g, ' '),
        activity.details,
        activity.entityType,
        activity.entityId
      ]);
    });

    const activitySheet = XLSX.utils.aoa_to_sheet(activityLog);
    XLSX.utils.book_append_sheet(workbook, activitySheet, 'Activity Log');

    // Generate Excel file
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=crane-management-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    res.status(200).send(buffer);

  } catch (error) {
    console.error('Export API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
