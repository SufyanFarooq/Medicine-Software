import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { 
  Table, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Modal, 
  Form, 
  Input, 
  Select,
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Progress,
  InputNumber,
  Divider,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    productId: '',
    status: '',
    sortBy: 'expiryDate',
    sortOrder: 'asc'
  });

  useEffect(() => {
    fetchBatches();
    fetchProducts();
  }, [filters]);

  const fetchBatches = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.productId) queryParams.append('productId', filters.productId);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

      const response = await apiRequest(`/api/batches?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with batches property
        const batchesArray = data.batches || data || [];
        setBatches(Array.isArray(batchesArray) ? batchesArray : []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      message.error('Failed to fetch batches');
      setBatches([]); // Ensure batches is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      message.error('Failed to fetch products');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const generateBatchNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const batchNumber = `B${timestamp}${random}`;
    form.setFieldsValue({ batchNumber });
  };

  const onSubmit = async (values) => {
    setLoading(true);
    
    try {
      // Convert dates to ISO strings if they exist
      const submitData = {
        ...values,
        expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
        manufacturingDate: values.manufacturingDate ? values.manufacturingDate.toISOString() : null
      };

      if (editingBatch) {
        // Update existing batch
        const response = await apiRequest(`/api/batches/${editingBatch._id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          message.success('Batch updated successfully!');
          setEditingBatch(null);
          setFormModalVisible(false);
          form.resetFields();
          fetchBatches();
        } else {
          const errorData = await response.json();
          message.error(errorData.error || 'Failed to update batch');
        }
      } else {
        // Create new batch
        const response = await apiRequest('/api/batches', {
          method: 'POST',
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          message.success('Batch created successfully!');
          setFormModalVisible(false);
          form.resetFields();
          fetchBatches();
        } else {
          const errorData = await response.json();
          message.error(errorData.error || 'Failed to create batch');
        }
      }
    } catch (error) {
      console.error('Error submitting batch:', error);
      message.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    form.setFieldsValue({
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      purchasePrice: batch.purchasePrice,
      expiryDate: batch.expiryDate ? dayjs(batch.expiryDate) : null,
      manufacturingDate: batch.manufacturingDate ? dayjs(batch.manufacturingDate) : null,
      supplier: batch.supplier || '',
      notes: batch.notes || ''
    });
    setFormModalVisible(true);
  };

  const handleDelete = async (batchId) => {
    try {
      const response = await apiRequest(`/api/batches/${batchId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('Batch deleted successfully!');
        fetchBatches();
      } else {
        const errorData = await response.json();
        message.error(errorData.error || 'Failed to delete batch');
      }
    } catch (error) {
      message.error('Error deleting batch');
    }
  };

  const resetForm = () => {
    setFormModalVisible(false);
    setEditingBatch(null);
    form.resetFields();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'expired': return 'red';
      case 'depleted': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleOutlined />;
      case 'expired': return <CloseCircleOutlined />;
      case 'depleted': return <WarningOutlined />;
      default: return null;
    }
  };

  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { text: 'Expired', color: 'red', icon: <CloseCircleOutlined /> };
    if (daysUntilExpiry <= 30) return { text: `${daysUntilExpiry} days`, color: 'orange', icon: <WarningOutlined /> };
    if (daysUntilExpiry <= 90) return { text: `${daysUntilExpiry} days`, color: 'gold', icon: <CalendarOutlined /> };
    return { text: `${daysUntilExpiry} days`, color: 'green', icon: <CheckCircleOutlined /> };
  };

  // Define table columns
  const columns = [
    {
      title: 'Batch Info',
      key: 'batchInfo',
      render: (_, record) => (
        <div>
          <Text strong>{record.batchNumber}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.supplier || 'No supplier'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <Text strong>{record.product?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.product?.code}
          </Text>
        </div>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      render: (_, record) => {
        const percentage = ((record.remainingQuantity / record.quantity) * 100);
        return (
          <div>
            <Text>{record.remainingQuantity} / {record.quantity}</Text>
            <Progress 
              percent={percentage} 
              size="small" 
              status={percentage < 20 ? 'exception' : percentage < 50 ? 'active' : 'success'}
              showInfo={false}
              style={{ marginTop: 4 }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {percentage.toFixed(1)}% remaining
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Purchase Price',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (price) => `Rs ${price?.toFixed(2)}`,
    },
    {
      title: 'Expiry',
      key: 'expiry',
      render: (_, record) => {
        const expiryStatus = getExpiryStatus(record.expiryDate);
        return (
          <div>
            <Text>{dayjs(record.expiryDate).format('DD/MM/YYYY')}</Text>
            <br />
            <Tag color={expiryStatus.color} icon={expiryStatus.icon} style={{ marginTop: 4 }}>
              {expiryStatus.text}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Batch">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Batch"
            description="Are you sure you want to delete this batch?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete Batch">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Loading batches...</Text>
          </div>
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
            <Title level={2} style={{ margin: 0 }}>Batches & Expiry Management</Title>
            <Text type="secondary">Track product batches, expiry dates, and manage FIFO/FEFO picking</Text>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              size="large"
              onClick={() => {
                resetForm();
                setFormModalVisible(true);
              }}
            >
              Add New Batch
            </Button>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>Product</Text>
              </div>
              <Select
                placeholder="All Products"
                style={{ width: '100%' }}
                value={filters.productId || undefined}
                onChange={(value) => handleFilterChange('productId', value || '')}
                allowClear
              >
                {products.map(product => (
                  <Option key={product._id} value={product._id}>
                    {product.name} ({product.code})
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>Status</Text>
              </div>
              <Select
                placeholder="All Status"
                style={{ width: '100%' }}
                value={filters.status || undefined}
                onChange={(value) => handleFilterChange('status', value || '')}
                allowClear
              >
                <Option value="active">Active</Option>
                <Option value="expired">Expired</Option>
                <Option value="depleted">Depleted</Option>
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>Sort By</Text>
              </div>
              <Select
                style={{ width: '100%' }}
                value={filters.sortBy}
                onChange={(value) => handleFilterChange('sortBy', value)}
              >
                <Option value="expiryDate">Expiry Date</Option>
                <Option value="createdAt">Creation Date</Option>
                <Option value="batchNumber">Batch Number</Option>
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>Order</Text>
              </div>
              <Select
                style={{ width: '100%' }}
                value={filters.sortOrder}
                onChange={(value) => handleFilterChange('sortOrder', value)}
              >
                <Option value="asc">Ascending</Option>
                <Option value="desc">Descending</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Batches Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={batches}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} batches`,
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <Title level={4} type="secondary">No batches found</Title>
                  <Text type="secondary">Add your first batch to get started!</Text>
                </div>
              )
            }}
          />
        </Card>

        {/* Batch Form Modal */}
        <Modal
          title={editingBatch ? 'Edit Batch' : 'Add New Batch'}
          open={formModalVisible}
          onCancel={resetForm}
          footer={null}
          width={800}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{
              productId: '',
              batchNumber: '',
              quantity: '',
              purchasePrice: '',
              expiryDate: null,
              manufacturingDate: null,
              supplier: '',
              notes: ''
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Product"
                  name="productId"
                  rules={[{ required: true, message: 'Please select a product!' }]}
                >
                  <Select placeholder="Select Product" showSearch>
                    {products.map(product => (
                      <Option key={product._id} value={product._id}>
                        <Space>
                          <ShoppingOutlined />
                          {product.name} ({product.code})
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="Batch Number"
                  name="batchNumber"
                  rules={[{ required: true, message: 'Please enter batch number!' }]}
                >
                  <Input 
                    placeholder="Enter batch number"
                    suffix={
                      <Button 
                        type="text" 
                        icon={<ThunderboltOutlined />}
                        onClick={generateBatchNumber}
                        size="small"
                        title="Generate Batch Number"
                      />
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Quantity"
                  name="quantity"
                  rules={[{ required: true, message: 'Please enter quantity!' }]}
                >
                  <InputNumber
                    placeholder="0.00"
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="Purchase Price"
                  name="purchasePrice"
                  rules={[{ required: true, message: 'Please enter purchase price!' }]}
                >
                  <InputNumber
                    placeholder="0.00"
                    style={{ width: '100%' }}
                    min={0}
                    step={0.01}
                    addonBefore="Rs"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Expiry Date"
                  name="expiryDate"
                  rules={[{ required: true, message: 'Please select expiry date!' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select expiry date"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="Manufacturing Date"
                  name="manufacturingDate"
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder="Select manufacturing date"
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              label="Supplier"
              name="supplier"
            >
              <Input placeholder="Enter supplier name" />
            </Form.Item>
            
            <Form.Item
              label="Notes"
              name="notes"
            >
              <TextArea 
                rows={3} 
                placeholder="Additional notes..."
              />
            </Form.Item>
            
            <Row justify="end">
              <Space>
                <Button onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingBatch ? 'Update Batch' : 'Create Batch'}
                </Button>
              </Space>
            </Row>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
}
