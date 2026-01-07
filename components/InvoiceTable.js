import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';
import { logInvoiceActivity } from '../lib/activity-logger';
import { getUser } from '../lib/auth';

export default function InvoiceTable({ products, settings = { discountPercentage: 3 }, onInvoiceGenerated }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [returnNotifications, setReturnNotifications] = useState([]);
  const [originalQuantities, setOriginalQuantities] = useState({});
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    email: ''
  });

  useEffect(() => {
    setFilteredProducts(products);
    generateInvoiceNumber();
    fetchCustomers();
  }, [products]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase())
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

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        setFilteredCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  useEffect(() => {
    if (customerSearchTerm.trim()) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(customerSearchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    } else {
      // Show all customers when no search term
      setFilteredCustomers(customers);
    }
  }, [customerSearchTerm, customers]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCustomerDropdown && !event.target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCustomerDropdown]);

  const handleCustomerSelect = (customer) => {
    setCustomerName(customer.name);
    setCustomerId(customer._id);
    setCustomerSearchTerm('');
    setShowCustomerDropdown(false);
  };

  const handleCustomerSearch = (value) => {
    setCustomerSearchTerm(value);
    setShowCustomerDropdown(true);
    if (!value.trim()) {
      setCustomerName('');
      setCustomerId(null);
      // Show all customers when search is cleared
      setFilteredCustomers(customers);
    }
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      const response = await apiRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomerData)
      });

      if (response.ok) {
        const newCustomer = await response.json();
        await fetchCustomers();
        setCustomerName(newCustomer.name);
        setCustomerId(newCustomer._id);
        setCustomerSearchTerm('');
        setShowAddCustomerModal(false);
        setNewCustomerData({ name: '', phone: '', address: '', email: '' });
        setShowCustomerDropdown(false);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer');
    }
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

  const addProduct = (product) => {
    const existingItem = selectedProducts.find(item => item._id === product._id);
    
    if (existingItem) {
      // Show notification that product is already added
      const notification = {
        id: Date.now(),
        message: `${product.name} is already in the invoice. Use quantity field to adjust.`,
        type: 'warning'
      };
      setReturnNotifications(prev => [...prev, notification]);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
      
      return; // Don't add duplicate
    } else {
      // Add new product with quantity 1
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
      // Track original quantity when first added
      setOriginalQuantities(prev => ({
        ...prev,
        [product._id]: 1
      }));
      
      // Show success notification
      const notification = {
        id: Date.now(),
        message: `${product.name} added to invoice`,
        type: 'success'
      };
      setReturnNotifications(prev => [...prev, notification]);
      
      // Remove notification after 2 seconds
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 2000);
    }
  };

  const updateQuantity = (productId, quantity) => {
    const currentItem = selectedProducts.find(item => item._id === productId);
    const originalProduct = products.find(m => m._id === productId);
    
    if (!currentItem || !originalProduct) return;
    
    const newQuantity = parseInt(quantity) || 0;
    
    // Check if quantity exceeds available stock
    if (newQuantity > originalProduct.quantity) {
      // Show warning notification
      const notification = {
        id: Date.now(),
        message: `Warning: ${originalProduct.name} quantity (${newQuantity}) exceeds available stock (${originalProduct.quantity})`,
        type: 'warning'
      };
      setReturnNotifications(prev => [...prev, notification]);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
      
      // Don't allow quantity to exceed available stock
      return;
    }
    
    // Update quantity if it's within available stock
    setSelectedProducts(prev =>
      prev.map(item =>
        item._id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
    
    // Update original quantities tracking
    setOriginalQuantities(prev => ({
      ...prev,
      [productId]: newQuantity
    }));
  };

  const updateSellingPrice = (productId, newPrice) => {
    const currentItem = selectedProducts.find(item => item._id === productId);
    const originalProduct = products.find(m => m._id === productId);
    
    if (!currentItem || !originalProduct) return;
    
    // Allow empty input for better UX
    if (newPrice === '' || newPrice === null || newPrice === undefined) {
      setSelectedProducts(prev =>
        prev.map(item =>
          item._id === productId ? { ...item, sellingPrice: '' } : item
        )
      );
      return;
    }
    
    const price = parseFloat(newPrice) || 0;
    const purchasePrice = parseFloat(originalProduct.purchasePrice) || 0;
    
    // Always update the price in state (allow user to type any value)
    setSelectedProducts(prev =>
      prev.map(item =>
        item._id === productId ? { ...item, sellingPrice: price } : item
      )
    );
    
    // Show warning if price is below purchase price, but still allow the input
    if (price < purchasePrice && price > 0) {
      // Show warning notification
      const notification = {
        id: Date.now(),
        message: `Warning: Selling price (${formatCurrency(price)}) is less than purchase price (${formatCurrency(purchasePrice)}) for ${originalProduct.name}. Invoice cannot be generated with this price.`,
        type: 'warning'
      };
      setReturnNotifications(prev => {
        // Remove previous warnings for this product
        const filtered = prev.filter(n => !n.message.includes(originalProduct.name) || n.type !== 'warning');
        return [...filtered, notification];
      });
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  };

  const handleReturn = async (product, returnQuantity) => {
    try {
      // Calculate return value with discount
      const returnValue = product.sellingPrice * returnQuantity * (1 - (settings.discountPercentage / 100));
      
      // Create return record
      const returnData = {
        returnNumber: generateReturnNumber(),
        productId: product._id,
        productName: product.name,
        productCode: product.code,
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
          message: `Return created: ${returnQuantity} units of ${product.name} (${formatCurrency(returnValue)})`,
          type: 'success'
        };
        setReturnNotifications(prev => [...prev, notification]);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 3000);
        
        console.log(`Return created for ${returnQuantity} units of ${product.name}`);
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

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(item => item._id !== productId));
    setOriginalQuantities(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce((total, item) => {
      const price = parseFloat(item.sellingPrice) || 0;
      const qty = parseInt(item.quantity) || 0;
      return total + (price * qty);
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
    if (selectedProducts.length === 0) {
      alert('Please select at least one product');
      return;
    }

    // Validate customer is selected
    if (!customerName || !customerId) {
      alert('Please select or add a customer before generating invoice');
      return;
    }

    // Validate quantities before generating invoice
    for (const item of selectedProducts) {
      const originalProduct = products.find(m => m._id === item._id);
      if (originalProduct && item.quantity > originalProduct.quantity) {
        alert(`Cannot generate invoice: ${originalProduct.name} quantity (${item.quantity}) exceeds available stock (${originalProduct.quantity})`);
        return;
      }
    }

    // Note: Purchase price validation removed - products can be sold below cost

    setLoading(true);
    try {
      // Calculate returns for negative quantities
      const returnsToProcess = [];
      
      for (const item of selectedProducts) {
        const originalProduct = products.find(m => m._id === item._id);
        if (originalProduct) {
          // If quantity is negative, create return for the absolute value
          if (item.quantity < 0) {
            const returnQuantity = Math.abs(item.quantity); // Convert negative to positive
            const returnValue = originalProduct.sellingPrice * returnQuantity * (1 - (settings.discountPercentage / 100));
            
            returnsToProcess.push({
              product: originalProduct,
              returnQuantity,
              returnValue
            });
          }
        }
      }

      const invoiceData = {
        invoiceNumber,
        customerName: customerName || null,
        customerId: customerId || null,
        items: selectedProducts.map(item => ({
          productId: item._id,
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
              productId: returnData.product._id,
              productName: returnData.product.name,
              productCode: returnData.product.code,
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
                message: `Return created: ${returnData.returnQuantity} units of ${returnData.product.name} (${formatCurrency(returnData.returnValue)})`,
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
        
        // Update product quantities and record inventory transactions
        for (const item of selectedProducts) {
          const originalProduct = products.find(m => m._id === item._id);
          if (originalProduct) {
            let newQuantity;
            
            if (item.quantity < 0) {
              // For negative quantities, add the absolute value back to stock
              newQuantity = originalProduct.quantity + Math.abs(item.quantity);
            } else {
              // For positive quantities, subtract from stock
              newQuantity = originalProduct.quantity - item.quantity;
            }
            
            // Update product quantity
            await apiRequest(`/api/products/${item._id}`, {
              method: 'PUT',
              body: JSON.stringify({
                name: originalProduct.name,
                code: originalProduct.code,
                quantity: newQuantity,
                purchasePrice: originalProduct.purchasePrice,
                sellingPrice: originalProduct.sellingPrice,
                expiryDate: originalProduct.expiryDate,
                batchNo: originalProduct.batchNo,
              }),
            });

            // Record inventory transaction for outflow (sale)
            if (item.quantity > 0) {
              try {
                const transactionData = {
                  productId: item._id,
                  type: 'outflow',
                  quantity: item.quantity,
                  unitPrice: item.sellingPrice,
                  totalAmount: item.sellingPrice * item.quantity,
                  batchNo: originalProduct.batchNo,
                  expiryDate: originalProduct.expiryDate,
                  supplier: null,
                  notes: `Sale via invoice ${invoiceNumber}`,
                  referenceType: 'sale',
                  referenceId: null, // Will be updated after invoice is saved
                  date: new Date().toISOString()
                };

                await apiRequest('/api/inventory', {
                  method: 'POST',
                  body: JSON.stringify(transactionData),
                });
              } catch (error) {
                console.error('Failed to record inventory transaction:', error);
                // Continue with invoice generation even if transaction recording fails
              }
            }
          }
        }

        // Log invoice generation
        logInvoiceActivity.generated(invoiceNumber, formatCurrency(calculateTotal()));
        
        onInvoiceGenerated(invoiceData);
        setSelectedProducts([]);
        setOriginalQuantities({});
        setCustomerName('');
        setCustomerId(null);
        setCustomerSearchTerm('');
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

  const handlePrint = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products before printing');
      return;
    }

    // Validate customer is selected
    if (!customerName || !customerId) {
      alert('Please select or add a customer before printing invoice');
      return;
    }

    // Validate quantities before printing
    for (const item of selectedProducts) {
      const originalProduct = products.find(m => m._id === item._id);
      if (originalProduct && item.quantity > originalProduct.quantity) {
        alert(`Cannot print invoice: ${originalProduct.name} quantity (${item.quantity}) exceeds available stock (${originalProduct.quantity})`);
        return;
      }
    }

    // Note: Purchase price validation removed - products can be sold below cost

    // First save the invoice to database
    setLoading(true);
    try {
      const invoiceData = {
        invoiceNumber,
        customerName: customerName || null,
        customerId: customerId || null,
        items: selectedProducts.map(item => ({
          productId: item._id,
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
        // Update product quantities and record inventory transactions
        for (const item of selectedProducts) {
          const originalProduct = products.find(m => m._id === item._id);
          if (originalProduct) {
            let newQuantity;
            if (item.quantity < 0) {
              // Handle negative quantities (returns)
              newQuantity = originalProduct.quantity + Math.abs(item.quantity);
            } else {
              // Normal sale
              newQuantity = originalProduct.quantity - item.quantity;
            }

            // Update product quantity in database
            try {
              await apiRequest(`/api/products/${item._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  ...originalProduct,
                  quantity: Math.max(0, newQuantity), // Ensure quantity doesn't go negative
                }),
              });

              // Record inventory transaction for outflow (sale)
              if (item.quantity > 0) {
                try {
                  const transactionData = {
                    productId: item._id,
                    type: 'outflow',
                    quantity: item.quantity,
                    unitPrice: item.sellingPrice,
                    totalAmount: item.sellingPrice * item.quantity,
                    batchNo: originalProduct.batchNo,
                    expiryDate: originalProduct.expiryDate,
                    supplier: null,
                    notes: `Sale via invoice ${invoiceNumber}`,
                    referenceType: 'sale',
                    referenceId: null,
                    date: new Date().toISOString()
                  };

                  await apiRequest('/api/inventory', {
                    method: 'POST',
                    body: JSON.stringify(transactionData),
                  });
                } catch (error) {
                  console.error('Failed to record inventory transaction:', error);
                  // Continue with invoice generation even if transaction recording fails
                }
              }
            } catch (error) {
              console.error('Error updating product quantity:', error);
            }
          }
        }

        // Show success notification
        const notification = {
          id: Date.now(),
          message: `Invoice saved and ready to print!`,
          type: 'success'
        };
        setReturnNotifications(prev => [...prev, notification]);
        
        setTimeout(() => {
          setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 3000);

        // Now proceed with printing
        printInvoice();
        
        // Log invoice printing
        logInvoiceActivity.printed(invoiceNumber);
        
        // Clear the form after successful save and print
        setSelectedProducts([]);
        setOriginalQuantities({});
        setCustomerName('');
        generateInvoiceNumber();
        
      } else {
        alert('Failed to save invoice');
        setLoading(false);
        return;
      }
    } catch (error) {
      alert('Error saving invoice');
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  // =================== DROP-IN (paste inside InvoiceTable component) ===================

// 1) Direct print button handler (simple & reliable)
const handleDirectPrint = () => {
  if (selectedProducts.length === 0) {
    alert('Please select products before printing');
    return;
  }
  const receiptText = generatePlainTextReceipt(); // 42-column strict text
  printPlainText(receiptText);                    // print via hidden iframe
};

// 2) Plain-text printer (hidden iframe; works with most thermal drivers)
function printPlainText(text) {
  // HTML escape so <, >, & etc. render safely inside <pre>
  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${invoiceNumber}</title>
        <style>
          @media print { 
            @page { 
              size: 76mm auto; 
              margin: 2mm; 
            } 
          }
          html, body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            color: #000; 
          }
          body {
            width: 76mm; 
            padding: 8px 8px 12px 8px;
            font-family: "Courier New", "Lucida Console", "Monaco", monospace;
            font-size: 11px; 
            line-height: 1.2;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          pre { 
            margin: 0; 
            white-space: pre; 
            font-family: "Courier New", "Lucida Console", "Monaco", monospace;
            font-size: 11px;
            line-height: 1.2;
          }
        </style>
      </head>
      <body><pre>${esc(text)}</pre></body>
    </html>
  `);
  doc.close();

  // small delay helps some drivers
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  }, 100);
}

// 3) Strict 42-column plain-text receipt with improved readability
function generatePlainTextReceipt() {
  const currentDate = new Date();
  const shopName = (settings.shopName || "Medical Shop").toUpperCase();
  const shopAddress = settings.address || "Your Shop Address";
  const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";
  const currentUser = getUser();

  const subTotal = calculateSubtotal();
  const discountAmt = calculateTotalDiscount();
  const total = calculateTotal();

  // ---- helpers (locked to 42 columns for 80mm) ----
  const COLS = 42;
  
  // Improved padding functions for better readability
  const pad = (s, n, side = "end") => {
    s = String(s);
    const k = Math.max(n - s.length, 0);
    return side === "start" ? " ".repeat(k) + s : s + " ".repeat(k);
  };
  
  // Ensure left text is max 28 chars, right text is max 14 chars
  const line = (L, R) => {
    const left = String(L).substring(0, 28);
    const right = String(R).substring(0, 14);
    return pad(left, 28, "end") + pad(right, 14, "start");
  };
  
  // Center text within 42 columns
  const center = (t) => {
    t = String(t);
    const k = Math.max(Math.floor((COLS - t.length) / 2), 0);
    return " ".repeat(k) + t;
  };
  
  // Separator line (exactly 42 characters)
  const sep = (ch = "-") => ch.repeat(COLS);

  // ---- items block with improved formatting ----
  let itemsText = "";
  selectedProducts.forEach((item) => {
    const price = +item.sellingPrice || 0;
    const qty = parseInt(item.quantity) || 0;
    const totalLine = (price * qty).toFixed(2);
    
    // Ensure item name fits in 28 characters
    const nm = (item.name || "Unknown Item").toUpperCase();
    const name = nm.length > 28 ? nm.slice(0, 25) + "..." : nm;

    // Format with proper Rs currency and alignment
    itemsText += line(name, `Rs${totalLine}`) + "\n";
    itemsText += `  Qty: ${qty} × Rs${price.toFixed(2)}\n\n`;
  });

  // ---- full receipt text with strict 42-column layout ----
  return [
    center(shopName),
    center(shopAddress),
    center(`Tel: ${phoneNumber}`),
    "",
    "*".repeat(COLS),  // Exactly 42 asterisks
    center("CASH RECEIPT"),
    "*".repeat(COLS),  // Exactly 42 asterisks
    "",
    line(`Invoice: ${invoiceNumber}`, ""),
    line(`Date: ${currentDate.toLocaleDateString()}`, ""),
    line(`Time: ${currentDate.toLocaleTimeString()}`, ""),
    line(`Cashier: ${currentUser?.username || "Unknown"}`, ""),
    "",
    sep("-"),  // Exactly 42 dashes
    line("Description", "Price"),
    sep("-"),  // Exactly 42 dashes
    "",
    itemsText.trimEnd(),
    "",
    sep("-"),  // Exactly 42 dashes
    line("Subtotal:", `Rs${subTotal.toFixed(2)}`),
    line(`Discount (${settings.discountPercentage || 0}%):`, `-Rs${discountAmt.toFixed(2)}`),
    sep("-"),  // Exactly 42 dashes
    line("TOTAL:", `Rs${total.toFixed(2)}`),
    "",
    line("Cash:", `Rs${total.toFixed(2)}`),
    line("Change:", `Rs0.00`),
    "",
    "*".repeat(COLS),  // Exactly 42 asterisks
    center("THANK YOU!"),
    "*".repeat(COLS),  // Exactly 42 asterisks
    "",
    center("Powered by Codebridge"),
    center("Contact: +92 308 2283845"),
    ""
  ].join("\n");
}
// =================== END DROP-IN ===================


  const handleCopyToClipboard = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products before copying receipt');
      return;
    }
    
    try {
      const receiptText = generatePlainTextReceipt();
      await navigator.clipboard.writeText(receiptText);
      
      // Show success notification
      const notification = {
        id: Date.now(),
        message: 'Receipt copied to clipboard! Paste in Notepad/Word to print',
        type: 'success'
      };
      setReturnNotifications(prev => [...prev, notification]);
      
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
      
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy receipt: ' + error.message);
    }
  };

  // Handle Print Quotation - A4 Format
  const handlePrintQuotation = () => {
    if (selectedProducts.length === 0) {
      alert('Please select products before printing quotation');
      return;
    }
    printQuotationA4();
  };

  // Print Quotation in A4 Format
  const printQuotationA4 = () => {
    const currentDate = new Date();
    const shopName = settings.shopName || "Medical Shop";
    const shopAddress = settings.address || "Your Shop Address";
    const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";
    const email = settings.email || "";
    const logo = settings.logo || null;
    const currentUser = getUser();

    // Calculate totals
    const subTotal = calculateSubtotal();
    const discountAmt = calculateTotalDiscount();
    const total = calculateTotal();

    // Format date and time
    const formattedDate = currentDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const formattedTime = currentDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Generate quotation number
    const quotationNumber = `QT${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Build items table rows
    const itemsRows = selectedProducts.map((item, index) => {
      const sellingPrice = parseFloat(item.sellingPrice) || parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const itemTotal = sellingPrice * quantity;
      
      return `
        <tr>
          <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name || item.code || 'N/A'}</td>
          <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${quantity}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rs ${sellingPrice.toFixed(2)}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rs ${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Enhanced HTML wrapper with A4 format styling for Quotation
    const printContent = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Quotation - ${quotationNumber}</title>
        <style>
          @media print {
            @page { 
              size: A4;
              margin: 15mm;
            }
            .no-print { display: none !important; }
            body { 
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .quotation-container {
              box-shadow: none !important;
              border: none !important;
            }
          }
          * { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          html, body {
            margin: 0; 
            padding: 0;
            background: #fff; 
            color: #000;
            font-family: 'Arial', 'Helvetica', sans-serif;
          }
          body {
            padding: 20px;
            background: #f5f5f5;
          }
          .quotation-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            align-items: flex-start;
            gap: 20px;
          }
          .logo-container {
            flex-shrink: 0;
          }
          .logo-container img {
            max-width: 120px;
            max-height: 120px;
            object-fit: contain;
          }
          .header-content {
            flex: 1;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .company-details {
            font-size: 12px;
            color: #666;
            line-height: 1.6;
          }
          .quotation-title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0;
            color: #0066cc;
            text-transform: uppercase;
            letter-spacing: 2px;
            border: 2px solid #0066cc;
            padding: 15px;
            background: #f0f7ff;
          }
          .quotation-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 5px;
            border-left: 4px solid #0066cc;
          }
          .info-left, .info-right {
            flex: 1;
          }
          .info-label {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
            font-size: 12px;
          }
          .info-value {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .customer-info {
            margin-bottom: 20px;
            padding: 15px;
            background: #f0f7ff;
            border-left: 4px solid #0066cc;
            border-radius: 5px;
          }
          .customer-label {
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 8px;
            font-size: 14px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th {
            background: #0066cc;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 13px;
            text-transform: uppercase;
          }
          .items-table th:first-child {
            text-align: center;
            width: 50px;
          }
          .items-table th:nth-child(3),
          .items-table td:nth-child(3) {
            text-align: center;
            width: 80px;
          }
          .items-table th:nth-child(4),
          .items-table td:nth-child(4),
          .items-table th:nth-child(5),
          .items-table td:nth-child(5) {
            text-align: right;
            width: 120px;
          }
          .items-table td {
            padding: 10px 8px;
            font-size: 13px;
          }
          .items-table tbody tr:hover {
            background: #f5f5f5;
          }
          .totals-section {
            margin-top: 30px;
            margin-left: auto;
            width: 400px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
          }
          .total-row.total-final {
            border-top: 2px solid #0066cc;
            border-bottom: 2px solid #0066cc;
            font-size: 18px;
            font-weight: bold;
            padding: 15px 0;
            margin-top: 10px;
            color: #0066cc;
          }
          .total-label {
            font-weight: bold;
            color: #333;
          }
          .total-value {
            color: #333;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #0066cc;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .validity-notice {
            background: #fff3cd;
            border: 2px solid #ffc107;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
            font-weight: bold;
            color: #856404;
            font-size: 16px;
          }
          .quotation-note {
            background: #e7f3ff;
            border-left: 4px solid #0066cc;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            font-size: 13px;
            color: #004085;
          }
          .thank-you {
            font-size: 18px;
            font-weight: bold;
            color: #0066cc;
            margin: 20px 0;
            text-transform: uppercase;
          }
          .print-button {
            position: fixed; 
            top: 20px; 
            right: 20px; 
            z-index: 1000;
            background: #28a745; 
            color: white; 
            border: none; 
            padding: 12px 24px;
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
            transition: all 0.3s ease;
          }
          .print-button:hover { 
            background: #218838; 
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.3);
          }
          .close-button {
            position: fixed; 
            top: 20px; 
            right: 140px; 
            z-index: 1000;
            background: #dc3545; 
            color: white; 
            border: none; 
            padding: 12px 24px;
            border-radius: 8px; 
            cursor: pointer; 
            font-size: 16px; 
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
            transition: all 0.3s ease;
          }
          .close-button:hover { 
            background: #c82333; 
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.3);
          }
          .info-text {
            text-align: center; 
            color: #666; 
            margin: 20px 0; 
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Print Quotation</button>
        <button class="close-button no-print" onclick="window.close()">❌ Close</button>
        
        <div class="info-text no-print">
          <strong>📄 Quotation Preview - A4 Format</strong><br>
          Quotation: ${quotationNumber} | Date: ${formattedDate}<br>
          <span style="color: #28a745; font-weight: bold;">🖨️ Click the Green Print Button to Print</span><br>
          <span style="color: #666; font-size: 11px;">Or use Ctrl+P (Cmd+P on Mac) to print</span>
        </div>
        
        <div class="quotation-container">
          <div class="header">
            ${logo ? `
              <div class="logo-container">
                <img src="${logo}" alt="${shopName} Logo" />
              </div>
            ` : ''}
            <div class="header-content">
              <div class="company-name">${shopName}</div>
              <div class="company-details">
                ${shopAddress}<br>
                ${phoneNumber ? `Tel: ${phoneNumber}` : ''}${email ? ` | Email: ${email}` : ''}
              </div>
            </div>
          </div>
          
          <div class="quotation-title">Quotation</div>
          
          <div class="quotation-info">
            <div class="info-left">
              <div class="info-label">Quotation Number:</div>
              <div class="info-value">${quotationNumber}</div>
              <div class="info-label">Date:</div>
              <div class="info-value">${formattedDate}</div>
              <div class="info-label">Time:</div>
              <div class="info-value">${formattedTime}</div>
            </div>
            <div class="info-right">
              <div class="info-label">Prepared by:</div>
              <div class="info-value">${currentUser?.username || "Unknown"}</div>
              ${customerName ? `
                <div class="info-label">Customer:</div>
                <div class="info-value">${customerName}</div>
              ` : ''}
            </div>
          </div>
          
          ${customerName ? `
            <div class="customer-info">
              <div class="customer-label">Customer Details:</div>
              <div class="info-value">${customerName}</div>
            </div>
          ` : ''}
          
          <table class="items-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          
          <div class="totals-section">
            <div class="total-row">
              <span class="total-label">Subtotal:</span>
              <span class="total-value">Rs ${subTotal.toFixed(2)}</span>
            </div>
            ${discountAmt > 0 ? `
              <div class="total-row">
                <span class="total-label">Discount (${settings.discountPercentage || 0}%):</span>
                <span class="total-value">- Rs ${discountAmt.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row total-final">
              <span class="total-label">Total Amount:</span>
              <span class="total-value">Rs ${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="validity-notice">
            ⏰ This quotation is valid for 7 days from the date of issue
          </div>
          
          <div class="quotation-note">
            <strong>Note:</strong> This is a quotation only. No payment is required at this stage. 
            Prices and availability are subject to change without notice. 
            Please contact us to confirm your order.
          </div>
          
          <div class="footer">
            <div class="thank-you">Thank You for Your Interest!</div>
            <div>This is a computer generated quotation.</div>
            <div style="margin-top: 10px;">Powered by Codebridge | Contact: +92 308 2283845</div>
          </div>
        </div>
        
        <script>
          // No auto-print - let user control when to print
          // User can click the print button or use Ctrl+P
        </script>
      </body>
    </html>`;

    // Open print window with modern approach
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then focus the window
      printWindow.onload = () => {
        printWindow.focus();
        // No auto-print - let user control when to print
      };
    }
  };

  const generateSimplePrintContent = () => {
    const currentDate = new Date();
    const shopName = settings.shopName || "Medical Shop";
    const shopAddress = settings.address || "Your Shop Address";
    const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";
    const currentUser = getUser();
    
    const subTotal = calculateSubtotal();
    const discountAmt = calculateTotalDiscount();
    const total = calculateTotal();

    const itemsList = selectedProducts.map(item => {
      const sellingPrice = parseFloat(item.sellingPrice) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const itemTotal = sellingPrice * quantity;
      return `${item.name} - Qty: ${quantity} × Rs${sellingPrice.toFixed(2)} = Rs${itemTotal.toFixed(2)}`;
    }).join('<br>');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${invoiceNumber}</title>
          <style>
            @media print {
              @page { size: 76mm auto; margin: 0; }
              body { font-size: 12px; line-height: 1.2; }
            }
            body { 
              font-family: "Courier New", monospace; 
              width: 76mm; 
              margin: 0; 
              padding: 10px; 
              font-size: 12px;
              line-height: 1.2;
            }
            .header { text-align: center; margin-bottom: 20px; }
            .shop-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .shop-address { font-size: 12px; margin-bottom: 5px; }
            .shop-phone { font-size: 12px; margin-bottom: 15px; }
            .receipt-title { font-size: 14px; font-weight: bold; text-align: center; margin: 15px 0; }
            .invoice-info { margin-bottom: 15px; font-size: 11px; }
            .items { margin-bottom: 15px; font-size: 11px; }
            .summary { margin-bottom: 15px; font-size: 11px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-name">${shopName.toUpperCase()}</div>
            <div class="shop-address">${shopAddress}</div>
            <div class="shop-phone">Tel: ${phoneNumber}</div>
          </div>
          
          <div class="receipt-title">CASH RECEIPT</div>
          
          <div class="invoice-info">
            <div>Invoice: ${invoiceNumber}</div>
            <div>Date: ${currentDate.toLocaleDateString()}</div>
            <div>Time: ${currentDate.toLocaleTimeString()}</div>
            <div>Cashier: ${currentUser?.username || "Unknown"}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${itemsList}
          </div>
          
          <div class="divider"></div>
          
          <div class="summary">
            <div>Subtotal: Rs${subTotal.toFixed(2)}</div>
            <div>Discount (${settings.discountPercentage || 0}%): -Rs${discountAmt.toFixed(2)}</div>
            <div style="font-weight: bold;">TOTAL: Rs${total.toFixed(2)}</div>
            <div>Cash: Rs${total.toFixed(2)}</div>
            <div>Change: Rs0.00</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            <div style="font-weight: bold; margin-bottom: 10px;">THANK YOU!</div>
            <div>Powered by Codebridge</div>
            <div>Contact: +92 308 2283845</div>
          </div>
        </body>
      </html>
    `;
  };

  // Helper functions for receipt formatting - SIMPLE and RELIABLE
  const center = (text) => {
    const width = 42;
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  const repeat = (char) => char.repeat(42);
  const line = (left, right) => {
    const leftText = String(left).substring(0, 28);
    const rightText = String(right).substring(0, 14);
    return leftText.padEnd(28) + rightText.padStart(14);
  };
  const money = (amount) => `Rs${parseFloat(amount || 0).toFixed(2)}`;
  const formatItem = (name, price) => {
    const shortName = name.length > 28 ? name.substring(0, 25) + '...' : name;
    const formattedPrice = `Rs${parseFloat(price || 0).toFixed(2)}`;
    return shortName.padEnd(28) + formattedPrice.padStart(14);
  };

  const printInvoice = (autoPrint = true) => {
    const currentDate = new Date();
    const shopName = settings.shopName || "Medical Shop";
    const shopAddress = settings.address || "Your Shop Address";
    const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";
    const email = settings.email || "";
    const logo = settings.logo || null;
    const currentUser = getUser();

    // Calculate totals
    const subTotal = calculateSubtotal();
    const discountAmt = calculateTotalDiscount();
    const total = calculateTotal();

    // Format date and time
    const formattedDate = currentDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const formattedTime = currentDate.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Build items table rows
    const itemsRows = selectedProducts.map((item, index) => {
      const sellingPrice = parseFloat(item.sellingPrice) || parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const itemTotal = sellingPrice * quantity;
      
      return `
        <tr>
          <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name || item.code || 'N/A'}</td>
          <td style="text-align: center; padding: 8px; border-bottom: 1px solid #ddd;">${quantity}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rs ${sellingPrice.toFixed(2)}</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #ddd;">Rs ${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

  // Enhanced HTML wrapper with A4 format styling
  const printContent = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${invoiceNumber}</title>
      <style>
        @media print {
          @page { 
            size: A4;
            margin: 15mm;
          }
          .no-print { display: none !important; }
          body { 
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .invoice-container {
            box-shadow: none !important;
            border: none !important;
          }
        }
        * { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
        }
        html, body {
          margin: 0; 
          padding: 0;
          background: #fff; 
          color: #000;
          font-family: 'Arial', 'Helvetica', sans-serif;
        }
        body {
          padding: 20px;
          background: #f5f5f5;
        }
        .invoice-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 30px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }
        .logo-container {
          flex-shrink: 0;
        }
        .logo-container img {
          max-width: 120px;
          max-height: 120px;
          object-fit: contain;
        }
        .header-content {
          flex: 1;
        }
        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .company-details {
          font-size: 12px;
          color: #666;
          line-height: 1.6;
        }
        .invoice-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin: 30px 0;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .info-left, .info-right {
          flex: 1;
        }
        .info-label {
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
          font-size: 12px;
        }
        .info-value {
          color: #666;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .customer-info {
          margin-bottom: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-left: 4px solid #333;
        }
        .customer-label {
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th {
          background: #333;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          font-size: 13px;
          text-transform: uppercase;
        }
        .items-table th:first-child {
          text-align: center;
          width: 50px;
        }
        .items-table th:nth-child(3),
        .items-table td:nth-child(3) {
          text-align: center;
          width: 80px;
        }
        .items-table th:nth-child(4),
        .items-table td:nth-child(4),
        .items-table th:nth-child(5),
        .items-table td:nth-child(5) {
          text-align: right;
          width: 120px;
        }
        .items-table td {
          padding: 10px 8px;
          font-size: 13px;
        }
        .items-table tbody tr:hover {
          background: #f5f5f5;
        }
        .totals-section {
          margin-top: 30px;
          margin-left: auto;
          width: 400px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #ddd;
          font-size: 14px;
        }
        .total-row.total-final {
          border-top: 2px solid #333;
          border-bottom: 2px solid #333;
          font-size: 18px;
          font-weight: bold;
          padding: 15px 0;
          margin-top: 10px;
        }
        .total-label {
          font-weight: bold;
          color: #333;
        }
        .total-value {
          color: #333;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        .thank-you {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
          text-transform: uppercase;
        }
        .print-button {
          position: fixed; 
          top: 20px; 
          right: 20px; 
          z-index: 1000;
          background: #28a745; 
          color: white; 
          border: none; 
          padding: 12px 24px;
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 16px; 
          font-weight: bold;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
          transition: all 0.3s ease;
        }
        .print-button:hover { 
          background: #218838; 
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        }
        .close-button {
          position: fixed; 
          top: 20px; 
          right: 140px; 
          z-index: 1000;
          background: #dc3545; 
          color: white; 
          border: none; 
          padding: 12px 24px;
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 16px; 
          font-weight: bold;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2); 
          transition: all 0.3s ease;
        }
        .close-button:hover { 
          background: #c82333; 
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        }
        .info-text {
          text-align: center; 
          color: #666; 
          margin: 20px 0; 
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Print Invoice</button>
      <button class="close-button no-print" onclick="window.close()">❌ Close</button>
      
      <div class="info-text no-print">
        <strong>📄 Invoice Preview - A4 Format</strong><br>
        Invoice: ${invoiceNumber} | Date: ${formattedDate}<br>
        <span style="color: #28a745; font-weight: bold;">🖨️ Click the Green Print Button to Print</span><br>
        <span style="color: #666; font-size: 11px;">Or use Ctrl+P (Cmd+P on Mac) to print</span>
      </div>
      
      <div class="invoice-container">
        <div class="header">
          ${logo ? `
            <div class="logo-container">
              <img src="${logo}" alt="${shopName} Logo" />
            </div>
          ` : ''}
          <div class="header-content">
            <div class="company-name">${shopName}</div>
            <div class="company-details">
              ${shopAddress}<br>
              ${phoneNumber ? `Tel: ${phoneNumber}` : ''}${email ? ` | Email: ${email}` : ''}
            </div>
          </div>
        </div>
        
        <div class="invoice-title">Tax Invoice</div>
        
        <div class="invoice-info">
          <div class="info-left">
            <div class="info-label">Invoice Number:</div>
            <div class="info-value">${invoiceNumber}</div>
            <div class="info-label">Date:</div>
            <div class="info-value">${formattedDate}</div>
            <div class="info-label">Time:</div>
            <div class="info-value">${formattedTime}</div>
          </div>
          <div class="info-right">
            <div class="info-label">Cashier:</div>
            <div class="info-value">${currentUser?.username || "Unknown"}</div>
            ${customerName ? `
              <div class="info-label">Customer:</div>
              <div class="info-value">${customerName}</div>
            ` : ''}
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">Rs ${subTotal.toFixed(2)}</span>
          </div>
          ${discountAmt > 0 ? `
            <div class="total-row">
              <span class="total-label">Discount (${settings.discountPercentage || 0}%):</span>
              <span class="total-value">- Rs ${discountAmt.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row total-final">
            <span class="total-label">Total Amount:</span>
            <span class="total-value">Rs ${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <div class="thank-you">Thank You for Your Business!</div>
          <div>This is a computer generated invoice.</div>
          <div style="margin-top: 10px;">Powered by Codebridge | Contact: +92 308 2283845</div>
        </div>
      </div>
      
      <script>
        // No auto-print - let user control when to print
        // User can click the print button or use Ctrl+P
      </script>
    </body>
  </html>`;

    // Open print window with modern approach
    const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then focus the window
      printWindow.onload = () => {
        printWindow.focus();
        // No auto-print - let user control when to print
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
          <button
            onClick={saveCurrentInvoiceToQueue}
            disabled={selectedProducts.length === 0}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Current to Queue
          </button>
        </div>
      </div>

      {/* Pending Invoices Tabs */}
      {pendingInvoices.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Pending Invoices ({pendingInvoices.length})</h3>
          <div className="flex flex-wrap gap-2 border-b border-gray-200">
            {pendingInvoices.map((invoice, index) => (
              <div
                key={invoice.id}
                className="flex items-center bg-gray-100 border border-gray-300 rounded-t-lg px-3 py-2 hover:bg-gray-200 cursor-pointer group"
                onClick={() => loadInvoiceFromQueue(invoice.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">
                    {invoice.customerName}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({invoice.items.length} items)
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatCurrency(invoice.items.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0))}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePendingInvoice(invoice.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Products */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Available Products</h3>
            <div className="text-sm text-gray-500">
              {filteredProducts.length} of {products.length} products
            </div>
          </div>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search products by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No products available</p>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {filteredProducts.map((product) => {
                  const isAlreadyAdded = selectedProducts.some(item => item._id === product._id);
                  return (
                    <div
                      key={product._id}
                      className={`flex items-center justify-between p-2 border rounded transition-colors ${
                        isAlreadyAdded 
                          ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate flex items-center">
                          {product.name}
                          {isAlreadyAdded && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-1 py-0.5 rounded">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-3">
                          <span>Code: {product.code}</span>
                          <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                            product.quantity <= 10 
                              ? 'bg-red-100 text-red-800' 
                              : product.quantity <= 50 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Stock: {product.quantity}
                          </span>
                          <span>Price: {formatCurrency(product.sellingPrice)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addProduct(product)}
                        disabled={product.quantity <= 0 || isAlreadyAdded}
                        className={`ml-2 text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${
                          isAlreadyAdded
                            ? 'bg-green-500 text-white cursor-not-allowed opacity-50'
                            : 'btn-primary hover:bg-blue-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isAlreadyAdded ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Products */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
            <div className="text-sm text-gray-500">
              {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''} selected
            </div>
          </div>
          
          {/* Customer Selection */}
          <div className="mb-4 relative customer-dropdown-container">
            <label htmlFor="customerSearch" className="block text-sm font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="customerSearch"
                value={customerSearchTerm || customerName}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search or add customer..."
                className={`input-field w-full ${customerName ? 'pr-24' : 'pr-20'}`}
              />
              {customerName && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCustomerName('');
                    setCustomerId(null);
                    setCustomerSearchTerm('');
                    setShowCustomerDropdown(false);
                  }}
                  className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-600 text-lg w-6 h-6 flex items-center justify-center"
                  title="Clear customer"
                >
                  ✕
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddCustomerModal(true);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1"
                title="Add new customer"
              >
                + Add
              </button>
            </div>
            
            {/* Customer Dropdown */}
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">
                    No customers found
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer._id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      {customer.phone && (
                        <div className="text-sm text-gray-500">Phone: {customer.phone}</div>
                      )}
                      {customer.email && (
                        <div className="text-sm text-gray-500">Email: {customer.email}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No products selected</p>
          ) : (
            <>
              {/* Stock Warning */}
              {selectedProducts.some(item => item.quantity > (products.find(m => m._id === item._id)?.quantity || 0)) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-yellow-600 mr-2">⚠️</span>
                    <span className="text-yellow-800 text-sm font-medium">
                      Warning: Some items exceed available stock. Invoice cannot be generated until quantities are adjusted.
                    </span>
                  </div>
                </div>
              )}
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {selectedProducts.map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-3 pb-6 border border-gray-200 rounded hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">Code: {item.code}</div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="-999"
                            max={products.find(m => m._id === item._id)?.quantity || 999}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item._id, e.target.value)}
                            className={`w-14 px-1 py-1 border border-gray-300 rounded text-center text-sm ${
                              item.quantity < 0 ? 'bg-red-50 border-red-300 text-red-700' : 
                              item.quantity > (products.find(m => m._id === item._id)?.quantity || 0) ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : ''
                            }`}
                            title={`Available stock: ${products.find(m => m._id === item._id)?.quantity || 0} units`}
                          />
                          {/* Stock info moved to tooltip only - cleaner interface */}
                          {item.quantity > (products.find(m => m._id === item._id)?.quantity || 0) && (
                            <div className="absolute -bottom-5 left-0 text-xs text-yellow-600 font-medium whitespace-nowrap z-10">
                              ⚠️ Exceeds stock!
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">×</span>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.sellingPrice || ''}
                            onChange={(e) => updateSellingPrice(item._id, e.target.value)}
                            onBlur={(e) => {
                              // Ensure value is valid number on blur
                              const val = parseFloat(e.target.value) || 0;
                              if (val !== item.sellingPrice) {
                                updateSellingPrice(item._id, val);
                              }
                            }}
                            className={`w-20 px-1 py-1 border border-gray-300 rounded text-center text-sm ${
                              item.sellingPrice && parseFloat(item.sellingPrice) < (parseFloat(products.find(m => m._id === item._id)?.purchasePrice) || 0) 
                                ? 'bg-red-50 border-red-300 text-red-700' : ''
                            }`}
                            title={`Purchase price: ${formatCurrency(products.find(m => m._id === item._id)?.purchasePrice || 0)}`}
                          />
                          {item.sellingPrice && parseFloat(item.sellingPrice) < (parseFloat(products.find(m => m._id === item._id)?.purchasePrice) || 0) && (
                            <div className="absolute -bottom-5 left-0 text-xs text-red-600 font-medium whitespace-nowrap z-10">
                              ⚠️ Below cost!
                            </div>
                          )}
                        </div>
                        <span className={`font-medium text-sm ${item.quantity < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency((parseFloat(item.sellingPrice) || 0) * (parseInt(item.quantity) || 0))}
                        </span>
                        <button
                          onClick={() => removeProduct(item._id)}
                          className="text-red-600 hover:text-red-800 text-sm ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                </div>

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
              <div className="flex flex-wrap gap-2 pt-4 sticky bottom-0 bg-white">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading || selectedProducts.length === 0}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Processing...' : '🧾 Generate Invoice'}
                </button>
                <button
                  onClick={saveCurrentInvoiceToQueue}
                  disabled={selectedProducts.length === 0}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save to Queue
                </button>
                <button
                  onClick={handlePrintQuotation}
                  disabled={selectedProducts.length === 0}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📄 Print & Quotation
                </button>
                <button
                  onClick={handlePrint}
                  disabled={selectedProducts.length === 0 || loading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Saving & Printing...' : '💾 Save & Print Invoice'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddCustomerModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  required
                  className="input-field w-full"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  className="input-field w-full"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  className="input-field w-full"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  rows="3"
                  className="input-field w-full"
                  placeholder="Enter address"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddNewCustomer}
                className="btn-primary flex-1"
              >
                Add Customer
              </button>
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  setNewCustomerData({ name: '', phone: '', address: '', email: '' });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 