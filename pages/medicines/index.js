import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await apiRequest('/api/medicines');
      if (response.ok) {
        const data = await response.json();
        setMedicines(data);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this medicine?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/medicines/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMedicines();
      } else {
        alert('Failed to delete medicine');
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
      alert('Error deleting medicine');
    }
  };

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your medicine inventory
            </p>
          </div>
          <Link href="/medicines/add" className="btn-primary">
            💊 Add Medicine
          </Link>
        </div>

        {/* Search */}
        <div className="card">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search medicines by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Medicines List */}
        <div className="card">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No medicines found</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first medicine to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Code</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header">Purchase Price</th>
                    <th className="table-header">Selling Price</th>
                    <th className="table-header">Expiry Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMedicines.map((medicine) => (
                    <tr key={medicine._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{medicine.name}</td>
                      <td className="table-cell">{medicine.code}</td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          medicine.quantity <= 10 
                            ? 'bg-red-100 text-red-800' 
                            : medicine.quantity <= 50 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {medicine.quantity}
                        </span>
                      </td>
                      <td className="table-cell">{formatCurrency(medicine.purchasePrice)}</td>
                      <td className="table-cell">{formatCurrency(medicine.sellingPrice)}</td>
                      <td className="table-cell">
                        {new Date(medicine.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <div className="flex space-x-3">
                          <Link
                            href={`/medicines/${medicine._id}`}
                            className="text-blue-600 hover:text-blue-900 text-lg cursor-pointer transition-colors duration-200"
                            title="View Details"
                          >
                            👁️
                          </Link>
                          <Link
                            href={`/medicines/${medicine._id}/edit`}
                            className="text-green-600 hover:text-green-900 text-lg cursor-pointer transition-colors duration-200"
                            title="Edit Medicine"
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(medicine._id)}
                            className="text-red-600 hover:text-red-900 text-lg cursor-pointer transition-colors duration-200"
                            title="Delete Medicine"
                          >
                            🗑️
                          </button>
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