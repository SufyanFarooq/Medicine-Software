import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import ProductForm from '../../../components/ProductForm';
import { apiRequest } from '../../../lib/auth';

export default function EditProduct() {
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [stockUpdateData, setStockUpdateData] = useState({
    additionalQuantity: '',
    newTotalBuyingPrice: '',
    newBatchNo: '',
    supplier: ''
  });
  const [priceChangeAlert, setPriceChangeAlert] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await apiRequest(`/api/products/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      setError('Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async () => {
    try {
      if (!stockUpdateData.additionalQuantity || !stockUpdateData.newTotalBuyingPrice) {
        setError('Please fill in all required fields');
        return;
      }

      const additionalQuantity = parseInt(stockUpdateData.additionalQuantity);
      const newTotalBuyingPrice = parseFloat(stockUpdateData.newTotalBuyingPrice);

      if (additionalQuantity <= 0 || newTotalBuyingPrice <= 0) {
        setError('Quantity and price must be greater than 0');
        return;
      }

      // Record inventory transaction
      const inventoryData = {
        productId: product._id,
        type: 'inflow',
        quantity: additionalQuantity,
        totalBuyingPrice: newTotalBuyingPrice,
        batchNo: stockUpdateData.newBatchNo || product.batchNo,
        supplier: stockUpdateData.supplier || 'Unknown',
        date: new Date().toISOString(),
        notes: `Stock update via edit form`
      };

      const inventoryResponse = await apiRequest('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(inventoryData)
      });

      if (!inventoryResponse.ok) {
        throw new Error('Failed to record inventory transaction');
      }

      // Calculate new average purchase price and quantity
      const currentQuantity = parseInt(product.quantity) || 0;
      const currentTotalValue = currentQuantity * (parseFloat(product.purchasePrice) || 0);
      const newTotalValue = currentTotalValue + newTotalBuyingPrice;
      const newTotalQuantity = currentQuantity + additionalQuantity;
      const newAveragePrice = newTotalValue / newTotalQuantity;

      // Update product
      const updatedProduct = {
        ...product,
        quantity: newTotalQuantity,
        purchasePrice: newAveragePrice.toFixed(2),
        batchNo: stockUpdateData.newBatchNo || product.batchNo
      };

      const updateResponse = await apiRequest(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProduct)
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update product');
      }

      // Set price change alert
      const oldPrice = parseFloat(product.purchasePrice) || 0;
      const priceChange = newAveragePrice - oldPrice;
      const priceChangePercent = oldPrice > 0 ? ((priceChange / oldPrice) * 100).toFixed(2) : 0;

      if (Math.abs(priceChange) > 0.01) {
        setPriceChangeAlert(
          `Purchase price updated from ${oldPrice.toFixed(2)} to ${newAveragePrice.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChangePercent}%)`
        );
      }

      // Update local state
      setProduct(updatedProduct);
      setStockUpdateData({
        additionalQuantity: '',
        newTotalBuyingPrice: '',
        newBatchNo: '',
        supplier: ''
      });
      setShowStockUpdate(false);
      setSuccessMessage(`Stock updated successfully! Added ${additionalQuantity} units.`);
      setError('');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);

    } catch (error) {
      console.error('Error updating stock:', error);
      setError(error.message || 'Failed to update stock');
    }
  };

  const handleStockUpdateCancel = () => {
    setShowStockUpdate(false);
    setStockUpdateData({
      additionalQuantity: '',
      newTotalBuyingPrice: '',
      newBatchNo: '',
      supplier: ''
    });
    setError('');
  };

  const handleSubmit = async (updatedProduct) => {
    try {
      // Product was already updated in the form component
      // Just redirect to products list
      router.push('/products');
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading product...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Products
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Edit Product</h1>
          <p className="mt-2 text-gray-600">
            Update product information and inventory details.
          </p>
        </div>

        {/* Stock Update Section */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">📦 Update Stock</h2>
            <button
              onClick={() => setShowStockUpdate(!showStockUpdate)}
              className="btn-primary"
            >
              {showStockUpdate ? '❌ Cancel' : '➕ Add Stock'}
            </button>
          </div>

          {showStockUpdate && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Quantity
                  </label>
                  <input
                    type="number"
                    name="additionalQuantity"
                    value={stockUpdateData.additionalQuantity}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      additionalQuantity: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Total Buying Price
                  </label>
                  <input
                    type="number"
                    name="newTotalBuyingPrice"
                    value={stockUpdateData.newTotalBuyingPrice}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      newTotalBuyingPrice: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter total price"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Batch Number
                  </label>
                  <input
                    type="text"
                    name="newBatchNo"
                    value={stockUpdateData.newBatchNo}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      newBatchNo: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter batch number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    value={stockUpdateData.supplier}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      supplier: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleStockUpdate}
                  className="btn-primary"
                  disabled={!stockUpdateData.additionalQuantity || !stockUpdateData.newTotalBuyingPrice}
                >
                  💾 Update Stock
                </button>
                <button
                  onClick={handleStockUpdateCancel}
                  className="btn-secondary"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price Change Alert */}
        {priceChangeAlert && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{priceChangeAlert}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <ProductForm
          product={product}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
}
