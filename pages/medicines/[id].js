import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function MedicineDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState({
    totalSold: 0,
    totalReceived: 0,
    totalProfit: 0,
    salesData: [],
    profitBreakdown: {},
    monthlySales: [],
    stockFlow: [],
    timeBasedAnalytics: {
      daily: { inflow: 0, outflow: 0, net: 0 },
      weekly: { inflow: 0, outflow: 0, net: 0 },
      monthly: { inflow: 0, outflow: 0, net: 0 },
      quarterly: { inflow: 0, outflow: 0, net: 0 },
      yearly: { inflow: 0, outflow: 0, net: 0 }
    }
  });

  // Custom time range state
  const [customTimeRange, setCustomTimeRange] = useState({
    startDate: '',
    endDate: '',
    isActive: false
  });

  const [customAnalytics, setCustomAnalytics] = useState({
    inflow: 0,
    outflow: 0,
    net: 0
  });

  useEffect(() => {
    if (id) {
      fetchMedicine();
    }
  }, [id]);

  useEffect(() => {
    if (medicine) {
      fetchAnalytics();
    }
  }, [medicine]);

  const fetchMedicine = async () => {
    try {
      const response = await apiRequest(`/api/medicines/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMedicine(data);
      } else {
        setError('Medicine not found');
      }
    } catch (error) {
      console.error('Error fetching medicine:', error);
      setError('Error loading medicine');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomTimeRangeAnalytics = async (startDate, endDate) => {
    try {
      // Convert date strings to proper Date objects with time
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      
      // Fetch inflow data for custom time range using ISO format
      const inflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow&startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      let customInflow = 0;
      if (inflowResponse.ok) {
        const inflowData = await inflowResponse.json();
        customInflow = inflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
      }

      // Calculate outflow for custom time range
      let customOutflow = 0;
      console.log('Checking sales data for custom range:', {
        start: start.toISOString(),
        end: end.toISOString(),
        salesData: analytics.salesData.slice(0, 3) // Show first 3 sales for debugging
      });
      
      analytics.salesData.forEach(sale => {
        const saleDate = new Date(sale.date);
        console.log('Sale date check:', {
          originalDate: sale.date,
          parsedDate: saleDate.toISOString(),
          isInRange: saleDate >= start && saleDate <= end,
          quantity: sale.quantity
        });
        if (saleDate >= start && saleDate <= end) {
          customOutflow += sale.quantity;
        }
      });

      const customNet = customInflow - customOutflow;
      
      console.log('Custom Time Range Debug:', {
        startDate: startDate,
        endDate: endDate,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        customInflow,
        customOutflow,
        customNet,
        salesDataLength: analytics.salesData.length
      });
      
      setCustomAnalytics({
        inflow: customInflow,
        outflow: customOutflow,
        net: customNet
      });
    } catch (error) {
      console.error('Error fetching custom time range analytics:', error);
    }
  };

  const handleCustomTimeRangeChange = (field, value) => {
    setCustomTimeRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyCustomTimeRange = () => {
    if (customTimeRange.startDate && customTimeRange.endDate) {
      setCustomTimeRange(prev => ({ ...prev, isActive: true }));
      fetchCustomTimeRangeAnalytics(customTimeRange.startDate, customTimeRange.endDate);
    }
  };

  const resetCustomTimeRange = () => {
    setCustomTimeRange({
      startDate: '',
      endDate: '',
      isActive: false
    });
    setCustomAnalytics({
      inflow: 0,
      outflow: 0,
      net: 0
    });
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch invoices data for this medicine
      const invoicesResponse = await apiRequest('/api/invoices');
      if (invoicesResponse.ok) {
        const invoices = await invoicesResponse.json();
        
        // Calculate analytics for this specific medicine
        let totalSold = 0;
        let totalProfit = 0;
        const salesData = [];
        const monthlySales = {};
        
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            if (item.medicineId === id) {
              const soldQty = item.quantity;
              const profit = Math.round(((item.price - medicine?.purchasePrice) * soldQty) * 100) / 100;
              
              totalSold += soldQty;
              totalProfit += profit;
              
              // Group by month for trend analysis
              const month = new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              if (!monthlySales[month]) {
                monthlySales[month] = { quantity: 0, revenue: 0, profit: 0 };
              }
              monthlySales[month].quantity += soldQty;
              monthlySales[month].revenue += Math.round((item.price * soldQty) * 100) / 100;
              monthlySales[month].profit += profit;
              
              salesData.push({
                date: invoice.date,
                quantity: soldQty,
                price: item.price,
                profit: profit,
                invoiceNumber: invoice.invoiceNumber
              });
            }
          });
        });

        // Calculate total received from inflow transactions (we'll get this from API)
        let totalReceived = 0;
        
        try {
          const allInflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow`);
          if (allInflowResponse.ok) {
            const allInflowData = await allInflowResponse.json();
            totalReceived = allInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching total inflow:', error);
          // Fallback: use medicine quantity + total sold
          totalReceived = (medicine?.quantity || 0) + totalSold;
        }
        
        // Calculate current stock as Total Received - Total Sold
        const currentStock = totalReceived - totalSold;
        
        // Prepare stock flow data
        const stockFlow = [
          { label: 'Total Received', value: totalReceived, color: '#3b82f6' },
          { label: 'Total Sold', value: totalSold, color: '#ef4444' },
          { label: 'Current Stock', value: currentStock, color: '#10b981' }
        ];

        // Calculate time-based analytics (Daily, Weekly, Monthly, Quarterly, Yearly)
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Calculate quarterly start (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        
        // Calculate yearly start
        const yearStart = new Date(now.getFullYear(), 0, 1);

        let dailyInflow = 0, dailyOutflow = 0;
        let weeklyInflow = 0, weeklyOutflow = 0;
        let monthlyInflow = 0, monthlyOutflow = 0;
        let quarterlyInflow = 0, quarterlyOutflow = 0;
        let yearlyInflow = 0, yearlyOutflow = 0;

        // Calculate outflow (items sold) for different time periods
        salesData.forEach(sale => {
          const saleDate = new Date(sale.date);
          
          // Daily analytics
          if (saleDate >= today) {
            dailyOutflow += sale.quantity;
          }
          
          // Weekly analytics
          if (saleDate >= weekStart) {
            weeklyOutflow += sale.quantity;
          }
          
          // Monthly analytics
          if (saleDate >= monthStart) {
            monthlyOutflow += sale.quantity;
          }
          
          // Quarterly analytics
          if (saleDate >= quarterStart) {
            quarterlyOutflow += sale.quantity;
          }
          
          // Yearly analytics
          if (saleDate >= yearStart) {
            yearlyOutflow += sale.quantity;
          }
        });

        // Calculate date ranges for inflow queries
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // End of week (Saturday)
        endOfWeek.setHours(23, 59, 59, 999);
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Fetch real inflow data from inventory transactions
        try {
          const inflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`);
          if (inflowResponse.ok) {
            const dailyInflowData = await inflowResponse.json();
            dailyInflow = dailyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching daily inflow:', error);
          dailyInflow = 0;
        }

        try {
          const weeklyInflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow&startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`);
          if (weeklyInflowResponse.ok) {
            const weeklyInflowData = await weeklyInflowResponse.json();
            weeklyInflow = weeklyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching weekly inflow:', error);
          weeklyInflow = 0;
        }

        try {
          const monthlyInflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow&startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`);
          if (monthlyInflowResponse.ok) {
            const monthlyInflowData = await monthlyInflowResponse.json();
            monthlyInflow = monthlyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching monthly inflow:', error);
          monthlyInflow = 0;
        }

        // Fetch quarterly inflow data
        try {
          const quarterlyInflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow&startDate=${quarterStart.toISOString()}&endDate=${endOfMonth.toISOString()}`);
          if (quarterlyInflowResponse.ok) {
            const quarterlyInflowData = await quarterlyInflowResponse.json();
            quarterlyInflow = quarterlyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching quarterly inflow:', error);
          quarterlyInflow = 0;
        }

        // Fetch yearly inflow data
        try {
          const yearlyInflowResponse = await apiRequest(`/api/inventory?medicineId=${medicine._id}&type=inflow&startDate=${yearStart.toISOString()}&endDate=${endOfMonth.toISOString()}`);
          if (yearlyInflowResponse.ok) {
            const yearlyInflowData = await yearlyInflowResponse.json();
            yearlyInflow = yearlyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching yearly inflow:', error);
          yearlyInflow = 0;
        }

        // Prepare profit breakdown with proper rounding
        const totalRevenue = Math.round((totalSold * (medicine?.sellingPrice || 0)) * 100) / 100;
        const totalCost = Math.round((totalSold * (medicine?.purchasePrice || 0)) * 100) / 100;
        const roundedProfit = Math.round(totalProfit * 100) / 100;
        const profitMargin = totalRevenue > 0 ? Math.round(((roundedProfit / totalRevenue) * 100) * 10) / 10 : 0;
        
        setAnalytics({
          totalSold,
          totalReceived,
          totalProfit: roundedProfit,
          salesData,
          profitBreakdown: {
            totalRevenue,
            totalCost,
            profit: roundedProfit,
            profitMargin
          },
          monthlySales: Object.entries(monthlySales).map(([month, data]) => ({
            month,
            quantity: data.quantity,
            revenue: Math.round(data.revenue * 100) / 100,
            profit: Math.round(data.profit * 100) / 100
          })),
          stockFlow,
          timeBasedAnalytics: {
            daily: { 
              inflow: dailyInflow, 
              outflow: dailyOutflow, 
              net: dailyInflow - dailyOutflow 
            },
            weekly: { 
              inflow: weeklyInflow, 
              outflow: weeklyOutflow, 
              net: weeklyInflow - weeklyOutflow 
            },
            monthly: { 
              inflow: monthlyInflow, 
              outflow: monthlyOutflow, 
              net: monthlyInflow - monthlyOutflow 
            },
            quarterly: { 
              inflow: quarterlyInflow, 
              outflow: quarterlyOutflow, 
              net: quarterlyInflow - quarterlyOutflow 
            },
            yearly: { 
              inflow: yearlyInflow, 
              outflow: yearlyOutflow, 
              net: yearlyInflow - yearlyOutflow 
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Enhanced Pie Chart Component with better styling
  const EnhancedPieChart = ({ data, title, subtitle, colors, showPercentage = true }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <div className="text-center p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">{title}</h4>
        {subtitle && <p className="text-sm text-gray-600 mb-4">{subtitle}</p>}
        
        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const x1 = 50 + 40 * Math.cos(currentAngle * Math.PI / 180);
              const y1 = 50 + 40 * Math.sin(currentAngle * Math.PI / 180);
              const x2 = 50 + 40 * Math.cos((currentAngle + angle) * Math.PI / 180);
              const y2 = 50 + 40 * Math.sin((currentAngle + angle) * Math.PI / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle += angle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={item.color || colors[index % colors.length]}
                  stroke="#fff"
                  strokeWidth="1"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            return (
              <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3 shadow-sm"
                    style={{ backgroundColor: item.color || colors[index % colors.length] }}
                  ></div>
                  <span className="text-gray-700 font-medium">{item.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{item.value}</div>
                  {showPercentage && <div className="text-xs text-gray-500">{percentage}%</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Bar Chart Component for monthly trends
  const BarChart = ({ data, title, color = '#3b82f6' }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No sales data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(item => item.quantity));
    
    return (
      <div className="p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">{title}</h4>
        <div className="space-y-3">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.quantity / maxValue) * 100 : 0;
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-16 text-xs text-gray-600 font-medium">{item.month}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${height}%` }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white drop-shadow-sm">
                      {item.quantity}
                    </span>
                  </div>
                </div>
                <div className="w-20 text-right text-xs text-gray-600">
                  Rs{Math.round(item.revenue * 100) / 100}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !medicine) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error || 'Medicine not found'}</div>
          <button
            onClick={() => router.push('/medicines')}
            className="btn-primary"
          >
            Back to Medicines
          </button>
        </div>
      </Layout>
    );
  }

  // Prepare data for enhanced charts
  const inventoryData = [
    { label: 'Total Sold', value: analytics.totalSold, color: '#ef4444' },
    { label: 'Current Stock', value: medicine.quantity, color: '#10b981' }
  ];

  const profitData = [
    { label: 'Total Cost', value: analytics.profitBreakdown.totalCost || 0, color: '#f59e0b' },
    { label: 'Total Profit', value: analytics.totalProfit || 0, color: '#3b82f6' }
  ];

  const marginPercentage = medicine.purchasePrice > 0 
    ? Math.round(((medicine.sellingPrice - medicine.purchasePrice) / medicine.purchasePrice * 100) * 10) / 10
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{medicine.name}</h1>
            <p className="mt-2 text-lg text-gray-600">
              Code: <span className="font-mono font-semibold">{medicine.code}</span> | 
              Batch: <span className="font-mono font-semibold">{medicine.batchNo || 'N/A'}</span>
            </p>
          </div>
          <button
            onClick={() => router.push('/medicines')}
            className="btn-secondary text-lg px-6 py-3"
          >
            ⬅️ Back to Medicines
          </button>
        </div>

        {/* Enhanced Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 bg-red-400 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm opacity-90">Total Sold</p>
                <p className="text-3xl font-bold">{analytics.totalSold}</p>
                <p className="text-xs opacity-75">units</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 bg-blue-400 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm opacity-90">Total Received</p>
                <p className="text-3xl font-bold">{analytics.totalReceived}</p>
                <p className="text-xs opacity-75">units</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 bg-green-400 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm opacity-90">Current Stock</p>
                <p className="text-3xl font-bold">{medicine.quantity}</p>
                <p className="text-xs opacity-75">units</p>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white transform hover:scale-105 transition-transform">
            <div className="flex items-center">
              <div className="p-3 bg-purple-400 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm opacity-90">Total Profit</p>
                <p className="text-3xl font-bold">{formatCurrency(analytics.totalProfit)}</p>
                <p className="text-xs opacity-75">{analytics.profitBreakdown.profitMargin?.toFixed(1)}% margin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock Flow Chart */}
          <div className="card">
            <EnhancedPieChart 
              data={analytics.stockFlow}
              title="📦 Stock Flow Analysis"
              subtitle="Complete inventory overview"
              colors={['#3b82f6', '#ef4444', '#10b981']}
            />
          </div>

          {/* Sales vs Stock Chart */}
          <div className="card">
            <EnhancedPieChart 
              data={inventoryData}
              title="📊 Sales vs Stock"
              subtitle="Current distribution"
              colors={['#ef4444', '#10b981']}
            />
          </div>

          {/* Profit Analysis Chart */}
          <div className="card">
            <EnhancedPieChart 
              data={profitData}
              title="💰 Profit Analysis"
              subtitle="Cost vs Profit breakdown"
              colors={['#f59e0b', '#3b82f6']}
            />
          </div>
        </div>

        {/* Monthly Sales Trend */}
        {analytics.monthlySales.length > 0 && (
          <div className="card">
            <BarChart 
              data={analytics.monthlySales}
              title="📈 Monthly Sales Trend"
            />
          </div>
        )}

        {/* Time-Based Inflow/Outflow Analytics */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            📊 Time-Based Stock Flow Analysis
          </h3>
          
          {/* Info Note */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ <strong>Real-Time Data:</strong> All inflow (purchases) and outflow (sales) data is now tracked 
              through the inventory management system. Stock updates and sales are automatically recorded.
            </p>
          </div>

          {/* Custom Time Range Selector */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              🗓️ Custom Time Range Analysis
            </h4>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-700">From:</label>
                <input
                  type="date"
                  value={customTimeRange.startDate}
                  onChange={(e) => handleCustomTimeRangeChange('startDate', e.target.value)}
                  className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-blue-700">To:</label>
                <input
                  type="date"
                  value={customTimeRange.endDate}
                  onChange={(e) => handleCustomTimeRangeChange('endDate', e.target.value)}
                  className="px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={applyCustomTimeRange}
                disabled={!customTimeRange.startDate || !customTimeRange.endDate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                🔍 Apply Range
              </button>
              {customTimeRange.isActive && (
                <button
                  onClick={resetCustomTimeRange}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium"
                >
                  🔄 Reset
                </button>
              )}
            </div>
            
            {/* Quick Preset Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm font-medium text-blue-700 mr-2">Quick Presets:</span>
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  setCustomTimeRange({
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                    isActive: false
                  });
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs font-medium"
              >
                📅 Last 7 Days
              </button>
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 30);
                  setCustomTimeRange({
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                    isActive: false
                  });
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs font-medium"
              >
                📅 Last 30 Days
              </button>
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 90);
                  setCustomTimeRange({
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                    isActive: false
                  });
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs font-medium"
              >
                📅 Last 3 Months
              </button>
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 180);
                  setCustomTimeRange({
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0],
                    isActive: false
                  });
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs font-medium"
              >
                📅 Last 6 Months
              </button>
            </div>
            
            {/* Custom Time Range Results */}
            {customTimeRange.isActive && (
              <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{customAnalytics.inflow}</div>
                    <div className="text-sm text-blue-700">Inflow (Custom Range)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{customAnalytics.outflow}</div>
                    <div className="text-sm text-red-700">Outflow (Custom Range)</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${customAnalytics.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {customAnalytics.net >= 0 ? '+' : ''}{customAnalytics.net}
                    </div>
                    <div className="text-sm text-gray-700">Net (Custom Range)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Daily Analytics */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                📅 Today's Flow
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Inflow:</span>
                  <span className="font-bold text-blue-800">{analytics.timeBasedAnalytics.daily.inflow} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.daily.outflow} units</span>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      (analytics.timeBasedAnalytics.daily.inflow - analytics.timeBasedAnalytics.daily.outflow) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.daily.inflow - analytics.timeBasedAnalytics.daily.outflow >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.daily.inflow - analytics.timeBasedAnalytics.daily.outflow} units
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Analytics */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                📊 This Week's Flow
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Inflow:</span>
                  <span className="font-bold text-green-800">{analytics.timeBasedAnalytics.weekly.inflow} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.weekly.outflow} units</span>
                </div>
                <div className="border-t border-green-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      (analytics.timeBasedAnalytics.weekly.inflow - analytics.timeBasedAnalytics.weekly.outflow) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.weekly.inflow - analytics.timeBasedAnalytics.weekly.outflow >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.weekly.inflow - analytics.timeBasedAnalytics.weekly.outflow} units
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Analytics */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
                📈 This Month's Flow
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-700">Inflow:</span>
                  <span className="font-bold text-purple-800">{analytics.timeBasedAnalytics.monthly.inflow} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.monthly.outflow} units</span>
                </div>
                <div className="border-t border-purple-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      (analytics.timeBasedAnalytics.monthly.inflow - analytics.timeBasedAnalytics.monthly.outflow) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.monthly.inflow - analytics.timeBasedAnalytics.monthly.outflow >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.monthly.inflow - analytics.timeBasedAnalytics.monthly.outflow} units
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quarterly Analytics */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
                📊 This Quarter's Flow
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-700">Inflow:</span>
                  <span className="font-bold text-orange-800">{analytics.timeBasedAnalytics.quarterly.inflow} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.quarterly.outflow} units</span>
                </div>
                <div className="border-t border-orange-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      (analytics.timeBasedAnalytics.quarterly.inflow - analytics.timeBasedAnalytics.quarterly.outflow) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.quarterly.inflow - analytics.timeBasedAnalytics.quarterly.outflow >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.quarterly.inflow - analytics.timeBasedAnalytics.quarterly.outflow} units
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Yearly Analytics */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
                📈 This Year's Flow
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Inflow:</span>
                  <span className="font-bold text-indigo-800">{analytics.timeBasedAnalytics.yearly.inflow} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.yearly.outflow} units</span>
                </div>
                <div className="border-t border-indigo-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      (analytics.timeBasedAnalytics.yearly.inflow - analytics.timeBasedAnalytics.yearly.outflow) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.yearly.inflow - analytics.timeBasedAnalytics.yearly.outflow >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.yearly.inflow - analytics.timeBasedAnalytics.yearly.outflow} units
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analytics.timeBasedAnalytics.daily.outflow}</div>
              <div className="text-sm text-blue-700">Units Sold Today</div>
            </div>
            <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analytics.timeBasedAnalytics.weekly.outflow}</div>
              <div className="text-sm text-green-700">Units Sold This Week</div>
            </div>
            <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics.timeBasedAnalytics.monthly.outflow}</div>
              <div className="text-sm text-purple-700">Units Sold This Month</div>
            </div>
            <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analytics.timeBasedAnalytics.quarterly.outflow}</div>
              <div className="text-sm text-orange-700">Units Sold This Quarter</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{analytics.timeBasedAnalytics.yearly.outflow}</div>
              <div className="text-sm text-indigo-700">Units Sold This Year</div>
            </div>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              📋 Basic Information
            </h3>
            <dl className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Medicine Name</dt>
                <dd className="text-sm text-gray-900 font-semibold">{medicine.name}</dd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Product Code</dt>
                <dd className="text-sm text-gray-900 font-mono">{medicine.code}</dd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Batch Number</dt>
                <dd className="text-sm text-gray-900">{medicine.batchNo || 'N/A'}</dd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Expiry Date</dt>
                <dd className="text-sm text-gray-900 font-semibold">
                  {new Date(medicine.expiryDate).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Financial Information */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              💵 Financial Details
            </h3>
            <dl className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Current Stock</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${
                    medicine.quantity <= 10 
                      ? 'bg-red-100 text-red-800' 
                      : medicine.quantity <= 50 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                      {medicine.quantity} units
                    </span>
                </dd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Purchase Price</dt>
                <dd className="text-sm text-gray-900 font-semibold">{formatCurrency(medicine.purchasePrice)}</dd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Selling Price</dt>
                <dd className="text-sm text-gray-900 font-semibold">{formatCurrency(medicine.sellingPrice)}</dd>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-600">Profit per Unit</dt>
                <dd className="text-sm text-green-600 font-bold">
                  {formatCurrency(medicine.sellingPrice - medicine.purchasePrice)}
                </dd>
              </div>
              <div className="flex justify-between items-center py-3">
                <dt className="text-sm font-medium text-gray-600">Profit Margin</dt>
                <dd className="text-sm text-green-600 font-bold">
                  {marginPercentage}%
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Recent Sales History */}
        {analytics.salesData.length > 0 && (
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center justify-between">
              <span>📈 Recent Sales History</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Showing {Math.min(analytics.salesData.length, 10)} of {analytics.salesData.length} sales
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      const container = document.getElementById('sales-table-container');
                      if (container) {
                        container.scrollTo({
                          top: container.scrollTop - 200,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center transition-colors"
                    title="Scroll Up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => {
                      const container = document.getElementById('sales-table-container');
                      if (container) {
                        container.scrollTo({
                          top: container.scrollTop + 200,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    className="w-8 h-8 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full flex items-center justify-center transition-colors"
                    title="Scroll Down"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </h3>
            
            <div 
              id="sales-table-container"
              className="overflow-y-auto max-h-96 scroll-smooth border border-gray-200 rounded-lg"
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.salesData.slice(0, 10).map((sale, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {sale.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-semibold">{sale.quantity}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(sale.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                        {formatCurrency(sale.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Scroll Instructions */}
            <div className="mt-3 text-center text-xs text-gray-500">
              💡 Use ↑↓ arrows or scroll to navigate through sales history
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 justify-center">
          <button
            onClick={() => router.push(`/medicines/${id}/edit`)}
            className="btn-primary text-lg px-8 py-3"
          >
            ✏️ Edit Medicine
          </button>
          <button
            onClick={() => router.push('/medicines')}
            className="btn-secondary text-lg px-8 py-3"
          >
            📋 Back to List
          </button>
        </div>
      </div>
    </Layout>
  );
}
