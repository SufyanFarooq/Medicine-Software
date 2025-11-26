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

    // Get current products from products collection (current inventory)
    const products = await db.collection('products')
      .find({})
      .sort({ name: 1 })
      .toArray();
    
    // Process products data - show current inventory
    const processedData = products
      .map((product, index) => ({
        srNo: index + 1,
        name: product.name || 'Unknown Product',
        quantity: product.quantity || 0,
        unitPrice: product.purchasePrice || 0,
        totalValue: (product.quantity || 0) * (product.purchasePrice || 0),
        batchNo: product.batchNo || 'N/A',
        expiryDate: product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'N/A'
      }))
      .filter(item => item.quantity > 0) // Only show products with stock
      .sort((a, b) => b.quantity - a.quantity); // Sort by quantity (highest first)

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
