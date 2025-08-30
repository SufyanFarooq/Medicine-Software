import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import { getUser, hasPermission } from '../../lib/auth';
import { canPerformAction } from '../../lib/permissions';

// Print invoice function - COMPLETELY REWRITTEN for perfect readability
const printInvoice = (invoice, settings = {}, currentUser = null) => {
  // Safety check for invoice structure
  if (!invoice) {
    console.error('No invoice provided to print function');
    return;
  }
  
  const currentDate = new Date();
  const shopName = settings.shopName || "Crane Management UAE";
  const shopAddress = settings.address || "Your Company Address";
  const phoneNumber = settings.contactNumber || "+971 XXX XXXXXX";

  // SIMPLE and RELIABLE helper functions
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

  // Build items block with SIMPLE formatting
  let itemsBlock = '';
  
  if (invoice.items && invoice.items.length > 0) {
    // Traditional invoice with items
    itemsBlock = invoice.items.map(item => {
      const sellingPrice = parseFloat(item.sellingPrice) || parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      const itemTotal = sellingPrice * quantity;
      
      return [
        line(item.name, `Rs${itemTotal.toFixed(2)}`),
        `  Qty: ${quantity} × Rs${sellingPrice.toFixed(2)}`,
        ""
      ].join('\n');
    }).join('\n');
  } else if (invoice.craneDetails && invoice.craneDetails.length > 0) {
    // Crane rental invoice
    itemsBlock = invoice.craneDetails.map(crane => {
      const craneCost = parseFloat(crane.craneCost) || 0;
      const hours = crane.hours || 0;
      const days = crane.days || 0;
      const billingType = invoice.rentalType || 'daily';
      
      return [
        line(crane.craneName || 'Crane Rental', `Rs${craneCost.toFixed(2)}`),
        `  ${billingType === 'hourly' ? `${hours} hours` : `${days} days`} × ${crane.craneName || 'Crane'}`,
        ""
      ].join('\n');
    }).join('\n');
  } else {
    itemsBlock = "No items specified";
  }

  // Build receipt with PERFECT 42-column layout
  const receiptText = [
    center(shopName.toUpperCase()),
    center(shopAddress),
    center(`Tel: ${phoneNumber}`),
    "",
    repeat("*"),
    center("CASH RECEIPT"),
    repeat("*"),
    "",
    `Invoice: ${invoice.invoiceNumber || 'N/A'}`,
    `Date: ${new Date(invoice.date || invoice.createdAt).toLocaleDateString()}`,
    `Time: ${new Date(invoice.date || invoice.createdAt).toLocaleTimeString()}`,
    `Cashier: ${currentUser?.username || "Unknown"}`,
    "",
    repeat("-"),
    "Description                    Price",
    repeat("-"),
    "",
    itemsBlock,
    repeat("-"),
    line("Subtotal:", `Rs${parseFloat(invoice.subtotal || invoice.subtotal || 0).toFixed(2)}`),
    line(`Discount (${settings.discountPercentage || 0}%):`, `-Rs${parseFloat(invoice.discount || 0).toFixed(2)}`),
    repeat("-"),
    line("TOTAL:", `Rs${parseFloat(invoice.total || invoice.totalAmount || 0).toFixed(2)}`),
    "",
    line("Cash:", `Rs${parseFloat(invoice.total || invoice.totalAmount || 0).toFixed(2)}`),
    line("Change:", "Rs0.00"),
    "",
    repeat("*"),
    center("THANK YOU!"),
    repeat("*"),
    "",
    center("Powered by Codebridge"),
    center("Contact: +92 308 2283845"),
    ""
  ].join('\n');

  // Enhanced HTML wrapper with print button and better styling
  const printContent = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt - ${invoice.invoiceNumber}</title>
      <style>
        @media print {
          @page { 
            size: 76mm auto; 
            margin: 2mm; 
          }
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            font-size: 11px !important;
            line-height: 1.2 !important;
            color: #000000 !important;
          }
          .receipt-container {
            border: none !important;
            box-shadow: none !important;
            padding: 3mm !important;
            width: 74mm !important;
          }
          pre {
            font-family: "Courier New", "Lucida Console", "Monaco", monospace !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            white-space: pre !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            font-weight: bold !important;
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
          font-size: 11px; line-height: 1.2;
          color: #000000;
        }
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #000000;
          font-weight: bold;
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
        Invoice: ${invoice.invoiceNumber} | Date: ${new Date(invoice.date || invoice.createdAt).toLocaleDateString()}<br>
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
          <div className="flex space-x-3">
                          <Link href="/invoices/generate-crane-rental" className="btn-primary">
                🚁 Generate Crane Rental Invoice
              </Link>
          </div>
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
                  {formatCurrency(invoices.reduce((sum, invoice) => sum + (invoice.total || invoice.totalAmount || 0), 0))}
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
                    <th className="table-header">Type</th>
                    <th className="table-header">Items/Cranes</th>
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
                        {new Date(invoice.date || invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          invoice.craneDetails ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {invoice.craneDetails ? '🚁 Crane Rental' : '🧾 Standard'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {invoice.items ? invoice.items.length : 
                         invoice.craneDetails ? invoice.craneDetails.length : 0}
                      </td>
                      <td className="table-cell">{formatCurrency(invoice.subtotal || 0)}</td>
                      <td className="table-cell">{formatCurrency(invoice.discount || 0)}</td>
                      <td className="table-cell font-medium">{formatCurrency(invoice.total || invoice.totalAmount || 0)}</td>
                      <td className="table-cell">
                        <div className="flex space-x-3">
                          <Link
                            href={`/invoices/${invoice._id}`}
                            className="text-blue-600 hover:text-blue-900 text-lg cursor-pointer transition-colors duration-200"
                            title="View Invoice"
                          >
                            👁️
                          </Link>
                          <button
                            onClick={() => printInvoice(invoice, settings, currentUser)}
                            className="text-blue-600 hover:text-blue-900 text-lg cursor-pointer transition-colors duration-200"
                            title="Print Receipt (Old Format)"
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