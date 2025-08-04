import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchActivities();
  }, [filters]);

  const fetchActivities = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('limit', '100');

      const response = await apiRequest(`/api/activities?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      userId: '',
      startDate: '',
      endDate: ''
    });
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'MEDICINE_ADDED':
        return '💊';
      case 'MEDICINE_UPDATED':
        return '✏️';
      case 'MEDICINE_DELETED':
        return '🗑️';
      case 'INVOICE_GENERATED':
        return '🧾';
      case 'INVOICE_PRINTED':
        return '🖨️';
      case 'INVOICE_DELETED':
        return '🗑️';
      case 'RETURN_CREATED':
        return '↩️';
      case 'RETURN_UPDATED':
        return '✏️';
      case 'RETURN_DELETED':
        return '🗑️';
      case 'USER_LOGIN':
        return '🔑';
      case 'USER_LOGOUT':
        return '🚪';
      case 'USER_CREATED':
        return '👤';
      case 'USER_UPDATED':
        return '✏️';
      case 'USER_DELETED':
        return '🗑️';
      case 'SETTINGS_UPDATED':
        return '⚙️';
      default:
        return '📝';
    }
  };

  const getActionColor = (action) => {
    if (action.includes('ADDED') || action.includes('CREATED') || action.includes('LOGIN')) {
      return 'text-green-600 bg-green-50';
    } else if (action.includes('UPDATED')) {
      return 'text-blue-600 bg-blue-50';
    } else if (action.includes('DELETED') || action.includes('LOGOUT')) {
      return 'text-red-600 bg-red-50';
    } else {
      return 'text-gray-600 bg-gray-50';
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
            <h1 className="text-2xl font-bold text-gray-900">User Activities</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track all user activities and actions
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Type
              </label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value="">All Actions</option>
                <option value="MEDICINE_ADDED">Medicine Added</option>
                <option value="MEDICINE_UPDATED">Medicine Updated</option>
                <option value="MEDICINE_DELETED">Medicine Deleted</option>
                <option value="INVOICE_GENERATED">Invoice Generated</option>
                <option value="INVOICE_PRINTED">Invoice Printed</option>
                <option value="INVOICE_DELETED">Invoice Deleted</option>
                <option value="RETURN_CREATED">Return Created</option>
                <option value="RETURN_UPDATED">Return Updated</option>
                <option value="RETURN_DELETED">Return Deleted</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_LOGOUT">User Logout</option>
                <option value="USER_CREATED">User Created</option>
                <option value="USER_UPDATED">User Updated</option>
                <option value="USER_DELETED">User Deleted</option>
                <option value="SETTINGS_UPDATED">Settings Updated</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                name="userId"
                value={filters.userId}
                onChange={handleFilterChange}
                className="input-field"
                placeholder="Filter by user ID"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="input-field"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Activities List */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Action</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Details</th>
                  <th className="table-header">Entity</th>
                  <th className="table-header">Date & Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No activities found
                    </td>
                  </tr>
                ) : (
                  activities.map((activity) => (
                    <tr key={activity._id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center">
                          <span className="mr-2">{getActionIcon(activity.action)}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(activity.action)}`}>
                            {activity.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{activity.username}</div>
                          <div className="text-sm text-gray-500">ID: {activity.userId}</div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">{activity.details}</div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-500">
                          {activity.entityType && (
                            <span className="capitalize">{activity.entityType}</span>
                          )}
                          {activity.entityId && (
                            <span className="ml-1 text-xs">({activity.entityId})</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-gray-900">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
} 