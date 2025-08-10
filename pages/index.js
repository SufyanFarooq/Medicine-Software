import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalSales: 0,
    inventoryValue: 0,
    netProfit: 0,
    totalReturns: 0,
    totalReturnsValue: 0,
    grossProfit: 0,
    totalCost: 0,
  });
  const [settings, setSettings] = useState({
    currency: '$',
    discountPercentage: 3,
    shopName: 'Medical Shop'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState({
    salesData: [],
    profitData: [],
    monthlyData: [],
    dailyData: [],
    weeklyData: []
  });
  const [timePeriod, setTimePeriod] = useState('monthly'); // 'daily', 'weekly', 'monthly'
  const [exportFilter, setExportFilter] = useState('monthly'); // Filter for export data

  useEffect(() => {
    fetchSettings();
    fetchStats();
    fetchRecentActivity();
    fetchChartData();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [medicinesRes, invoicesRes, returnsRes] = await Promise.all([
        apiRequest('/api/medicines'),
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
      ]);

      let medicines = [];
      if (medicinesRes.ok) {
        medicines = await medicinesRes.json();
        const lowStock = medicines.filter(m => m.quantity <= 10).length;
        const expiringSoon = medicines.filter(m => {
          const expiryDate = new Date(m.expiryDate);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }).length;

        // Calculate inventory value (current stock × purchase price)
        const inventoryValue = medicines.reduce((sum, medicine) => {
          return sum + (medicine.quantity * medicine.purchasePrice);
        }, 0);

        // Calculate total cost of inventory
        const totalCost = medicines.reduce((sum, medicine) => {
          return sum + (medicine.quantity * medicine.purchasePrice);
        }, 0);

        setStats(prev => ({
          ...prev,
          totalMedicines: medicines.length,
          lowStock,
          expiringSoon,
          inventoryValue,
          totalCost,
        }));
      }

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        
        // Calculate total sales from invoices (these are already updated after returns)
        const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
        
        // Calculate actual profit based on purchase and selling prices
        let totalPurchasePrice = 0;
        let totalSellingPrice = 0;
        
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            // Find the medicine to get purchase price
            const medicine = medicines.find(m => m._id === item.medicineId);
            if (medicine) {
              totalPurchasePrice += item.quantity * medicine.purchasePrice;
              totalSellingPrice += item.quantity * item.price;
            }
          });
        });
        
        // Calculate actual gross profit: Gross Sales - Total Purchase Price
        const grossProfit = totalSales - totalPurchasePrice;
        
        setStats(prev => ({ 
          ...prev, 
          totalSales,
          grossProfit,
          totalPurchasePrice,
          totalSellingPrice,
        }));
      }

      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        const totalReturns = returns.length;
        const totalReturnsValue = returns.reduce((sum, returnItem) => {
          return sum + (returnItem.returnValue || 0);
        }, 0);

        // Calculate net profit (gross profit - returns)
        const netProfit = stats.grossProfit - totalReturnsValue;

        setStats(prev => ({ 
          ...prev, 
          totalReturns,
          totalReturnsValue,
          netProfit,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [invoicesRes, returnsRes, medicinesRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/medicines'),
      ]);

      const activities = [];

      // Process invoices
      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const recentInvoices = invoices
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        recentInvoices.forEach(invoice => {
          activities.push({
            id: invoice._id,
            type: 'invoice',
            title: `Invoice ${invoice.invoiceNumber} generated`,
            description: `${invoice.items.length} item(s) - ${formatCurrency(invoice.total)}`,
            date: new Date(invoice.createdAt),
            icon: '🧾',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
          });
        });
      }

      // Process returns
      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        const recentReturns = returns
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        recentReturns.forEach(returnItem => {
          activities.push({
            id: returnItem._id,
            type: 'return',
            title: `Return ${returnItem.returnNumber} processed`,
            description: `${returnItem.medicineName} - ${returnItem.quantity} qty - ${formatCurrency(returnItem.returnValue)}`,
            date: new Date(returnItem.createdAt),
            icon: '🔄',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
          });
        });
      }

      // Process medicine updates (recently added or updated)
      if (medicinesRes.ok) {
        const medicines = await medicinesRes.json();
        const recentMedicines = medicines
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 3);
        
        recentMedicines.forEach(medicine => {
          activities.push({
            id: medicine._id,
            type: 'medicine',
            title: `${medicine.name} updated`,
            description: `Stock: ${medicine.quantity} | Price: ${formatCurrency(medicine.sellingPrice)}`,
            date: new Date(medicine.updatedAt || medicine.createdAt),
            icon: '💊',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
          });
        });
      }

      // Sort all activities by date and take the most recent 10
      const sortedActivities = activities
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);

      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const [invoicesRes, returnsRes, medicinesRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/medicines'),
      ]);

      const salesData = [];
      const profitData = [];
      const monthlyData = [];
      const dailyData = [];
      const weeklyData = [];

      if (invoicesRes.ok && medicinesRes.ok) {
        const invoices = await invoicesRes.json();
        const medicines = await medicinesRes.json();
        
        // Group invoices by month with profit calculation
        const monthlySales = {};
        const dailySales = {};
        const weeklySales = {};
        
        invoices.forEach(invoice => {
          const date = new Date(invoice.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const weekKey = `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
          
          // Monthly data
          if (!monthlySales[monthKey]) {
            monthlySales[monthKey] = {
              sales: 0,
              purchasePrice: 0,
              count: 0,
              month: monthKey
            };
          }
          monthlySales[monthKey].sales += invoice.total;
          monthlySales[monthKey].count += 1;
          
          // Daily data
          if (!dailySales[dayKey]) {
            dailySales[dayKey] = {
              sales: 0,
              purchasePrice: 0,
              count: 0,
              day: dayKey
            };
          }
          dailySales[dayKey].sales += invoice.total;
          dailySales[dayKey].count += 1;
          
          // Weekly data
          if (!weeklySales[weekKey]) {
            weeklySales[weekKey] = {
              sales: 0,
              purchasePrice: 0,
              count: 0,
              week: weekKey
            };
          }
          weeklySales[weekKey].sales += invoice.total;
          weeklySales[weekKey].count += 1;
          
          // Calculate purchase price for this invoice
          invoice.items.forEach(item => {
            const medicine = medicines.find(m => m._id === item.medicineId);
            if (medicine) {
              const purchaseCost = item.quantity * medicine.purchasePrice;
              monthlySales[monthKey].purchasePrice += purchaseCost;
              dailySales[dayKey].purchasePrice += purchaseCost;
              weeklySales[weekKey].purchasePrice += purchaseCost;
            }
          });
        });

        // Convert monthly data
        Object.values(monthlySales).forEach(month => {
          const profit = month.sales - month.purchasePrice;
          monthlyData.push({
            period: month.month,
            sales: month.sales,
            profit: profit,
            count: month.count
          });
        });

        // Convert daily data
        Object.values(dailySales).forEach(day => {
          const profit = day.sales - day.purchasePrice;
          dailyData.push({
            period: day.day,
            sales: day.sales,
            profit: profit,
            count: day.count
          });
        });

        // Convert weekly data
        Object.values(weeklySales).forEach(week => {
          const profit = week.sales - week.purchasePrice;
          weeklyData.push({
            period: week.week,
            sales: week.sales,
            profit: profit,
            count: week.count
          });
        });

        // Sort all data in descending order (latest first)
        monthlyData.sort((a, b) => b.period.localeCompare(a.period));
        dailyData.sort((a, b) => b.period.localeCompare(a.period));
        weeklyData.sort((a, b) => b.period.localeCompare(a.period));
      }

      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        
        // Group returns by period
        const monthlyReturns = {};
        const dailyReturns = {};
        const weeklyReturns = {};
        
        returns.forEach(returnItem => {
          const date = new Date(returnItem.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const weekKey = `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
          
          // Monthly returns
          if (!monthlyReturns[monthKey]) {
            monthlyReturns[monthKey] = { returns: 0, count: 0 };
          }
          monthlyReturns[monthKey].returns += returnItem.returnValue || 0;
          monthlyReturns[monthKey].count += 1;
          
          // Daily returns
          if (!dailyReturns[dayKey]) {
            dailyReturns[dayKey] = { returns: 0, count: 0 };
          }
          dailyReturns[dayKey].returns += returnItem.returnValue || 0;
          dailyReturns[dayKey].count += 1;
          
          // Weekly returns
          if (!weeklyReturns[weekKey]) {
            weeklyReturns[weekKey] = { returns: 0, count: 0 };
          }
          weeklyReturns[weekKey].returns += returnItem.returnValue || 0;
          weeklyReturns[weekKey].count += 1;
        });

        // Merge returns data
        monthlyData.forEach(month => {
          const returnData = monthlyReturns[month.period];
          if (returnData) {
            month.returns = returnData.returns;
            month.returnCount = returnData.count;
            month.netProfit = month.profit - returnData.returns;
          } else {
            month.returns = 0;
            month.returnCount = 0;
            month.netProfit = month.profit;
          }
        });

        dailyData.forEach(day => {
          const returnData = dailyReturns[day.period];
          if (returnData) {
            day.returns = returnData.returns;
            day.returnCount = returnData.count;
            day.netProfit = day.profit - returnData.returns;
          } else {
            day.returns = 0;
            day.returnCount = 0;
            day.netProfit = day.profit;
          }
        });

        weeklyData.forEach(week => {
          const returnData = weeklyReturns[week.period];
          if (returnData) {
            week.returns = returnData.returns;
            week.returnCount = returnData.count;
            week.netProfit = week.profit - returnData.returns;
          } else {
            week.returns = 0;
            week.returnCount = 0;
            week.netProfit = week.profit;
          }
        });
      }

      setChartData({
        salesData,
        profitData,
        monthlyData,
        dailyData,
        weeklyData
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await apiRequest(`/api/export/sales-data?filter=${exportFilter}`);
      
      if (response.ok) {
        // Create blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with current date and filter
        const currentDate = new Date().toISOString().split('T')[0];
        const filterLabel = exportFilter === 'all' ? 'all-time' : exportFilter;
        link.download = `sales-report-${filterLabel}-${currentDate}.xlsx`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert(`Excel file downloaded successfully! (${exportFilter === 'all' ? 'All Time' : `Last ${exportFilter === 'daily' ? '30 Days' : exportFilter === 'weekly' ? '12 Weeks' : '12 Months'}`})`);
      } else {
        throw new Error('Failed to generate Excel file');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Error downloading Excel file. Please try again.');
    }
  };

  const statCards = [
    {
      title: 'Total Medicines',
      value: stats.totalMedicines,
      icon: '💊',
      color: 'bg-blue-500',
      href: '/medicines',
    },
    {
      title: 'Inventory Value',
      value: `${formatCurrency(stats.inventoryValue)}`,
      icon: '📦',
      color: 'bg-blue-500',
      href: '/medicines'
    },
    {
      title: 'Total Cost',
      value: `${formatCurrency(stats.totalPurchasePrice || 0)}`,
      icon: '🛒',
      color: 'bg-orange-500',
      href: '/medicines'
    },
    {
      title: 'Total Sales Value',
      value: `${formatCurrency(stats.totalSellingPrice || 0)}`,
      icon: '💵',
      color: 'bg-green-500',
      href: '/invoices'
    },
    {
      title: 'Total Sales',
      value: `${formatCurrency(stats.totalSales)}`,
      icon: '💰',
      color: 'bg-green-500',
      href: '/invoices'
    },
    {
      title: 'Gross Profit',
      value: `${formatCurrency(stats.grossProfit)}`,
      icon: '📈',
      color: 'bg-green-500',
      href: '/invoices'
    },
  ];

  const quickActions = [
    {
      title: 'Add New Medicine',
      description: 'Add a new medicine to inventory',
      icon: '➕',
      href: '/medicines/add',
      color: 'bg-primary-500',
    },
    {
      title: 'Generate Invoice',
      description: 'Create a new customer invoice',
      icon: '🧾',
      href: '/invoices/generate',
      color: 'bg-success-500',
    },
    {
      title: 'View Medicines',
      description: 'Browse and manage medicines',
      icon: '📋',
      href: '/medicines',
      color: 'bg-warning-500',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to {settings.shopName} Management System
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${stat.color}`}>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 p-3 rounded-lg ${action.color}`}>
                      <span className="text-2xl">{action.icon}</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sales & Profit Overview */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Sales & Profit Overview</h3>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <select
                  value={exportFilter}
                  onChange={(e) => setExportFilter(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Last 30 Days</option>
                  <option value="weekly">Last 12 Weeks</option>
                  <option value="monthly">Last 12 Months</option>
                  <option value="all">All Time</option>
                </select>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1 text-sm rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <span>📊</span>
                  <span>Export Excel</span>
                </button>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTimePeriod('daily')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium ${
                    timePeriod === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setTimePeriod('weekly')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium ${
                    timePeriod === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTimePeriod('monthly')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium ${
                    timePeriod === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>
                      {(() => {
              const currentData = timePeriod === 'daily' ? chartData.dailyData : 
                                 timePeriod === 'weekly' ? chartData.weeklyData : 
                                 chartData.monthlyData;
              const periodLabel = timePeriod === 'daily' ? 'Daily' : 
                                 timePeriod === 'weekly' ? 'Weekly' : 'Monthly';
              
              return currentData.length > 0 ? (
                <div className="space-y-6">
                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">{periodLabel} Sales Bar Chart</h4>
                      <div className="relative h-48 bg-gray-50 rounded-lg p-4">
                        <div className="flex items-end justify-between h-full space-x-2">
                          {currentData.slice(0, 6).reverse().map((period, index) => {
                            const maxSales = Math.max(...currentData.slice(0, 6).map(m => m.sales));
                            const height = maxSales > 0 ? (period.sales / maxSales) * 80 : 0;
                            const periodLabel = timePeriod === 'daily' ? 
                              new Date(period.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                              timePeriod === 'weekly' ? 
                              `W${period.period.split('-W')[1]}` :
                              new Date(period.period + '-01').toLocaleDateString('en-US', { month: 'short' });
                            
                            return (
                              <div key={period.period} className="flex-1 flex flex-col items-center">
                                <div 
                                  className="w-full bg-green-500 rounded-t min-h-[4px]"
                                  style={{ height: `${height}%` }}
                                ></div>
                                <div className="text-xs text-gray-500 mt-2 text-center">
                                  {periodLabel}
                                </div>
                                <div className="text-xs font-medium text-green-600">
                                  {settings.currency}{period.sales.toFixed(0)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                                    {/* Line Chart */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">{periodLabel} Profit Trend Line Chart</h4>
                      <div className="relative h-48 bg-gray-50 rounded-lg p-4">
                        <svg className="w-full h-full" viewBox="0 0 400 200">
                          {currentData.slice(0, 6).reverse().map((period, index) => {
                            const reversedData = currentData.slice(0, 6).reverse();
                            const maxProfit = Math.max(...reversedData.map(m => Math.abs(m.profit)));
                            const x = (index / (reversedData.length - 1)) * 350 + 25;
                            const y = maxProfit > 0 ? 175 - ((period.profit / maxProfit) * 150) : 175;
                            
                            if (index === 0) {
                              return (
                                <g key={period.period}>
                                  <circle cx={x} cy={y} r="4" fill={period.profit >= 0 ? "#10b981" : "#ef4444"} />
                                </g>
                              );
                            }
                            
                            const prevPeriod = reversedData[index - 1];
                            const prevMaxProfit = Math.max(...reversedData.map(m => Math.abs(m.profit)));
                            const prevX = ((index - 1) / (reversedData.length - 1)) * 350 + 25;
                            const prevY = prevMaxProfit > 0 ? 175 - ((prevPeriod.profit / prevMaxProfit) * 150) : 175;
                            
                            return (
                              <g key={period.period}>
                                <line 
                                  x1={prevX} y1={prevY} x2={x} y2={y} 
                                  stroke={period.profit >= 0 ? "#10b981" : "#ef4444"} 
                                  strokeWidth="2" 
                                />
                                <circle cx={x} cy={y} r="4" fill={period.profit >= 0 ? "#10b981" : "#ef4444"} />
                              </g>
                            );
                          })}
                        </svg>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          {currentData.slice(0, 6).reverse().map((period, index) => {
                            const periodLabel = timePeriod === 'daily' ? 
                              new Date(period.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                              timePeriod === 'weekly' ? 
                              `W${period.period.split('-W')[1]}` :
                              new Date(period.period + '-01').toLocaleDateString('en-US', { month: 'short' });
                            
                            return (
                              <span key={period.period}>
                                {periodLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{periodLabel} Summary</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {currentData.slice(0, 6).map((period, index) => {
                        const periodLabel = timePeriod === 'daily' ? 
                          new Date(period.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                          timePeriod === 'weekly' ? 
                          `Week ${period.period.split('-W')[1]}, ${period.period.split('-W')[0]}` :
                          new Date(period.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        
                        return (
                          <div key={period.period} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {periodLabel}
                              </div>
                              <div className="text-xs text-gray-500">
                                {period.count} invoices, {period.returnCount || 0} returns
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                Sales: {settings.currency}{period.sales.toFixed(2)}
                              </div>
                              <div className={`text-sm font-medium ${period.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                Profit: {settings.currency}{period.profit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No {timePeriod} data available</p>
                  <p className="text-sm text-gray-400 mt-2">Generate invoices to see {timePeriod} trends</p>
                </div>
              );
            })()}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <div className="flex space-x-2">
              <Link href="/invoices" className="text-sm text-primary-600 hover:text-primary-800">
                View Invoices
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/returns" className="text-sm text-primary-600 hover:text-primary-800">
                View Returns
              </Link>
            </div>
          </div>
          <div className="card">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent activity</p>
                <p className="text-sm text-gray-400 mt-2">
                  Start by adding medicines or generating invoices
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className={`flex-shrink-0 p-2 rounded-lg ${activity.bgColor}`}>
                      <span className={`text-lg ${activity.color}`}>{activity.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
} 