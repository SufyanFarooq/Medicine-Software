import { connectToDatabase } from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const { filter = 'all', fromDate, toDate } = req.query;
    
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

    // Build date filter for inventory
    const dateFilter = filter === 'all' ? {} : {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Get inventory transactions (inflow only - what was added to inventory)
    const inventoryTransactions = await db.collection('inventory_transactions')
      .find({ ...dateFilter, type: 'inflow' })
      .sort({ date: -1 })
      .toArray();
    
    // Get medicines data for names
    const medicines = await db.collection('medicines')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Create a map of medicine names
    const medicineMap = {};
    medicines.forEach(medicine => {
      medicineMap[medicine._id.toString()] = medicine.name;
    });
    
    // Debug: Log the results
    console.log('Filter:', filter);
    console.log('Date filter:', dateFilter);
    console.log('Total inventory transactions found:', inventoryTransactions.length);
    if (inventoryTransactions.length > 0) {
      console.log('Sample transaction:', JSON.stringify(inventoryTransactions[0], null, 2));
    }

    // Process inventory data - group by medicine and sum quantities
    const inventoryByMedicine = {};
    
    inventoryTransactions.forEach(transaction => {
      const medicineId = transaction.medicineId?.toString();
      const medicineName = medicineMap[medicineId] || 'Unknown Medicine';
      
      if (!inventoryByMedicine[medicineName]) {
        inventoryByMedicine[medicineName] = {
          name: medicineName,
          quantity: 0,
          unitPrice: transaction.unitPrice || 0,
          totalValue: 0,
          batchNo: transaction.batchNo || 'N/A',
          expiryDate: transaction.expiryDate ? new Date(transaction.expiryDate).toLocaleDateString() : 'N/A'
        };
      }
      
      inventoryByMedicine[medicineName].quantity += transaction.quantity || 0;
      inventoryByMedicine[medicineName].totalValue += (transaction.quantity || 0) * (transaction.unitPrice || 0);
    });
    
    // Convert to array and sort by quantity
    const processedData = Object.values(inventoryByMedicine)
      .map((item, index) => ({
        srNo: index + 1,
        ...item
      }))
      .sort((a, b) => b.quantity - a.quantity);

    // Sort by quantity (highest first)
    processedData.sort((a, b) => b.quantity - a.quantity);

    // Calculate totals
    const totalQuantity = processedData.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = processedData.reduce((sum, item) => sum + item.totalValue, 0);

    res.status(200).json({
      success: true,
      data: processedData,
      summary: {
        totalRecords: processedData.length,
        totalQuantity,
        totalValue,
        filter,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching inventory report:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
