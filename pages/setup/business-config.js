import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { SYSTEM_CONFIG, getBusinessTypeConfig, getDefaultCategories, getDefaultDiscount } from '../../lib/config';

export default function BusinessSetup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [businessConfig, setBusinessConfig] = useState({
    businessName: '',
    businessType: 'retail-store',
    industry: 'General',
    currency: 'Rs',
    currencySymbol: '₹',
    timezone: 'Asia/Karachi',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    address: '',
    contactNumber: '',
    email: '',
    website: '',
    taxRate: 0,
    defaultDiscount: 3,
    hasExpiryDates: true,
    hasBatchNumbers: true,
    hasSerialNumbers: false,
    hasWarranty: false
  });

  const [categories, setCategories] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  useEffect(() => {
    // Load existing business settings if available
    loadExistingSettings();
  }, []);

  const loadExistingSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        if (settings.businessName) {
          setBusinessConfig(prev => ({
            ...prev,
            ...settings
          }));
          setCurrentStep(4); // Skip to final step if already configured
        }
      }
    } catch (error) {
      console.log('No existing settings found, starting fresh setup');
    }
  };

  const updateBusinessConfig = (field, value) => {
    setBusinessConfig(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-update related fields based on business type
    if (field === 'businessType') {
      const typeConfig = getBusinessTypeConfig(value);
      setBusinessConfig(prev => ({
        ...prev,
        businessType: value,
        defaultDiscount: typeConfig.defaultDiscount,
        hasExpiryDates: typeConfig.hasExpiryDates,
        hasBatchNumbers: typeConfig.hasBatchNumbers,
        hasSerialNumbers: typeConfig.hasSerialNumbers,
        hasWarranty: typeConfig.hasWarranty
      }));
      
      // Set default categories for the business type
      setCategories(getDefaultCategories(value));
    }
  };

  const addCustomCategory = () => {
    const newCategory = prompt('Enter new category name:');
    if (newCategory && newCategory.trim()) {
      setCustomCategories(prev => [...prev, newCategory.trim()]);
    }
  };

  const removeCustomCategory = (index) => {
    setCustomCategories(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    setError('');

    try {
      // Combine default and custom categories
      const allCategories = [...categories, ...customCategories].map((name, index) => ({
        name,
        description: `${name} category`,
        color: getCategoryColor(index),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Save categories first
      for (const category of allCategories) {
        try {
          const categoryResponse = await apiRequest('/api/categories', {
            method: 'POST',
            body: JSON.stringify(category)
          });
          
          if (!categoryResponse.ok) {
            console.warn(`Failed to save category: ${category.name}`);
          }
        } catch (error) {
          console.warn(`Error saving category ${category.name}:`, error);
        }
      }

      // Prepare settings data for POST method
      const settingsData = {
        businessName: businessConfig.businessName,
        businessType: businessConfig.businessType,
        industry: businessConfig.industry,
        currency: businessConfig.currency,
        currencySymbol: businessConfig.currencySymbol,
        timezone: businessConfig.timezone,
        language: businessConfig.language,
        dateFormat: businessConfig.dateFormat,
        timeFormat: businessConfig.timeFormat,
        address: businessConfig.address,
        contactNumber: businessConfig.contactNumber,
        email: businessConfig.email,
        website: businessConfig.website,
        taxRate: businessConfig.taxRate,
        discountPercentage: businessConfig.defaultDiscount,
        hasExpiryDates: businessConfig.hasExpiryDates,
        hasBatchNumbers: businessConfig.hasBatchNumbers,
        hasSerialNumbers: businessConfig.hasSerialNumbers,
        hasWarranty: businessConfig.hasWarranty,
        lowStockThreshold: 10
      };

      console.log('Saving business setup:', settingsData);

      // Use POST method for business setup
      const response = await apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
      });

      if (response.ok) {
        const result = await response.json();
        alert('Business setup completed successfully!');
        console.log('Setup result:', result);
        router.push('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete business setup');
      }
    } catch (error) {
      setError('Failed to complete business setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (index) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6B7280', '#374151', '#059669', '#DC2626'];
    return colors[index % colors.length];
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              value={businessConfig.businessName}
              onChange={(e) => updateBusinessConfig('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your business name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type *
            </label>
            <select
              value={businessConfig.businessType}
              onChange={(e) => updateBusinessConfig('businessType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(SYSTEM_CONFIG.businessTypes).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.name} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={businessConfig.industry}
              onChange={(e) => updateBusinessConfig('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Electronics, Fashion, Food"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency *
            </label>
            <select
              value={businessConfig.currency}
              onChange={(e) => updateBusinessConfig('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Rs">Pakistani Rupee (Rs)</option>
              <option value="$">US Dollar ($)</option>
              <option value="€">Euro (€)</option>
              <option value="£">British Pound (£)</option>
              <option value="₹">Indian Rupee (₹)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact & Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Address
            </label>
            <textarea
              value={businessConfig.address}
              onChange={(e) => updateBusinessConfig('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your business address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Number
            </label>
            <input
              type="tel"
              value={businessConfig.contactNumber}
              onChange={(e) => updateBusinessConfig('contactNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+92 XXX XXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={businessConfig.email}
              onChange={(e) => updateBusinessConfig('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="business@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={businessConfig.website}
              onChange={(e) => updateBusinessConfig('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={businessConfig.timezone}
              onChange={(e) => updateBusinessConfig('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Asia/Karachi">Pakistan (UTC+5)</option>
              <option value="Asia/Dubai">UAE (UTC+4)</option>
              <option value="Asia/Kolkata">India (UTC+5:30)</option>
              <option value="America/New_York">US Eastern (UTC-5)</option>
              <option value="Europe/London">UK (UTC+0)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Discount (%)
            </label>
            <input
              type="number"
              value={businessConfig.defaultDiscount}
              onChange={(e) => updateBusinessConfig('defaultDiscount', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={businessConfig.taxRate}
              onChange={(e) => updateBusinessConfig('taxRate', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Inventory Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={businessConfig.hasExpiryDates}
                onChange={(e) => updateBusinessConfig('hasExpiryDates', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Track Expiry Dates</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={businessConfig.hasBatchNumbers}
                onChange={(e) => updateBusinessConfig('hasBatchNumbers', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Track Batch Numbers</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={businessConfig.hasSerialNumbers}
                onChange={(e) => updateBusinessConfig('hasSerialNumbers', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Track Serial Numbers</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={businessConfig.hasWarranty}
                onChange={(e) => updateBusinessConfig('hasWarranty', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Track Warranty</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Categories & Final Setup</h3>
        
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Default Categories</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {categories.map((category, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <span className="text-sm font-medium text-blue-800">{category}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-900">Custom Categories</h4>
            <button
              onClick={addCustomCategory}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              + Add Category
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {customCategories.map((category, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3 text-center flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">{category}</span>
                <button
                  onClick={() => removeCustomCategory(index)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Configuration Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Business:</strong> {businessConfig.businessName}</p>
              <p><strong>Type:</strong> {getBusinessTypeConfig(businessConfig.businessType).name}</p>
              <p><strong>Currency:</strong> {businessConfig.currency}</p>
              <p><strong>Default Discount:</strong> {businessConfig.defaultDiscount}%</p>
            </div>
            <div>
              <p><strong>Categories:</strong> {categories.length + customCategories.length}</p>
              <p><strong>Expiry Tracking:</strong> {businessConfig.hasExpiryDates ? 'Yes' : 'No'}</p>
              <p><strong>Batch Numbers:</strong> {businessConfig.hasBatchNumbers ? 'Yes' : 'No'}</p>
              <p><strong>Serial Numbers:</strong> {businessConfig.hasSerialNumbers ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return businessConfig.businessName.trim() !== '';
    if (currentStep === 2) return businessConfig.contactNumber.trim() !== '';
    if (currentStep === 3) return true;
    if (currentStep === 4) return true;
    return false;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Business Setup Wizard
          </h1>
          <p className="text-lg text-gray-600">
            Configure your Universal Business Management System
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            Step {currentStep} of 4: {
              currentStep === 1 ? 'Business Information' :
              currentStep === 2 ? 'Contact & Location' :
              currentStep === 3 ? 'Business Settings' :
              'Categories & Final Setup'
            }
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={saveConfiguration}
                disabled={loading || !canProceed()}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </div>
    </Layout>
  );
}
