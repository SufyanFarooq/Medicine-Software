import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import BarcodeGenerator from '../../components/BarcodeGenerator';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
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
  const [customTimeRange, setCustomTimeRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [customAnalytics, setCustomAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [stockUpdateData, setStockUpdateData] = useState({
    additionalQuantity: '',
    newTotalBuyingPrice: '',
    newBatchNo: '',
    supplier: ''
  });
  const [priceChangeAlert, setPriceChangeAlert] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      fetchAnalytics();
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      const response = await apiRequest(`/api/products/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Error loading product');
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
      const inflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow&startDate=${start.toISOString()}&endDate=${end.toISOString()}`);
      let customInflow = 0;
      if (inflowResponse.ok) {
        const inflowData = await inflowResponse.json();
        customInflow = inflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
      }

      // Calculate outflow for custom time range
      let customOutflow = 0;
      analytics.salesData.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate >= start && saleDate <= end) {
          customOutflow += sale.quantity;
        }
      });

      const customNet = customInflow - customOutflow;
      
      setCustomAnalytics({
        inflow: customInflow,
        outflow: customOutflow,
        net: customNet
      });
    } catch (error) {
      console.error('Error fetching custom time range analytics:', error);
    }
  };

  // Stock Update Functions
  const handleStockUpdate = async () => {
    try {
      if (!stockUpdateData.additionalQuantity || !stockUpdateData.newTotalBuyingPrice) {
        alert('Please fill in all required fields');
        return;
      }

      const additionalQuantity = parseInt(stockUpdateData.additionalQuantity);
      const newTotalBuyingPrice = parseFloat(stockUpdateData.newTotalBuyingPrice);

      if (additionalQuantity <= 0 || newTotalBuyingPrice <= 0) {
        alert('Quantity and price must be greater than 0');
        return;
      }

      // Record inventory transaction
      const inventoryData = {
        productId: product._id,
        type: 'inflow',
        quantity: additionalQuantity,
        totalBuyingPrice: newTotalBuyingPrice,
        batchNo: stockUpdateData.newBatchNo || product.batchNo,
        supplier: stockUpdateData.supplier || 'Unknown',
        date: new Date().toISOString(),
        notes: `Stock update via view page`
      };

      const inventoryResponse = await apiRequest('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(inventoryData)
      });

      if (!inventoryResponse.ok) {
        throw new Error('Failed to record inventory transaction');
      }

      // Calculate new average purchase price and quantity
      const currentQuantity = parseInt(product.quantity) || 0;
      const currentTotalValue = currentQuantity * (parseFloat(product.purchasePrice) || 0);
      const newTotalValue = currentTotalValue + newTotalBuyingPrice;
      const newTotalQuantity = currentQuantity + additionalQuantity;
      const newAveragePrice = newTotalValue / newTotalQuantity;

      // Update product
      const updatedProduct = {
        ...product,
        quantity: newTotalQuantity,
        purchasePrice: newAveragePrice.toFixed(2),
        batchNo: stockUpdateData.newBatchNo || product.batchNo
      };

      const updateResponse = await apiRequest(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProduct)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update product');
      }

      // Set price change alert
      const oldPrice = parseFloat(product.purchasePrice) || 0;
      const priceChange = newAveragePrice - oldPrice;
      const priceChangePercent = oldPrice > 0 ? ((priceChange / oldPrice) * 100).toFixed(2) : 0;

      if (Math.abs(priceChange) > 0.01) {
        setPriceChangeAlert(
          `Purchase price updated from ${oldPrice.toFixed(2)} to ${newAveragePrice.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChangePercent}%)`
        );
      }

      // Update local state
      setProduct(updatedProduct);
      setStockUpdateData({
        additionalQuantity: '',
        newTotalBuyingPrice: '',
        newBatchNo: '',
        supplier: ''
      });
      setShowStockUpdate(false);

      // Show success message
      alert(`Stock updated successfully! Added ${additionalQuantity} units.`);

      // Refresh analytics
      fetchAnalytics();

    } catch (error) {
      console.error('Error updating stock:', error);
      alert(`Failed to update stock: ${error.message}`);
    }
  };

  const handleStockUpdateCancel = () => {
    setStockUpdateData({
      additionalQuantity: '',
      newTotalBuyingPrice: '',
      newBatchNo: '',
      supplier: ''
    });
    setShowStockUpdate(false);
    setPriceChangeAlert('');
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
      // Fetch invoices data for this product
      const invoicesResponse = await apiRequest('/api/invoices');
      if (invoicesResponse.ok) {
        const invoices = await invoicesResponse.json();
        
        // Calculate analytics for this specific product
        let totalSold = 0;
        let totalProfit = 0;
        const salesData = [];
        const monthlySales = {};
        
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            if (item.productId === id) {
              const soldQty = item.quantity;
              const profit = Math.round(((item.price - product?.purchasePrice) * soldQty) * 100) / 100;
              
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
          const allInflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow`);
          if (allInflowResponse.ok) {
            const allInflowData = await allInflowResponse.json();
            totalReceived = allInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching total inflow:', error);
          // Fallback: use product quantity + total sold
          totalReceived = (product?.quantity || 0) + totalSold;
        }
        
        // If no inflow transactions found, use product quantity + total sold as fallback
        if (totalReceived === 0) {
          totalReceived = (product?.quantity || 0) + totalSold;
        }
        
        // Calculate current stock as Total Received - Total Sold
        const currentStock = totalReceived - totalSold;
        
        // Validate current stock matches product quantity
        if (Math.abs(currentStock - product.quantity) > 1) {
          console.warn('Stock mismatch detected:', {
            calculatedStock: currentStock,
            productQuantity: product.quantity,
            totalReceived,
            totalSold
          });
          // Use product quantity as source of truth
          totalReceived = product.quantity + totalSold;
        }
        
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
          const inflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow&startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`);
          if (inflowResponse.ok) {
            const dailyInflowData = await inflowResponse.json();
            dailyInflow = dailyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching daily inflow:', error);
          dailyInflow = 0;
        }

        try {
          const weeklyInflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow&startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`);
          if (weeklyInflowResponse.ok) {
            const weeklyInflowData = await weeklyInflowResponse.json();
            weeklyInflow = weeklyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching weekly inflow:', error);
          weeklyInflow = 0;
        }

        try {
          const monthlyInflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow&startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`);
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
          const quarterlyInflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow&startDate=${quarterStart.toISOString()}&endDate=${endOfMonth.toISOString()}`);
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
          const yearlyInflowResponse = await apiRequest(`/api/inventory?productId=${product._id}&type=inflow&startDate=${yearStart.toISOString()}&endDate=${endOfMonth.toISOString()}`);
          if (yearlyInflowResponse.ok) {
            const yearlyInflowData = await yearlyInflowResponse.json();
            yearlyInflow = yearlyInflowData.reduce((sum, transaction) => sum + transaction.quantity, 0);
          }
        } catch (error) {
          console.error('Error fetching yearly inflow:', error);
          yearlyInflow = 0;
        }

        // Prepare profit breakdown with proper rounding
        const totalRevenue = Math.round((totalSold * (product?.sellingPrice || 0)) * 100) / 100;
        const totalCost = Math.round((totalSold * (product?.purchasePrice || 0)) * 100) / 100;
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error || 'Product not found'}</div>
          <button
            onClick={() => router.push('/products')}
            className="btn-primary"
          >
            Back to Products
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="mt-2 text-lg text-gray-600">
              Code: <span className="font-mono font-semibold">{product.code}</span> | 
              Category: <span className="font-mono font-semibold">{product.category}</span>
              {product.adminDiscount > 0 && (
                <span className="ml-4 text-blue-600 font-semibold">
                  🎯 Admin Discount: {product.adminDiscount}%
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push('/products')}
            className="btn-secondary text-lg px-6 py-3"
          >
            ⬅️ Back to Products
          </button>
        </div>

        {/* Barcode & Quick Details */}
        <div className="card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">🔗 Barcode</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium text-gray-900">Code:</span> <span className="font-mono">{product.code}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Category:</span> {product.category || 'N/A'}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Stock:</span> {product.quantity} {product.unit || 'pcs'}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Unit Cost:</span> {formatCurrency(product.purchasePrice)}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Selling Price:</span> {formatCurrency(product.sellingPrice)}
                </div>
                <div>
                  <span className="font-medium text-gray-900">Admin Discount:</span> {product.adminDiscount || 0}%
                </div>
              </div>
            </div>
            <div className="overflow-auto">
              <BarcodeGenerator value={product.code} />
            </div>
          </div>
        </div>

        {/* Stock Update Section - Back to View Details Page */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📦 Update Stock</h2>
            <button
              onClick={() => setShowStockUpdate(!showStockUpdate)}
              className="btn-primary"
            >
              {showStockUpdate ? '❌ Cancel' : '➕ Add Stock'}
            </button>
          </div>

          {showStockUpdate && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Quantity
                  </label>
                  <input
                    type="number"
                    name="additionalQuantity"
                    value={stockUpdateData.additionalQuantity}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      additionalQuantity: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Total Buying Price
                  </label>
                  <input
                    type="number"
                    name="newTotalBuyingPrice"
                    value={stockUpdateData.newTotalBuyingPrice}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      newTotalBuyingPrice: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter total price"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Batch Number
                  </label>
                  <input
                    type="text"
                    name="newBatchNo"
                    value={stockUpdateData.newBatchNo}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      newBatchNo: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter batch number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={stockUpdateData.supplier}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      supplier: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleStockUpdate}
                  className="btn-primary"
                  disabled={!stockUpdateData.additionalQuantity || !stockUpdateData.newTotalBuyingPrice}
                >
                  💾 Update Stock
                </button>
                <button
                  onClick={handleStockUpdateCancel}
                  className="btn-secondary"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price Change Alert */}
        {priceChangeAlert && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{priceChangeAlert}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Sold</p>
                <p className="text-2xl font-bold text-blue-900">
                  {analytics?.totalSold || 0} {product?.unit || 'pcs'}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Received</p>
                <p className="text-2xl font-bold text-green-900">
                  {analytics?.totalReceived || 0} {product?.unit || 'pcs'}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-purple-50 border-purple-200">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <span className="text-2xl">🏪</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Current Stock</p>
                <p className="text-2xl font-bold text-purple-900">
                  {product?.quantity || 0} {product?.unit || 'pcs'}
                </p>
              </div>
            </div>
          </div>

          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Total Profit</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(analytics?.totalProfit || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time-Based Inflow/Outflow Analytics */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 Time-Based Stock Flow Analysis</h3>
          
          {/* Removed compact summary tiles to avoid duplication. Detailed cards below remain. */}
          
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
            </div>
            
            {/* Custom Time Range Results */}
            {customTimeRange.isActive && (
              <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{customAnalytics?.inflow || 0}</div>
                    <div className="text-sm text-blue-700">Inflow (Custom Range)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{customAnalytics?.outflow || 0}</div>
                    <div className="text-sm text-red-700">Outflow (Custom Range)</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${(customAnalytics?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(customAnalytics?.net || 0) >= 0 ? '+' : ''}{customAnalytics?.net || 0}
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
                  <span className="font-bold text-blue-800">{analytics.timeBasedAnalytics.daily.inflow} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.daily.outflow} {product.unit}</span>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      analytics.timeBasedAnalytics.daily.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.daily.net >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.daily.net} {product.unit}
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
                  <span className="font-bold text-green-800">{analytics.timeBasedAnalytics.weekly.inflow} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.weekly.outflow} {product.unit}</span>
                </div>
                <div className="border-t border-green-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      analytics.timeBasedAnalytics.weekly.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.weekly.net >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.weekly.net} {product.unit}
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
                  <span className="font-bold text-purple-800">{analytics.timeBasedAnalytics.monthly.inflow} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.monthly.outflow} {product.unit}</span>
                </div>
                <div className="border-t border-purple-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      analytics.timeBasedAnalytics.monthly.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.monthly.net >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.monthly.net} {product.unit}
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
                  <span className="font-bold text-orange-800">{analytics.timeBasedAnalytics.quarterly.inflow} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.quarterly.outflow} {product.unit}</span>
                </div>
                <div className="border-t border-orange-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      analytics.timeBasedAnalytics.quarterly.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.quarterly.net >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.quarterly.net} {product.unit}
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
                  <span className="font-bold text-indigo-800">{analytics.timeBasedAnalytics.yearly.inflow} {product.unit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-700">Outflow:</span>
                  <span className="font-bold text-red-800">{analytics.timeBasedAnalytics.yearly.outflow} {product.unit}</span>
                </div>
                <div className="border-t border-indigo-200 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Net:</span>
                    <span className={`font-bold ${
                      analytics.timeBasedAnalytics.yearly.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analytics.timeBasedAnalytics.yearly.net >= 0 ? '+' : ''}
                      {analytics.timeBasedAnalytics.yearly.net} {product.unit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Sales Analysis */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Monthly Sales Analysis</h3>
          
          {analytics?.monthlySales && analytics.monthlySales.length > 0 ? (
            <div className="space-y-3">
              {analytics.monthlySales.map((monthData, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-800">{monthData.month}</span>
                    <span className="text-sm text-gray-600 ml-2">({monthData.year})</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {monthData.quantity} {product?.unit || 'pcs'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(monthData.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl">📊</span>
              <p className="mt-2">No sales data available for monthly analysis</p>
            </div>
          )}
        </div>

        {/* Recent Sales History */}
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Recent Sales History</h3>
          
          {analytics?.salesData && analytics.salesData.length > 0 ? (
            <div>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.salesData
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((sale, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(sale.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {sale.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {sale.quantity} {product?.unit || 'pcs'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatCurrency(sale.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(sale.price * sale.quantity)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, analytics.salesData.length)} to{' '}
                    {Math.min(currentPage * itemsPerPage, analytics.salesData.length)} of{' '}
                    {analytics.salesData.length} results
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.ceil(analytics.salesData.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(analytics.salesData.length / itemsPerPage);
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        if (index > 0 && array[index - 1] !== page - 1) {
                          return (
                            <span key={`ellipsis-${page}`} className="px-2 py-1 text-sm text-gray-500">
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm font-medium rounded-md ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(analytics.salesData.length / itemsPerPage)))}
                    disabled={currentPage === Math.ceil(analytics.salesData.length / itemsPerPage)}
                    className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl">📋</span>
              <p className="mt-2">No recent sales data available</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-4 justify-center">
          <button
            onClick={() => router.push(`/products/${id}/edit`)}
            className="btn-primary text-lg px-8 py-3"
          >
            ✏️ Edit Product
          </button>
          <button
            onClick={() => router.push('/products')}
            className="btn-secondary text-lg px-8 py-3"
          >
            📋 Back to List
          </button>
        </div>
      </div>
    </Layout>
  );
}

