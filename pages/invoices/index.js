import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import { getUser, hasPermission } from '../../lib/auth';
import { canPerformAction } from '../../lib/permissions';

// Print invoice function
const printInvoice = (invoice, settings = {}, currentUser = null) => {
  const currentDate = new Date();
  const shopName = settings.shopName || "Medical Shop";
  const shopAddress = settings.address || "Your Shop Address";
  const phoneNumber = settings.contactNumber || "+92 XXX XXXXXXX";

  // Create print content for thermal printer (80mm width)
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Medical Shop Receipt</title>
        <style>
          @media print {
            @page {
              margin: 0;
              size: 80mm auto;
            }
          }
          
          body { 
            font-family: 'Courier New', monospace; 
            margin: 0; 
            padding: 10px; 
            width: 80mm; 
            font-size: 12px;
            line-height: 1.2;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 15px; 
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          
          .shop-name { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          
          .shop-address { 
            font-size: 10px; 
            margin-bottom: 5px;
          }
          
          .shop-phone { 
            font-size: 10px; 
            margin-bottom: 5px;
          }
          
          .receipt-type { 
            font-size: 12px; 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          
          .invoice-info { 
            margin-bottom: 15px; 
            font-size: 10px;
          }
          
          .customer-info { 
            margin-bottom: 15px; 
            font-size: 10px;
          }
          
          .items-table { 
            width: 100%; 
            margin-bottom: 15px; 
            font-size: 10px;
          }
          
          .item-row { 
            margin-bottom: 8px; 
            border-bottom: 1px dotted #ccc;
            padding-bottom: 5px;
          }
          
          .item-name { 
            font-weight: bold; 
            margin-bottom: 2px;
          }
          
          .item-details { 
            display: flex; 
            justify-content: space-between; 
            font-size: 9px;
          }
          
          .item-price { 
            text-align: right;
          }
          
          .summary { 
            border-top: 1px dashed #000; 
            padding-top: 10px; 
            margin-bottom: 15px;
            font-size: 11px;
          }
          
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px;
          }
          
          .total-row { 
            font-weight: bold; 
            font-size: 12px; 
            border-top: 1px solid #000; 
            padding-top: 5px;
            margin-top: 5px;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 15px; 
            font-size: 9px; 
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
          
          .thank-you { 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          
          .terms { 
            font-size: 8px; 
            color: #666;
            line-height: 1.1;
          }
          
          .divider { 
            border-top: 1px dashed #000; 
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shopName}</div>
          <div class="shop-address">${shopAddress}</div>
          <div class="shop-phone">${phoneNumber}</div>
          <div class="receipt-type">ORIGINAL</div>
        </div>
        
        <div class="invoice-info">
          <div style="display: flex; justify-content: space-between;">
            <span>Invoice #: ${invoice.invoiceNumber}</span>
            <span>Date: ${new Date(invoice.date).toLocaleDateString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Time: ${new Date(invoice.date).toLocaleTimeString()}</span>
            <span>Cashier: ${currentUser?.username || 'Unknown'}</span>
          </div>
        </div>

        <div class="customer-info">
          <div>Customer: WALK IN CUSTOMER</div>
          <div>Payment: Cash</div>
        </div>

        <div class="items-table">
          ${invoice.items.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                <span class="item-price">Qty: ${item.quantity} × ${formatCurrency(item.sellingPrice)}</span>
              </div>
              <div class="item-details">
                <span></span>
                <span class="item-price"><strong>${formatCurrency(item.sellingPrice * item.quantity)}</strong></span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(invoice.subtotal)}</span>
          </div>
          <div class="summary-row">
            <span>Discount:</span>
            <span>-${formatCurrency(invoice.discount)}</span>
          </div>
          <div class="divider"></div>
          <div class="summary-row total-row">
            <span>TOTAL:</span>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
          <div class="summary-row">
            <span>Amount Paid:</span>
            <span>${formatCurrency(invoice.total)}</span>
          </div>
          <div class="summary-row">
            <span>Balance:</span>
            <span>Rs. 0.00</span>
          </div>
        </div>

        <div class="footer">
          <div class="thank-you">Thank You!</div>
          <div class="terms">
            Please keep this receipt for your records.<br>
            No refunds on medicines after purchase.<br>
            For any queries, please contact us.
          </div>
          <div class="divider"></div>
          <div class="company-promotion">
            <div style="text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 3px;">
              Powered by Codebridge
            </div>
            <div style="text-align: center; font-size: 9px; color: #666;">
              Contact: 03082283845
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
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