import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { formatCurrency as formatAppCurrency } from '../../lib/currency';

export default function Reports() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter, year, custom, all
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [reportsData, setReportsData] = useState({});

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchReportsData();
  }, [dateRange, customStartDate, customEndDate]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      let url = '/api/reports?type=overview';
      const { start, end } = getRange();
      if (start && end) {
        url += `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
      }
      const response = await apiRequest(url);
      if (response.ok) {
        const data = await response.json();
        setReportsData(data);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRange = () => {
    const now = new Date();
    const toISO = (d) => new Date(d).toISOString();

    switch (dateRange) {
      case 'week': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) return { start: null, end: null };
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'custom': return 'Custom Range';
      case 'all': return 'All Time';
      default: return 'Last 30 Days';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Business Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive business insights and performance analytics
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="ml-auto">
              <span className="text-sm text-gray-500">
                {getDateRangeLabel()}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('profit-loss')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profit-loss'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Profit & Loss
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Top Products
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏷️ Category Performance
            </button>
            <button
              onClick={() => setActiveTab('taxes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'taxes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🧾 Tax Analysis
            </button>
          </nav>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Overview Dashboard Tab */}
        {activeTab === 'overview' && !loading && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <span className="text-green-600 text-lg">💰</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatAppCurrency(reportsData.totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Sales</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(reportsData.totalSales)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">📈</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Gross Profit</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatAppCurrency(reportsData.grossProfit)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <span className="text-purple-600 text-lg">🎯</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Profit Margin</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {reportsData.profitMargin ? `${reportsData.profitMargin.toFixed(1)}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">📊 Recent Activity Summary</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Top Selling Products</h4>
                    {reportsData.topProducts && reportsData.topProducts.length > 0 ? (
                      <div className="space-y-2">
                        {reportsData.topProducts.slice(0, 5).map((product, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{product.name}</span>
                            <span className="font-medium">{formatNumber(product.quantity)} sold</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No data available</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Category Performance</h4>
                    {reportsData.categoryPerformance && reportsData.categoryPerformance.length > 0 ? (
                      <div className="space-y-2">
                        {reportsData.categoryPerformance.slice(0, 5).map((category, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{category.name}</span>
                            <span className="font-medium">{formatAppCurrency(category.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profit & Loss Tab */}
        {activeTab === 'profit-loss' && !loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">💰 Profit & Loss Statement</h3>
                <p className="text-sm text-gray-500">Detailed financial performance for the selected period</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Revenue</span>
                    <span className="font-semibold text-green-600">{formatAppCurrency(reportsData.totalRevenue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Cost of Goods Sold</span>
                    <span className="text-red-600">{formatAppCurrency(reportsData.costOfGoodsSold)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Gross Profit</span>
                    <span className="font-semibold text-blue-600">{formatAppCurrency(reportsData.grossProfit)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Operating Expenses</span>
                    <span className="text-red-600">{formatAppCurrency(reportsData.operatingExpenses)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Taxes</span>
                    <span className="text-red-600">{formatAppCurrency(reportsData.totalTaxes)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                    <span className="text-lg font-bold text-gray-900">Net Profit</span>
                    <span className="text-lg font-bold text-green-600">{formatAppCurrency(reportsData.netProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Products Tab */}
        {activeTab === 'products' && !loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">📦 Top Performing Products</h3>
                <p className="text-sm text-gray-500">Best-selling products by revenue and quantity</p>
              </div>
              <div className="p-6">
                {reportsData.topProducts && reportsData.topProducts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Sold</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportsData.topProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.code}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(product.quantity)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatAppCurrency(product.revenue)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{formatAppCurrency(product.profit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No product data available for the selected period</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category Performance Tab */}
        {activeTab === 'categories' && !loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">🏷️ Category Performance Analysis</h3>
                <p className="text-sm text-gray-500">Revenue and performance by product category</p>
              </div>
              <div className="p-6">
                {reportsData.categoryPerformance && reportsData.categoryPerformance.length > 0 ? (
                  <div className="space-y-4">
                    {reportsData.categoryPerformance.map((category, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-gray-900">{category.name}</h4>
                          <span className="text-sm text-gray-500">{category.productCount} products</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Revenue:</span>
                            <span className="ml-2 font-medium text-green-600">{formatAppCurrency(category.revenue)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Profit:</span>
                            <span className="ml-2 font-medium text-blue-600">{formatAppCurrency(category.profit)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Margin:</span>
                            <span className="ml-2 font-medium text-purple-600">{category.profitMargin?.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No category data available for the selected period</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tax Analysis Tab */}
        {activeTab === 'taxes' && !loading && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">🧾 Tax Analysis</h3>
                <p className="text-sm text-gray-500">Tax collection and breakdown for the selected period</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Tax Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Tax Collected:</span>
                          <span className="font-medium text-green-600">{formatAppCurrency(reportsData.totalTaxes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax Rate:</span>
                          <span className="font-medium">{reportsData.averageTaxRate?.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxable Sales:</span>
                          <span className="font-medium">{formatAppCurrency(reportsData.taxableSales)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Tax by Category</h4>
                      {reportsData.taxByCategory && reportsData.taxByCategory.length > 0 ? (
                        <div className="space-y-2">
                          {reportsData.taxByCategory.map((taxItem, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{taxItem.category}</span>
                              <span className="font-medium">{formatAppCurrency(taxItem.taxAmount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No tax category data available</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
