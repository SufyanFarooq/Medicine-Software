import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function GenerateCraneRentalInvoice() {
  const router = useRouter();
  const { rentalId } = router.query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [rental, setRental] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [cranes, setCranes] = useState([]);
  
  const [invoiceData, setInvoiceData] = useState({
    rentalId: '',
    customerId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectName: '',
    projectLocation: '',
    startDate: '',
    endDate: '',
    billingType: 'daily',
    craneDetails: [],
    notes: '',
    paymentTerms: 'Net 30',
    dueDate: ''
  });

  useEffect(() => {
    fetchCustomers();
    fetchCranes();
    if (rentalId) {
      fetchRental();
    }
  }, [rentalId]);

  const fetchRental = async () => {
    try {
      const response = await apiRequest(`/api/crane-rentals/${rentalId}`);
      if (response.ok) {
        const rentalData = await response.json();

        setRental(rentalData);
        
        // Auto-fill invoice data from rental with multi-crane support
        const craneDetails = rentalData.craneRentals ? rentalData.craneRentals.map(crane => ({
          craneId: crane.craneId,
          craneName: crane.craneName,
          craneCode: crane.craneCode,
          craneType: crane.craneType,
          hours: crane.totalHours || 0,
          days: crane.totalDays || 0,
          craneCost: crane.individualAmount || 0
        })) : [];

        setInvoiceData({
          rentalId: rentalData._id,
          customerId: rentalData.customerId,
          customerName: rentalData.customerName,
          customerEmail: rentalData.customerEmail,
          customerPhone: rentalData.customerPhone,
          projectName: rentalData.projectName,
          projectLocation: rentalData.projectLocation,
          startDate: rentalData.startDate ? new Date(rentalData.startDate).toISOString().split('T')[0] : '',
          endDate: rentalData.endDate ? new Date(rentalData.endDate).toISOString().split('T')[0] : '',
          billingType: rentalData.billingType || 'daily',
          craneDetails: craneDetails,
          notes: rentalData.notes || '',
          paymentTerms: 'Net 30',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error fetching rental:', error);
      setError('Failed to load rental details');
    }
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
        // Only show available cranes
        const availableCranes = data.filter(crane => crane.status === 'Available');
        setCranes(availableCranes);
      }
    } catch (error) {
      console.error('Error fetching cranes:', error);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setInvoiceData(prev => ({
        ...prev,
        customerId: customer._id,
        customerName: customer.companyName || customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone
      }));
    }
  };

  const addCraneRental = () => {
    const newCraneRental = {
      craneId: '',
      hours: 0,
      days: 0,
      craneName: '',
      craneCode: '',
      craneType: '',
      craneCost: 0
    };

    setInvoiceData(prev => ({
      ...prev,
      craneDetails: [...prev.craneDetails, newCraneRental]
    }));
  };

  const removeCraneRental = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      craneDetails: prev.craneDetails.filter((_, i) => i !== index)
    }));
  };

  const updateCraneRental = (index, field, value) => {
    setInvoiceData(prev => {
      const updatedCraneDetails = [...prev.craneDetails];
      updatedCraneDetails[index] = {
        ...updatedCraneDetails[index],
        [field]: value
      };

      // Auto-calculate costs
      if (field === 'craneId') {
        const crane = cranes.find(c => c._id === value);
        if (crane) {
          updatedCraneDetails[index].craneName = crane.name;
          updatedCraneDetails[index].craneCode = crane.code;
          updatedCraneDetails[index].craneType = crane.type;
        }
      }

      return {
        ...prev,
        craneDetails: updatedCraneDetails
      };
    });
  };

  const calculateTotal = () => {
    let subtotal = 0;
    invoiceData.craneDetails.forEach(crane => {
      if (crane.craneId && (crane.hours > 0 || crane.days > 0)) {
        const selectedCrane = cranes.find(c => c._id === crane.craneId);
        if (selectedCrane) {
          if (invoiceData.billingType === 'hourly') {
            const hourlyRate = selectedCrane.dailyRate / 8;
            crane.craneCost = hourlyRate * crane.hours;
          } else {
            crane.craneCost = selectedCrane.dailyRate * crane.days;
          }
          subtotal += crane.craneCost;
        }
      }
    });

    const vatAmount = subtotal * 0.05; // 5% UAE VAT
    const total = subtotal + vatAmount;

    return { subtotal, vatAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!invoiceData.customerId || !invoiceData.projectName || !invoiceData.startDate || !invoiceData.endDate) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (invoiceData.craneDetails.length === 0) {
        setError('Please add at least one crane rental');
        setLoading(false);
        return;
      }

      // Validate crane details
      for (const crane of invoiceData.craneDetails) {
        if (!crane.craneId) {
          setError('Please select a crane for all rentals');
          setLoading(false);
          return;
        }
        
        if (invoiceData.billingType === 'hourly' && crane.hours <= 0) {
          setError('Please enter valid hours for hourly rentals');
          setLoading(false);
          return;
        }
        
        if (invoiceData.billingType === 'daily' && crane.days <= 0) {
          setError('Please enter valid days for daily rentals');
          setLoading(false);
          return;
        }
      }

      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Invoice ${result.invoiceNumber} created successfully! Total: ${formatCurrency(result.totalAmount)}`);
        
        // Reset form after successful creation
        setTimeout(() => {
          router.push('/invoices');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, vatAmount, total } = calculateTotal();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Generate Crane Rental Invoice
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Create invoices for crane rentals with hourly/daily rates
                </p>
              </div>
              <Link
                href="/invoices"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← Back to Invoices
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-green-400">✅</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">{success}</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Customer *
                    </label>
                    <select
                      value={invoiceData.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Choose a customer</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.companyName || customer.name} - {customer.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={invoiceData.customerName}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      value={invoiceData.customerEmail}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, customerEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Phone
                    </label>
                    <input
                      type="tel"
                      value={invoiceData.customerPhone}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      readOnly
                    />
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
                      value={invoiceData.projectName}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, projectName: e.target.value }))}
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
                      value={invoiceData.projectLocation}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, projectLocation: e.target.value }))}
                      placeholder="e.g., Dubai Marina"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={invoiceData.startDate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, startDate: e.target.value }))}
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
                      value={invoiceData.endDate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Rental Type */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rental Type *
                    </label>
                    <select
                      value={invoiceData.rentalType}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, rentalType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="daily">Daily Rate</option>
                      <option value="hourly">Hourly Rate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <select
                      value={invoiceData.paymentTerms}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Net 30">Net 30</option>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 7">Net 7</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={invoiceData.dueDate}
                      onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Crane Rentals */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Crane Rentals</h3>
                  <button
                    type="button"
                    onClick={addCraneRental}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    ➕ Add Crane
                  </button>
                </div>

                {invoiceData.craneDetails.map((craneRental, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-md font-medium text-gray-900">Crane #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeCraneRental(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        🗑️ Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                          <option value="">Choose crane</option>
                          {cranes.map(crane => (
                            <option key={crane._id} value={crane._id}>
                              {crane.name} - {crane.capacity} - {crane.location}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {invoiceData.billingType === 'hourly' ? 'Hours' : 'Days'} *
                        </label>
                        <input
                          type="number"
                          value={invoiceData.billingType === 'hourly' ? craneRental.hours : craneRental.days}
                          onChange={(e) => {
                            const field = invoiceData.billingType === 'hourly' ? 'hours' : 'days';
                            updateCraneRental(index, field, parseFloat(e.target.value) || 0);
                          }}
                          min="0"
                          step="0.5"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rate
                        </label>
                        <input
                          type="text"
                          value={craneRental.craneId ? 
                            (invoiceData.billingType === 'hourly' ? 
                              `${formatCurrency(cranes.find(c => c._id === craneRental.craneId)?.dailyRate / 8 || 0)}/hr` :
                              `${formatCurrency(cranes.find(c => c._id === craneRental.craneId)?.dailyRate || 0)}/day`
                            ) : 'N/A'
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Cost
                        </label>
                        <input
                          type="text"
                          value={formatCurrency(craneRental.craneCost)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 font-medium"
                          readOnly
                        />
                      </div>
                    </div>

                    {craneRental.craneId && (
                      <div className="mt-3 text-sm text-gray-600">
                        <span className="font-medium">Selected:</span> {craneRental.craneName} ({craneRental.craneCode}) - {craneRental.craneType}
                      </div>
                    )}
                  </div>
                ))}

                {invoiceData.craneDetails.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🚁</div>
                    <p>No cranes added yet. Click "Add Crane" to get started.</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional information about the rental..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Cost Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT (5%):</span>
                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-semibold text-gray-900">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Link
                  href="/invoices"
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Invoice...' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
