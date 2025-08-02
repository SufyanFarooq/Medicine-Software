import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SearchBar from '../../components/SearchBar';
import { format } from 'date-fns';

export default function ReturnsList() {
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/returns');
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
        setFilteredReturns(data);
      } else {
        setError('Failed to fetch returns');
      }
    } catch (error) {
      setError('Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredReturns(returns);
      return;
    }

    const filtered = returns.filter(returnItem =>
      returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.medicineCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReturns(filtered);
  };



  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading returns...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={fetchReturns}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
            <p className="mt-1 text-sm text-gray-500">
              View all medicine returns
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <SearchBar onSearch={handleSearch} placeholder="Search returns by number or medicine..." />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                <p className="text-sm font-medium text-gray-500">Total Return Values</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${returns.reduce((sum, returnItem) => sum + (returnItem.returnValue || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Returns Table */}
        <div className="card">
          {filteredReturns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {returns.length === 0 ? 'No returns found.' : 'No returns match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Return #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Medicine</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header">Return Value</th>
                    <th className="table-header">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReturns.map((returnItem) => (
                    <tr key={returnItem._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{returnItem.returnNumber}</td>
                      <td className="table-cell">
                        {format(new Date(returnItem.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="table-cell">
                        {returnItem.invoiceNumber ? (
                          <span className="text-sm text-blue-600 font-medium">
                            #{returnItem.invoiceNumber}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium">{returnItem.medicineName}</div>
                          <div className="text-sm text-gray-500">{returnItem.medicineCode}</div>
                        </div>
                      </td>
                      <td className="table-cell">{returnItem.quantity}</td>
                      <td className="table-cell">${(returnItem.returnValue || 0).toFixed(2)}</td>
                      <td className="table-cell">
                        <span className="text-sm">{returnItem.reason}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-500">
          Showing {filteredReturns.length} of {returns.length} returns
        </div>
      </div>
    </Layout>
  );
} 