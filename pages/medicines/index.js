import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SearchBar from '../../components/SearchBar';
import Link from 'next/link';
import { format } from 'date-fns';

export default function MedicinesList() {
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/medicines');
      if (response.ok) {
        const data = await response.json();
        setMedicines(data);
        setFilteredMedicines(data);
      } else {
        setError('Failed to fetch medicines');
      }
    } catch (error) {
      setError('Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredMedicines(medicines);
      return;
    }

    const filtered = medicines.filter(medicine =>
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMedicines(filtered);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this medicine?')) {
      return;
    }

    try {
      const response = await fetch(`/api/medicines/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMedicines();
      } else {
        alert('Failed to delete medicine');
      }
    } catch (error) {
      alert('Error deleting medicine');
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { text: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (quantity <= 10) return { text: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const getExpiryStatus = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiry < today) return { text: 'Expired', color: 'text-red-600 bg-red-100' };
    if (expiry <= thirtyDaysFromNow) return { text: 'Expiring Soon', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'Valid', color: 'text-green-600 bg-green-100' };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading medicines...</div>
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
            onClick={fetchMedicines}
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
            <h1 className="text-2xl font-bold text-gray-900">Medicines</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your medicine inventory
            </p>
          </div>
          <Link href="/medicines/add">
            <button className="btn-primary mt-4 sm:mt-0">
              Add Medicine
            </button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-blue-500">
                <span className="text-2xl text-white">💊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Medicines</p>
                <p className="text-2xl font-semibold text-gray-900">{medicines.length}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-lg bg-purple-500">
                <span className="text-2xl text-white">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Value of Medicines</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${medicines.reduce((sum, medicine) => sum + (medicine.quantity * medicine.purchasePrice), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="card">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {medicines.length === 0 ? 'No medicines found. Add your first medicine!' : 'No medicines match your search.'}
              </p>
              {medicines.length === 0 && (
                <Link href="/medicines/add">
                  <button className="btn-primary mt-4">
                    Add First Medicine
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Code</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Quantity</th>
                    <th className="table-header">Purchase Price</th>
                    <th className="table-header">Selling Price</th>
                    <th className="table-header">Expiry Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMedicines.map((medicine) => {
                    const stockStatus = getStockStatus(medicine.quantity);
                    const expiryStatus = getExpiryStatus(medicine.expiryDate);
                    
                    return (
                      <tr key={medicine._id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">{medicine.code}</td>
                        <td className="table-cell">{medicine.name}</td>
                        <td className="table-cell">{medicine.quantity}</td>
                        <td className="table-cell">${medicine.purchasePrice}</td>
                        <td className="table-cell">${medicine.sellingPrice}</td>
                        <td className="table-cell">
                          {format(new Date(medicine.expiryDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                              {stockStatus.text}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${expiryStatus.color}`}>
                              {expiryStatus.text}
                            </span>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            <Link href={`/medicines/${medicine._id}`}>
                              <button className="text-primary-600 hover:text-primary-900 text-sm font-medium">
                                Edit
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDelete(medicine._id)}
                              className="text-danger-600 hover:text-danger-900 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-500">
          Showing {filteredMedicines.length} of {medicines.length} medicines
        </div>
      </div>
    </Layout>
  );
} 