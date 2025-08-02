import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SearchBar from '../../components/SearchBar';
import { apiRequest } from '../../lib/auth';

export default function AddReturn() {
  const [medicines, setMedicines] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [searchMode, setSearchMode] = useState('invoice'); // 'invoice' or 'medicine'
  const [formData, setFormData] = useState({
    quantity: '',
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMedicines();
    fetchInvoices();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await apiRequest('/api/medicines');
      if (response.ok) {
        const data = await response.json();
        setMedicines(data);
        setFilteredMedicines(data);
      } else {
        setError('Failed to fetch medicines');
      }
    } catch (error) {
      setError('Error connecting to database');
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await apiRequest('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
        setFilteredInvoices(data);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (error) {
      setError('Error connecting to database');
    }
  };

  const handleInvoiceSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredInvoices(invoices);
      return;
    }

    const filtered = invoices.filter(invoice =>
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.items.some(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredInvoices(filtered);
  };

  const handleMedicineSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredMedicines(medicines);
      return;
    }

    const filtered = medicines.filter(medicine =>
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMedicines(filtered);
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setSelectedMedicine(null);
    setSelectedInvoiceItems([]);
    setFormData(prev => ({ 
      ...prev, 
      quantity: '',
      reason: '',
      notes: ''
    }));
  };

  const handleMedicineSelect = (medicine) => {
    setSelectedMedicine(medicine);
    setSelectedInvoice(null);
    setSelectedInvoiceItems([]);
    setFormData(prev => ({ ...prev, quantity: '' }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInvoiceItemSelect = (item) => {
    const existingItem = selectedInvoiceItems.find(selected => selected.medicineId === item.medicineId);
    if (existingItem) {
      setSelectedInvoiceItems(prev => prev.filter(selected => selected.medicineId !== item.medicineId));
    } else {
      setSelectedInvoiceItems(prev => [...prev, { ...item, returnQuantity: 1 }]);
    }
  };

  const handleInvoiceItemQuantityChange = (medicineId, quantity) => {
    setSelectedInvoiceItems(prev => 
      prev.map(item => 
        item.medicineId === medicineId 
          ? { ...item, returnQuantity: parseInt(quantity) || 0 }
          : item
      )
    );
  };

  const removeInvoiceItem = (medicineId) => {
    setSelectedInvoiceItems(prev => prev.filter(item => item.medicineId !== medicineId));
  };

  const generateReturnNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `RET${timestamp}${random}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMedicine && !selectedInvoice) {
      alert('Please select either a medicine or an invoice');
      return;
    }

    if (!formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    // Handle single medicine return
    if (selectedMedicine) {
      if (!formData.quantity) {
        alert('Please specify quantity to return');
        return;
      }
      const quantity = parseInt(formData.quantity);
      if (quantity <= 0) {
        alert('Quantity must be greater than 0');
        return;
      }
    }

    // Handle invoice-based return
    if (selectedInvoice && selectedInvoiceItems.length === 0) {
      alert('Please select at least one item to return from the invoice');
      return;
    }

    // Validate quantities for invoice items
    if (selectedInvoice) {
      for (const item of selectedInvoiceItems) {
        if (item.returnQuantity <= 0) {
          alert(`Quantity for ${item.name} must be greater than 0`);
          return;
        }
        if (item.returnQuantity > item.quantity) {
          alert(`Cannot return more than ${item.quantity} items of ${item.name}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      let returnRequests = [];

      if (selectedMedicine) {
        // Single medicine return
        returnRequests.push({
          returnNumber: generateReturnNumber(),
          medicineId: selectedMedicine._id,
          medicineName: selectedMedicine.name,
          medicineCode: selectedMedicine.code,
          quantity: parseInt(formData.quantity),
          reason: formData.reason,
          notes: formData.notes,
          date: new Date().toISOString(),
          status: 'Approved',
          invoiceNumber: null,
          invoiceId: null
        });
      } else {
        // Multiple items from invoice
        for (const item of selectedInvoiceItems) {
          returnRequests.push({
            returnNumber: generateReturnNumber(),
            medicineId: item.medicineId,
            medicineName: item.name,
            medicineCode: item.code,
            quantity: item.returnQuantity,
            reason: formData.reason,
            notes: formData.notes,
            date: new Date().toISOString(),
            status: 'Approved',
            invoiceNumber: selectedInvoice.invoiceNumber,
            invoiceId: selectedInvoice._id
          });
        }
      }

      // Submit all return requests
      const promises = returnRequests.map(returnData => 
        apiRequest('/api/returns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(returnData),
        })
      );

      const responses = await Promise.all(promises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        alert(`Return request${returnRequests.length > 1 ? 's' : ''} submitted successfully!`);
        // Reset form
        setSelectedMedicine(null);
        setSelectedInvoice(null);
        setSelectedInvoiceItems([]);
        setFormData({
          quantity: '',
          reason: '',
          notes: ''
        });
      } else {
        alert('Some return requests failed to submit');
      }
    } catch (error) {
      alert('Error submitting return request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Return</h1>
          <p className="mt-1 text-sm text-gray-500">
            Process customer medicine returns
          </p>
        </div>

        {/* Search Mode Toggle */}
        <div className="card">
          <div className="flex space-x-4">
            <button
              onClick={() => setSearchMode('invoice')}
              className={`px-4 py-2 rounded-lg font-medium ${
                searchMode === 'invoice'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Search by Invoice
            </button>
            <button
              onClick={() => setSearchMode('medicine')}
              className={`px-4 py-2 rounded-lg font-medium ${
                searchMode === 'medicine'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Search by Medicine
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {searchMode === 'invoice' ? 'Search Invoices' : 'Select Medicine'}
            </h3>
            
            <div className="mb-4">
              <SearchBar 
                onSearch={searchMode === 'invoice' ? handleInvoiceSearch : handleMedicineSearch} 
                placeholder={searchMode === 'invoice' ? "Search invoices by number or medicine..." : "Search medicines..."} 
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchMode === 'invoice' ? (
                // Invoice Search Results
                filteredInvoices.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No invoices found</p>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedInvoice?._id === invoice._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleInvoiceSelect(invoice)}
                    >
                      <div className="font-medium text-gray-900">Invoice #{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-500">
                        Date: {new Date(invoice.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Items: {invoice.items.length} | Total: ${invoice.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {invoice.items.map(item => item.name).join(', ')}
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Medicine Search Results
                filteredMedicines.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No medicines available</p>
                ) : (
                  filteredMedicines.map((medicine) => (
                    <div
                      key={medicine._id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedMedicine?._id === medicine._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleMedicineSelect(medicine)}
                    >
                      <div className="font-medium text-gray-900">{medicine.name}</div>
                      <div className="text-sm text-gray-500">
                        Code: {medicine.code} | Stock: {medicine.quantity} | Price: ${medicine.sellingPrice}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </div>

          {/* Return Form */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Return Details</h3>
            
            {selectedInvoice ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-900">Selected Invoice:</div>
                <div className="text-sm text-blue-700">
                  #{selectedInvoice.invoiceNumber} - {new Date(selectedInvoice.date).toLocaleDateString()}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Total Items: {selectedInvoice.items.length} | Total: ${selectedInvoice.total.toFixed(2)}
                </div>
              </div>
            ) : selectedMedicine ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-900">Selected Medicine:</div>
                <div className="text-sm text-blue-700">
                  {selectedMedicine.name} ({selectedMedicine.code})
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-700">Please select an invoice or medicine first</div>
              </div>
            )}

            {/* Invoice Items Selection */}
            {selectedInvoice && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Items to Return:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedInvoice.items.map((item) => {
                    const isSelected = selectedInvoiceItems.find(selected => selected.medicineId === item.medicineId);
                    return (
                      <div
                        key={item.medicineId}
                        className={`p-3 border rounded-lg ${
                          isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              Code: {item.code} | Purchased: {item.quantity} | Price: ${item.price}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => handleInvoiceItemSelect(item)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            {isSelected && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={item.quantity}
                                  value={isSelected.returnQuantity || 1}
                                  onChange={(e) => handleInvoiceItemQuantityChange(item.medicineId, e.target.value)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                  placeholder="Qty"
                                />
                                <span className="text-xs text-gray-500">/ {item.quantity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Items Summary */}
            {selectedInvoiceItems.length > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-900 mb-2">Selected Items:</div>
                <div className="space-y-1">
                  {selectedInvoiceItems.map((item) => (
                    <div key={item.medicineId} className="flex items-center justify-between text-sm">
                      <span className="text-green-700">{item.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">{item.returnQuantity} / {item.quantity}</span>
                        <button
                          onClick={() => removeInvoiceItem(item.medicineId)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {selectedMedicine && (
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Return Quantity *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    max={selectedMedicine?.quantity || 1}
                    className="input-field"
                    placeholder="Enter quantity to return"
                  />
                </div>
              )}

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Return Reason *
                </label>
                <select
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                >
                  <option value="">Select a reason</option>
                  <option value="Expired">Expired</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Wrong Medicine">Wrong Medicine</option>
                  <option value="Allergic Reaction">Allergic Reaction</option>
                  <option value="Side Effects">Side Effects</option>
                  <option value="Not Needed">Not Needed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="input-field"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || (!selectedMedicine && !selectedInvoice)}
                >
                  {loading ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 