import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../../lib/auth';
import { formatCurrency } from '../../../lib/currency';

export default function CustomerServicesPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerServices, setCustomerServices] = useState(null);

  useEffect(() => {
    if (id) {
      fetchCustomerServices();
    }
  }, [id]);

  const fetchCustomerServices = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/customers/${id}/services`);
      if (response.ok) {
        const data = await response.json();
        setCustomerServices(data);
      } else {
        setError('Failed to fetch customer services');
      }
    } catch (error) {
      console.error('Error fetching customer services:', error);
      setError('Error fetching customer services');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customer services...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !customerServices) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Services</h2>
            <p className="text-gray-600 mb-4">{error || 'Customer services not found'}</p>
            <Link
              href={`/customers/${id}`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ← Back to Customer
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const { customer, statistics, projects, craneUsage, monthlyTrends, recentActivity } = customerServices;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Customer Service History
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {customer.companyName || customer.contactPerson} - Complete service tracking
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href={`/customers/${id}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  ← Back to Customer
                </Link>
                <Link
                  href={`/crane-rentals/generate?customerId=${id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  ➕ New Rental
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Customer Information Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Company:</span> {customer.companyName || 'N/A'}</p>
                  <p><span className="font-medium">Contact:</span> {customer.contactPerson || 'N/A'}</p>
                  <p><span className="font-medium">Email:</span> {customer.email}</p>
                  <p><span className="font-medium">Phone:</span> {customer.phone}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Service Statistics</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Total Rentals:</span> <span className="text-indigo-600 font-semibold">{statistics.totalRentals}</span></p>
                  <p><span className="font-medium">Total Invoices:</span> <span className="text-indigo-600 font-semibold">{statistics.totalInvoices}</span></p>
                  <p><span className="font-medium">Total Spent:</span> <span className="text-green-600 font-semibold">{formatCurrency(statistics.totalSpent)}</span></p>
                  <p><span className="font-medium">Outstanding:</span> <span className="text-red-600 font-semibold">{formatCurrency(statistics.totalOutstanding)}</span></p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href={`/crane-rentals/generate?customerId=${id}`}
                    className="block w-full text-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                  >
                    🚁 New Crane Rental
                  </Link>
                  <Link
                    href={`/invoices/generate-crane-rental?customerId=${id}`}
                    className="block w-full text-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                  >
                    📄 Generate Invoice
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Summary */}
          {projects.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Projects Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{project.name}</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Location:</span> {project.location || 'N/A'}</p>
                      <p><span className="font-medium">Rentals:</span> {project.totalRentals}</p>
                      <p><span className="font-medium">Total Spent:</span> {formatCurrency(project.totalSpent)}</p>
                      <p><span className="font-medium">First Rental:</span> {new Date(project.firstRental).toLocaleDateString()}</p>
                      <p><span className="font-medium">Last Rental:</span> {new Date(project.lastRental).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crane Usage Summary */}
          {craneUsage.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Crane Usage Summary</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crane</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Rentals</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {craneUsage.map((crane, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{crane.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{crane.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{crane.totalRentals}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{crane.totalHours}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{crane.totalDays}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(crane.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly Spending Trends */}
          {monthlyTrends.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Spending Trends</h3>
              <div className="space-y-3">
                {monthlyTrends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(trend.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((trend.amount / Math.max(...monthlyTrends.map(t => t.amount))) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-24 text-right">
                        {formatCurrency(trend.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        activity.type === 'rental' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {activity.type === 'rental' ? '🚁' : '📄'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(activity.amount)}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        activity.status === 'Completed' || activity.status === 'Paid' 
                          ? 'bg-green-100 text-green-800'
                          : activity.status === 'Active' || activity.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.length === 0 && projects.length === 0 && craneUsage.length === 0 && (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Service History Yet</h3>
              <p className="text-gray-600 mb-6">This customer hasn't used any services yet.</p>
              <Link
                href={`/crane-rentals/generate?customerId=${id}`}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create First Rental
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
