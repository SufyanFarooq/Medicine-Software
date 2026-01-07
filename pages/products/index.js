import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [topSellingItems, setTopSellingItems] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchTopSellingItems();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.action-menu-container') && !event.target.closest('.action-menu')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const fetchProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
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
        
        // Calculate sales for each product
        const salesData = {};
        
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            if (item.productId) {
              if (!salesData[item.productId]) {
                salesData[item.productId] = {
                  productId: item.productId,
                  name: item.name,
                  code: item.code,
                  totalSold: 0,
                  totalRevenue: 0,
                  totalProfit: 0
                };
              }
              
              const quantity = item.quantity || 0;
              const price = item.price || 0;
              
              salesData[item.productId].totalSold += quantity;
              salesData[item.productId].totalRevenue += Math.round((price * quantity) * 100) / 100;
              
              // Find product to calculate profit
              const product = products.find(m => m._id === item.productId);
              if (product) {
                const profit = Math.round(((price - product.purchasePrice) * quantity) * 100) / 100;
                salesData[item.productId].totalProfit += profit;
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
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await apiRequest(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProducts();
        fetchTopSellingItems(); // Refresh analytics after deletion
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your product inventory
            </p>
          </div>
          <Link href="/products/add" className="btn-primary">
            📦 Add Product
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
                  <div key={item.productId} className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-2 hover:bg-blue-100 transition-colors flex-shrink-0">
                    {/* Rank Badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {/* Product Name */}
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
                placeholder="Search products by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="card">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No products found</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first product to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
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
                  {filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium max-w-xs">
                        <div className="truncate" title={product.name}>
                          {product.name}
                        </div>
                      </td>
                      <td className="table-cell max-w-xs">
                        <div className="truncate" title={product.code}>
                          {product.code}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          product.quantity <= 10 
                            ? 'bg-red-100 text-red-800' 
                            : product.quantity <= 50 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {product.quantity}
                        </span>
                      </td>
                      <td className="table-cell">{formatCurrency(product.purchasePrice)}</td>
                      <td className="table-cell">{formatCurrency(product.sellingPrice)}</td>
                      <td className="table-cell">
                        {new Date(product.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="table-cell relative">
                        <div className="relative action-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === product._id ? null : product._id);
                            }}
                            className="text-gray-600 hover:text-gray-900 text-xl cursor-pointer transition-colors duration-200 focus:outline-none px-2 py-1"
                            title="Actions"
                          >
                            ⋮
                          </button>
                          {openMenuId === product._id && (
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200 action-menu">
                              <div className="py-1">
                                <Link
                                  href={`/products/${product._id}`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <span className="mr-2">👁️</span>
                                  View Product
                                </Link>
                                <Link
                                  href={`/products/${product._id}/edit`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <span className="mr-2">✏️</span>
                                  Edit Product
                                </Link>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDelete(product._id);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center cursor-pointer"
                                  type="button"
                                >
                                  <span className="mr-2">🗑️</span>
                                  Delete Product
                                </button>
                              </div>
                            </div>
                          )}
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
        .table-cell {
          max-width: 200px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        table {
          table-layout: fixed;
          width: 100%;
        }
        table th:first-child,
        table td:first-child {
          width: 25%;
        }
        table th:nth-child(2),
        table td:nth-child(2) {
          width: 12%;
        }
        table th:nth-child(3),
        table td:nth-child(3) {
          width: 10%;
        }
        table th:nth-child(4),
        table td:nth-child(4),
        table th:nth-child(5),
        table td:nth-child(5) {
          width: 12%;
        }
        table th:nth-child(6),
        table td:nth-child(6) {
          width: 12%;
        }
        table th:last-child,
        table td:last-child {
          width: 8%;
        }
        .action-menu-container {
          overflow: visible !important;
          position: relative !important;
        }
        .action-menu-container > div {
          overflow: visible !important;
        }
        table td {
          overflow: visible !important;
        }
        table {
          overflow: visible !important;
        }
        .card {
          overflow: visible !important;
        }
        .card > div {
          overflow: visible !important;
        }
      `}</style>
    </Layout>
  );
} 