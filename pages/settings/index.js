import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { setCurrency } from '../../lib/currency';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { logSettingsActivity } from '../../lib/activity-logger';
import Link from 'next/link';

export default function Settings() {
  const [settings, setSettings] = useState({
    currency: '$',
    discountPercentage: 3,
    businessName: 'My Business',
    businessType: 'Retail Store',
    contactNumber: '',
    address: '',
    email: '',
    website: '',
    taxRate: 0,
    hasExpiryDates: true,
    hasBatchNumbers: false,
    lowStockThreshold: 10,
    // Notification settings
    enableEmailNotifications: false,
    enableSmsNotifications: false,
    notificationEmail: '',
    notificationPhoneNumber: '',
    notificationSettings: {
      lowStockThreshold: 20,
      expiryWarningDays: 30,
      criticalExpiryDays: 7,
      emailNotifications: true,
      inAppNotifications: true,
      notificationFrequency: 'realtime',
      autoCleanupDays: 30,
      stockoutAlert: true
    }
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
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const currencies = [
    { symbol: '$', name: 'US Dollar' },
    { symbol: '€', name: 'Euro' },
    { symbol: '£', name: 'British Pound' },
    { symbol: '₹', name: 'Indian Rupee' },
    { symbol: '¥', name: 'Japanese Yen' },
    { symbol: '₽', name: 'Russian Ruble' },
    { symbol: '₩', name: 'Korean Won' },
    { symbol: '₨', name: 'Pakistani Rupee' },
    { symbol: '₦', name: 'Nigerian Naira' }
  ];

  const businessTypes = [
    { value: 'Retail Store', label: 'Retail Store' },
    { value: 'Restaurant', label: 'Restaurant' },
    { value: 'Service Business', label: 'Service Business' },
    { value: 'Wholesale Business', label: 'Wholesale Business' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'E-commerce', label: 'E-commerce' },
    { value: 'Other', label: 'Other' }
  ];

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'sales_man', label: 'Sales Man' }
  ];

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    setIsLoadingUser(false);
    fetchSettings();
  }, []);

  // Separate useEffect for user-dependent operations
  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'canManageUsers')) {
      fetchUsers();
    }
  }, [currentUser]);

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

  const testNotification = async () => {
    try {
      const response = await apiRequest('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          action: 'process',
          userId: 'test'
        })
      });

      if (response.ok) {
        setMessage('Test notification processed successfully! Check the notification bell.');
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage('Failed to process test notification');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      setMessage('Failed to test notification');
    }
  };

  const handleSettingsSave = async () => {
    if (!hasPermission(currentUser?.role, 'canModifySettings')) {
      setMessage('Access denied. You do not have permission to modify settings.');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      // If we're on the notifications tab, send notification settings
      if (activeTab === 'notifications') {
        response = await apiRequest('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            notificationSettings: settings.notificationSettings
          }),
        });
      } else {
        // For other tabs, send regular settings
        response = await apiRequest('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        });
      }

      if (response.ok) {
        // Log settings changes for regular settings
        if (activeTab !== 'notifications') {
          if (originalSettings.businessName !== settings.businessName) {
            logSettingsActivity.updated('businessName', originalSettings.businessName, settings.businessName);
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
        }
        
        setMessage(activeTab === 'notifications' ? 'Notification settings saved successfully!' : 'Settings saved successfully!');
        // Update global currency immediately for regular settings
        if (activeTab !== 'notifications') {
          setCurrency(settings.currency);
        }
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

  if (isLoadingUser) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-600">Please log in to access settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage company information, system settings, and users
              </p>
            </div>
            
            {/* Business Setup Button */}
            {hasPermission(currentUser?.role, 'canManageBusinessSetup') && (
              <div className="flex flex-col items-end space-y-2">
                <Link
                  href="/setup/business-config"
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🚀 Business Setup Wizard
                </Link>
                <p className="text-xs text-gray-500 text-right">
                  Configure your business type, categories, and features
                </p>
              </div>
            )}
          </div>
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
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔔 Notification Settings
            </button>
            {hasPermission(currentUser?.role, 'canManageBusinessSetup') && (
              <button
                onClick={() => setActiveTab('business-setup')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'business-setup'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚀 Business Setup
              </button>
            )}
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
            <div className="space-y-6">
              {/* Basic Business Information */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🏪 Basic Business Information</h3>
                <p className="text-sm text-gray-600 mb-4">Core business details that appear on invoices and receipts</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      value={settings.businessName}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                      className="input-field"
                      placeholder="Enter business name"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will appear on all invoices and reports
                    </p>
                  </div>

                  <div>
                    <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      id="businessType"
                      value={settings.businessType}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessType: e.target.value }))}
                      className="input-field"
                    >
                      {businessTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Determines default categories and features
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📞 Contact Information</h3>
                <p className="text-sm text-gray-600 mb-4">Business contact details for customer communication</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      id="contactNumber"
                      value={settings.contactNumber}
                      onChange={(e) => setSettings(prev => ({ ...prev, contactNumber: e.target.value }))}
                      className="input-field"
                      placeholder="+92 XXX XXXXXXX"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Customer service contact number
                    </p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={settings.email}
                      onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="input-field"
                      placeholder="business@example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Business email for customer inquiries
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Online Presence */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📍 Location & Online Presence</h3>
                <p className="text-sm text-gray-600 mb-4">Business address and online information</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Address
                    </label>
                    <textarea
                      id="address"
                      rows="3"
                      value={settings.address}
                      onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                      className="input-field"
                      placeholder="Enter complete business address"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Full address for invoices and customer reference
                    </p>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={settings.website}
                      onChange={(e) => setSettings(prev => ({ ...prev, website: e.target.value }))}
                      className="input-field"
                      placeholder="https://www.example.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Your business website
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSettingsSave}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? '⏳ Saving...' : '💾 Save Company Information'}
                </button>
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
            <div className="space-y-6">
              {/* Currency & Financial Settings */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">💰 Currency & Financial Settings</h3>
                <p className="text-sm text-gray-600 mb-4">Configure currency, discounts, and tax settings</p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      This will be used on all invoices and reports
                    </p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      Applied to all new invoices by default
                    </p>
                  </div>

                  <div>
                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      id="taxRate"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.taxRate}
                      onChange={(e) => setSettings(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                      className="input-field"
                      placeholder="Enter tax rate"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tax rate applied to all sales transactions
                    </p>
                  </div>
                </div>
              </div>

              {/* Inventory Management Settings */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📦 Inventory Management Settings</h3>
                <p className="text-sm text-gray-600 mb-4">Configure inventory tracking and alert settings</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      id="lowStockThreshold"
                      min="1"
                      value={settings.lowStockThreshold}
                      onChange={(e) => setSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) }))}
                      className="input-field"
                      placeholder="Enter low stock threshold"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Products below this quantity will show low stock warnings
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Feature Toggles</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="hasExpiryDates"
                          checked={settings.hasExpiryDates}
                          onChange={(e) => setSettings(prev => ({ ...prev, hasExpiryDates: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="hasExpiryDates" className="ml-3 block text-sm text-gray-700">
                          <span className="font-medium">Expiry Date Tracking</span>
                          <p className="text-xs text-gray-500">Track product expiration dates</p>
                        </label>
                      </div>

                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="hasBatchNumbers"
                          checked={settings.hasBatchNumbers}
                          onChange={(e) => setSettings(prev => ({ ...prev, hasBatchNumbers: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="hasBatchNumbers" className="ml-3 block text-sm text-gray-700">
                          <span className="font-medium">Batch Number Tracking</span>
                          <p className="text-xs text-gray-500">Track product batch numbers</p>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
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

        {/* Notification Settings Tab */}
        {activeTab === 'notifications' && (
          hasPermission(currentUser?.role, 'canModifySettings') ? (
            <div className="space-y-6">
              {/* Stock Alerts */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📦 Stock Alerts</h3>
                <p className="text-sm text-gray-600 mb-4">Configure low-stock alerts and stockout warnings</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.notificationSettings?.lowStockThreshold || 20}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            lowStockThreshold: parseInt(e.target.value)
                          }
                        }))}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">% of min stock level</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when stock falls below this percentage of minimum stock level
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stockout Alert
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationSettings?.stockoutAlert !== false}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            stockoutAlert: e.target.checked
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Alert when product is completely out of stock
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiry Warnings */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">⏰ Expiry Warnings</h3>
                <p className="text-sm text-gray-600 mb-4">Configure expiry warning notifications</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warning Days (Medium Priority)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.notificationSettings?.expiryWarningDays || 30}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          expiryWarningDays: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Days before expiry to show medium priority warning
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Critical Days (High Priority)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.notificationSettings?.criticalExpiryDays || 7}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          criticalExpiryDays: parseInt(e.target.value)
                        }
                      }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Days before expiry to show critical priority warning
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Channels */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">📱 Notification Channels</h3>
                <p className="text-sm text-gray-600 mb-4">Choose how you want to receive notifications</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      In-app notifications (recommended)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationSettings?.inAppNotifications !== false}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            inAppNotifications: e.target.checked
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Show notifications in the app interface
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email notifications
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.notificationSettings?.emailNotifications === true}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            emailNotifications: e.target.checked
                          }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Send notifications via email
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Frequency */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">⏱️ Notification Frequency</h3>
                <p className="text-sm text-gray-600 mb-4">How often should the system check for alerts</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check Frequency
                  </label>
                  <select
                    value={settings.notificationSettings?.notificationFrequency || 'realtime'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        notificationFrequency: e.target.value
                      }
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="realtime">Real-time (immediate)</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Real-time provides instant alerts, while hourly/daily reduces system load
                  </p>
                </div>
              </div>

              {/* Cleanup Settings */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🧹 Cleanup Settings</h3>
                <p className="text-sm text-gray-600 mb-4">Automatically clean up old notifications</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-cleanup Old Notifications
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.notificationSettings?.autoCleanupDays || 30}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          autoCleanupDays: parseInt(e.target.value)
                        }
                      }))}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">days old</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Notifications older than this will be automatically removed
                  </p>
                </div>
              </div>

              {/* Test Notifications */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">🧪 Test Notifications</h3>
                <p className="text-sm text-gray-600 mb-4">Test the notification system to ensure it's working properly</p>
                
                <button
                  type="button"
                  onClick={testNotification}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  🧪 Test Notifications
                </button>
                
                <p className="text-xs text-gray-500 mt-2">
                  This will create sample notifications to test the system
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSettingsSave}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '⏳ Saving...' : '💾 Save Notification Settings'}
                </button>
              </div>

              {/* How It Works */}
              <div className="card bg-blue-50 border-blue-200">
                <h3 className="text-lg font-medium text-blue-900 mb-4">💡 How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
                  <div>
                    <h4 className="font-medium mb-2">Low Stock Alerts</h4>
                    <p>System monitors product quantities and alerts when stock falls below thresholds</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Expiry Warnings</h4>
                    <p>Automatically detects products nearing expiry and sends timely reminders</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Priority Levels</h4>
                    <p>Critical (red), High (orange), Medium (yellow), Low (blue) based on urgency</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Real-time Updates</h4>
                    <p>Notifications appear instantly in the app and can be sent via email</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-8">
                <p className="text-gray-500">Notification Settings</p>
                <p className="text-sm text-gray-400 mt-2">
                  You do not have permission to modify notification settings. Contact your Super Admin.
                </p>
              </div>
            </div>
          )
        )}

        {/* Business Setup Tab */}
        {activeTab === 'business-setup' && (
          hasPermission(currentUser?.role, 'canManageBusinessSetup') ? (
            <div className="space-y-6">
              {/* Business Setup Wizard Card */}
              <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Business Setup Wizard</h3>
                  <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Use our comprehensive wizard to configure your business type, categories, and features. 
                    This will set up your system according to your business requirements.
                  </p>
                  <Link
                    href="/setup/business-config"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-lg font-medium rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    🚀 Launch Business Setup Wizard
                  </Link>
                </div>
              </div>

              {/* Business Features Status */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">⚙️ Business Features Status</h3>
                <p className="text-sm text-gray-600 mb-4">Current features enabled for your business</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl mr-3">📅</span>
                    <div>
                      <p className="font-medium text-gray-900">Expiry Dates</p>
                      <p className="text-sm text-gray-600">
                        {settings.hasExpiryDates ? '✅ Enabled' : '❌ Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl mr-3">🏷️</span>
                    <div>
                      <p className="font-medium text-gray-900">Batch Numbers</p>
                      <p className="text-sm text-gray-600">
                        {settings.hasBatchNumbers ? '✅ Enabled' : '❌ Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl mr-3">💰</span>
                    <div>
                      <p className="font-medium text-gray-900">Default Discount</p>
                      <p className="text-sm text-gray-600">{settings.discountPercentage}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Business Configuration */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">⚡ Quick Business Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">Essential business settings that can be quickly modified</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      value={settings.businessType}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessType: e.target.value }))}
                      className="input-field"
                    >
                      {businessTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This affects default categories and features
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.discountPercentage}
                      onChange={(e) => setSettings(prev => ({ ...prev, discountPercentage: parseFloat(e.target.value) }))}
                      className="input-field"
                      placeholder="Enter discount percentage"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Applied to all new invoices by default
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSettingsSave}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? '⏳ Saving...' : '💾 Save Quick Settings'}
                  </button>
                </div>
              </div>

              {/* Business Setup Tips */}
              <div className="card bg-blue-50 border-blue-200">
                <h3 className="text-lg font-medium text-blue-900 mb-4">💡 Business Setup Tips</h3>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <p>Use the Business Setup Wizard for complete configuration</p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <p>Business type determines default categories and features</p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <p>Default discount applies to all new invoices</p>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <p>Contact support for advanced business configuration</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-8">
                <p className="text-gray-500">Business Setup Wizard</p>
                <p className="text-sm text-gray-400 mt-2">
                  You do not have permission to manage business setup. Contact your Super Admin.
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