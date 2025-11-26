import Layout from '../../components/Layout';
import ProductForm from '../../components/ProductForm';

export default function AddProduct() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new product to your inventory
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <ProductForm />
        </div>
      </div>
    </Layout>
  );
} 