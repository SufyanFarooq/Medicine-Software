import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';

export default function CustomerStatementPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedTransactions, setExpandedTransactions] = useState(new Set());

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const generateStatement = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        customerId: selectedCustomer,
        startDate,
        endDate
      });

      const response = await apiRequest(`/api/customers/statement?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStatement(data);
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to generate statement');
      }
    } catch (error) {
      console.error('Error generating statement:', error);
      alert('Error generating statement');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount || 0);
  };

  const toggleTransactionExpansion = (transactionId) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-AE');
  };

  if (!hasPermission(currentUser?.role, 'canViewCustomerStatement')) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to view customer statements.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Statement</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate and view customer account statements with date filtering
          </p>
        </div>

        {/* Filters */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statement Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer *
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Choose a customer...</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.companyName} - {customer.contactPerson}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={generateStatement}
                disabled={loading || !selectedCustomer}
                className="btn-primary w-full"
              >
                {loading ? '⏳ Generating...' : '📊 Generate Statement'}
              </button>
            </div>
          </div>
        </div>

        {/* Statement Results */}
        {statement && (
          <div className="card print-container">
            <div className="flex justify-between items-center mb-6 print-header">
              <h3 className="text-lg font-medium text-gray-900">Statement Report</h3>
              <button
                onClick={() => {
                  // Create print-optimized version
                  const printWindow = window.open('', '_blank');
                  const printContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Customer Statement - ${statement.customer.companyName}</title>
                      <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                        .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
                        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; }
                        .summary-card { border: 1px solid #000; padding: 10px; text-align: center; }
                        .summary-card h3 { margin: 0 0 5px 0; font-size: 10px; }
                        .summary-card p { margin: 0; font-size: 14px; font-weight: bold; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .table th, .table td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; }
                        .table th { background-color: #f0f0f0; font-weight: bold; }
                        .invoice-items { font-size: 10px; margin-top: 5px; }
                        .invoice-item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        .invoice-summary { margin-top: 5px; padding-top: 5px; border-top: 1px solid #000; }
                        .footer { text-align: center; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <h1>Statement Report</h1>
                      </div>
                      
                      <div class="customer-info">
                        <div>
                          <strong>Company:</strong> ${statement.customer.companyName}<br>
                          <strong>Email:</strong> ${statement.customer.email}<br>
                          <strong>VAT Number:</strong> ${statement.customer.vatNumber || 'N/A'}
                        </div>
                        <div>
                          <strong>Contact Person:</strong> ${statement.customer.contactPerson}<br>
                          <strong>Phone:</strong> ${statement.customer.phone}<br>
                          <strong>LPO Number:</strong> ${statement.customer.lpoNumber || 'N/A'}
                        </div>
                      </div>
                      
                      <div class="summary">
                        <div class="summary-card">
                          <h3>Total Rentals</h3>
                          <p>${statement.summary.totalRentals}</p>
                        </div>
                        <div class="summary-card">
                          <h3>Total Invoices</h3>
                          <p>${statement.summary.totalInvoices}</p>
                        </div>
                        <div class="summary-card">
                          <h3>Total Amount</h3>
                          <p>${formatCurrency(statement.summary.totalAmount)}</p>
                        </div>
                        <div class="summary-card">
                          <h3>Paid Amount</h3>
                          <p>${formatCurrency(statement.summary.paidAmount)}</p>
                        </div>
                        <div class="summary-card">
                          <h3>Outstanding</h3>
                          <p>${formatCurrency(statement.summary.outstanding)}</p>
                        </div>
                      </div>
                      
                      <h3>Transaction Details</h3>
                      <table class="table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Invoice No.</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${statement.transactions.map(transaction => `
                            <tr>
                              <td>${formatDate(transaction.date)}</td>
                              <td>${transaction.type === 'rental' ? 'Rental' : transaction.type === 'invoice' ? 'Invoice' : 'Payment'}</td>
                              <td>${transaction.invoiceNumber}</td>
                              <td>
                                ${transaction.description}
                                ${transaction.type === 'invoice' && transaction.items && transaction.items.length > 0 ? `
                                  <div class="invoice-items">
                                    ${transaction.items.map(item => `
                                      <div class="invoice-item">
                                        <span>${item.description} (${item.quantity} × ${formatCurrency(item.unitPrice)})</span>
                                        <span>${formatCurrency(item.total)}</span>
                                      </div>
                                    `).join('')}
                                    ${transaction.subtotal > 0 ? `
                                      <div class="invoice-summary">
                                        <div>Subtotal: ${formatCurrency(transaction.subtotal)}</div>
                                        ${transaction.discount > 0 ? `<div>Discount: -${formatCurrency(transaction.discount)}</div>` : ''}
                                        <div><strong>Total: ${formatCurrency(transaction.amount)}</strong></div>
                                      </div>
                                    ` : ''}
                                  </div>
                                ` : ''}
                              </td>
                              <td>${transaction.type === 'rental' || transaction.type === 'invoice' ? '+' : '-'}${formatCurrency(transaction.amount)}</td>
                              <td>${transaction.status}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      
                      <div class="footer">
                        <p>Generated on: ${new Date().toLocaleDateString('en-AE')} at ${new Date().toLocaleTimeString('en-AE')}</p>
                        <p>Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
                      </div>
                    </body>
                    </html>
                  `;
                  
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }}
                className="btn-secondary no-print"
              >
                🖨️ Print Statement
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Company:</span> {statement.customer.companyName}
                </div>
                <div>
                  <span className="font-medium">Contact Person:</span> {statement.customer.contactPerson}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {statement.customer.email || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {statement.customer.phone || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">VAT Number:</span> {statement.customer.vatNumber || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">LPO Number:</span> {statement.customer.lpoNumber || 'N/A'}
                </div>
              </div>
            </div>

            {/* Statement Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-600">Total Rentals</div>
                <div className="text-2xl font-bold text-blue-900">{statement.summary.totalRentals}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-purple-600">Total Invoices</div>
                <div className="text-2xl font-bold text-purple-900">{statement.summary.totalInvoices}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-600">Total Amount</div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(statement.summary.totalAmount)}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-yellow-600">Paid Amount</div>
                <div className="text-2xl font-bold text-yellow-900">{formatCurrency(statement.summary.paidAmount)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-red-600">Outstanding</div>
                <div className="text-2xl font-bold text-red-900">{formatCurrency(statement.summary.outstanding)}</div>
              </div>
            </div>

            {/* Transaction Details */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Transaction Details</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Invoice No.</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statement.transactions.map((transaction, index) => (
                      <React.Fragment key={index}>
                        <tr className="hover:bg-gray-50">
                        <td className="table-cell">{formatDate(transaction.date)}</td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.type === 'rental' 
                              ? 'bg-purple-100 text-purple-800'
                              : transaction.type === 'invoice' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {transaction.type === 'rental' ? 'Rental' : transaction.type === 'invoice' ? 'Invoice' : 'Payment'}
                          </span>
                        </td>
                        <td className="table-cell font-medium">{transaction.invoiceNumber}</td>
                        <td className="table-cell">
                          <div className="space-y-1">
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.type === 'rental' && (
                              <div className="text-xs text-gray-500 space-y-1">
                                {transaction.projectLocation !== 'N/A' && (
                                  <div>📍 {transaction.projectLocation}</div>
                                )}
                                {transaction.craneName !== 'Unknown Crane' && (
                                  <div>🚁 {transaction.craneName}</div>
                                )}
                                {transaction.craneCode !== 'N/A' && (
                                  <div>🏷️ {transaction.craneCode}</div>
                                )}
                                {transaction.billingType !== 'N/A' && (
                                  <div>💰 {transaction.billingType}</div>
                                )}
                                {transaction.totalHours > 0 && (
                                  <div>⏱️ {transaction.totalHours} hours</div>
                                )}
                                {transaction.totalDays > 0 && (
                                  <div>📅 {transaction.totalDays} days</div>
                                )}
                              </div>
                            )}
                            {transaction.type === 'invoice' && (
                              <div className="text-xs text-gray-500 space-y-1">
                                {transaction.projectLocation !== 'N/A' && (
                                  <div>📍 {transaction.projectLocation}</div>
                                )}
                                {transaction.craneName !== 'Unknown Crane' && (
                                  <div>🚁 {transaction.craneName}</div>
                                )}
                                {transaction.status && (
                                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                    transaction.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                    transaction.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transaction.status}
                                  </div>
                                )}
                                {transaction.dueDate && (
                                  <div>📅 Due: {new Date(transaction.dueDate).toLocaleDateString()}</div>
                                )}
                                {transaction.discount > 0 && (
                                  <div>💰 Discount: {formatCurrency(transaction.discount)}</div>
                                )}
                                {transaction.subtotal > 0 && (
                                  <div>📊 Subtotal: {formatCurrency(transaction.subtotal)}</div>
                                )}
                                {transaction.itemsCount > 0 && (
                                  <div>📦 {transaction.itemsCount} items</div>
                                )}
                                {transaction.notes && (
                                  <div className="italic">📝 {transaction.notes}</div>
                                )}
                              </div>
                            )}
                            {transaction.type === 'payment' && transaction.reason !== 'N/A' && (
                              <div className="text-xs text-gray-500">
                                📝 {transaction.reason}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell font-medium">
                          <span className={transaction.type === 'rental' || transaction.type === 'invoice' ? 'text-red-600' : 'text-green-600'}>
                            {transaction.type === 'rental' || transaction.type === 'invoice' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expandable Invoice Items */}
                      {transaction.type === 'invoice' && transaction.items && transaction.items.length > 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-2">
                            <button
                              onClick={() => toggleTransactionExpansion(transaction.invoiceNumber)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              {expandedTransactions.has(transaction.invoiceNumber) ? '▼' : '▶'} 
                              {expandedTransactions.has(transaction.invoiceNumber) ? 'Hide' : 'Show'} Invoice Items ({transaction.items.length})
                            </button>
                            
                            {expandedTransactions.has(transaction.invoiceNumber) && (
                              <div className="mt-2 ml-4 bg-gray-50 rounded-lg p-3">
                                <div className="text-sm font-medium text-gray-700 mb-2">Invoice Items:</div>
                                <div className="space-y-2">
                                  {transaction.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center bg-white p-2 rounded border">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{item.description}</div>
                                        <div className="text-xs text-gray-500">
                                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {formatCurrency(item.total)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {transaction.subtotal > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <div className="flex justify-between text-sm">
                                      <span>Subtotal:</span>
                                      <span>{formatCurrency(transaction.subtotal)}</span>
                                    </div>
                                    {transaction.discount > 0 && (
                                      <div className="flex justify-between text-sm text-red-600">
                                        <span>Discount:</span>
                                        <span>-{formatCurrency(transaction.discount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm font-bold text-gray-900">
                                      <span>Total:</span>
                                      <span>{formatCurrency(transaction.amount)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statement Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  Generated on: {new Date().toLocaleDateString('en-AE')} at {new Date().toLocaleTimeString('en-AE')}
                </div>
                <div>
                  Period: {formatDate(startDate)} to {formatDate(endDate)}
                </div>
              </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  font-size: 12px;
                  line-height: 1.2;
                }
                
                .print-container {
                  width: 100%;
                  max-width: none;
                  margin: 0;
                  padding: 0;
                  box-shadow: none;
                  background: white;
                }
                
                .print-header {
                  margin-bottom: 10px;
                  padding-bottom: 5px;
                  border-bottom: 2px solid #000;
                }
                
                .print-customer-info {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 10px;
                  margin-bottom: 10px;
                  font-size: 11px;
                }
                
                .print-summary {
                  display: grid;
                  grid-template-columns: repeat(5, 1fr);
                  gap: 5px;
                  margin-bottom: 10px;
                }
                
                .print-summary-card {
                  padding: 5px;
                  border: 1px solid #000;
                  text-align: center;
                  font-size: 10px;
                }
                
                .print-summary-card h3 {
                  font-size: 10px;
                  margin: 0 0 2px 0;
                }
                
                .print-summary-card p {
                  font-size: 12px;
                  font-weight: bold;
                  margin: 0;
                }
                
                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 10px;
                }
                
                .print-table th,
                .print-table td {
                  border: 1px solid #000;
                  padding: 3px;
                  text-align: left;
                  vertical-align: top;
                }
                
                .print-table th {
                  background-color: #f0f0f0;
                  font-weight: bold;
                  font-size: 9px;
                }
                
                .print-invoice-items {
                  font-size: 9px;
                  margin-top: 3px;
                }
                
                .print-invoice-item {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 1px;
                  padding: 1px 0;
                }
                
                .print-invoice-summary {
                  margin-top: 3px;
                  padding-top: 2px;
                  border-top: 1px solid #000;
                  font-size: 9px;
                }
                
                .print-invoice-summary div {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 1px;
                }
                
                .print-footer {
                  margin-top: 10px;
                  text-align: center;
                  font-size: 9px;
                  border-top: 1px solid #000;
                  padding-top: 5px;
                }
                
                /* Hide non-printable elements */
                .no-print {
                  display: none !important;
                }
                
                /* Force page breaks */
                .page-break {
                  page-break-before: always;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </Layout>
  );
}
