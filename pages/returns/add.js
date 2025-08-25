import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SearchBar from '../../components/SearchBar';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function AddReturn() {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);
  const [searchMode, setSearchMode] = useState('invoice'); // 'invoice' or 'product'
  const [formData, setFormData] = useState({
    quantity: '',
    reason: '',
    refundMethod: 'cash',
    refundAmount: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchInvoices();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
        setFilteredProducts(data);
      } else {
        setError('Failed to fetch products');
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
        // Filter out invoices that are already fully returned
        const activeInvoices = data.filter(invoice => 
          invoice.status !== 'fully_returned' && 
          !(invoice.totalReturnQuantity && invoice.totalReturnQuantity >= invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0))
        );
        setInvoices(activeInvoices);
        setFilteredInvoices(activeInvoices);
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

  const handleProductSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const handleInvoiceSelect = (invoice) => {
    setSelectedInvoice(invoice);
    setSelectedProduct(null);
    setSelectedInvoiceItems([]);
    setFormData(prev => ({ 
      ...prev, 
      quantity: '',
      reason: '',
      refundMethod: 'cash',
      refundAmount: '',
      notes: ''
    }));
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
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
    // Check if this item can still be returned
    const alreadyReturned = selectedInvoiceItems.reduce((sum, selected) => {
      if (selected.medicineId === item.medicineId) {
        return sum + selected.returnQuantity;
      }
      return sum;
    }, 0);
    
    const remainingQuantity = (item.quantity || 0) - alreadyReturned;
    
    if (remainingQuantity <= 0) {
      alert(`Cannot return more items. ${item.name} has already been fully returned from this invoice.`);
      return;
    }
    
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
    
    if (!selectedProduct && !selectedInvoice) {
      setError('Please select either a product or an invoice');
      return;
    }

    if (!formData.reason) {
      setError('Please select a return reason');
      return;
    }

    // Handle single product return
    if (selectedProduct) {
      if (!formData.quantity) {
        setError('Please specify quantity to return');
        return;
      }
      const quantity = parseInt(formData.quantity);
      if (quantity <= 0) {
        setError('Quantity must be greater than 0');
        return;
      }
    }

    // Handle invoice-based return
    if (selectedInvoice && selectedInvoiceItems.length === 0) {
      setError('Please select at least one item to return from the invoice');
      return;
    }

    // Validate quantities for invoice items
    if (selectedInvoice) {
      for (const item of selectedInvoiceItems) {
        if (item.returnQuantity <= 0) {
          setError(`Quantity for ${item.name} must be greater than 0`);
          return;
        }
        
        // Check if this item can actually be returned
        const alreadyReturned = selectedInvoiceItems.reduce((sum, selected) => {
          if (selected.medicineId === item.medicineId && selected !== item) {
            return sum + selected.returnQuantity;
          }
          return sum;
        }, 0);
        
        const totalReturning = alreadyReturned + item.returnQuantity;
        if (totalReturning > item.quantity) {
          setError(`Cannot return ${totalReturning} items of ${item.name}. Only ${item.quantity} items were purchased.`);
          return;
        }
      }
    }

    setLoading(true);
    setError('');
    setSuccess(''); // Clear previous success messages
    try {
      let returnRequests = [];

      if (selectedProduct) {
        // Single product return
        returnRequests.push({
          returnNumber: generateReturnNumber(),
          productId: selectedProduct._id,
          productName: selectedProduct.name,
          productCode: selectedProduct.code,
          quantity: parseInt(formData.quantity),
          price: selectedProduct.sellingPrice || 0,
          reason: formData.reason,
          refundMethod: formData.refundMethod,
          refundAmount: formData.refundAmount,
          notes: formData.notes,
          date: new Date().toISOString(),
          createdBy: null
        });
      } else {
        // Invoice-based return
        for (const item of selectedInvoiceItems) {
          returnRequests.push({
            returnNumber: generateReturnNumber(),
            productId: item.medicineId,
            productName: item.name,
            productCode: item.code,
            quantity: item.returnQuantity,
            price: item.price || 0,
            reason: formData.reason,
            refundMethod: formData.refundMethod,
            refundAmount: formData.refundAmount,
            notes: formData.notes,
            date: new Date().toISOString(),
            invoiceId: selectedInvoice._id,
            invoiceNumber: selectedInvoice.invoiceNumber,
            customerName: selectedInvoice.customerName || 'Walk-in Customer',
            customerPhone: selectedInvoice.customerPhone || '',
            createdBy: null
          });
        }
      }

      // Submit all return requests
      const promises = returnRequests.map(returnData => 
        apiRequest('/api/returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(returnData)
        })
      );

      const results = await Promise.all(promises);
      const successful = results.filter(res => res.ok);
      const failed = results.filter(res => !res.ok);

      if (successful.length > 0) {
        // Show success message
        const successMessage = successful.length === 1 
          ? 'Return processed successfully!' 
          : `${successful.length} returns processed successfully!`;
        
        setSuccess(successMessage);
        // Removed alert to avoid popup interruptions
        
        // Reset form
        setSelectedProduct(null);
        setSelectedInvoice(null);
        setSelectedInvoiceItems([]);
        setFormData({
          quantity: '',
          reason: '',
          refundMethod: 'cash',
          refundAmount: '',
          notes: ''
        });
        
        // Refresh data
        fetchInvoices();
        fetchProducts();
      }

      if (failed.length > 0) {
        // Show detailed error messages in a user-friendly format
        let errorDetails = [];
        for (let i = 0; i < failed.length; i++) {
          try {
            const errorData = await failed[i].json();
            const itemName = returnRequests[i].productName;
            errorDetails.push(`${itemName}: ${errorData.error}`);
          } catch {
            errorDetails.push(`Return ${i + 1}: Failed to process`);
          }
        }
        
        const errorMessage = `Some returns failed:\n\n${errorDetails.join('\n')}`;
        setError(errorMessage);
        // Removed alert to avoid double messaging
      }
    } catch (error) {
      setError('Failed to submit return: ' + error.message);
      // Removed alert to avoid double messaging
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
            Process customer product returns
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
            <div className="text-red-800 font-medium mb-2">❌ Return Processing Error</div>
            <div className="text-sm text-red-700 whitespace-pre-line mb-3">{error}</div>
            
            {/* Helpful suggestions based on error type */}
            {error.includes('already been fully returned') && (
              <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                💡 <strong>What happened?</strong> This item has already been completely returned from this invoice.<br/>
                💡 <strong>What can you do?</strong> Select different items or a different invoice for returns.
              </div>
            )}
            
            {error.includes('Cannot return more than') && (
              <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                💡 <strong>What happened?</strong> You're trying to return more items than were purchased.<br/>
                💡 <strong>What can you do?</strong> Reduce the return quantity or check the original purchase quantity.
              </div>
            )}
            
            {error.includes('Product not found') && (
              <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                💡 <strong>What happened?</strong> The selected product could not be found in the system.<br/>
                💡 <strong>What can you do?</strong> Try refreshing the page or select a different product.
              </div>
            )}
            
            <div className="text-xs text-red-600 mt-2">
              💡 <strong>Need help?</strong> Check that all selected items are valid and have sufficient quantities for return.
            </div>
            
            {/* Clear error button */}
            <button
              onClick={() => setError('')}
              className="mt-3 px-3 py-1 text-xs bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200"
            >
              Clear Error
            </button>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <div className="text-green-800 font-medium mb-2">✅ Return Processing Success</div>
            <div className="text-sm text-green-700 whitespace-pre-line mb-3">{success}</div>
            <button
              onClick={() => setSuccess('')}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        )}

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
              onClick={() => setSearchMode('product')}
              className={`px-4 py-2 rounded-lg font-medium ${
                searchMode === 'product'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Search by Product
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Section */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {searchMode === 'invoice' ? 'Search Invoices' : 'Select Product'}
            </h3>
            
            {/* Info message about filtering */}
            {searchMode === 'invoice' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <div className="font-medium">ℹ️ Invoice Selection</div>
                <div className="text-xs mt-1">
                  • Fully returned invoices are automatically hidden
                  • Partially returned invoices show remaining returnable quantities
                  • Only active invoices with returnable items are displayed
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <SearchBar 
                onSearch={searchMode === 'invoice' ? handleInvoiceSearch : handleProductSearch} 
                placeholder={searchMode === 'invoice' ? "Search invoices by number or product..." : "Search products..."} 
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
                      <div className="font-medium text-gray-900">#{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-500">
                        Date: {new Date(invoice.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Items: {invoice.items.length} | Total: {formatCurrency(invoice.total)}
                      </div>
                      
                      {/* Show return status and remaining quantities */}
                      {invoice.totalReturnQuantity > 0 && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                          <div className="text-orange-800 font-medium">
                            {invoice.status === 'fully_returned' ? '🔄 Fully Returned' : '⚠️ Partially Returned'}
                          </div>
                          <div className="text-orange-600">
                            {invoice.totalReturnQuantity} items returned
                            {invoice.status !== 'fully_returned' && (
                              <span className="ml-2">
                                • {invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0) - invoice.totalReturnQuantity} items remaining
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show product names */}
                      <div className="mt-1 text-xs text-gray-400">
                        {invoice.items.map(item => item.name).join(', ')}
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Product Search Results
                filteredProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No products available</p>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedProduct?._id === product._id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        Code: {product.code} | Stock: {product.quantity} | Price: {formatCurrency(product.sellingPrice)}
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
                  Total Items: {selectedInvoice.items.length} | Total: {formatCurrency(selectedInvoice.total)}
                </div>
              </div>
            ) : selectedProduct ? (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-medium text-blue-900">Selected Product:</div>
                <div className="text-sm text-blue-700">
                  {selectedProduct.name} ({selectedProduct.code})
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-700">Please select an invoice or product first</div>
              </div>
            )}

            {/* Invoice Items Selection */}
            {selectedInvoice && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Items to Return:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedInvoice.items.map((item) => {
                    // Calculate how many items can still be returned
                    const alreadyReturned = selectedInvoiceItems.reduce((sum, selected) => {
                      if (selected.medicineId === item.medicineId) {
                        return sum + selected.returnQuantity;
                      }
                      return sum;
                    }, 0);
                    
                    const returnableQuantity = (item.quantity || 0) - alreadyReturned;
                    const isFullyReturned = returnableQuantity <= 0;
                    
                    return (
                      <div
                        key={item.medicineId}
                        className={`p-3 border rounded-lg cursor-pointer ${
                          isFullyReturned 
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50' 
                            : selectedInvoiceItems.find(selected => selected.medicineId === item.medicineId)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => !isFullyReturned && handleInvoiceItemSelect(item)}
                      >
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          Code: {item.code} | Purchased: {item.quantity} | Price: {formatCurrency(item.price)}
                        </div>
                        
                        {/* Show return status */}
                        {alreadyReturned > 0 && (
                          <div className="mt-1 text-xs text-orange-600">
                            {alreadyReturned} items already returned
                          </div>
                        )}
                        
                        {!isFullyReturned && (
                          <div className="mt-2 flex items-center justify-between">
                            <input
                              type="checkbox"
                              checked={!!selectedInvoiceItems.find(selected => selected.medicineId === item.medicineId)}
                              onChange={() => handleInvoiceItemSelect(item)}
                              className="mr-2"
                            />
                            <span className="text-xs text-gray-500">
                              {returnableQuantity} items can be returned
                            </span>
                          </div>
                        )}
                        
                        {isFullyReturned && (
                          <div className="mt-2 text-xs text-gray-500 font-medium">
                            🔄 Fully Returned
                          </div>
                        )}
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

              {selectedProduct && (
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
                    max={selectedProduct?.quantity || 1}
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
                  <option value="Wrong Product">Wrong Product</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Not as Described">Not as Described</option>
                  <option value="Size/Color Mismatch">Size/Color Mismatch</option>
                  <option value="Customer Changed Mind">Customer Changed Mind</option>
                  <option value="Duplicate Order">Duplicate Order</option>
                  <option value="Shipping Damage">Shipping Damage</option>
                  <option value="Manufacturing Defect">Manufacturing Defect</option>
                  <option value="Not Needed">Not Needed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="refundMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Refund Method
                </label>
                <select
                  id="refundMethod"
                  name="refundMethod"
                  value={formData.refundMethod}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="cash">Cash Refund</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="credit">Credit Note</option>
                </select>
              </div>

              {formData.refundMethod === 'cash' && (
                <div>
                  <label htmlFor="refundAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount (if applicable)
                  </label>
                  <input
                    type="number"
                    id="refundAmount"
                    name="refundAmount"
                    value={formData.refundAmount}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter refund amount"
                  />
                </div>
              )}

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
                  ❌ Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || (!selectedProduct && !selectedInvoice)}
                >
                  {loading ? '⏳ Submitting...' : '↩️ Submit Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
} 