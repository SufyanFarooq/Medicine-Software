import { useState } from 'react';
import Layout from '../../components/Layout';
import ProductForm from '../../components/ProductForm';
import { useRouter } from 'next/router';
import { Typography, Card } from 'antd';

const { Title, Text } = Typography;

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
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0 }}>Add New Product</Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Add a new product to your inventory with complete details.
            </Text>
          </div>

          <ProductForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Card>
      </div>
    </Layout>
  );
}