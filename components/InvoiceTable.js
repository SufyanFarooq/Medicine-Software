import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';
import { logInvoiceActivity } from '../lib/activity-logger';
import { getUser } from '../lib/auth';

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
      // Show notification that medicine is already added
      const notification = {
        id: Date.now(),
        message: `${medicine.name} is already in the invoice. Use quantity field to adjust.`,
        type: 'warning'
      };
      setReturnNotifications(prev => [...prev, notification]);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 3000);
      
      return; // Don't add duplicate
    } else {
      // Add new medicine with quantity 1
      setSelectedMedicines(prev => [...prev, { ...medicine, quantity: 1 }]);
      // Track original quantity when first added
      setOriginalQuantities(prev => ({
        ...prev,
        [medicine._id]: 1
      }));
      
      // Show success notification
      const notification = {
        id: Date.now(),
        message: `${medicine.name} added to invoice`,
        type: 'success'
      };
      setReturnNotifications(prev => [...prev, notification]);
      
      // Remove notification after 2 seconds
      setTimeout(() => {
        setReturnNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 2000);
    }
  };

  const updateQuantity = (medicineId, quantity) => {
    const currentItem = selectedMedicines.find(item => item._id === medicineId);
    const originalMedicine = medicines.find(m => m._id === medicineId);
    
    if (!currentItem || !originalMedicine) return;
    
    const newQuantity = parseInt(quantity) || 0;
    
    // Check if quantity exceeds available stock
    if (newQuantity > originalMedicine.quantity) {
      // Show warning notification
      const notification = {
        id: Date.now(),
        message: `Warning: ${originalMedicine.name} quantity (${newQuantity}) exceeds available stock (${originalMedicine.quantity})`,
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

    // Validate quantities before generating invoice
    for (const item of selectedMedicines) {
      const originalMedicine = medicines.find(m => m._id === item._id);
      if (originalMedicine && item.quantity > originalMedicine.quantity) {
        alert(`Cannot generate invoice: ${originalMedicine.name} quantity (${item.quantity}) exceeds available stock (${originalMedicine.quantity})`);
        return;
      }
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

        // Log invoice generation
        logInvoiceActivity.generated(invoiceNumber, formatCurrency(calculateTotal()));
        
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

  const handlePrint = async () => {
    if (selectedMedicines.length === 0) {
      alert('Please select medicines before printing');
      return;
    }

    // First save the invoice to database
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
        discount: calculateTotalDiscount(),
        total: calculateTotal(),
        date: new Date().toISOString(),
      };

      const response = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        // Update medicine quantities
        for (const item of selectedMedicines) {
          const originalMedicine = medicines.find(m => m._id === item._id);
          if (originalMedicine) {
            let newQuantity;
            if (item.quantity < 0) {
              // Handle negative quantities (returns)
              newQuantity = originalMedicine.quantity + Math.abs(item.quantity);
            } else {
              // Normal sale
              newQuantity = originalMedicine.quantity - item.quantity;
            }

            // Update medicine quantity in database
            try {
              await apiRequest(`/api/medicines/${item._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                  ...originalMedicine,
                  quantity: Math.max(0, newQuantity), // Ensure quantity doesn't go negative
                }),
              });
            } catch (error) {
              console.error('Error updating medicine quantity:', error);
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
        setSelectedMedicines([]);
        setOriginalQuantities({});
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

  const handlePreviewInvoice = () => {
    if (selectedMedicines.length === 0) {
      alert('Please select medicines before previewing');
      return;
    }
    
    // Open print window without auto-printing
    printInvoice(false);
  };

  const handleDirectPrint = () => {
    if (selectedMedicines.length === 0) {
      alert('Please select medicines before printing');
      return;
    }
    
    // Direct print method - simpler approach
    const printContent = generateSimplePrintContent();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
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

    const itemsList = selectedMedicines.map(item => {
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

  // Helper functions for receipt formatting - improved for better printing
  const center = (text) => text.padStart((42 - text.length) / 2 + text.length);
  const repeat = (char) => char.repeat(42);
  const line = (left, right) => left.padEnd(28) + right.padStart(14);
  const money = (amount) => formatCurrency(amount);
  const formatItem = (name, price) => {
    const shortName = name.length > 25 ? name.substring(0, 22) + '...' : name;
    return shortName.padEnd(28) + price.padStart(14);
  };

  const printInvoice = (autoPrint = true) => {
    const currentDate = new Date();
    const shopName = settings.shopName || "Medical Shop";
    const shopAddress = settings.address || "Your Shop Address";
    const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";
    const currentUser = getUser();

    // Calculate totals
    const subTotal = calculateSubtotal();
    const discountAmt = calculateTotalDiscount();
    const total = calculateTotal();

    // Build items block with proper formatting and spacing
    const itemsBlock = selectedMedicines.map(item => {
      // Ensure we have valid price values with fallbacks
      const sellingPrice = parseFloat(item.sellingPrice) || parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const itemTotal = sellingPrice * quantity;
      
      // Debug logging to see what values we're working with
      console.log('Item:', item.name, 'Price:', item.sellingPrice, 'Parsed:', sellingPrice, 'Total:', itemTotal);
      
      // Use simple formatting to avoid potential issues
      const itemName = item.name || 'Unknown Item';
      const priceStr = `Rs${itemTotal.toFixed(2)}`;
      const qtyStr = `Qty: ${quantity} × Rs${sellingPrice.toFixed(2)}`;
      
      return [
        `${itemName.padEnd(28)}${priceStr.padStart(14)}`,
        `  ${qtyStr}`,
        ""  // Add empty line for spacing between items
      ].join('\n');
    }).join('\n');

    // Build a professional receipt body matching your examples
    const receiptText = [
      center(shopName.toUpperCase()),
      center(shopAddress),
      center(`Tel: ${phoneNumber}`),
      "",
      repeat("*"),
      center("CASH RECEIPT"),
      repeat("*"),
      "",
      `Invoice: ${invoiceNumber}`,
      `Date: ${currentDate.toLocaleDateString()}`,
      `Time: ${currentDate.toLocaleTimeString()}`,
      `Cashier: ${currentUser?.username || "Unknown"}`,
      "",
      repeat("-"),
      "Description                    Price",
      repeat("-"),
      "",
      itemsBlock,
      repeat("-"),
      line("Subtotal:", `Rs${subTotal.toFixed(2)}`),
      line(`Discount (${settings.discountPercentage || 0}%):`, `-Rs${discountAmt.toFixed(2)}`),
      repeat("-"),
      line("TOTAL:", `Rs${total.toFixed(2)}`),
      "",
      line("Cash:", `Rs${total.toFixed(2)}`),
      line("Change:", `Rs0.00`),
      "",
      repeat("*"),
      center("THANK YOU!"),
      repeat("*"),
      "",
      center("Powered by Codebridge"),
      center("Contact: +92 308 2283845"),
    ].join("\n");

    // Debug logging to see the final receipt content
    console.log('Final Receipt Text:', receiptText);
    console.log('Receipt Length:', receiptText.length);

  // Enhanced HTML wrapper with print button and better styling
  const printContent = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt - ${invoiceNumber}</title>
      <style>
        @media print {
          @page { 
            size: 76mm auto; 
            margin: 0; 
          }
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            color: black !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .receipt-container {
            border: none !important;
            box-shadow: none !important;
            padding: 5mm !important;
            width: 76mm !important;
            margin: 0 !important;
            background: white !important;
          }
          pre {
            font-family: "Courier New", "Lucida Console", "Monaco", monospace !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            white-space: pre !important;
            margin: 0 !important;
            padding: 0 !important;
            color: black !important;
            background: white !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          * {
            color: black !important;
            background: white !important;
          }
        }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body {
          margin: 0; padding: 0;
          background: #fff; color: #000;
        }
        body {
          width: 100%; max-width: 800px; margin: 0 auto; padding: 20px;
          font-family: "Courier New", "Lucida Console", "Monaco", monospace;
          font-size: 12px; line-height: 1.2;
          text-rendering: optimizeLegibility;
          background: #f8f9fa;
        }
        .receipt-container {
          width: 76mm; margin: 0 auto; padding: 6px 6px 10px 6px;
          border: 2px solid #333; background: #fff;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          font-family: "Courier New", "Lucida Console", "Monaco", monospace;
          font-size: 10px; line-height: 1.0;
        }
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .print-button {
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          background: #28a745; color: white; border: none; padding: 12px 24px;
          border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: all 0.3s ease;
        }
        .print-button:hover { 
          background: #218838; 
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        }
        .close-button {
          position: fixed; top: 20px; right: 140px; z-index: 1000;
          background: #dc3545; color: white; border: none; padding: 12px 24px;
          border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: all 0.3s ease;
        }
        .close-button:hover { 
          background: #c82333; 
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.3);
        }
        .info-text {
          text-align: center; color: #666; margin: 20px 0; font-size: 12px;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Print Receipt</button>
      <button class="close-button no-print" onclick="window.close()">❌ Close</button>
      
      <div class="info-text no-print">
        <strong>📄 Receipt Preview</strong><br>
        Invoice: ${invoiceNumber} | Date: ${new Date().toLocaleDateString()}<br>
        <span style="color: #28a745; font-weight: bold;">🖨️ Click the Green Print Button to Print</span><br>
        <span style="color: #666; font-size: 11px;">Or use Ctrl+P (Cmd+P on Mac) to print</span>
      </div>
      
      <div class="receipt-container">
        <pre>${receiptText}</pre>
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
            disabled={selectedMedicines.length === 0}
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
        {/* Available Medicines */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Available Medicines</h3>
            <div className="text-sm text-gray-500">
              {filteredMedicines.length} of {medicines.length} medicines
            </div>
          </div>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search medicines by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredMedicines.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No medicines available</p>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {filteredMedicines.map((medicine) => {
                  const isAlreadyAdded = selectedMedicines.some(item => item._id === medicine._id);
                  return (
                    <div
                      key={medicine._id}
                      className={`flex items-center justify-between p-2 border rounded transition-colors ${
                        isAlreadyAdded 
                          ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate flex items-center">
                          {medicine.name}
                          {isAlreadyAdded && (
                            <span className="ml-2 text-xs bg-green-500 text-white px-1 py-0.5 rounded">
                              Added
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-3">
                          <span>Code: {medicine.code}</span>
                          <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                            medicine.quantity <= 10 
                              ? 'bg-red-100 text-red-800' 
                              : medicine.quantity <= 50 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Stock: {medicine.quantity}
                          </span>
                          <span>Price: {formatCurrency(medicine.sellingPrice)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => addMedicine(medicine)}
                        disabled={medicine.quantity <= 0 || isAlreadyAdded}
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

        {/* Selected Medicines */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
            <div className="text-sm text-gray-500">
              {selectedMedicines.length} item{selectedMedicines.length !== 1 ? 's' : ''} selected
            </div>
          </div>
          {selectedMedicines.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No medicines selected</p>
          ) : (
            <>
              {/* Stock Warning */}
              {selectedMedicines.some(item => item.quantity > (medicines.find(m => m._id === item._id)?.quantity || 0)) && (
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
                  {selectedMedicines.map((item) => (
                    <div key={item._id} className="flex items-center justify-between p-2 border border-gray-200 rounded hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">Code: {item.code}</div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="relative">
                          <input
                            type="number"
                            min="-999"
                            max={medicines.find(m => m._id === item._id)?.quantity || 999}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item._id, e.target.value)}
                            className={`w-14 px-1 py-1 border border-gray-300 rounded text-center text-sm ${
                              item.quantity < 0 ? 'bg-red-50 border-red-300 text-red-700' : 
                              item.quantity > (medicines.find(m => m._id === item._id)?.quantity || 0) ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : ''
                            }`}
                            title={`Available stock: ${medicines.find(m => m._id === item._id)?.quantity || 0} units`}
                          />
                          {/* Stock info moved to tooltip only - cleaner interface */}
                          {item.quantity > (medicines.find(m => m._id === item._id)?.quantity || 0) && (
                            <div className="absolute -bottom-6 left-0 text-xs text-yellow-600 font-medium whitespace-nowrap">
                              ⚠️ Exceeds stock!
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">× {formatCurrency(item.sellingPrice)}</span>
                        <span className={`font-medium text-sm ${item.quantity < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(item.sellingPrice * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeMedicine(item._id)}
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
              <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white">
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading || selectedMedicines.length === 0}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Generating...' : '🧾 Generate Invoice'}
                </button>
                <button
                  onClick={saveCurrentInvoiceToQueue}
                  disabled={selectedMedicines.length === 0}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save to Queue
                </button>
                {/* <button
                  onClick={handlePreviewInvoice}
                  disabled={selectedMedicines.length === 0}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  👁️ Preview Receipt
                </button> */}
                <button
                  onClick={handleDirectPrint}
                  disabled={selectedMedicines.length === 0}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🖨️ Direct Print
                </button>
                <button
                  onClick={handlePrint}
                  disabled={selectedMedicines.length === 0 || loading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Saving & Printing...' : '💾 Save & Print Invoice'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 