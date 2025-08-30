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
    projectName: '',
    projectLocation: '',
    projectDescription: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '18:00',
    billingType: 'daily', // 'hourly' or 'daily'
    notes: '',
    operator: '',
    craneRentals: [], // Array for multiple cranes with individual status
    additionalServices: [],
    contractStatus: 'Active', // Active, Completed, Cancelled
    contractEndDate: null // Will be set when contract is completed
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

  // Debug: Log rental data changes
  useEffect(() => {
    console.log('Rental data updated:', rentalData);
    console.log('Crane rentals count:', rentalData.craneRentals.length);
  }, [rentalData]);

  // Function to pre-populate form with existing crane data (for testing/editing)
  const prePopulateCranes = () => {
    const existingCranes = [
      {
        craneId: "68b0e4c043713283120fcfdc",
        hourlyRate: 1875,
        dailyRate: 15000,
        totalHours: 8,
        totalDays: 1,
        craneName: "Liebherr LTM 1100-4.2",
        craneCode: "CRANE001",
        craneType: "Mobile Crane",
        craneCapacity: "100 tons",
        craneStatus: "Active",
        completionDate: null,
        individualAmount: 0
      },
      {
        craneId: "68b0e4c043713283120fcfdf",
        hourlyRate: 4375,
        dailyRate: 35000,
        totalHours: 8,
        totalDays: 1,
        craneName: "Demag CC 2800-1",
        craneCode: "CRANE004",
        craneType: "Crawler Crane",
        craneCapacity: "600 tons",
        craneStatus: "Active",
        completionDate: null,
        individualAmount: 0
      }
    ];

    setRentalData(prev => ({
      ...prev,
      craneRentals: existingCranes
    }));
  };

  // Handle URL parameters for pre-filling customer data
  useEffect(() => {
    if (router.query.customerId && customers.length > 0) {
      const customerId = router.query.customerId;
      console.log('URL customerId:', customerId);
      console.log('Available customers:', customers);
      
      const customer = customers.find(c => c._id === customerId);
      console.log('Found customer:', customer);
      
      if (customer) {
        setRentalData(prev => ({
          ...prev,
          customerId: customer._id
        }));
        console.log('Customer ID set to:', customer._id);
      }
    }
  }, [router.query.customerId, customers]);

  const addCraneRental = () => {
    const newCraneRental = {
      craneId: '',
      hourlyRate: '',
      dailyRate: '',
      totalHours: 8,
      totalDays: 1,
      craneName: '',
      craneCode: '',
      craneType: '',
      craneCapacity: '',
      craneStatus: 'Active', // Active, Completed, Cancelled
      completionDate: null,
      individualAmount: 0
    };

    setRentalData(prev => ({
      ...prev,
      craneRentals: [...prev.craneRentals, newCraneRental]
    }));
  };

  const removeCraneRental = (index) => {
    setRentalData(prev => ({
      ...prev,
      craneRentals: prev.craneRentals.filter((_, i) => i !== index)
    }));
  };

  const updateCraneRental = (index, field, value) => {
    setRentalData(prev => {
      const updatedCraneRentals = [...prev.craneRentals];
      updatedCraneRentals[index] = {
        ...updatedCraneRentals[index],
        [field]: value
      };

      // Auto-fill crane details when crane is selected
      if (field === 'craneId') {
        const selectedCrane = cranes.find(crane => crane._id === value);
        if (selectedCrane) {
          updatedCraneRentals[index].craneName = selectedCrane.name;
          updatedCraneRentals[index].craneCode = selectedCrane.code;
          updatedCraneRentals[index].craneType = selectedCrane.type;
          updatedCraneRentals[index].craneCapacity = selectedCrane.capacity;
          updatedCraneRentals[index].dailyRate = selectedCrane.dailyRate;
          updatedCraneRentals[index].hourlyRate = selectedCrane.hourlyRate || Math.round(selectedCrane.dailyRate / 8);
        }
      }

      return {
        ...prev,
        craneRentals: updatedCraneRentals
      };
    });
  };

  useEffect(() => {
    // Filter available cranes
    const available = cranes.filter(crane => crane.status === 'Available');
    setAvailableCranes(available);
  }, [cranes]);

  // Function to get available cranes for a specific crane rental card (excluding already selected ones)
  const getAvailableCranesForCard = (currentIndex) => {
    const selectedCraneIds = rentalData.craneRentals
      .map((crane, index) => index !== currentIndex ? crane.craneId : null)
      .filter(id => id); // Remove null values
    
    return availableCranes.filter(crane => !selectedCraneIds.includes(crane._id));
  };

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

    // Auto-fill customer details when customer is selected
    if (name === 'customerId') {
      const selectedCustomer = customers.find(customer => customer._id === value);
      if (selectedCustomer) {
        // You can add more customer fields here if needed
        console.log('Customer selected:', selectedCustomer);
      }
    }
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
    
    // Calculate subtotal from individual crane rentals
    rentalData.craneRentals.forEach(crane => {
      if (crane.craneId) {
        if (rentalData.billingType === 'hourly') {
          subtotal += (crane.hourlyRate || 0) * (crane.totalHours || 0);
        } else {
          subtotal += (crane.dailyRate || 0) * (crane.totalDays || 0);
        }
      }
    });

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
      if (!rentalData.customerId || !rentalData.projectName) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (rentalData.craneRentals.length === 0) {
        setError('Please add at least one crane to the rental');
        setLoading(false);
        return;
      }

      // Validate crane details
      for (const crane of rentalData.craneRentals) {
        if (!crane.craneId) {
          setError('Please select a crane for all rentals');
          setLoading(false);
          return;
        }
      }

      // Validate individual crane billing details
      for (const crane of rentalData.craneRentals) {
        if (rentalData.billingType === 'hourly' && (!crane.hourlyRate || !crane.totalHours)) {
          setError(`Please provide hourly rate and total hours for crane ${crane.craneName || crane.craneCode}`);
          setLoading(false);
          return;
        }
        if (rentalData.billingType === 'daily' && (!crane.dailyRate || !crane.totalDays)) {
          setError(`Please provide daily rate and total days for crane ${crane.craneName || crane.craneCode}`);
          setLoading(false);
          return;
        }
      }

      const response = await apiRequest('/api/crane-rentals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rentalData,
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

              {/* Customer Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Selection</h3>
                <div className="grid grid-cols-1 gap-4">
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
                    {rentalData.customerId && (
                      <p className="mt-1 text-sm text-green-600">
                        ✅ Customer selected: {customers.find(c => c._id === rentalData.customerId)?.companyName || customers.find(c => c._id === rentalData.customerId)?.contactPerson}
                      </p>
                    )}
                  </div>
                </div>
            </div>

              {/* Crane Rentals Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Crane Rentals</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={addCraneRental}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      ➕ Add Crane
                    </button>
                    <button
                      type="button"
                      onClick={prePopulateCranes}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      🔄 Load Test Data
                    </button>
                  </div>
                </div>

                {rentalData.craneRentals.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-4xl mb-2">🚁</div>
                    <p className="text-gray-500 mb-2">No cranes added yet</p>
                    <p className="text-sm text-gray-400">Click "Add Crane" to start adding cranes to this rental</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rentalData.craneRentals.map((craneRental, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-md font-medium text-gray-900">Crane #{index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeCraneRental(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Crane *
                            </label>
                            <select
                              value={craneRental.craneId}
                              onChange={(e) => updateCraneRental(index, 'craneId', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              required
                            >
                              <option value="">Select Available Crane</option>
                              {getAvailableCranesForCard(index).length > 0 ? (
                                getAvailableCranesForCard(index).map(crane => (
                                  <option key={crane._id} value={crane._id}>
                                    {crane.name} - {crane.capacity} - {crane.location}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>
                                  No more cranes available
                                </option>
                              )}
                            </select>
                            {getAvailableCranesForCard(index).length > 0 && (
                              <p className="mt-1 text-xs text-gray-500">
                                {getAvailableCranesForCard(index).length} crane(s) available for selection
                              </p>
                            )}
                            {getAvailableCranesForCard(index).length === 0 && (
                              <p className="mt-1 text-xs text-red-500">
                                No more cranes available. Remove another crane first.
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Billing Type
                            </label>
                            <select
                              value={rentalData.billingType}
                              onChange={(e) => handleBillingTypeChange(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="daily">Daily Rate</option>
                              <option value="hourly">Hourly Rate</option>
                            </select>
                          </div>

                          {rentalData.billingType === 'hourly' ? (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Hourly Rate (AED)
                                </label>
                                <input
                                  type="number"
                                  value={craneRental.hourlyRate}
                                  onChange={(e) => updateCraneRental(index, 'hourlyRate', e.target.value)}
                                  placeholder="Auto-filled from crane"
                                  step="100"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Total Hours
                                </label>
                                <input
                                  type="number"
                                  value={craneRental.totalHours}
                                  onChange={(e) => updateCraneRental(index, 'totalHours', e.target.value)}
                                  placeholder="e.g., 8"
                                  min="1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Daily Rate (AED)
                                </label>
                                <input
                                  type="number"
                                  value={craneRental.dailyRate}
                                  onChange={(e) => updateCraneRental(index, 'dailyRate', e.target.value)}
                                  placeholder="Auto-filled from crane"
                                  step="100"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Total Days
                                </label>
                                <input
                                  type="number"
                                  value={craneRental.totalDays}
                                  onChange={(e) => updateCraneRental(index, 'totalDays', e.target.value)}
                                  placeholder="e.g., 1"
                                  min="1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {craneRental.craneId && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-800">
                              <strong>Selected Crane:</strong> {craneRental.craneName} ({craneRental.craneCode})
                            </p>
                            <p className="text-sm text-blue-600">
                              <strong>Type:</strong> {craneRental.craneType} | <strong>Capacity:</strong> {craneRental.craneCapacity}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

              {/* Summary Section */}
              {rentalData.craneRentals.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-3">Rental Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-blue-700">Total Cranes</p>
                      <p className="text-lg font-semibold text-blue-900">{rentalData.craneRentals.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Billing Type</p>
                      <p className="text-lg font-semibold text-blue-900 capitalize">{rentalData.billingType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Total Amount</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(rentalData.craneRentals.reduce((sum, crane) => {
                          if (rentalData.billingType === 'hourly') {
                            return sum + ((crane.hourlyRate || 0) * (crane.totalHours || 0));
                          } else {
                            return sum + ((crane.dailyRate || 0) * (crane.totalDays || 0));
                          }
                        }, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      {rentalData.craneRentals.length > 0 ? (
                        rentalData.billingType === 'hourly' 
                          ? `${rentalData.craneRentals.length} crane(s) × hourly rates`
                          : `${rentalData.craneRentals.length} crane(s) × daily rates`
                      ) : (
                        'No cranes added'
                      )}
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
