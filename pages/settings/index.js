import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { setCurrency } from '../../lib/currency';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';

export default function Settings() {
  const [settings, setSettings] = useState({
    currency: '$',
    discountPercentage: 3,
    shopName: 'Medical Shop'
  });
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'sales_man'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const currencies = [
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
        // Set global currency
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

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
        setMessage('Settings saved successfully!');
        // Update global currency immediately
        setCurrency(settings.currency);
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your shop settings and users
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

        {/* General Settings */}
        {hasPermission(currentUser?.role, 'canModifySettings') ? (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
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
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="text-center py-8">
              <p className="text-gray-500">Settings Management</p>
              <p className="text-sm text-gray-400 mt-2">
                You do not have permission to modify settings. Contact your Super Admin.
              </p>
            </div>
          </div>
        )}

        {/* User Management */}
        {hasPermission(currentUser?.role, 'canManageUsers') ? (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="btn-primary"
              >
                {showAddUser ? 'Cancel' : 'Add User'}
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
                      {loading ? 'Adding...' : 'Add User'}
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
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          disabled={user.role === 'super_admin' || user._id === currentUser?._id}
                          className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
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
        )}
      </div>
    </Layout>
  );
} 