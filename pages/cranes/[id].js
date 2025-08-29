import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function CraneDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [crane, setCrane] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchCrane();
    }
  }, [id]);

  const fetchCrane = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/cranes/${id}`);
      if (response.ok) {
        const craneData = await response.json();
        setCrane(craneData);
      } else {
        setError('Crane not found');
      }
    } catch (error) {
      console.error('Error fetching crane:', error);
      setError('Error fetching crane');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this crane?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/cranes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/cranes');
      } else {
        alert('Failed to delete crane');
      }
    } catch (error) {
      console.error('Error deleting crane:', error);
      alert('Error deleting crane');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading crane details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !crane) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Crane Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested crane could not be found'}</p>
            <Link
              href="/cranes"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              ← Back to Cranes
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
                  {crane.name}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Crane Code: {crane.code}
                </p>
              </div>
              <div className="flex space-x-3">
                <Link
                  href="/cranes"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  ← Back to Cranes
                </Link>
                <Link
                  href={`/cranes/${id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  ✏️ Edit Crane
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Crane Information */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Crane Information</h3>
            </div>
            
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Basic Information</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Crane Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Crane Code</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.code}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          crane.status === 'Available' 
                            ? 'bg-green-100 text-green-800'
                            : crane.status === 'In Use'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {crane.status}
                        </span>
                      </dd>
                    </div>
                  </div>
                </div>

                {/* Specifications */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Specifications</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.capacity}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Boom Length</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.boomLength || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.location || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Operator</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.operator || 'N/A'}</dd>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Financial Information</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Purchase Price</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {crane.purchasePrice ? formatCurrency(crane.purchasePrice) : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Daily Rate</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {crane.dailyRate ? formatCurrency(crane.dailyRate) : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Hourly Rate</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {crane.hourlyRate ? formatCurrency(crane.hourlyRate) : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Minimum Rental Hours</dt>
                      <dd className="mt-1 text-sm text-gray-900">{crane.minRentalHours || 'N/A'}</dd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Schedule */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Maintenance Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Maintenance</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {crane.lastMaintenance ? new Date(crane.lastMaintenance).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Next Maintenance</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {crane.nextMaintenance ? new Date(crane.nextMaintenance).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {crane.notes && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Notes</h4>
                  <p className="text-sm text-gray-900">{crane.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
            <div className="flex space-x-4">
              <Link
                href={`/cranes/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                ✏️ Edit Crane
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                🗑️ Delete Crane
              </button>
              <Link
                href="/cranes"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back to Cranes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
