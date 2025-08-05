import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function MedicineDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchMedicine();
    }
  }, [id]);

  const fetchMedicine = async () => {
    try {
      const response = await apiRequest(`/api/medicines/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMedicine(data);
      } else {
        setError('Medicine not found');
      }
    } catch (error) {
      console.error('Error fetching medicine:', error);
      setError('Error loading medicine');
    } finally {
      setLoading(false);
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

  if (error || !medicine) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error || 'Medicine not found'}</div>
          <button
            onClick={() => router.push('/medicines')}
            className="btn-primary"
          >
            Back to Medicines
          </button>
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
            <h1 className="text-2xl font-bold text-gray-900">Medicine Details</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and edit medicine information
            </p>
          </div>
                      <button
              onClick={() => router.push('/medicines')}
              className="btn-secondary"
            >
              ⬅️ Back to Medicines
            </button>
        </div>

        {/* Medicine Details */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{medicine.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">{medicine.code}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Batch Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{medicine.batchNo || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing & Stock</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      medicine.quantity <= 10 
                        ? 'bg-red-100 text-red-800' 
                        : medicine.quantity <= 50 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {medicine.quantity}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Purchase Price</dt>
                  <dd className="mt-1 text-sm text-gray-900">${formatCurrency(medicine.purchasePrice)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Selling Price</dt>
                  <dd className="mt-1 text-sm text-gray-900">${formatCurrency(medicine.sellingPrice)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(medicine.expiryDate).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => router.push(`/medicines/${id}/edit`)}
              className="btn-primary"
            >
              ✏️ Edit Medicine
            </button>
            <button
              onClick={() => router.push('/medicines')}
              className="btn-secondary"
            >
              📋 Back to List
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
} 