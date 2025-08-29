import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function CranesPage() {
  const [cranes, setCranes] = useState([]);
  const [filteredCranes, setFilteredCranes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCranes();
  }, []);

  useEffect(() => {
    filterCranes();
  }, [cranes, searchTerm, statusFilter, typeFilter]);

  const fetchCranes = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/cranes');
      
      if (response.ok) {
        const data = await response.json();
        setCranes(data);
      } else {
        setError('Failed to fetch cranes');
      }
    } catch (error) {
      console.error('Error fetching cranes:', error);
      setError('Error fetching cranes');
    } finally {
      setLoading(false);
    }
  };

  const filterCranes = () => {
    let filtered = cranes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(crane =>
        crane.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crane.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crane.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        crane.operator.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(crane => crane.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(crane => crane.type === typeFilter);
    }

    setFilteredCranes(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'In Use':
        return 'bg-blue-100 text-blue-800';
      case 'Maintenance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Mobile Crane':
        return '🚚';
      case 'Tower Crane':
        return '🏗️';
      case 'Crawler Crane':
        return '🦀';
      case 'All Terrain Crane':
        return '🚛';
      case 'Truck Mounted Crane':
        return '🚛';
      default:
        return '🚁';
    }
  };

  const handleDelete = async (craneId) => {
    if (!confirm('Are you sure you want to delete this crane?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/cranes/${craneId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCranes(cranes.filter(crane => crane._id !== craneId));
      } else {
        alert('Failed to delete crane');
      }
    } catch (error) {
      console.error('Error deleting crane:', error);
      alert('Error deleting crane');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cranes...</p>
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
              onClick={fetchCranes}
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
                  Crane Management
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your crane fleet across UAE
                </p>
              </div>
              <Link
                href="/cranes/add"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ➕ Add New Crane
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search cranes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="Mobile Crane">Mobile Crane</option>
                  <option value="Tower Crane">Tower Crane</option>
                  <option value="Crawler Crane">Crawler Crane</option>
                  <option value="All Terrain Crane">All Terrain Crane</option>
                  <option value="Truck Mounted Crane">Truck Mounted Crane</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  {filteredCranes.length} of {cranes.length} cranes
                </div>
              </div>
            </div>
          </div>

          {/* Cranes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCranes.map((crane) => (
              <div key={crane._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getTypeIcon(crane.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {crane.name}
                        </h3>
                        <p className="text-sm text-gray-500">{crane.code}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(crane.status)}`}>
                      {crane.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Type:</span>
                      <span className="text-sm font-medium text-gray-900">{crane.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Capacity:</span>
                      <span className="text-sm font-medium text-gray-900">{crane.capacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Boom Length:</span>
                      <span className="text-sm font-medium text-gray-900">{crane.boomLength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Location:</span>
                      <span className="text-sm font-medium text-gray-900">{crane.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Operator:</span>
                      <span className="text-sm font-medium text-gray-900">{crane.operator}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Daily Rate:</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(crane.dailyRate)}</span>
                    </div>
                  </div>

                  {/* Maintenance Info */}
                  <div className="border-t pt-3 mb-4">
                    <div className="text-xs text-gray-500">
                      <div>Last Maintenance: {new Date(crane.lastMaintenance).toLocaleDateString()}</div>
                      <div>Next Maintenance: {new Date(crane.nextMaintenance).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/cranes/${crane._id}`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      👁️ View
                    </Link>
                    <Link
                      href={`/cranes/${crane._id}/edit`}
                      className="flex-1 text-center px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(crane._id)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredCranes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cranes found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by adding your first crane.'}
              </p>
              {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <Link
                  href="/cranes/add"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  ➕ Add Your First Crane
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
