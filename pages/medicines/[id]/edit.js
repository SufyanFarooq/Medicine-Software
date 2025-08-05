import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import MedicineForm from '../../../components/MedicineForm';
import { apiRequest } from '../../../lib/auth';

export default function EditMedicine() {
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
            ⬅️ Back to Medicines
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Medicine</h1>
            <p className="mt-1 text-sm text-gray-500">
              Update medicine information
            </p>
          </div>
          <button
            onClick={() => router.push(`/medicines/${id}`)}
            className="btn-secondary"
          >
            ⬅️ Back to Details
          </button>
        </div>

        {/* Edit Form */}
        <div className="card">
          <MedicineForm medicine={medicine} isEditing={true} />
        </div>
      </div>
    </Layout>
  );
} 