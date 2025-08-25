import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import { getUser } from '../../lib/auth';
import { canPerformAction } from '../../lib/permissions';

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await apiRequest('/api/returns');
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this return?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/returns/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchReturns();
      } else {
        alert('Failed to delete return');
      }
    } catch (error) {
      console.error('Error deleting return:', error);
      alert('Error deleting return');
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage product returns and track refunds
            </p>
          </div>
          <Link href="/returns/add" className="btn-primary">
            ↩️ Add Return
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-orange-500">
                <span className="text-2xl text-white">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Returns</p>
                <p className="text-2xl font-semibold text-gray-900">{returns.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-red-500">
                <span className="text-2xl text-white">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Returns Value</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(returns.reduce((sum, returnItem) => sum + (returnItem.returnValue || 0), 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-500">
                <span className="text-2xl text-white">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Stock Restored</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {returns.reduce((sum, returnItem) => sum + (returnItem.quantity || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
                <span className="text-2xl text-white">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {returns.filter(r => {
                    const returnDate = new Date(r.date);
                    const now = new Date();
                    return returnDate.getMonth() === now.getMonth() && returnDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Returns List */}
        <div className="card">
          {returns.filter(r => r.status !== 'duplicate').length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No active returns found</p>
              <p className="text-sm text-gray-400 mt-2">
                Add your first return to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Return #</th>
                    <th className="table-header">Product</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header">Return Value</th>
                    <th className="table-header">Reason</th>
                    <th className="table-header">Refund Method</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.filter(r => r.status !== 'duplicate').map((returnItem) => (
                    <tr key={returnItem._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{returnItem.returnNumber}</td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium">{returnItem.productName || returnItem.medicineName}</div>
                          <div className="text-sm text-gray-500">{returnItem.productCode || returnItem.medicineCode}</div>
                        </div>
                      </td>
                      <td className="table-cell">{returnItem.quantity}</td>
                      <td className="table-cell font-medium">{formatCurrency(returnItem.returnValue || 0)}</td>
                      <td className="table-cell">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {returnItem.reason}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {returnItem.refundMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          returnItem.status === 'processed' ? 'bg-green-100 text-green-800' :
                          returnItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          returnItem.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {returnItem.status || 'Active'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {new Date(returnItem.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-3">
                          {canPerformAction(currentUser?.role, 'delete_return') && (
                            <button
                              onClick={() => handleDelete(returnItem._id)}
                              className="text-red-600 hover:text-red-900 text-lg cursor-pointer transition-colors duration-200"
                              title="Delete Return"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 