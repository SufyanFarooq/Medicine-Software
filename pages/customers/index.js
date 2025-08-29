import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/customers');
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        setError('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setError('Error fetching customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.includes(searchTerm))
      );
    }

    setFilteredCustomers(filtered);
  };

  const handleDelete = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer? This will also delete all associated rental records.')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/customers/${customerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCustomers(customers.filter(customer => customer._id !== customerId));
      } else {
        alert('Failed to delete customer');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Customer Management
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your UAE-based clients and companies
                </p>
              </div>
              <Link
                href="/customers/add"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ➕ Add New Customer
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customers
              </label>
              <input
                type="text"
                placeholder="Search by company, contact person, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <div key={customer._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">
                          {customer.companyName ? customer.companyName.charAt(0).toUpperCase() : 
                           customer.contactPerson ? customer.contactPerson.charAt(0).toUpperCase() : 'C'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {customer.companyName || 'Individual Customer'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {customer.contactPerson || customer.email}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.totalRentals > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.totalRentals > 0 ? 'Active Customer' : 'New Customer'}
                    </span>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3 mb-4">
                    {customer.contactPerson && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Contact:</span>
                        <span className="text-sm font-medium text-gray-900">{customer.contactPerson}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Phone:</span>
                        <span className="text-sm font-medium text-gray-900">{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Address:</span>
                        <span className="text-sm font-medium text-gray-900">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Business Information */}
                  {customer.businessType && (
                    <div className="border-t pt-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Business Type:</span>
                        <span className="text-sm font-medium text-gray-900">{customer.businessType}</span>
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="border-t pt-3 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-indigo-600">{customer.totalRentals}</div>
                        <div className="text-xs text-gray-500">Total Rentals</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</div>
                        <div className="text-xs text-gray-500">Total Spent</div>
                      </div>
                    </div>
                    {customer.lastRental && (
                      <div className="text-xs text-gray-500 text-center mt-2">
                        Last rental: {new Date(customer.lastRental).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 mb-3">
                    <Link
                      href={`/customers/${customer._id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      👁️ View
                    </Link>
                    <Link
                      href={`/customers/${customer._id}/edit`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(customer._id)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  
                  {/* Service History Link */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/customers/${customer._id}/services`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      📊 Service History
                    </Link>
                    <Link
                      href={`/crane-rentals/generate?customerId=${customer._id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      🚁 New Rental
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms.'
                  : 'Get started by adding your first customer.'}
              </p>
              {!searchTerm && (
                <Link
                  href="/customers/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  ➕ Add Your First Customer
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
