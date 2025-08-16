import { useState } from 'react';
import Layout from '../../components/Layout';
import ProductForm from '../../components/ProductForm';
import { useRouter } from 'next/router';

export default function AddProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (newProduct) => {
    setLoading(true);
    try {
      // Product was already created in the form component
      // Just redirect to products list
      router.push('/products');
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Add New Product</h1>
          <p className="mt-2 text-gray-600">
            Add a new product to your inventory with complete details.
          </p>
        </div>

        <ProductForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
}
