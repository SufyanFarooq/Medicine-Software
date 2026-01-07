import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import { getUser, hasPermission } from '../../lib/auth';
import { canPerformAction } from '../../lib/permissions';

// Print invoice function - A4 Format Bill Pad Style
const printInvoice = (invoice, settings = {}, currentUser = null) => {
  const currentDate = new Date();
  const shopName = settings.shopName || "Medical Shop";
  const shopAddress = settings.address || "Your Shop Address";
  const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";
  const email = settings.email || "";
  const logo = settings.logo || null;
  
  // Format date and time
  const invoiceDate = new Date(invoice.date);
  const formattedDate = invoiceDate.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  const formattedTime = invoiceDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Build items table rows
  const itemsRows = invoice.items.map((item, index) => {
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

  // Calculate totals
  const subtotal = parseFloat(invoice.subtotal || 0);
  const discount = parseFloat(invoice.discount || 0);
  const total = parseFloat(invoice.total || 0);

  // Enhanced HTML wrapper with A4 format styling
  const printContent = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${invoice.invoiceNumber}</title>
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
        Invoice: ${invoice.invoiceNumber} | Date: ${formattedDate}<br>
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
            <div class="info-value">${invoice.invoiceNumber}</div>
            <div class="info-label">Date:</div>
            <div class="info-value">${formattedDate}</div>
            <div class="info-label">Time:</div>
            <div class="info-value">${formattedTime}</div>
          </div>
          <div class="info-right">
            <div class="info-label">Cashier:</div>
            <div class="info-value">${currentUser?.username || "Unknown"}</div>
            ${invoice.customerName ? `
              <div class="info-label">Customer:</div>
              <div class="info-value">${invoice.customerName}</div>
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
            <span class="total-value">Rs ${subtotal.toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
            <div class="total-row">
              <span class="total-label">Discount (${settings.discountPercentage || 0}%):</span>
              <span class="total-value">- Rs ${discount.toFixed(2)}</span>
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

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [returns, setReturns] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, returnsRes, settingsRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/settings'),
      ]);

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData);
      }

      if (returnsRes.ok) {
        const returnsData = await returnsRes.json();
        setReturns(returnsData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/invoices/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage customer invoices
            </p>
          </div>
          <Link href="/invoices/generate" className="btn-primary">
            🧾 Generate Invoice
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
                <span className="text-2xl text-white">🧾</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                <p className="text-2xl font-semibold text-gray-900">{invoices.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-500">
                <span className="text-2xl text-white">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(invoices.reduce((sum, invoice) => sum + invoice.total, 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-orange-500">
                <span className="text-2xl text-white">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Returns</p>
                <p className="text-2xl font-semibold text-gray-900">{returns.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="card">
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No invoices found</p>
              <p className="text-sm text-gray-400 mt-2">
                Generate your first invoice to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Items</th>
                    <th className="table-header">Subtotal</th>
                    <th className="table-header">Discount</th>
                    <th className="table-header">Total</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{invoice.invoiceNumber}</td>
                      <td className="table-cell">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell">{invoice.items.length}</td>
                      <td className="table-cell">{formatCurrency(invoice.subtotal)}</td>
                      <td className="table-cell">{formatCurrency(invoice.discount)}</td>
                      <td className="table-cell font-medium">{formatCurrency(invoice.total)}</td>
                      <td className="table-cell">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => printInvoice(invoice, settings, currentUser)}
                            className="text-blue-600 hover:text-blue-900 text-lg cursor-pointer transition-colors duration-200"
                            title="Print Invoice"
                          >
                            🖨️
                          </button>
                          {canPerformAction(currentUser?.role, 'delete_invoice') && (
                            <button
                              onClick={() => handleDelete(invoice._id)}
                              className="text-red-600 hover:text-red-900 text-lg cursor-pointer transition-colors duration-200"
                              title="Delete Invoice"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 