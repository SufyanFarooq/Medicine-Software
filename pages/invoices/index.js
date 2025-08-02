import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SearchBar from '../../components/SearchBar';
import { format } from 'date-fns';

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoices();
    fetchReturns();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
        setFilteredInvoices(data);
      } else {
        setError('Failed to fetch invoices');
      }
    } catch (error) {
      setError('Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      const response = await fetch('/api/returns');
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      } else {
        console.error('Failed to fetch returns');
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    }
  };

  const getInvoiceReturns = (invoiceId) => {
    return returns.filter(r => r.invoiceId === invoiceId);
  };

  const getTotalReturnsValue = (invoiceId) => {
    const invoiceReturns = getInvoiceReturns(invoiceId);
    return invoiceReturns.reduce((sum, r) => sum + r.returnValue, 0);
  };

  const handleSearch = (searchTerm) => {
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

  const handlePrintInvoice = (invoice) => {
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
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${format(new Date(invoice.date), 'MMM dd, yyyy')}</p>
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
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price}</td>
                  <td>$${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Subtotal: $${invoice.subtotal.toFixed(2)}</p>
            <p>Discount (3%): -$${invoice.discount.toFixed(2)}</p>
            <p>Total: $${invoice.total.toFixed(2)}</p>
          </div>

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please keep this invoice for your records.</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading invoices...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={fetchInvoices}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-sm text-gray-500">
              View all generated invoices
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <SearchBar onSearch={handleSearch} placeholder="Search invoices by number or medicine..." />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-green-500">
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
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
                <span className="text-2xl text-white">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${invoices.reduce((sum, invoice) => sum + invoice.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="card">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {invoices.length === 0 ? 'No invoices found. Generate your first invoice!' : 'No invoices match your search.'}
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
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{invoice.invoiceNumber}</td>
                      <td className="table-cell">
                        {format(new Date(invoice.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="table-cell">
                        <div className="text-sm">
                          {invoice.items.length} item(s)
                          <div className="text-gray-500 mt-1">
                            {invoice.items.slice(0, 2).map(item => item.name).join(', ')}
                            {invoice.items.length > 2 && '...'}
                          </div>
                          {/* Show return information if any */}
                          {(() => {
                            const invoiceReturns = getInvoiceReturns(invoice._id);
                            if (invoiceReturns.length > 0) {
                              const totalReturnValue = getTotalReturnsValue(invoice._id);
                              return (
                                <div className="text-red-500 mt-1 text-xs">
                                  {invoiceReturns.length} return(s) - ${totalReturnValue.toFixed(2)} returned
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="table-cell">${invoice.subtotal.toFixed(2)}</td>
                      <td className="table-cell">-${invoice.discount.toFixed(2)}</td>
                      <td className="table-cell font-bold">
                        ${invoice.total.toFixed(2)}
                        {/* Show if invoice was updated due to returns */}
                        {(() => {
                          const invoiceReturns = getInvoiceReturns(invoice._id);
                          if (invoiceReturns.length > 0 && invoice.updatedAt && invoice.updatedAt !== invoice.createdAt) {
                            return (
                              <div className="text-xs text-gray-500 mt-1">
                                Updated after returns
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handlePrintInvoice(invoice)}
                          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-500">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
      </div>
    </Layout>
  );
} 