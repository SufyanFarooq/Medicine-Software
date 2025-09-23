import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import ProductForm from '../../../components/ProductForm';
import { apiRequest } from '../../../lib/auth';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  message,
  Alert,
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined, 
  PlusOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

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
        message.error('Please fill in all required fields');
        return;
      }

      const additionalQuantity = parseInt(stockUpdateData.additionalQuantity);
      const newTotalBuyingPrice = parseFloat(stockUpdateData.newTotalBuyingPrice);

      if (additionalQuantity <= 0 || newTotalBuyingPrice <= 0) {
        message.error('Quantity and price must be greater than 0');
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
      message.error(error.message || 'Failed to update stock');
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
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading product...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div style={{ padding: '24px' }}>
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => router.push('/products')}>
                Back to Products
              </Button>
            }
          />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.back()}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>Edit Product</Title>
            </Space>
            <div>
              <Text type="secondary">Update product information and inventory details.</Text>
            </div>
          </Col>
        </Row>

        {/* Stock Update Section */}
        <Card title="📦 Update Stock" style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Text>Add new stock to this product</Text>
            </Col>
            <Col>
              <Button 
                type={showStockUpdate ? 'default' : 'primary'}
                icon={<PlusOutlined />}
                onClick={() => setShowStockUpdate(!showStockUpdate)}
              >
                {showStockUpdate ? 'Cancel' : 'Add Stock'}
              </Button>
            </Col>
          </Row>

          {showStockUpdate && (
            <div style={{ backgroundColor: '#fafafa', padding: '16px', borderRadius: '8px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Additional Quantity" required>
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Enter quantity"
                      value={stockUpdateData.additionalQuantity}
                      onChange={(value) => setStockUpdateData(prev => ({
                        ...prev,
                        additionalQuantity: value
                      }))}
                      min={1}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="New Total Buying Price" required>
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="Enter total price"
                      value={stockUpdateData.newTotalBuyingPrice}
                      onChange={(value) => setStockUpdateData(prev => ({
                        ...prev,
                        newTotalBuyingPrice: value
                      }))}
                      min={0}
                      step={0.01}
                      formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="New Batch Number">
                    <Input
                      placeholder="Enter batch number"
                      value={stockUpdateData.newBatchNo}
                      onChange={(e) => setStockUpdateData(prev => ({
                        ...prev,
                        newBatchNo: e.target.value
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="Supplier">
                    <Input
                      placeholder="Enter supplier name"
                      value={stockUpdateData.supplier}
                      onChange={(e) => setStockUpdateData(prev => ({
                        ...prev,
                        supplier: e.target.value
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Space>
                    <Button 
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleStockUpdate}
                      disabled={!stockUpdateData.additionalQuantity || !stockUpdateData.newTotalBuyingPrice}
                    >
                      Update Stock
                    </Button>
                    <Button 
                      icon={<CloseOutlined />}
                      onClick={handleStockUpdateCancel}
                    >
                      Cancel
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>
          )}
        </Card>

        {/* Price Change Alert */}
        {priceChangeAlert && (
          <Alert
            message="Price Change Alert"
            description={priceChangeAlert}
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Success Message */}
        {successMessage && (
          <Alert
            message="Success"
            description={successMessage}
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Product Form */}
        <Card>
          <ProductForm
            product={product}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Card>
      </div>
    </Layout>
  );
}