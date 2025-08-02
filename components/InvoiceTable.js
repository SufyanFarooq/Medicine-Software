import { useState, useEffect } from 'react';

export default function InvoiceTable({ medicines, onInvoiceGenerated }) {
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

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

  const addMedicineToInvoice = (medicine) => {
    const existing = selectedMedicines.find(item => item._id === medicine._id);
    
    if (existing) {
      setSelectedMedicines(prev =>
        prev.map(item =>
          item._id === medicine._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedMedicines(prev => [...prev, { ...medicine, quantity: 1 }]);
    }
  };

  const updateQuantity = (medicineId, quantity) => {
    if (quantity <= 0) {
      setSelectedMedicines(prev => prev.filter(item => item._id !== medicineId));
    } else {
      setSelectedMedicines(prev =>
        prev.map(item =>
          item._id === medicineId ? { ...item, quantity: parseInt(quantity) } : item
        )
      );
    }
  };

  const removeMedicine = (medicineId) => {
    setSelectedMedicines(prev => prev.filter(item => item._id !== medicineId));
  };

  const calculateSubtotal = () => {
    return selectedMedicines.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
  };

  const [settings, setSettings] = useState({ discountPercentage: 3 });

  useEffect(() => {
    // Fetch settings for discount percentage
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return subtotal * (settings.discountPercentage / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const handleGenerateInvoice = async () => {
    if (selectedMedicines.length === 0) {
      alert('Please select at least one medicine');
      return;
    }

    setLoading(true);
    try {
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
        discount: calculateDiscount(),
        total: calculateTotal(),
        date: new Date().toISOString(),
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        // Update medicine quantities
        for (const item of selectedMedicines) {
          const originalMedicine = medicines.find(m => m._id === item._id);
          const newQuantity = originalMedicine.quantity - item.quantity;
          
          await fetch(`/api/medicines/${item._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
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

        onInvoiceGenerated(invoiceData);
        setSelectedMedicines([]);
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
                  <td>$${item.sellingPrice}</td>
                  <td>$${(item.sellingPrice * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Subtotal: $${calculateSubtotal().toFixed(2)}</p>
            <p>Discount (3%): -$${calculateDiscount().toFixed(2)}</p>
            <p>Total: $${calculateTotal().toFixed(2)}</p>
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
      {/* Invoice Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Generate Invoice</h2>
            <p className="text-sm text-gray-500">Invoice #: {invoiceNumber}</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field max-w-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Medicines */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Medicines</h3>
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
                      Code: {medicine.code} | Stock: {medicine.quantity} | Price: ${medicine.sellingPrice}
                    </div>
                  </div>
                  <button
                    onClick={() => addMedicineToInvoice(medicine)}
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
            <div className="space-y-4">
              {selectedMedicines.map((item) => (
                <div key={item._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">Code: {item.code}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item._id, e.target.value)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-sm text-gray-500">× ${item.sellingPrice}</span>
                    <span className="font-medium">${(item.sellingPrice * item.quantity).toFixed(2)}</span>
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
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount (3%):</span>
                  <span>-${calculateDiscount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading || selectedMedicines.length === 0}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Generating...' : 'Generate Invoice'}
                </button>
                <button
                  onClick={handlePrint}
                  disabled={selectedMedicines.length === 0}
                  className="btn-secondary"
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