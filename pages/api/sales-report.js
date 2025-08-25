import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const { filter = 'daily', fromDate, toDate } = req.query;
    
    // Calculate date range based on filter
    let startDate, endDate = new Date();
    
    if (filter === 'custom' && fromDate && toDate) {
      // Use custom date range
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
    } else {
      // Use predefined filters
      switch (filter) {
        case 'daily':
          startDate = new Date();
          startDate.setHours(startDate.getHours() - 24); // Previous 24 hours
          break;
        case 'weekly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7); // Previous 7 days
          break;
        case 'monthly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30); // Previous 30 days
          break;
        default:
          startDate = new Date('2020-01-01'); // Very old date to get all data
      }
    }

    // Build date filter
    const dateFilter = filter === 'all' ? {} : {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Get invoices within the date range
    const invoices = await db.collection('invoices')
      .find(dateFilter)
      .sort({ date: -1 })
      .toArray();

    // Get medicines data for purchase prices
    const medicines = await db.collection('medicines')
      .find({})
      .sort({ name: 1 })
      .toArray();

    // Debug: Log sample invoice structure
    if (invoices.length > 0) {
      console.log('Sample invoice structure:', JSON.stringify(invoices[0], null, 2));
    }

    // Aggregate sales data by medicine
    const salesStats = {};
    
    invoices.forEach(invoice => {
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach(item => {
          const medicineId = item.medicineId || item.medicine || item.productId;
          let medicineName = item.name; // Invoice items have 'name' field
          
          // Skip items without medicine names
          if (!medicineName) {
            return;
          }
          
          const unitPrice = item.price || 0;
          const quantity = item.quantity || 0;
          
          if (!salesStats[medicineName]) {
            salesStats[medicineName] = {
              name: medicineName,
              quantity: 0,
              unitPrice: unitPrice,
              totalPrice: 0,
              purchasePrice: 0,
              totalPurchasePrice: 0,
              profit: 0
            };
          }
          
          salesStats[medicineName].quantity += quantity;
          salesStats[medicineName].totalPrice += quantity * unitPrice;
          
          // Get purchase price from medicines collection
          const medicine = medicines.find(m => m._id.toString() === medicineId);
          if (medicine) {
            salesStats[medicineName].purchasePrice = medicine.purchasePrice || 0;
          }
        });
      }
    });
    
    // Calculate totals and profit for each medicine
    Object.values(salesStats).forEach(item => {
      item.totalPurchasePrice = item.quantity * item.purchasePrice;
      item.profit = item.totalPrice - item.totalPurchasePrice;
    });

    // Convert the aggregated data to the required format
    const processedData = Object.values(salesStats).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      purchasePrice: item.purchasePrice,
      totalPurchasePrice: item.totalPurchasePrice,
      profit: item.profit
    }));

    // Sort by total price (highest first)
    processedData.sort((a, b) => b.totalPrice - a.totalPrice);

    // Calculate totals
    const totalQuantity = processedData.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = processedData.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalPurchasePrice = processedData.reduce((sum, item) => sum + item.totalPurchasePrice, 0);
    const totalProfit = processedData.reduce((sum, item) => sum + item.profit, 0);

    res.status(200).json({
      success: true,
      data: processedData,
      summary: {
        totalRecords: processedData.length,
        totalQuantity,
        totalPrice,
        totalPurchasePrice,
        totalProfit,
        filter,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
