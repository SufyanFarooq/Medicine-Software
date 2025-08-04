import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';

export default function InvoiceTable({ medicines, settings = { discountPercentage: 3 }, onInvoiceGenerated }) {
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [returnNotifications, setReturnNotifications] = useState([]);
  const [originalQuantities, setOriginalQuantities] = useState({});
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);

  useEffect(() => {
    setFilteredMedicines(medicines);
    generateInvoiceNumber();
  }, [medicines]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        medicine.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMedicines(filtered);
    } else {
      setFilteredMedicines(medicines);
    }
  }, [searchTerm, medicines]);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    setInvoiceNumber(`INV${timestamp}${random}`);
  };

  const saveCurrentInvoiceToQueue = () => {
    if (selectedMedicines.length === 0) {
      alert('No items to save in queue');
      return;
    }

    const invoiceId = currentInvoiceId || `pending_${Date.now()}`;
    const pendingInvoice = {
      id: invoiceId,
      invoiceNumber,
      items: [...selectedMedicines],
      originalQuantities: { ...originalQuantities },
      timestamp: Date.now(),
      customerName: `Customer ${pendingInvoices.length + 1}`
    };

    setPendingInvoices(prev => [...prev, pendingInvoice]);
    
    // Clear current invoice
    setSelectedMedicines([]);
    setOriginalQuantities({});
    setCurrentInvoiceId(null);
    generateInvoiceNumber();

    // Show notification
    const notification = {
      id: Date.now(),
      message: `Invoice saved to queue: ${pendingInvoice.customerName}`,
      type: 'info'
    };
    setReturnNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  const loadInvoiceFromQueue = (invoiceId) => {
    const pendingInvoice = pendingInvoices.find(inv => inv.id === invoiceId);
    if (!pendingInvoice) return;

    // Save current invoice if any
    if (selectedMedicines.length > 0) {
      saveCurrentInvoiceToQueue();
    }

    // Load the selected invoice
    setSelectedMedicines([...pendingInvoice.items]);
    setOriginalQuantities({ ...pendingInvoice.originalQuantities });
    setCurrentInvoiceId(pendingInvoice.id);
    setInvoiceNumber(pendingInvoice.invoiceNumber);

    // Remove from pending list
    setPendingInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    // Show notification
    const notification = {
      id: Date.now(),
      message: `Loaded invoice: ${pendingInvoice.customerName}`,
      type: 'success'
    };
    setReturnNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  const deletePendingInvoice = (invoiceId) => {
    const pendingInvoice = pendingInvoices.find(inv => inv.id === invoiceId);
    if (!pendingInvoice) return;

    setPendingInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    // Show notification
    const notification = {
      id: Date.now(),
      message: `Deleted pending invoice: ${pendingInvoice.customerName}`,
      type: 'warning'
    };
    setReturnNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 3000);
  };

  const addMedicine = (medicine) => {
    const existingItem = selectedMedicines.find(item => item._id === medicine._id);
    
    if (existingItem) {
      // If medicine already exists, increase quantity
      setSelectedMedicines(prev =>
        prev.map(item =>
          item._id === medicine._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Add new medicine with quantity 1
      setSelectedMedicines(prev => [...prev, { ...medicine, quantity: 1 }]);
      // Track original quantity when first added
      setOriginalQuantities(prev => ({
        ...prev,
        [medicine._id]: 1
      }));
    }
  };

  const updateQuantity = (medicineId, quantity) => {
    const currentItem = selectedMedicines.find(item => item._id === medicineId);
    const originalMedicine = medicines.find(m => m._id === medicineId);
    
    if (!currentItem || !originalMedicine) return;
    
    const newQuantity = parseInt(quantity) || 0;
    
    // Always update quantity, even if negative
    setSelectedMedicines(prev =>
      prev.map(item =>
        item._id === medicineId ? { ...item, quantity: newQuantity } : item
      )
    );
    
    // Update original quantities tracking
    setOriginalQuantities(prev => ({
      ...prev,
      [medicineId]: newQuantity
    }));
  };

  const handleReturn = async (medicine, returnQuantity) => {
    try {
      // Calculate return value with discount
      const returnValue = medicine.sellingPrice * returnQuantity * (1 - (settings.discountPercentage / 100));
      
      // Create return record
      const returnData = {
        returnNumber: generateReturnNumber(),
        medicineId: medicine._id,
        medicineName: medicine.name,
        medicineCode: medicine.code,
        quantity: returnQuantity,
        reason: 'Quantity Adjustment',
        notes: `Quantity reduced during invoice generation`,
        returnValue: returnValue,
        date: new Date().toISOString(),
        status: 'Approved',
        invoiceNumber: null,
        invoiceId: null
      };

      // Submit return
      const response = await apiRequest('/api/returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData),
      });

      if (response.ok) {
        // Add notification
        const notification = {
          id: Date.now(),
          message: `Return created: ${returnQuantity} units of ${medicine.name} (${formatCurrency(returnValue)})`,
          type: 'success'
        };
        setReturnNotifications(prev => [...prev, notification]);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 3000);
        
        console.log(`Return created for ${returnQuantity} units of ${medicine.name}`);
      } else {
        console.error('Failed to create return');
      }
    } catch (error) {
      console.error('Error creating return:', error);
    }
  };

  const generateReturnNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `RET${timestamp}${random}`;
  };

  const removeMedicine = (medicineId) => {
    setSelectedMedicines(prev => prev.filter(item => item._id !== medicineId));
    setOriginalQuantities(prev => {
      const newState = { ...prev };
      delete newState[medicineId];
      return newState;
    });
  };

  const calculateSubtotal = () => {
    return selectedMedicines.reduce((total, item) => {
      return total + (item.sellingPrice * item.quantity);
    }, 0);
  };

  const calculateTotalDiscount = () => {
    const subtotal = calculateSubtotal();
    const adminDiscount = subtotal * (settings.discountPercentage / 100);
    return adminDiscount;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateTotalDiscount();
    return subtotal - discount;
  };

  const handleGenerateInvoice = async () => {
    if (selectedMedicines.length === 0) {
      alert('Please select at least one medicine');
      return;
    }

    setLoading(true);
    try {
      // Calculate returns for negative quantities
      const returnsToProcess = [];
      
      for (const item of selectedMedicines) {
        const originalMedicine = medicines.find(m => m._id === item._id);
        if (originalMedicine) {
          // If quantity is negative, create return for the absolute value
          if (item.quantity < 0) {
            const returnQuantity = Math.abs(item.quantity); // Convert negative to positive
            const returnValue = originalMedicine.sellingPrice * returnQuantity * (1 - (settings.discountPercentage / 100));
            
            returnsToProcess.push({
              medicine: originalMedicine,
              returnQuantity,
              returnValue
            });
          }
        }
      }

      const invoiceData = {
        invoiceNumber,
        items: selectedMedicines.map(item => ({
          medicineId: item._id,
          name: item.name,
          code: item.code,
          quantity: item.quantity,
          price: item.sellingPrice,
          total: item.sellingPrice * item.quantity,
        })),
        subtotal: calculateSubtotal(),
        discount: calculateTotalDiscount(),
        total: calculateTotal(),
        date: new Date().toISOString(),
      };

      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        // Process returns for negative quantities
        for (const returnData of returnsToProcess) {
          try {
            const returnRecord = {
              returnNumber: generateReturnNumber(),
              medicineId: returnData.medicine._id,
              medicineName: returnData.medicine.name,
              medicineCode: returnData.medicine.code,
              quantity: returnData.returnQuantity,
              reason: 'Negative Quantity Adjustment',
              notes: `Negative quantity during invoice generation`,
              returnValue: returnData.returnValue,
              date: new Date().toISOString(),
              status: 'Approved',
              invoiceNumber: invoiceNumber,
              invoiceId: null
            };

            const returnResponse = await apiRequest('/api/returns', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(returnRecord),
            });

            if (returnResponse.ok) {
              // Add notification
              const notification = {
                id: Date.now() + Math.random(),
                message: `Return created: ${returnData.returnQuantity} units of ${returnData.medicine.name} (${formatCurrency(returnData.returnValue)})`,
                type: 'success'
              };
              setReturnNotifications(prev => [...prev, notification]);
              
              // Remove notification after 3 seconds
              setTimeout(() => {
                setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
              }, 3000);
            }
          } catch (error) {
            console.error('Error creating return:', error);
          }
        }
        
        // Update medicine quantities
        for (const item of selectedMedicines) {
          const originalMedicine = medicines.find(m => m._id === item._id);
          if (originalMedicine) {
            let newQuantity;
            
            if (item.quantity < 0) {
              // For negative quantities, add the absolute value back to stock
              newQuantity = originalMedicine.quantity + Math.abs(item.quantity);
            } else {
              // For positive quantities, subtract from stock
              newQuantity = originalMedicine.quantity - item.quantity;
            }
            
            await apiRequest(`/api/medicines/${item._id}`, {
              method: 'PUT',
              body: JSON.stringify({
                name: originalMedicine.name,
                code: originalMedicine.code,
                quantity: newQuantity,
                purchasePrice: originalMedicine.purchasePrice,
                sellingPrice: originalMedicine.sellingPrice,
                expiryDate: originalMedicine.expiryDate,
                batchNo: originalMedicine.batchNo,
              }),
            });
          }
        }

        onInvoiceGenerated(invoiceData);
        setSelectedMedicines([]);
        setOriginalQuantities({});
        generateInvoiceNumber();
      } else {
        alert('Failed to generate invoice');
      }
    } catch (error) {
      alert('Error generating invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (selectedMedicines.length === 0) {
      alert('Please select medicines before printing');
      return;
    }

    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical Shop Invoice</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Medical Shop</h1>
            <p>Invoice</p>
          </div>
          
          <div class="invoice-info">
            <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${selectedMedicines.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.sellingPrice)}</td>
                  <td>${formatCurrency(item.sellingPrice * item.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Subtotal: ${formatCurrency(calculateSubtotal())}</p>
            <p>Admin Discount (${settings.discountPercentage || 0}%): -${formatCurrency(calculateTotalDiscount())}</p>
            <p>Total: ${formatCurrency(calculateTotal())}</p>
          </div>

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please keep this invoice for your records.</p>
          </div>
        </body>
      </html>
    `;

    // Open print window with modern approach
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }
  };

  return (
    <div className="space-y-6">
      {/* Return Notifications */}
      {returnNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {returnNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : notification.type === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {notification.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : notification.type === 'warning' ? (
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Header */}
      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Generate Invoice</h2>
            <p className="text-gray-600">Invoice #: {invoiceNumber}</p>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Queue Invoices Section */}
      {pendingInvoices.length > 0 && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Pending Invoices ({pendingInvoices.length})</h3>
            <button
              onClick={saveCurrentInvoiceToQueue}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Save Current to Queue
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvoices.map((invoice) => (
              <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{invoice.customerName}</h4>
                    <p className="text-sm text-gray-500">#{invoice.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(invoice.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(invoice.items.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0))}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadInvoiceFromQueue(invoice.id)}
                    className="flex-1 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => deletePendingInvoice(invoice.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Medicines */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Medicines</h3>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search medicines by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMedicines.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No medicines available</p>
            ) : (
              filteredMedicines.map((medicine) => (
                <div
                  key={medicine._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{medicine.name}</div>
                    <div className="text-sm text-gray-500">
                      Code: {medicine.code} | Stock: {medicine.quantity} | Price: {formatCurrency(medicine.sellingPrice)}
                    </div>
                  </div>
                  <button
                    onClick={() => addMedicine(medicine)}
                    disabled={medicine.quantity <= 0}
                    className="btn-primary text-sm px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Medicines */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h3>
          {selectedMedicines.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No medicines selected</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedMedicines.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-500">Code: {item.code}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="-999"
                        max="999"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item._id, e.target.value)}
                        className={`w-16 px-2 py-1 border border-gray-300 rounded text-center ${
                          item.quantity < 0 ? 'bg-red-50 border-red-300 text-red-700' : ''
                        }`}
                      />
                    </div>
                    <span className="text-sm text-gray-500">× {formatCurrency(item.sellingPrice)}</span>
                    <span className={`font-medium ${item.quantity < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(item.sellingPrice * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeMedicine(item._id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {/* Invoice Summary */}
              <div className="border-t pt-4 space-y-2 sticky bottom-0 bg-white">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin Discount ({settings.discountPercentage}%):</span>
                  <span>-{formatCurrency(calculateTotalDiscount())}</span>
                </div>
                {/* {pendingReturns.length > 0 && ( // No longer needed
                  <div className="flex justify-between text-green-600">
                    <span>Pending Returns:</span>
                    <span>-{formatCurrency(pendingReturns.reduce((total, ret) => total + ret.returnValue, 0))}</span>
                  </div>
                )} */}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(calculateTotal())}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading || selectedMedicines.length === 0}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Generating...' : 'Generate Invoice'}
                </button>
                <button
                  onClick={saveCurrentInvoiceToQueue}
                  disabled={selectedMedicines.length === 0}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save to Queue
                </button>
                <button
                  onClick={handlePrint}
                  disabled={selectedMedicines.length === 0}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Print Invoice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
} 