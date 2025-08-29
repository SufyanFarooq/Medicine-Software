import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { setCurrency } from '../../lib/currency';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { logSettingsActivity } from '../../lib/activity-logger';

export default function Settings() {
  const [settings, setSettings] = useState({
    currency: 'AED',
    discountPercentage: 3,
    shopName: 'Crain Management UAE',
    contactNumber: '',
    address: ''
  });
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'sales_man'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('company');

  const currencies = [
    { symbol: 'AED', name: 'UAE Dirham' },
    { symbol: '$', name: 'US Dollar' },
    { symbol: '€', name: 'Euro' },
    { symbol: '£', name: 'British Pound' },
    { symbol: '₹', name: 'Indian Rupee' },
    { symbol: '¥', name: 'Japanese Yen' },
    { symbol: '₽', name: 'Russian Ruble' },
    { symbol: '₩', name: 'Korean Won' },
    { symbol: '₪', name: 'Israeli Shekel' },
    { symbol: '₨', name: 'Pakistani Rupee' },
    { symbol: '₦', name: 'Nigerian Naira' }
  ];

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'sales_man', label: 'Sales Man' }
  ];

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchSettings();
    if (hasPermission(user?.role, 'canManageUsers')) {
      fetchUsers();
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
        // Set global currency
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const [originalSettings, setOriginalSettings] = useState({});

  const fetchUsers = async () => {
    try {
      const response = await apiRequest('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSettingsSave = async () => {
    if (!hasPermission(currentUser?.role, 'canModifySettings')) {
      setMessage('Access denied. You do not have permission to modify settings.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        // Log settings changes
        if (originalSettings.shopName !== settings.shopName) {
          logSettingsActivity.updated('shopName', originalSettings.shopName, settings.shopName);
        }
        if (originalSettings.contactNumber !== settings.contactNumber) {
          logSettingsActivity.updated('contactNumber', originalSettings.contactNumber, settings.contactNumber);
        }
        if (originalSettings.address !== settings.address) {
          logSettingsActivity.updated('address', originalSettings.address, settings.address);
        }
        if (originalSettings.currency !== settings.currency) {
          logSettingsActivity.updated('currency', originalSettings.currency, settings.currency);
        }
        if (originalSettings.discountPercentage !== settings.discountPercentage) {
          logSettingsActivity.updated('discountPercentage', originalSettings.discountPercentage, settings.discountPercentage);
        }
        
        setMessage('Settings saved successfully!');
        // Update global currency immediately
        setCurrency(settings.currency);
        // Update original settings
        setOriginalSettings(settings);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!hasPermission(currentUser?.role, 'canCreateUsers')) {
      setMessage('Access denied. You do not have permission to create users.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setMessage('User added successfully!');
        setNewUser({ username: '', password: '', role: 'sales_man' });
        setShowAddUser(false);
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to add user');
      }
    } catch (error) {
      setMessage('Error adding user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!hasPermission(currentUser?.role, 'canDeleteUsers')) {
      setMessage('Access denied. You do not have permission to delete users.');
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('User deleted successfully!');
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to delete user');
      }
    } catch (error) {
      setMessage('Error deleting user');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      _id: user._id,
      username: user.username,
      password: '',
      role: user.role
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!hasPermission(currentUser?.role, 'canUpdateUsers')) {
      setMessage('Access denied. You do not have permission to update users.');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        username: editingUser.username,
        role: editingUser.role
      };
      
      // Only include password if it's not empty
      if (editingUser.password.trim() !== '') {
        updateData.password = editingUser.password;
      }

      const response = await apiRequest(`/api/users/${editingUser._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        setMessage('User updated successfully!');
        setEditingUser(null);
        fetchUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to update user');
      }
    } catch (error) {
      setMessage('Error updating user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage company information, system settings, and users
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('successfully') 
              ? 'bg-green-50 border border-green-200 text-green-600' 
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'company'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🏪 Company Information
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ System Settings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 User Management
            </button>
          </nav>
        </div>

        {/* Company Information Tab */}
        {activeTab === 'company' && (
          hasPermission(currentUser?.role, 'canModifySettings') ? (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">🏪 Company Information</h3>
            <p className="text-sm text-gray-600 mb-4">Update your shop details that will appear on invoices and receipts</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name
                </label>
                <input
                  type="text"
                  id="shopName"
                  value={settings.shopName}
                  onChange={(e) => setSettings(prev => ({ ...prev, shopName: e.target.value }))}
                  className="input-field"
                  placeholder="Enter shop name"
                />
              </div>

              <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="text"
                  id="contactNumber"
                  value={settings.contactNumber}
                  onChange={(e) => setSettings(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="input-field"
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  rows="3"
                  value={settings.address}
                  onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                  className="input-field"
                  placeholder="Enter shop address"
                />
              </div>

              <div className="flex justify-end">
                                  <button
                    onClick={handleSettingsSave}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '⏳ Saving...' : '💾 Save Company Info'}
                  </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-8">
              <p className="text-gray-500">Company Information</p>
              <p className="text-sm text-gray-400 mt-2">
                You do not have permission to modify company information. Contact your Super Admin.
              </p>
            </div>
          </div>
        )
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          hasPermission(currentUser?.role, 'canModifySettings') ? (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ System Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Configure system preferences and default values</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                    Currency Symbol
                  </label>
                  <select
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                    className="input-field"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.symbol} value={currency.symbol}>
                        {currency.symbol} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                    Default Discount Percentage
                  </label>
                  <input
                    type="number"
                    id="discountPercentage"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.discountPercentage}
                    onChange={(e) => setSettings(prev => ({ ...prev, discountPercentage: parseFloat(e.target.value) }))}
                    className="input-field"
                    placeholder="Enter discount percentage"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSettingsSave}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '⏳ Saving...' : '⚙️ Save System Settings'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-8">
                <p className="text-gray-500">System Settings</p>
                <p className="text-sm text-gray-400 mt-2">
                  You do not have permission to modify system settings. Contact your Super Admin.
                </p>
              </div>
            </div>
          )
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          hasPermission(currentUser?.role, 'canManageUsers') ? (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="btn-primary"
              >
                {showAddUser ? '❌ Cancel' : '👤 Add User'}
              </button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">Add New User</h4>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        required
                        value={newUser.username}
                        onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                        className="input-field"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        required
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                        className="input-field"
                        placeholder="Enter password"
                      />
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        id="role"
                        value={newUser.role}
                        onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                        className="input-field"
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? '⏳ Adding...' : '👤 Add User'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit User Form */}
            {editingUser && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-md font-medium text-gray-900">Edit User: {editingUser.username}</h4>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ❌ Cancel
                  </button>
                </div>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        id="edit-username"
                        required
                        value={editingUser.username}
                        onChange={(e) => setEditingUser(prev => ({ ...prev, username: e.target.value }))}
                        className="input-field"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 mb-2">
                        Password (leave blank to keep current)
                      </label>
                      <input
                        type="password"
                        id="edit-password"
                        value={editingUser.password}
                        onChange={(e) => setEditingUser(prev => ({ ...prev, password: e.target.value }))}
                        className="input-field"
                        placeholder="Enter new password (optional)"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        id="edit-role"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                        className="input-field"
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? '⏳ Updating...' : '💾 Update User'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Users List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Username</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Created At</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{user.username}</td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'super_admin' 
                            ? 'bg-red-100 text-red-800' 
                            : user.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleEditUser(user)}
                            disabled={!hasPermission(currentUser?.role, 'canUpdateUsers')}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                            title="Edit User"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            disabled={user.role === 'super_admin' || user._id === currentUser?._id}
                            className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-8">
              <p className="text-gray-500">User Management</p>
              <p className="text-sm text-gray-400 mt-2">
                You do not have permission to manage users. Contact your Super Admin.
              </p>
            </div>
          </div>
        )
        )}
      </div>
    </Layout>
  );
} 