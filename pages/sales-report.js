import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';

export default function SalesReport() {
  const [salesData, setSalesData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchSalesData();
  }, [timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    filterData();
  }, [salesData, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, timeFilter]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      let url = `/api/sales-report?filter=${timeFilter}`;
      
      // Add custom date parameters if custom filter is selected
      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        url += `&fromDate=${customStartDate}&toDate=${customEndDate}`;
      }
      
      const response = await apiRequest(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSalesData(data.data);
          setTotalRecords(data.data.length);
        } else {
          console.error('Failed to fetch sales data:', data.message);
        }
      } else {
        console.error('Failed to fetch sales data');
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = salesData;
    
    if (searchTerm) {
      filtered = salesData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredData(filtered);
    setTotalRecords(filtered.length);
  };

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(parseInt(size));
    setCurrentPage(1);
  };

  const calculateTotals = () => {
    const data = getPaginatedData();
    const subTotal = data.reduce((sum, item) => sum + item.quantity, 0);
    const grandTotal = data.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalPurchase = data.reduce((sum, item) => sum + item.totalPurchasePrice, 0);
    const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
    
    // Also calculate totals for all filtered data (not just current page)
    const allDataSubTotal = filteredData.reduce((sum, item) => sum + item.quantity, 0);
    const allDataGrandTotal = filteredData.reduce((sum, item) => sum + item.totalPrice, 0);
    const allDataTotalPurchase = filteredData.reduce((sum, item) => sum + item.totalPurchasePrice, 0);
    const allDataTotalProfit = filteredData.reduce((sum, item) => sum + item.profit, 0);
    
    return { 
      subTotal: allDataSubTotal, 
      grandTotal: allDataGrandTotal,
      totalPurchase: allDataTotalPurchase,
      totalProfit: allDataTotalProfit,
      pageSubTotal: subTotal,
      pageGrandTotal: grandTotal,
      pageTotalPurchase: totalPurchase,
      pageTotalProfit: totalProfit
    };
  };

  const { subTotal, grandTotal, totalPurchase, totalProfit } = calculateTotals();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading sales data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Internal Medicine Statistics</h1>
          
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search by medicine name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Time Filter and Pagination Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            {/* Time Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Time Filter:</span>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily (24H)</option>
                <option value="weekly">Weekly (7 Days)</option>
                <option value="monthly">Monthly (30 Days)</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>
            
            {/* Custom Date Inputs */}
            {timeFilter === 'custom' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm font-medium text-gray-700">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Quick Date Selectors for Custom Date */}
            {timeFilter === 'custom' && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Quick Select:</span>
                <button
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    setCustomStartDate(yesterdayStr);
                    setCustomEndDate(yesterdayStr);
                  }}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => {
                    const twoDaysAgo = new Date();
                    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
                    setCustomStartDate(twoDaysAgoStr);
                    setCustomEndDate(twoDaysAgoStr);
                  }}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  2 Days Ago
                </button>
                <button
                  onClick={() => {
                    const threeDaysAgo = new Date();
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
                    setCustomStartDate(threeDaysAgoStr);
                    setCustomEndDate(threeDaysAgoStr);
                  }}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  3 Days Ago
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <span className="text-sm text-gray-600">Total Records: {totalRecords}</span>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sr. No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medicine Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Sale Unit Price (PKR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Total Price (PKR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Price (PKR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Purchase (PKR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit (PKR)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getPaginatedData().map((item, index) => (
                  <tr key={item.srNo} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalPurchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.profit)}
                    </td>
                  </tr>
                ))}
                
                {/* Summary Rows */}
                <tr className="bg-gray-50 font-medium">
                  <td colSpan="2" className="px-6 py-4 text-sm text-gray-900">
                    Sub Total
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {subTotal}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    -
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(totalPurchase)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(totalProfit)}
                  </td>
                </tr>
                <tr className="bg-blue-50 font-bold">
                  <td colSpan="2" className="px-6 py-4 text-sm text-blue-900">
                    Grand Total
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-900">
                    {subTotal}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-900">
                    -
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-900">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-900">
                    -
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-900">
                    {formatCurrency(totalPurchase)}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-900">
                    {formatCurrency(totalProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </div>
    </Layout>
  );
}
