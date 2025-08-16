import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    fetchMedicines();
    fetchTopSellingItems();
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

  const fetchTopSellingItems = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await apiRequest('/api/invoices');
      if (response.ok) {
        const invoices = await response.json();
        
        // Calculate sales for each medicine
        const salesData = {};
        
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            if (item.medicineId) {
              if (!salesData[item.medicineId]) {
                salesData[item.medicineId] = {
                  medicineId: item.medicineId,
                  name: item.name,
                  code: item.code,
                  totalSold: 0,
                  totalRevenue: 0,
                  totalProfit: 0
                };
              }
              
              const quantity = item.quantity || 0;
              const price = item.price || 0;
              
              salesData[item.medicineId].totalSold += quantity;
              salesData[item.medicineId].totalRevenue += Math.round((price * quantity) * 100) / 100;
              
              // Find medicine to calculate profit
              const medicine = medicines.find(m => m._id === item.medicineId);
              if (medicine) {
                const profit = Math.round(((price - medicine.purchasePrice) * quantity) * 100) / 100;
                salesData[item.medicineId].totalProfit += profit;
              }
            }
          });
        });
        
        // Convert to array and sort by total sold quantity
        const sortedItems = Object.values(salesData)
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 10); // Top 10
        
        setTopSellingItems(sortedItems);
      }
    } catch (error) {
      console.error('Error fetching top selling items:', error);
    } finally {
      setAnalyticsLoading(false);
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
        fetchTopSellingItems(); // Refresh analytics after deletion
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600">        </div>
      </div>
      
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scroll-smooth {
          scroll-behavior: smooth;
        }
        
        #top-selling-container {
          scroll-snap-type: x mandatory;
        }
        
        #top-selling-container > div {
          scroll-snap-align: start;
        }
      `}</style>
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

        {/* Top 10 Selling Items - Compact View */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              🏆 Top 10 Selling Items
            </h2>
            <button
              onClick={fetchTopSellingItems}
              disabled={analyticsLoading}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {analyticsLoading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>
          
          {analyticsLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : topSellingItems.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No sales data available</p>
            </div>
          ) : (
            <div className="relative">
              {/* Left Arrow */}
              <button
                onClick={() => {
                  const container = document.getElementById('top-selling-container');
                  if (container) {
                    container.scrollTo({
                      left: container.scrollLeft - 300,
                      behavior: 'smooth'
                    });
                  }
                }}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-50 shadow-md transition-all hover:scale-110"
              >
                ←
              </button>
              
              {/* Right Arrow */}
              <button
                onClick={() => {
                  const container = document.getElementById('top-selling-container');
                  if (container) {
                    container.scrollTo({
                      left: container.scrollLeft + 300,
                      behavior: 'smooth'
                    });
                  }
                }}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-50 shadow-md transition-all hover:scale-110"
              >
                →
              </button>
              
              {/* Items Container */}
              <div 
                id="top-selling-container"
                className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-10 scroll-smooth"
                onKeyDown={(e) => {
                  const container = e.currentTarget;
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    container.scrollTo({
                      left: container.scrollLeft - 300,
                      behavior: 'smooth'
                    });
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    container.scrollTo({
                      left: container.scrollLeft + 300,
                      behavior: 'smooth'
                    });
                  }
                }}
                tabIndex={0}
              >
                {topSellingItems.map((item, index) => (
                  <div key={item.medicineId} className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-2 hover:bg-blue-100 transition-colors flex-shrink-0">
                    {/* Rank Badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Medicine Name */}
                    <span className="text-sm font-medium text-gray-800 max-w-32 truncate" title={item.name}>
                      {item.name}
                    </span>
                    
                    {/* Sold Units */}
                    <span className="text-xs text-blue-600 font-semibold bg-blue-100 px-2 py-1 rounded-full">
                      {item.totalSold} sold
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
      
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Layout>
  );
} 