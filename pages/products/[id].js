import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import BarcodeGenerator from '../../components/BarcodeGenerator';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Statistic, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  message,
  Descriptions,
  Badge,
  Alert
} from 'antd';
import { 
  EditOutlined, 
  ArrowLeftOutlined, 
  PlusOutlined,
  BarChartOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function ProductDetail() {
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
        notes: `Stock update via view page`
      };

      const inventoryResponse = await apiRequest('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(inventoryData)
      });

      if (!inventoryResponse.ok) {
        throw new Error('Failed to record inventory transaction');
      }

      // Update product quantity
      const updatedProduct = {
        ...product,
        quantity: product.quantity + additionalQuantity
      };

      const productResponse = await apiRequest(`/api/products/${product._id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProduct)
      });

      if (!productResponse.ok) {
        throw new Error('Failed to update product');
      }

      setProduct(updatedProduct);
      setShowStockUpdate(false);
      setStockUpdateData({
        additionalQuantity: '',
        newTotalBuyingPrice: '',
        newBatchNo: '',
        supplier: ''
      });
      
      message.success('Stock updated successfully!');
    } catch (error) {
      console.error('Error updating stock:', error);
      message.error('Failed to update stock');
    }
  };

  const getCategoryColor = (categoryName) => {
    // You can implement category color logic here
    return '#1890ff';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading product details...</div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Alert
            message="Error"
            description={error || 'Product not found'}
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
              <Title level={2} style={{ margin: 0 }}>
                {product.name}
              </Title>
              {product.adminDiscount > 0 && (
                <Badge 
                  count={`🎯 ${product.adminDiscount}%`} 
                  style={{ backgroundColor: '#1890ff' }}
                />
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => router.push(`/products/${product._id}/edit`)}
              >
                Edit Product
              </Button>
              <Button 
                icon={<PlusOutlined />}
                onClick={() => setShowStockUpdate(true)}
              >
                Update Stock
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={24}>
          {/* Product Information */}
          <Col xs={24} lg={16}>
            <Card title="Product Information" style={{ marginBottom: '24px' }}>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="Product Name" span={2}>
                  <Text strong>{product.name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Product Code">
                  {product.code || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Barcode">
                  {product.barcode ? (
                    <Space>
                      <Text code>{product.barcode}</Text>
                      <BarcodeGenerator value={product.barcode} />
                    </Space>
                  ) : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Brand">
                  {product.brand || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  <Tag color={getCategoryColor(product.category)}>
                    {product.category}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Unit">
                  {product.unit}
                </Descriptions.Item>
                <Descriptions.Item label="Batch Number">
                  {product.batchNo || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  {product.description || 'No description available'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Pricing Information */}
            <Card title="Pricing Information">
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Purchase Price"
                    value={product.purchasePrice}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Selling Price"
                    value={product.sellingPrice}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Profit Margin"
                    value={product.sellingPrice - product.purchasePrice}
                    formatter={(value) => formatCurrency(value)}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Stock Information */}
          <Col xs={24} lg={8}>
            <Card title="Stock Information" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col span={24}>
                  <Statistic
                    title="Current Stock"
                    value={product.quantity}
                    suffix={product.unit}
                    prefix={<ShoppingCartOutlined />}
                    valueStyle={{ 
                      color: product.quantity <= 10 ? '#cf1322' : '#3f8600' 
                    }}
                  />
                  {product.quantity <= 10 && (
                    <Alert
                      message="Low Stock Alert"
                      description={`Only ${product.quantity} ${product.unit} remaining`}
                      type="warning"
                      showIcon
                      icon={<ExclamationCircleOutlined />}
                      style={{ marginTop: '16px' }}
                    />
                  )}
                </Col>
              </Row>
            </Card>

            {/* Quick Actions */}
            <Card title="Quick Actions">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  block
                  icon={<PlusOutlined />}
                  onClick={() => setShowStockUpdate(true)}
                >
                  Update Stock
                </Button>
                <Button 
                  block
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/products/${product._id}/edit`)}
                >
                  Edit Product
                </Button>
                <Button 
                  block
                  icon={<BarChartOutlined />}
                  onClick={() => router.push(`/reports?productId=${product._id}`)}
                >
                  View Analytics
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Stock Update Modal */}
        <Modal
          title="Update Stock"
          open={showStockUpdate}
          onCancel={() => setShowStockUpdate(false)}
          onOk={handleStockUpdate}
          okText="Update Stock"
          cancelText="Cancel"
        >
          <Form layout="vertical">
            <Form.Item label="Additional Quantity" required>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter quantity to add"
                value={stockUpdateData.additionalQuantity}
                onChange={(value) => setStockUpdateData(prev => ({
                  ...prev,
                  additionalQuantity: value
                }))}
                min={1}
              />
            </Form.Item>
            <Form.Item label="Total Buying Price" required>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Enter total buying price"
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
            <Form.Item label="Batch Number">
              <Input
                placeholder="Enter batch number"
                value={stockUpdateData.newBatchNo}
                onChange={(e) => setStockUpdateData(prev => ({
                  ...prev,
                  newBatchNo: e.target.value
                }))}
              />
            </Form.Item>
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
          </Form>
        </Modal>
      </div>
    </Layout>
  );
}
