import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import MedicineForm from '../../components/MedicineForm';

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
      setLoading(true);
      const response = await fetch(`/api/medicines/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setMedicine(data);
      } else {
        setError('Medicine not found');
      }
    } catch (error) {
      setError('Error fetching medicine');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading medicine...</div>
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
            onClick={() => router.push('/medicines')}
            className="btn-primary"
          >
            Back to Medicines
          </button>
        </div>
      </Layout>
    );
  }

  if (!medicine) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-gray-600 text-lg mb-4">Medicine not found</div>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Medicine</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update medicine information
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <MedicineForm medicine={medicine} isEditing={true} />
        </div>
      </div>
    </Layout>
  );
} 