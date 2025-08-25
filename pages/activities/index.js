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
        console.log('Activities data received:', data);
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

  const getActionIcon = (actionType) => {
    if (!actionType) return '📝';
    
    switch (actionType) {
      // Product activities
      case 'PRODUCT_ADDED': return '📦';
      case 'PRODUCT_UPDATED': return '✏️';
      case 'PRODUCT_DELETED': return '🗑️';
      
      // Inventory activities
      case 'INVENTORY_INFLOW': return '📥';
      case 'INVENTORY_OUTFLOW': return '📤';
      
      // Invoice activities
      case 'INVOICE_CREATED': return '🧾';
      case 'INVOICE_UPDATED': return '✏️';
      case 'INVOICE_DELETED': return '🗑️';
      
      // Return activities
      case 'RETURN_PROCESSED': return '↩️';
      case 'RETURN_UPDATED': return '✏️';
      case 'RETURN_DELETED': return '🗑️';
      
      // Business setup activities
      case 'BUSINESS_SETUP_COMPLETED': return '⚙️';
      case 'BUSINESS_SETUP_UPDATED': return '✏️';
      
      // Supplier activities
      case 'SUPPLIER_ADDED': return '🏢';
      case 'SUPPLIER_UPDATED': return '✏️';
      case 'SUPPLIER_DELETED': return '🗑️';
      
      // Purchase Order activities
      case 'PURCHASE_ORDER_CREATED': return '📋';
      case 'PURCHASE_ORDER_UPDATED': return '✏️';
      case 'PURCHASE_ORDER_RECEIVED': return '✅';
      case 'PURCHASE_ORDER_CANCELLED': return '❌';
      
      // User activities
      case 'USER_LOGIN': return '🔑';
      case 'USER_LOGOUT': return '🚪';
      case 'USER_CREATED': return '👤';
      case 'USER_UPDATED': return '✏️';
      case 'USER_DELETED': return '🗑️';
      
      // Legacy medicine activities (for backward compatibility)
      case 'MEDICINE_ADDED': return '📦';
      case 'MEDICINE_UPDATED': return '✏️';
      case 'MEDICINE_DELETED': return '🗑️';
      
      default: return '📝';
    }
  };

  const getActionColor = (actionType) => {
    if (!actionType) return 'text-gray-600 bg-gray-100';
    
    switch (actionType) {
      // Product activities
      case 'PRODUCT_ADDED': return 'text-green-600 bg-green-100';
      case 'PRODUCT_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'PRODUCT_DELETED': return 'text-red-600 bg-red-100';
      
      // Inventory activities
      case 'INVENTORY_INFLOW': return 'text-green-600 bg-green-100';
      case 'INVENTORY_OUTFLOW': return 'text-orange-600 bg-orange-100';
      
      // Invoice activities
      case 'INVOICE_CREATED': return 'text-green-600 bg-green-100';
      case 'INVOICE_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'INVOICE_DELETED': return 'text-red-600 bg-red-100';
      
      // Return activities
      case 'RETURN_PROCESSED': return 'text-purple-600 bg-purple-100';
      case 'RETURN_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'RETURN_DELETED': return 'text-red-600 bg-red-100';
      
      // Business setup activities
      case 'BUSINESS_SETUP_COMPLETED': return 'text-green-600 bg-green-100';
      case 'BUSINESS_SETUP_UPDATED': return 'text-blue-600 bg-blue-100';
      
      // Supplier activities
      case 'SUPPLIER_ADDED': return 'text-green-600 bg-green-100';
      case 'SUPPLIER_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'SUPPLIER_DELETED': return 'text-red-600 bg-red-100';
      
      // Purchase Order activities
      case 'PURCHASE_ORDER_CREATED': return 'text-green-600 bg-green-100';
      case 'PURCHASE_ORDER_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'PURCHASE_ORDER_RECEIVED': return 'text-green-600 bg-green-100';
      case 'PURCHASE_ORDER_CANCELLED': return 'text-red-600 bg-red-100';
      
      // User activities
      case 'USER_LOGIN': return 'text-green-600 bg-green-100';
      case 'USER_LOGOUT': return 'text-gray-600 bg-gray-100';
      case 'USER_CREATED': return 'text-green-600 bg-green-100';
      case 'USER_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'USER_DELETED': return 'text-red-600 bg-red-100';
      
      // Legacy medicine activities (for backward compatibility)
      case 'MEDICINE_ADDED': return 'text-green-600 bg-green-100';
      case 'MEDICINE_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'MEDICINE_DELETED': return 'text-red-600 bg-red-100';
      
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Function to safely convert details to readable string
  const formatDetails = (details) => {
    if (!details) return 'No details available';
    
    // If details is already a string, return it
    if (typeof details === 'string') return details;
    
    // If details is an object, convert it to a readable string
    if (typeof details === 'object') {
      try {
        // Handle return objects specifically
        if (details.returnNumber) {
          return `Return ${details.returnNumber} - ${details.reason || 'No reason'} - Amount: ${details.refundAmount || 'N/A'}`;
        }
        
        // Handle invoice objects
        if (details.invoiceNumber) {
          return `Invoice ${details.invoiceNumber} - Items: ${details.items ? details.items.length : 0}`;
        }
        
        // Handle other objects - convert to JSON string but limit length
        const jsonString = JSON.stringify(details);
        return jsonString.length > 100 ? jsonString.substring(0, 100) + '...' : jsonString;
      } catch (error) {
        return 'Complex data (cannot display)';
      }
    }
    
    // For any other type, convert to string
    return String(details);
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
              Track activity across products, sales, returns, inventory, and settings
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
                value={filters.action}
                onChange={handleFilterChange}
                className="input-field"
              >
                <option value="">All Action Types</option>
                
                {/* Product Activities */}
                <optgroup label="📦 Product Management">
                  <option value="PRODUCT_ADDED">Product Added</option>
                  <option value="PRODUCT_UPDATED">Product Updated</option>
                  <option value="PRODUCT_DELETED">Product Deleted</option>
                </optgroup>
                
                {/* Inventory Activities */}
                <optgroup label="📊 Inventory Management">
                  <option value="INVENTORY_INFLOW">Stock Inflow</option>
                  <option value="INVENTORY_OUTFLOW">Stock Outflow</option>
                </optgroup>
                
                {/* Invoice Activities */}
                <optgroup label="🧾 Sales & Invoicing">
                  <option value="INVOICE_CREATED">Invoice Created</option>
                  <option value="INVOICE_UPDATED">Invoice Updated</option>
                  <option value="INVOICE_DELETED">Invoice Deleted</option>
                </optgroup>
                
                {/* Return Activities */}
                <optgroup label="↩️ Returns & Refunds">
                  <option value="RETURN_PROCESSED">Return Processed</option>
                  <option value="RETURN_UPDATED">Return Updated</option>
                  <option value="RETURN_DELETED">Return Deleted</option>
                </optgroup>
                
                {/* Purchase Order Activities */}
                <optgroup label="📋 Purchase Orders">
                  <option value="PURCHASE_ORDER_CREATED">PO Created</option>
                  <option value="PURCHASE_ORDER_UPDATED">PO Updated</option>
                  <option value="PURCHASE_ORDER_RECEIVED">PO Received</option>
                  <option value="PURCHASE_ORDER_CANCELLED">PO Cancelled</option>
                </optgroup>
                
                {/* Supplier Activities */}
                <optgroup label="🏢 Supplier Management">
                  <option value="SUPPLIER_ADDED">Supplier Added</option>
                  <option value="SUPPLIER_UPDATED">Supplier Updated</option>
                  <option value="SUPPLIER_DELETED">Supplier Deleted</option>
                </optgroup>
                
                {/* Business Setup Activities */}
                <optgroup label="⚙️ System Configuration">
                  <option value="BUSINESS_SETUP_COMPLETED">Business Setup Completed</option>
                  <option value="BUSINESS_SETUP_UPDATED">Business Setup Updated</option>
                </optgroup>
                
                {/* User Activities */}
                <optgroup label="👤 User Management">
                  <option value="USER_LOGIN">User Login</option>
                  <option value="USER_LOGOUT">User Logout</option>
                  <option value="USER_CREATED">User Created</option>
                  <option value="USER_UPDATED">User Updated</option>
                  <option value="USER_DELETED">User Deleted</option>
                </optgroup>
                
                {/* Legacy Medicine Activities (for backward compatibility) */}
                <optgroup label="💊 Legacy Medicine Activities">
                  <option value="MEDICINE_ADDED">Medicine Added</option>
                  <option value="MEDICINE_UPDATED">Medicine Updated</option>
                  <option value="MEDICINE_DELETED">Medicine Deleted</option>
                </optgroup>
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
              🔄 Clear Filters
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
                {(!activities || activities.length === 0) ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-500">
                      No activities found
                    </td>
                  </tr>
                ) : (
                  activities.filter(activity => activity && typeof activity === 'object').map((activity) => {
                    // Debug logging for problematic activities
                    if (activity.details && typeof activity.details === 'object') {
                      console.log('Activity with object details:', {
                        id: activity._id,
                        action: activity.action,
                        details: activity.details
                      });
                    }
                    
                    try {
                      return (
                        <tr key={activity._id ? String(activity._id) : Math.random()} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <div className="flex items-center">
                              <span className="mr-2">{getActionIcon(activity.action)}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(activity.action)}`}>
                                {activity.action ? activity.action.replace(/_/g, ' ') : 'Unknown Action'}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div>
                              <div className="font-medium text-gray-900">{activity.username || 'Unknown User'}</div>
                              <div className="text-sm text-gray-500">ID: {activity.userId || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">{formatDetails(activity.details)}</div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-500">
                              {activity.entityType ? (
                                <span className="capitalize">{activity.entityType}</span>
                              ) : (
                                <span className="text-gray-400">No entity</span>
                              )}
                              {activity.entityId && (
                                <span className="ml-1 text-xs">({String(activity.entityId)})</span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-gray-900">
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString() : 'N/A'}
                            </div>
                          </td>
                        </tr>
                      );
                    } catch (error) {
                      console.error('Error rendering activity row:', error, activity);
                      return (
                        <tr key={Math.random()} className="hover:bg-gray-50">
                          <td colSpan="5" className="table-cell text-center text-red-500">
                            Error displaying activity data
                          </td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
} 