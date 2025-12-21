import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalItems: 0,
    averageOrder: 0
  });

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id, timeFilter, customStartDate, customEndDate]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      let url = `/api/customers/${id}`;
      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        url += `?fromDate=${customStartDate}&toDate=${customEndDate}`;
      } else if (timeFilter !== 'all') {
        url += `?filter=${timeFilter}`;
      }
      
      const response = await apiRequest(url);
      if (response.ok) {
        const data = await response.json();
        setCustomer({
          _id: data._id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          createdAt: data.createdAt
        });
        
        // Filter invoices by date if needed
        let filteredInvoices = data.invoices || [];
        if (timeFilter !== 'all') {
          const now = new Date();
          let startDate = new Date();
          
          switch (timeFilter) {
            case 'daily':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'weekly':
              startDate.setDate(startDate.getDate() - 7);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'monthly':
              startDate.setDate(startDate.getDate() - 30);
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'custom':
              if (customStartDate && customEndDate) {
                startDate = new Date(customStartDate);
                now.setTime(new Date(customEndDate).getTime());
                now.setHours(23, 59, 59, 999);
              }
              break;
          }
          
          filteredInvoices = filteredInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate >= startDate && invDate <= now;
          });
        }
        
        setInvoices(filteredInvoices);
        
        // Calculate sales statistics
        const totalSales = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
        const totalItems = filteredInvoices.reduce((sum, inv) => sum + (inv.items?.length || 0), 0);
        const totalProfit = filteredInvoices.reduce((sum, inv) => {
          const itemProfit = (inv.items || []).reduce((itemSum, item) => {
            // Get product purchase price to calculate profit
            // For now, estimate profit as 20% of total (can be improved)
            return itemSum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0) * 0.2);
          }, 0);
          return sum + itemProfit;
        }, 0);
        const averageOrder = filteredInvoices.length > 0 ? totalSales / filteredInvoices.length : 0;
        
        setSalesStats({
          totalSales,
          totalProfit,
          totalItems,
          averageOrder
        });
      } else {
        setError('Customer not found');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Error loading customer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading customer details...</div>
        </div>
      </Layout>
    );
  }

  if (error || !customer) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error || 'Customer not found'}</div>
          <button
            onClick={() => router.push('/customers')}
            className="btn-primary"
          >
            ⬅️ Back to Customers
          </button>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Account</h1>
            <p className="mt-1 text-sm text-gray-500">
              View customer details and purchase history
            </p>
          </div>
          <button
            onClick={() => router.push('/customers')}
            className="btn-secondary"
          >
            ⬅️ Back to Customers
          </button>
        </div>

        {/* Customer Information */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900 font-medium">{customer.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900">{customer.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{customer.email || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900">{customer.address || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Member Since</label>
              <p className="text-gray-900">
                {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Sales Report Filters */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sales Report Filters</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Time Period:</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Time</option>
                <option value="daily">Today</option>
                <option value="weekly">Last 7 Days</option>
                <option value="monthly">Last 30 Days</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>
            
            {timeFilter === 'custom' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="input-field"
                />
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sales Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-500">Total Invoices</div>
            <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Total Sales</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(salesStats.totalSales)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Total Items</div>
            <div className="text-2xl font-bold text-blue-600">
              {salesStats.totalItems}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Average Order</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(salesStats.averageOrder)}
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Invoice History</h2>
            <div className="text-sm text-gray-500">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </div>
          </div>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invoices found for this customer{timeFilter !== 'all' ? ' in selected period' : ''}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Time</th>
                    <th className="table-header">Items</th>
                    <th className="table-header">Subtotal</th>
                    <th className="table-header">Discount</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{invoice.invoiceNumber}</td>
                      <td className="table-cell">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell text-sm text-gray-500">
                        {new Date(invoice.date).toLocaleTimeString()}
                      </td>
                      <td className="table-cell">{invoice.items?.length || 0}</td>
                      <td className="table-cell">{formatCurrency(invoice.subtotal || 0)}</td>
                      <td className="table-cell text-red-600">{formatCurrency(invoice.discount || 0)}</td>
                      <td className="table-cell font-semibold text-green-600">
                        {formatCurrency(invoice.total || 0)}
                      </td>
                      <td className="table-cell">
                        <Link
                          href={`/invoices/${invoice._id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="4" className="table-cell font-semibold text-right">
                      Total:
                    </td>
                    <td className="table-cell font-semibold">
                      {formatCurrency(invoices.reduce((sum, inv) => sum + (parseFloat(inv.subtotal) || 0), 0))}
                    </td>
                    <td className="table-cell font-semibold text-red-600">
                      {formatCurrency(invoices.reduce((sum, inv) => sum + (parseFloat(inv.discount) || 0), 0))}
                    </td>
                    <td className="table-cell font-bold text-green-600 text-lg">
                      {formatCurrency(salesStats.totalSales)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

