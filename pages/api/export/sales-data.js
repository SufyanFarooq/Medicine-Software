import { connectToDatabase } from '../../../lib/mongodb';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const { filter, fromDate, toDate } = req.query;
    
    // Calculate date range based on filter or custom date range
    let startDate, endDate = new Date();
    let effectiveFilter = filter; // Track which filter is effectively being used
    
    if (fromDate && toDate) {
      // Use custom date range
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      effectiveFilter = 'custom'; // Mark as custom date range
    } else {
      // Use filter-based date range
      switch (filter) {
        case 'daily':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30); // Last 30 days
          break;
        case 'weekly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - (12 * 7)); // Last 12 weeks
          break;
        case 'monthly':
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
          break;
        default: // 'all'
          startDate = new Date('2020-01-01'); // Very old date to get all data
      }
    }

    // Build date filter for queries
    const dateFilter = effectiveFilter === 'all' ? {} : {
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const createdAtFilter = effectiveFilter === 'all' ? {} : {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Get filtered data
    const invoices = await db.collection('invoices').find(dateFilter).sort({ date: -1 }).toArray();
    const returns = await db.collection('returns').find(dateFilter).sort({ date: -1 }).toArray();
    const inventory = await db.collection('inventory').find(createdAtFilter).sort({ createdAt: -1 }).toArray();
    const activities = await db.collection('activities').find(createdAtFilter).sort({ createdAt: -1 }).toArray();
    
    // Get medicines created within the selected time period
    const medicinesFilter = effectiveFilter === 'all' ? {} : {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Debug: Log the filter and date range
    console.log('Export Filter:', filter);
    console.log('Effective Filter:', effectiveFilter);
    console.log('From Date:', fromDate);
    console.log('To Date:', toDate);
    console.log('Calculated Start Date:', startDate);
    console.log('Calculated End Date:', endDate);
    console.log('Medicines Filter:', JSON.stringify(medicinesFilter));
    
    const medicines = await db.collection('medicines').find(medicinesFilter).sort({ createdAt: -1 }).toArray();
    
    // Debug: Log the results
    console.log('Total medicines found:', medicines.length);
    if (medicines.length > 0) {
      console.log('Sample medicine dates:', medicines.slice(0, 3).map(m => ({
        name: m.name,
        createdAt: m.createdAt,
        dateAdded: m.dateAdded
      })));
    }

    // Filter medicine activities for inventory tracking
    const medicineActivities = activities.filter(activity => 
      activity.action === 'MEDICINE_ADDED' || activity.action === 'MEDICINE_UPDATED'
    );

    // Calculate basic stats
    const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const totalReturns = returns.reduce((sum, returnItem) => sum + (returnItem.returnValue || 0), 0);
    
    let totalPurchasePrice = 0;
    let totalSellingPrice = 0;
    
    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const medicine = medicines.find(m => m._id.toString() === item.medicineId);
        if (medicine) {
          totalPurchasePrice += item.quantity * medicine.purchasePrice;
          totalSellingPrice += item.quantity * item.price;
        }
      });
    });

    const grossProfit = totalSales - totalPurchasePrice;
    const netProfit = grossProfit - totalReturns;

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Determine report period label
    const periodLabel = effectiveFilter === 'all' ? 'All Time' : 
                       effectiveFilter === 'daily' ? 'Last 30 Days' :
                       effectiveFilter === 'weekly' ? 'Last 12 Weeks' : 
                       effectiveFilter === 'monthly' ? 'Last 12 Months' :
                       'Custom Date Range';

    // Sheet 1: Basic Stats
    const statsData = [
      ['Medical Shop Sales Report', ''],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Report Period', periodLabel],
      ['', ''],
      ['BASIC STATISTICS', ''],
      ['Total Medicines', medicines.length],
      ['Total Invoices (Period)', invoices.length],
      ['Total Returns (Period)', returns.length],
      ['Total Inventory Transactions (Period)', inventory.length + medicineActivities.length],
      ['', ''],
      ['FINANCIAL SUMMARY (Period)', ''],
      ['Total Sales', `Rs${totalSales.toFixed(2)}`],
      ['Total Purchase Cost', `Rs${totalPurchasePrice.toFixed(2)}`],
      ['Gross Profit', `Rs${grossProfit.toFixed(2)}`],
      ['Total Returns Value', `Rs${totalReturns.toFixed(2)}`],
      ['Net Profit', `Rs${netProfit.toFixed(2)}`],
      ['', ''],
      ['INVENTORY STATS (Current)', ''],
      ['Low Stock Items (≤10)', medicines.filter(m => m.quantity <= 10).length],
      ['Expiring Soon (30 days)', medicines.filter(m => {
        const expiryDate = new Date(m.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate <= thirtyDaysFromNow;
      }).length],
      ['', ''],
      ['INVENTORY ACTIVITY (Period)', ''],
      ['New Medicines Added (Period)', medicines.length],
      ['Stock Additions/Updates', inventory.filter(i => i.type === 'add').length],
      ['Total Inventory Items', medicines.length + inventory.filter(i => i.type === 'add').length]
    ];

    const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Basic Stats');

    // Sheet 2: Sales History (Invoices)
    const salesHistory = [
      ['Invoice Number', 'Date', 'Customer Name', 'Items Count', 'Total Amount', 'Discount', 'Final Total', 'Payment Method']
    ];

    invoices.forEach(invoice => {
      salesHistory.push([
        invoice.invoiceNumber,
        new Date(invoice.date).toLocaleDateString(),
        invoice.customerName || 'N/A',
        invoice.items.length,
        `Rs${invoice.subtotal?.toFixed(2) || invoice.total.toFixed(2)}`,
        `Rs${invoice.discount?.toFixed(2) || '0.00'}`,
        `Rs${invoice.total.toFixed(2)}`,
        invoice.paymentMethod || 'Cash'
      ]);
    });

    const salesSheet = XLSX.utils.aoa_to_sheet(salesHistory);
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales History');

    // Sheet 3: Detailed Sales Items
    const itemsHistory = [
      ['Invoice Number', 'Date', 'Medicine Name', 'Quantity', 'Unit Price', 'Total Price']
    ];

    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const medicine = medicines.find(m => m._id.toString() === item.medicineId);
        itemsHistory.push([
          invoice.invoiceNumber,
          new Date(invoice.date).toLocaleDateString(),
          medicine ? medicine.name : 'Unknown Medicine',
          item.quantity,
          `Rs${item.price.toFixed(2)}`,
          `Rs${(item.quantity * item.price).toFixed(2)}`
        ]);
      });
    });

    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsHistory);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Detailed Items');

    // Sheet 4: Returns History
    const returnsHistory = [
      ['Return Number', 'Date', 'Medicine Name', 'Quantity', 'Reason', 'Return Value', 'Status']
    ];

    returns.forEach(returnItem => {
      returnsHistory.push([
        returnItem.returnNumber,
        new Date(returnItem.date).toLocaleDateString(),
        returnItem.medicineName,
        returnItem.quantity,
        returnItem.reason || 'N/A',
        `Rs${returnItem.returnValue?.toFixed(2) || '0.00'}`,
        returnItem.status || 'Processed'
      ]);
    });

    const returnsSheet = XLSX.utils.aoa_to_sheet(returnsHistory);
    XLSX.utils.book_append_sheet(workbook, returnsSheet, 'Returns History');

    // Sheet 5: Inventory Tracking (Simplified - Only essential info)
    const inventoryHistory = [
      ['Date', 'Medicine Name', 'Quantity Added', 'Total Amount', 'Unit Price']
    ];

    // Add medicines created within the time period (this will include your 53 medicines)
    medicines.forEach(medicine => {
      const createdAt = medicine.createdAt || medicine.dateAdded || new Date();
      inventoryHistory.push([
        new Date(createdAt).toLocaleDateString(),
        medicine.name,
        medicine.quantity || 0,
        `Rs${((medicine.quantity || 0) * (medicine.purchasePrice || 0)).toFixed(2)}`,
        `Rs${(medicine.purchasePrice || 0).toFixed(2)}`
      ]);
    });

    // Add dedicated inventory tracking records (for stock updates/adjustments)
    inventory.forEach(item => {
      if (item.type === 'add') {
        const unitPrice = item.purchasePrice || 0;
        const totalAmount = (item.quantity || 0) * unitPrice;
        
        inventoryHistory.push([
          new Date(item.createdAt).toLocaleDateString(),
          item.medicineName,
          item.quantity || 0,
          `Rs${totalAmount.toFixed(2)}`,
          `Rs${unitPrice.toFixed(2)}`
        ]);
      }
    });

    // Add medicine activities (MEDICINE_ADDED only) - for additional tracking
    medicineActivities.forEach(activity => {
      if (activity.action === 'MEDICINE_ADDED') {
        // Extract medicine name from details
        const detailsMatch = activity.details.match(/(Added|Updated) medicine: (.+?) \((.+?)\)/);
        const medicineName = detailsMatch ? detailsMatch[2] : 'Unknown';
        
        // For medicine additions, we'll show basic info since we don't have quantity/price in activity log
        inventoryHistory.push([
          new Date(activity.createdAt).toLocaleDateString(),
          medicineName,
          'N/A', // Quantity not available in activity log
          'N/A', // Total amount not available in activity log
          'N/A'  // Unit price not available in activity log
        ]);
      }
    });

    // Sort by date (newest first)
    const headerRow = inventoryHistory.shift(); // Remove header
    inventoryHistory.sort((a, b) => new Date(b[0]) - new Date(a[0]));
    inventoryHistory.unshift(headerRow); // Add header back

    const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryHistory);
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory Tracking');

    // Sheet 6: Time-based Summary with Zero Days
    const generateTimebasedSummary = () => {
      const summary = {};
      let currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate all dates in range with zero values
      while (currentDate <= end) {
        let key;
        if (effectiveFilter === 'daily') {
          key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (effectiveFilter === 'weekly') {
          const weekNumber = Math.ceil((currentDate.getDate() + new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()) / 7);
          key = `${currentDate.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        if (!summary[key]) {
          summary[key] = {
            sales: 0,
            invoiceCount: 0,
            purchasePrice: 0,
            inventoryAdded: 0,
            inventoryCount: 0,
            returns: 0,
            returnCount: 0
          };
        }
      }
      
      // Populate with actual sales data
      invoices.forEach(invoice => {
        const date = new Date(invoice.date);
        let key;
        if (effectiveFilter === 'daily') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else if (effectiveFilter === 'weekly') {
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
          key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (summary[key]) {
          summary[key].sales += invoice.total;
          summary[key].invoiceCount += 1;
          
          invoice.items.forEach(item => {
            const medicine = medicines.find(m => m._id.toString() === item.medicineId);
            if (medicine) {
              summary[key].purchasePrice += item.quantity * medicine.purchasePrice;
            }
          });
        }
      });
      
      // Populate with inventory data
      inventory.filter(item => item.type === 'add').forEach(item => {
        const date = new Date(item.createdAt);
        let key;
        if (effectiveFilter === 'daily') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else if (effectiveFilter === 'weekly') {
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
          key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (summary[key]) {
          summary[key].inventoryAdded += item.quantity;
          summary[key].inventoryCount += 1;
        }
      });

      // Populate with medicines data (new medicines added)
      medicines.forEach(medicine => {
        const date = new Date(medicine.createdAt || medicine.dateAdded || new Date());
        let key;
        if (effectiveFilter === 'daily') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else if (effectiveFilter === 'weekly') {
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
          key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (summary[key]) {
          summary[key].inventoryAdded += medicine.quantity || 0;
          summary[key].inventoryCount += 1;
        }
      });
      
      // Populate with returns data
      returns.forEach(returnItem => {
        const date = new Date(returnItem.date);
        let key;
        if (effectiveFilter === 'daily') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } else if (effectiveFilter === 'weekly') {
          const weekNumber = Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
          key = `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        
        if (summary[key]) {
          summary[key].returns += returnItem.returnValue || 0;
          summary[key].returnCount += 1;
        }
      });
      
      return summary;
    };
    
    const timebasedSummary = generateTimebasedSummary();
    
    const summaryData = [
      ['Period', 'Total Sales', 'Invoice Count', 'Purchase Cost', 'Gross Profit', 'Inventory Added', 'Inventory Count', 'Returns Value', 'Return Count', 'Net Profit']
    ];

    Object.keys(timebasedSummary).sort().forEach(period => {
      const data = timebasedSummary[period];
      const grossProfit = data.sales - data.purchasePrice;
      const netProfit = grossProfit - data.returns;
      
      let periodLabel;
      if (effectiveFilter === 'daily') {
        periodLabel = new Date(period).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } else if (effectiveFilter === 'weekly') {
        const [year, week] = period.split('-W');
        periodLabel = `Week ${week}, ${year}`;
      } else {
        periodLabel = new Date(period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      summaryData.push([
        periodLabel,
        `Rs${data.sales.toFixed(2)}`,
        data.invoiceCount,
        `Rs${data.purchasePrice.toFixed(2)}`,
        `Rs${grossProfit.toFixed(2)}`,
        data.inventoryAdded,
        data.inventoryCount,
        `Rs${data.returns.toFixed(2)}`,
        data.returnCount,
        `Rs${netProfit.toFixed(2)}`
      ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Generate a proper sheet name based on the effective filter
    let sheetName;
    if (effectiveFilter === 'custom') {
      sheetName = 'Custom Range Summary';
    } else if (effectiveFilter === 'all') {
      sheetName = 'All Time Summary';
    } else {
      sheetName = `${effectiveFilter.charAt(0).toUpperCase() + effectiveFilter.slice(1)} Summary`;
    }
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, sheetName);

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Set headers for file download
    const filename = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the file
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error generating Excel export:', error);
    res.status(500).json({ message: 'Error generating Excel file', error: error.message });
  }
}
