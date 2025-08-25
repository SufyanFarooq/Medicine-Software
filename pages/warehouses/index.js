import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'main_warehouse',
    location: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Pakistan'
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    manager: {
      name: '',
      phone: '',
      email: ''
    },
    settings: {
      enableNotifications: true,
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
      allowNegativeStock: false
    }
  });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: ''
  });
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockWarehouse, setStockWarehouse] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      } else {
        console.error('Failed to fetch warehouses');
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!formData.name || !formData.code) {
        alert('Name and code are required fields');
        return;
      }

      const url = editingWarehouse 
        ? `/api/warehouses/${editingWarehouse._id}`
        : '/api/warehouses';
      
      const method = editingWarehouse ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        if (editingWarehouse) {
          const updatedWarehouse = await response.json();
          setWarehouses(prev => prev.map(w => 
            w._id === editingWarehouse._id ? { ...w, ...updatedWarehouse } : w
          ));
          alert('Warehouse updated successfully!');
        } else {
          const newWarehouse = await response.json();
          setWarehouses(prev => [newWarehouse, ...prev]);
          alert('Warehouse created successfully!');
        }
        
        setShowForm(false);
        setEditingWarehouse(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      alert('Failed to save warehouse');
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      location: warehouse.location || '',
      address: warehouse.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Pakistan'
      },
      contact: warehouse.contact || {
        phone: '',
        email: '',
        website: ''
      },
      manager: warehouse.manager || {
        name: '',
        phone: '',
        email: ''
      },
      settings: warehouse.settings || {
        enableNotifications: true,
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        allowNegativeStock: false
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (warehouseId) => {
    if (!confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/warehouses/${warehouseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setWarehouses(prev => prev.filter(w => w._id !== warehouseId));
        alert('Warehouse deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('Failed to delete warehouse');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'main_warehouse',
      location: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Pakistan'
      },
      contact: {
        phone: '',
        email: '',
        website: ''
      },
      manager: {
        name: '',
        phone: '',
        email: ''
      },
      settings: {
        enableNotifications: true,
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        allowNegativeStock: false
      }
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingWarehouse(null);
    resetForm();
  };

  const getTypeLabel = (type) => {
    const labels = {
      'main_warehouse': 'Main Warehouse',
      'branch_office': 'Branch Office',
      'retail_store': 'Retail Store',
      'distribution_center': 'Distribution Center',
      'supplier_warehouse': 'Supplier Warehouse'
    };
    return labels[type] || type;
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      if (!warehouse.name.toLowerCase().includes(searchTerm) &&
          !warehouse.code.toLowerCase().includes(searchTerm) &&
          !warehouse.location.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }
    if (filters.type && warehouse.type !== filters.type) return false;
    if (filters.status && warehouse.status !== filters.status) return false;
    return true;
  });

  const openStockModal = async (warehouse) => {
    setStockWarehouse(warehouse);
    setShowStockModal(true);
    setStockLoading(true);
    try {
      const response = await apiRequest(`/api/warehouses/${warehouse._id}/stock`);
      if (response.ok) {
        const data = await response.json();
        setWarehouseStock(data);
      } else {
        setWarehouseStock([]);
      }
    } catch (e) {
      setWarehouseStock([]);
    } finally {
      setStockLoading(false);
    }
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setStockWarehouse(null);
    setWarehouseStock([]);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading warehouses...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Warehouses</h1>
          <p className="text-gray-600">Manage your warehouse locations and settings</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Warehouses</div>
            <div className="text-2xl font-bold text-gray-900">{warehouses.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">
              {warehouses.filter(w => w.isActive).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Main Warehouses</div>
            <div className="text-2xl font-bold text-blue-600">
              {warehouses.filter(w => w.type === 'main_warehouse').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Branch Offices</div>
            <div className="text-2xl font-bold text-purple-600">
              {warehouses.filter(w => w.type === 'branch_office').length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search warehouses..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              <option value="main_warehouse">Main Warehouse</option>
              <option value="branch_office">Branch Office</option>
              <option value="retail_store">Retail Store</option>
              <option value="distribution_center">Distribution Center</option>
              <option value="supplier_warehouse">Supplier Warehouse</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : 'Add New Warehouse'}
          </button>
        </div>

        {/* Create/Edit Warehouse Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter warehouse name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse Code *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., WH001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="main_warehouse">Main Warehouse</option>
                    <option value="branch_office">Branch Office</option>
                    <option value="retail_store">Retail Store</option>
                    <option value="distribution_center">Distribution Center</option>
                    <option value="supplier_warehouse">Supplier Warehouse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Karachi, Pakistan"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="State/Province"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="ZIP/Postal Code"
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, zipCode: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Information</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.contact.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, phone: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={formData.contact.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, email: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="url"
                    placeholder="Website (optional)"
                    value={formData.contact.website}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      contact: { ...prev.contact, website: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Manager Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Manager Information</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={formData.manager.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      manager: { ...prev.manager, name: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="tel"
                    placeholder="Manager Phone"
                    value={formData.manager.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      manager: { ...prev.manager, phone: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                  <input
                    type="email"
                    placeholder="Manager Email"
                    value={formData.manager.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      manager: { ...prev.manager, email: e.target.value }
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse Settings</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableNotifications"
                      checked={formData.settings.enableNotifications}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, enableNotifications: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <label htmlFor="enableNotifications" className="text-sm text-gray-700">
                      Enable Notifications
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Low Stock Threshold</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.settings.lowStockThreshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, lowStockThreshold: parseInt(e.target.value) }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Critical Stock Threshold</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.settings.criticalStockThreshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, criticalStockThreshold: parseInt(e.target.value) }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowNegativeStock"
                      checked={formData.settings.allowNegativeStock}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowNegativeStock: e.target.checked }
                      }))}
                      className="mr-2"
                    />
                    <label htmlFor="allowNegativeStock" className="text-sm text-gray-700">
                      Allow Negative Stock
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Warehouses List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Warehouses ({filteredWarehouses.length})
            </h3>
          </div>
          
          {filteredWarehouses.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No warehouses found. {warehouses.length === 0 ? 'Create your first warehouse to get started!' : 'Try adjusting your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type & Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWarehouses.map((warehouse) => (
                    <tr key={warehouse._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {warehouse.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Code: {warehouse.code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getTypeLabel(warehouse.type)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {warehouse.location || 'No location specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {warehouse.contact?.phone || 'No phone'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {warehouse.contact?.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {warehouse.manager?.name || 'No manager'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {warehouse.manager?.phone || 'No contact'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          warehouse.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {warehouse.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(warehouse)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openStockModal(warehouse)}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Stock
                          </button>
                          <button
                            onClick={() => handleDelete(warehouse._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-1/2 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Stock - {stockWarehouse?.name} ({stockWarehouse?.code})</h3>
              <button className="text-gray-600" onClick={closeStockModal}>✕</button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {stockLoading ? (
                <div className="text-center text-gray-500 py-8">Loading stock...</div>
              ) : warehouseStock.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No stock records found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {warehouseStock.map(row => (
                      <tr key={row._id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.product?.name || 'Unknown'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{row.product?.code || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
              <button className="bg-gray-700 text-white px-4 py-2 rounded-md" onClick={closeStockModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
