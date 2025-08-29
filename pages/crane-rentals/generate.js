import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function GenerateCraneRentalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState([]);
  const [cranes, setCranes] = useState([]);
  const [availableCranes, setAvailableCranes] = useState([]);
  
  const [rentalData, setRentalData] = useState({
    customerId: '',
    craneId: '',
    projectName: '',
    projectLocation: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '18:00',
    billingType: 'daily', // 'hourly' or 'daily'
    hourlyRate: '',
    dailyRate: '',
    totalHours: 8,
    totalDays: 1,
    notes: '',
    operator: '',
    additionalServices: []
  });

  const [additionalService, setAdditionalService] = useState({
    name: '',
    description: '',
    cost: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchCranes();
  }, []);

  useEffect(() => {
    if (rentalData.craneId) {
      const selectedCrane = cranes.find(crane => crane._id === rentalData.craneId);
      if (selectedCrane) {
        setRentalData(prev => ({
          ...prev,
          dailyRate: selectedCrane.dailyRate,
          hourlyRate: selectedCrane.hourlyRate || Math.round(selectedCrane.dailyRate / 8)
        }));
      }
    }
  }, [rentalData.craneId, cranes]);

  useEffect(() => {
    // Filter available cranes
    const available = cranes.filter(crane => crane.status === 'Available');
    setAvailableCranes(available);
  }, [cranes]);

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCranes = async () => {
    try {
      const response = await apiRequest('/api/cranes');
      if (response.ok) {
        const data = await response.json();
        setCranes(data);
      }
    } catch (error) {
      console.error('Error fetching cranes:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRentalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBillingTypeChange = (billingType) => {
    setRentalData(prev => ({
      ...prev,
      billingType,
      totalHours: billingType === 'hourly' ? 8 : 0,
      totalDays: billingType === 'daily' ? 1 : 0
    }));
  };

  const calculateTotal = () => {
    let subtotal = 0;
    
    if (rentalData.billingType === 'hourly') {
      subtotal = (rentalData.hourlyRate || 0) * rentalData.totalHours;
    } else {
      subtotal = (rentalData.dailyRate || 0) * rentalData.totalDays;
    }

    const additionalServicesTotal = rentalData.additionalServices.reduce((sum, service) => sum + (service.cost || 0), 0);
    
    return {
      subtotal,
      additionalServicesTotal,
      total: subtotal + additionalServicesTotal
    };
  };

  const addAdditionalService = () => {
    if (!additionalService.name || !additionalService.cost) {
      alert('Please fill in service name and cost');
      return;
    }

    setRentalData(prev => ({
      ...prev,
      additionalServices: [...prev.additionalServices, { ...additionalService, id: Date.now() }]
    }));

    setAdditionalService({ name: '', description: '', cost: '' });
  };

  const removeAdditionalService = (serviceId) => {
    setRentalData(prev => ({
      ...prev,
      additionalServices: prev.additionalServices.filter(service => service.id !== serviceId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!rentalData.customerId || !rentalData.craneId || !rentalData.projectName) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (rentalData.billingType === 'hourly' && (!rentalData.hourlyRate || !rentalData.totalHours)) {
        setError('Please provide hourly rate and total hours');
        setLoading(false);
        return;
      }

      if (rentalData.billingType === 'daily' && (!rentalData.dailyRate || !rentalData.totalDays)) {
        setError('Please provide daily rate and total days');
        setLoading(false);
        return;
      }

      const response = await apiRequest('/api/crane-rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rentalData,
          hourlyRate: parseFloat(rentalData.hourlyRate) || 0,
          dailyRate: parseFloat(rentalData.dailyRate) || 0,
          totalHours: parseInt(rentalData.totalHours) || 0,
          totalDays: parseInt(rentalData.totalDays) || 0,
          additionalServices: rentalData.additionalServices.map(service => ({
            name: service.name,
            description: service.description,
            cost: parseFloat(service.cost) || 0
          }))
        }),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/crane-rentals/${result.rentalId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create crane rental');
      }
    } catch (error) {
      console.error('Error creating crane rental:', error);
      setError('Error creating crane rental');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotal();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Generate Crane Rental
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Create a new crane rental invoice
                </p>
              </div>
              <Link
                href="/crane-rentals"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← Back to Rentals
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer and Crane Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer & Crane Selection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer *
                    </label>
                    <select
                      name="customerId"
                      value={rentalData.customerId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.companyName || customer.contactPerson} - {customer.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Crane *
                    </label>
                    <select
                      name="craneId"
                      value={rentalData.craneId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Available Crane</option>
                      {availableCranes.map(crane => (
                        <option key={crane._id} value={crane._id}>
                          {crane.name} - {crane.capacity} - {crane.location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Project Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      name="projectName"
                      value={rentalData.projectName}
                      onChange={handleInputChange}
                      placeholder="e.g., Dubai Marina Tower Construction"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Location
                    </label>
                    <input
                      type="text"
                      name="projectLocation"
                      value={rentalData.projectLocation}
                      onChange={handleInputChange}
                      placeholder="e.g., Dubai Marina"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Rental Period */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={rentalData.startDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={rentalData.endDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={rentalData.startTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={rentalData.endTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Type and Rates */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing & Rates</h3>
                
                {/* Billing Type Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Type *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="billingType"
                        value="daily"
                        checked={rentalData.billingType === 'daily'}
                        onChange={() => handleBillingTypeChange('daily')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Daily Rate</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="billingType"
                        value="hourly"
                        checked={rentalData.billingType === 'hourly'}
                        onChange={() => handleBillingTypeChange('hourly')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Hourly Rate</span>
                    </label>
                  </div>
                </div>

                {/* Rate and Quantity Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rentalData.billingType === 'hourly' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hourly Rate (AED) *
                        </label>
                        <input
                          type="number"
                          name="hourlyRate"
                          value={rentalData.hourlyRate}
                          onChange={handleInputChange}
                          placeholder="e.g., 1500"
                          step="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Hours *
                        </label>
                        <input
                          type="number"
                          name="totalHours"
                          value={rentalData.totalHours}
                          onChange={handleInputChange}
                          placeholder="e.g., 8"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Daily Rate (AED) *
                        </label>
                        <input
                          type="number"
                          name="dailyRate"
                          value={rentalData.dailyRate}
                          onChange={handleInputChange}
                          placeholder="e.g., 15000"
                          step="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Days *
                        </label>
                        <input
                          type="number"
                          name="totalDays"
                          value={rentalData.totalDays}
                          onChange={handleInputChange}
                          placeholder="e.g., 1"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Additional Services */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Services</h3>
                
                {/* Add Service Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Service name"
                      value={additionalService.name}
                      onChange={(e) => setAdditionalService(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Description"
                      value={additionalService.description}
                      onChange={(e) => setAdditionalService(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Cost (AED)"
                      value={additionalService.cost}
                      onChange={(e) => setAdditionalService(prev => ({ ...prev, cost: e.target.value }))}
                      step="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={addAdditionalService}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>

                {/* Services List */}
                {rentalData.additionalServices.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Added Services:</h4>
                    <div className="space-y-2">
                      {rentalData.additionalServices.map(service => (
                        <div key={service.id} className="flex justify-between items-center bg-white p-3 rounded border">
                          <div>
                            <div className="font-medium text-gray-900">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-gray-500">{service.description}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-gray-900">{formatCurrency(service.cost)}</span>
                            <button
                              type="button"
                              onClick={() => removeAdditionalService(service.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Operator
                    </label>
                    <input
                      type="text"
                      name="operator"
                      value={rentalData.operator}
                      onChange={handleInputChange}
                      placeholder="e.g., Ahmed Al Mansouri"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={rentalData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Any additional notes about this rental..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {rentalData.billingType === 'hourly' ? 'Hourly Rate' : 'Daily Rate'}:
                    </span>
                    <span className="font-medium">
                      {rentalData.billingType === 'hourly' 
                        ? `${formatCurrency(rentalData.hourlyRate)} × ${rentalData.totalHours} hours`
                        : `${formatCurrency(rentalData.dailyRate)} × ${rentalData.totalDays} days`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  {totals.additionalServicesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Additional Services:</span>
                      <span className="font-medium">{formatCurrency(totals.additionalServicesTotal)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-semibold text-gray-900">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Link
                  href="/crane-rentals"
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Rental Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
