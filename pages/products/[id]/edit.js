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
      console.error('Error fetching product:', error);
      setError('Error loading product');
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

  if (error || !product) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error || 'Product not found'}</div>
          <button
            onClick={() => router.push('/products')}
            className="btn-primary"
          >
            ⬅️ Back to Products
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
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            <p className="mt-1 text-sm text-gray-500">
              Update product information
            </p>
          </div>
          <button
            onClick={() => router.push(`/products/${id}`)}
            className="btn-secondary"
          >
            ⬅️ Back to Details
          </button>
        </div>

        {/* Edit Form */}
        <div className="card">
          <ProductForm product={product} isEditing={true} />
        </div>
      </div>
    </Layout>
  );
} 