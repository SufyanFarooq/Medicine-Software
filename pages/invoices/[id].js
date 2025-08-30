import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function InvoiceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/invoices/${id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        setError('Invoice not found');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('Error fetching invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested invoice could not be found.'}</p>
            <Link
              href="/invoices"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ← Back to Invoices
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Invoice: {invoice.invoiceNumber}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Created on {new Date(invoice.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href="/invoices"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  ← Back to Invoices
                </Link>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  🖨️ Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Content - 4x6 Format */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            {/* Print-friendly Invoice */}
            <div className="p-8 print:p-4" style={{ minHeight: '600px' }}>
              {/* Company Header */}
              <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  AL SALAMA TRANSPORT L.L.C
                </div>
                <div className="text-lg text-gray-600 mb-1">
                  Dubai P.O BOX 239264
                </div>
                <div className="text-lg text-gray-600 mb-1">
                  United Arab Emirates
                </div>
                <div className="text-sm text-gray-500">
                  TRN: 100396030700003
                </div>
              </div>

              {/* Invoice Title and Number */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    TAX INVOICE
                  </h2>
                  <div className="text-lg text-gray-600">
                    <strong>Invoice #:</strong> {invoice.invoiceNumber}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg text-gray-600 mb-1">
                    <strong>Invoice Date:</strong> {new Date(invoice.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-lg text-gray-600 mb-1">
                    <strong>Payment Terms:</strong> {invoice.paymentTerms}
                  </div>
                  <div className="text-lg text-gray-600">
                    <strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
                  Bill To:
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 mb-1">
                      {invoice.customerName}
                    </div>
                    <div className="text-gray-600 mb-1">
                      {invoice.customerEmail}
                    </div>
                    <div className="text-gray-600 mb-1">
                      {invoice.customerPhone}
                    </div>
                    <div className="text-gray-600">
                      {invoice.projectLocation}
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900 mb-2">
                      Project Details:
                    </div>
                    <div className="text-gray-600 mb-1">
                      <strong>Project:</strong> {invoice.projectName}
                    </div>
                    <div className="text-gray-600 mb-1">
                      <strong>Location:</strong> {invoice.projectLocation}
                    </div>
                    <div className="text-gray-600">
                      <strong>Period:</strong> {new Date(invoice.startDate).toLocaleDateString()} - {new Date(invoice.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Crane Services Table */}
              <div className="mb-8">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        #
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Item & Description
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        Qty
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Rate
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Tax
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.craneDetails.map((crane, index) => (
                      <tr key={index} className="border-b border-gray-300">
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">
                            {crane.craneName} ({crane.craneCode})
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {crane.craneType} - {crane.craneCapacity}
                          </div>
                          <div className="text-xs text-gray-600">
                            {invoice.billingType === 'hourly' ? `${crane.hours} hours` : `${crane.days} days`} at site
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-900">
                          {invoice.billingType === 'hourly' ? crane.hours : crane.days}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(invoice.billingType === 'hourly' ? (crane.dailyRate / 8) : crane.dailyRate)}
                          /{invoice.billingType === 'hourly' ? 'hr' : 'day'}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(crane.craneCost * 0.05)}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-900 font-medium">
                          {formatCurrency(crane.craneCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section */}
              <div className="flex justify-end mb-8">
                <div className="w-80">
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">Sub Total:</span>
                      <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="text-gray-600">VAT (5%):</span>
                      <span className="font-medium">{formatCurrency(invoice.vatAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Summary */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-2">
                  Tax Summary
                </h4>
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <div className="mb-2">
                      <strong>Tax Details:</strong> Standard Rate (5%)
                    </div>
                    <div className="mb-2">
                      <strong>Taxable Amount:</strong> {formatCurrency(invoice.subtotal)}
                    </div>
                    <div>
                      <strong>Tax Amount:</strong> {formatCurrency(invoice.vatAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">
                      <strong>Total Taxable:</strong> {formatCurrency(invoice.subtotal)}
                    </div>
                    <div className="mb-2">
                      <strong>Total Tax:</strong> {formatCurrency(invoice.vatAmount)}
                    </div>
                    <div>
                      <strong>Grand Total:</strong> {formatCurrency(invoice.totalAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Footer */}
              <div className="border-t border-gray-300 pt-6">
                <div className="text-center text-gray-600 mb-4">
                  Thanks for your business with us.
                </div>
                <div className="text-center text-sm text-gray-500">
                  <div>Email: alsalamatransport1@gmail.com</div>
                  <div>Landline: 042356665</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .bg-gray-50 {
            background-color: white !important;
          }
          .shadow-lg {
            box-shadow: none !important;
          }
          .border {
            border-color: #000 !important;
          }
          .border-gray-300 {
            border-color: #000 !important;
          }
          .text-gray-900 {
            color: #000 !important;
          }
          .text-gray-600 {
            color: #000 !important;
          }
          .text-gray-500 {
            color: #000 !important;
          }
        }
      `}</style>
    </Layout>
  );
}
