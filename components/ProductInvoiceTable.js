import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';
import { logInvoiceActivity } from '../lib/activity-logger';
import { getUser } from '../lib/auth';

export default function ProductInvoiceTable({ products, settings = { discountPercentage: 3 }, onInvoiceGenerated }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [returnNotifications, setReturnNotifications] = useState([]);
  const [originalQuantities, setOriginalQuantities] = useState({});
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);

  useEffect(() => {
    setFilteredProducts(products);
    generateInvoiceNumber();
  }, [products]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    setInvoiceNumber(`INV${timestamp}${random}`);
  };

  const saveCurrentInvoiceToQueue = () => {
    if (selectedProducts.length === 0) {
      alert('No items to save in queue');
      return;
    }

    const invoiceId = currentInvoiceId || `pending_${Date.now()}`;
    const pendingInvoice = {
      id: invoiceId,
      invoiceNumber,
      items: [...selectedProducts],
      originalQuantities: { ...originalQuantities },
      timestamp: Date.now(),
      customerName: `Customer ${pendingInvoices.length + 1}`
    };

    setPendingInvoices(prev => [...prev, pendingInvoice]);
    
    // Clear current invoice
    setSelectedProducts([]);
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
    if (selectedProducts.length > 0) {
      saveCurrentInvoiceToQueue();
    }

    // Load the selected invoice
    setSelectedProducts([...pendingInvoice.items]);
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

  const addProductToInvoice = (product) => {
    // Check if product already exists in invoice
    const existingIndex = selectedProducts.findIndex(item => item._id === product._id);
    
    if (existingIndex !== -1) {
      // Update quantity if already exists
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      // Add new product to invoice
      const productWithQuantity = {
        ...product,
        quantity: 1,
        sellingPrice: product.sellingPrice || product.purchasePrice || 0
      };
      setSelectedProducts(prev => [...prev, productWithQuantity]);
      
      // Store original quantity for return functionality
      setOriginalQuantities(prev => ({
        ...prev,
        [product._id]: product.quantity
      }));
    }
  };

  const updateProductQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove product if quantity is 0 or negative
      setSelectedProducts(prev => prev.filter(item => item._id !== productId));
      setOriginalQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[productId];
        return newQuantities;
      });
    } else {
      // Update quantity
      setSelectedProducts(prev => 
        prev.map(item => 
          item._id === productId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  const removeProductFromInvoice = (productId) => {
    setSelectedProducts(prev => prev.filter(item => item._id !== productId));
    setOriginalQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[productId];
      return newQuantities;
    });
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, item) => {
      const price = parseFloat(item.sellingPrice) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);

    const discount = (subtotal * (settings.discountPercentage || 0)) / 100;
    const total = subtotal - discount;

    return { subtotal, discount, total };
  };

  const generateInvoice = async () => {
    if (selectedProducts.length === 0) {
      alert('Please add products to the invoice');
      return;
    }

    const { subtotal, discount, total } = calculateTotals();
    
    // Validate quantities
    for (const item of selectedProducts) {
      if (item.quantity > item.quantity) {
        alert(`Insufficient stock for ${item.name}. Available: ${item.quantity}, Requested: ${item.quantity}`);
        return;
      }
    }

    setLoading(true);

    try {
      // Create invoice data
      const invoiceData = {
        invoiceNumber,
        date: new Date().toISOString(),
        items: selectedProducts.map(item => ({
          productId: item._id,
          name: item.name,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          total: item.quantity * item.sellingPrice
        })),
        subtotal,
        discount,
        total,
        type: 'product'
      };

      // Save invoice
      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        throw new Error('Failed to save invoice');
      }

      const savedInvoice = await response.json();

      // Update product quantities
      for (const item of selectedProducts) {
        const newQuantity = item.quantity - item.quantity;
        
        if (newQuantity >= 0) {
          await apiRequest(`/api/products/${item._id}`, {
            method: 'PUT',
            body: JSON.stringify({
              ...item,
              quantity: newQuantity
            })
          });
        }
      }

      // Log activity
      const currentUser = getUser();
      await logInvoiceActivity({
        action: 'invoice_generated',
        invoiceId: savedInvoice._id,
        invoiceNumber,
        total,
        itemsCount: selectedProducts.length,
        userId: currentUser?.id,
        username: currentUser?.username
      });

      // Clear invoice
      setSelectedProducts([]);
      setOriginalQuantities({});
      generateInvoiceNumber();

      // Show success message
      alert('Invoice generated successfully!');

      // Call callback
      if (onInvoiceGenerated) {
        onInvoiceGenerated(savedInvoice);
      }

    } catch (error) {
      console.error('Error generating invoice:', error);
      alert(`Failed to generate invoice: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, discount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={saveCurrentInvoiceToQueue}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          💾 Save to Queue
        </button>
      </div>

      {/* Pending Invoices Queue */}
      {pendingInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Pending Invoices</h3>
          <div className="space-y-2">
            {pendingInvoices.map((invoice) => (
              <div key={invoice.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                <div>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                  <span className="text-sm text-gray-600 ml-2">({invoice.customerName})</span>
                </div>
                <button
                  onClick={() => loadInvoiceFromQueue(invoice.id)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">📦 Available Products</h3>
            <p className="text-sm text-gray-600">Click on a product to add it to the invoice</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No products found
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => addProductToInvoice(product)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        {product.code && (
                          <p className="text-sm text-gray-500">Code: {product.code}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Stock: {product.quantity || 0} {product.unit || 'pcs'}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(product.sellingPrice || product.purchasePrice || 0)}
                        </p>
                        <p className="text-sm text-gray-500">per {product.unit || 'pcs'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invoice */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">🧾 Invoice</h3>
            <p className="text-sm text-gray-600">Invoice #: {invoiceNumber}</p>
          </div>
          
          <div className="p-4">
            {selectedProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl">📋</span>
                <p className="mt-2">No products added to invoice</p>
                <p className="text-sm">Click on products from the left to add them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedProducts.map((item) => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.sellingPrice)} × {item.quantity} = {formatCurrency(item.sellingPrice * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={item.quantity}
                        onChange={(e) => updateProductQuantity(item._id, parseInt(e.target.value))}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      />
                      <button
                        onClick={() => removeProductFromInvoice(item._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ❌
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount ({settings.discountPercentage || 0}%):</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
                
                <button
                  onClick={generateInvoice}
                  disabled={loading || selectedProducts.length === 0}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Generating...' : '💾 Generate Invoice'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {returnNotifications.length > 0 && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {returnNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
