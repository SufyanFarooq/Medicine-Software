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
  InputNumber,
  Checkbox,
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Alert,
  Divider,
  Drawer,
  Collapse,
  Spin,
  Badge,
  Descriptions,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  ShopOutlined,
  SettingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  BankOutlined,
  GlobalOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: ''
  });
  const [stockDrawerVisible, setStockDrawerVisible] = useState(false);
  const [stockWarehouse, setStockWarehouse] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with warehouses property
        const warehousesArray = data.warehouses || data || [];
        setWarehouses(Array.isArray(warehousesArray) ? warehousesArray : []);
      } else {
        message.error('Failed to fetch warehouses');
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      message.error('Error fetching warehouses');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      const url = editingWarehouse 
        ? `/api/warehouses/${editingWarehouse._id}`
        : '/api/warehouses';
      
      const method = editingWarehouse ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        if (editingWarehouse) {
          const updatedWarehouse = await response.json();
          setWarehouses(prev => prev.map(w => 
            w._id === editingWarehouse._id ? { ...w, ...updatedWarehouse } : w
          ));
          message.success('Warehouse updated successfully!');
        } else {
          const newWarehouse = await response.json();
          setWarehouses(prev => [newWarehouse, ...prev]);
          message.success('Warehouse created successfully!');
        }
        
        resetForm();
      } else {
        const error = await response.json();
        message.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      message.error('Failed to save warehouse');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    form.setFieldsValue({
      name: warehouse.name,
      code: warehouse.code,
      type: warehouse.type,
      location: warehouse.location || '',
      address: warehouse.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Pakistan'
      },
      contact: warehouse.contact || {
        phone: '',
        email: '',
        website: ''
      },
      manager: warehouse.manager || {
        name: '',
        phone: '',
        email: ''
      },
      settings: warehouse.settings || {
        enableNotifications: true,
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        allowNegativeStock: false
      }
    });
    setFormModalVisible(true);
  };

  const handleDelete = async (warehouseId) => {
    try {
      const response = await apiRequest(`/api/warehouses/${warehouseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setWarehouses(prev => prev.filter(w => w._id !== warehouseId));
        message.success('Warehouse deleted successfully!');
      } else {
        const error = await response.json();
        message.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      message.error('Failed to delete warehouse');
    }
  };

  const resetForm = () => {
    setFormModalVisible(false);
    setEditingWarehouse(null);
    form.resetFields();
  };

  const getTypeLabel = (type) => {
    const labels = {
      'main_warehouse': 'Main Warehouse',
      'branch_office': 'Branch Office',
      'retail_store': 'Retail Store',
      'distribution_center': 'Distribution Center',
      'supplier_warehouse': 'Supplier Warehouse'
    };
    return labels[type] || type;
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      if (!warehouse.name.toLowerCase().includes(searchTerm) &&
          !warehouse.code.toLowerCase().includes(searchTerm) &&
          !warehouse.location.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }
    if (filters.type && warehouse.type !== filters.type) return false;
    if (filters.status && warehouse.status !== filters.status) return false;
    return true;
  });

  const openStockDrawer = async (warehouse) => {
    setStockWarehouse(warehouse);
    setStockDrawerVisible(true);
    setStockLoading(true);
    try {
      const response = await apiRequest(`/api/warehouses/${warehouse._id}/stock`);
      if (response.ok) {
        const data = await response.json();
        setWarehouseStock(data);
      } else {
        setWarehouseStock([]);
        message.warning('No stock data available');
      }
    } catch (e) {
      setWarehouseStock([]);
      message.error('Failed to load stock data');
    } finally {
      setStockLoading(false);
    }
  };

  const closeStockDrawer = () => {
    setStockDrawerVisible(false);
    setStockWarehouse(null);
    setWarehouseStock([]);
  };

  // Define table columns
  const columns = [
    {
      title: 'Warehouse',
      key: 'warehouse',
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Code: {record.code}
          </Text>
        </div>
      ),
    },
    {
      title: 'Type & Location',
      key: 'typeLocation',
      render: (_, record) => (
        <div>
          <Space>
            <BankOutlined style={{ color: '#1890ff' }} />
            <Text>{getTypeLabel(record.type)}</Text>
          </Space>
          <br />
          <Space style={{ marginTop: '4px' }}>
            <EnvironmentOutlined style={{ color: '#52c41a' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.location || 'No location specified'}
            </Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <Space>
            <PhoneOutlined style={{ color: '#fa8c16' }} />
            <Text style={{ fontSize: '12px' }}>
              {record.contact?.phone || 'No phone'}
            </Text>
          </Space>
          <br />
          <Space style={{ marginTop: '4px' }}>
            <MailOutlined style={{ color: '#722ed1' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.contact?.email || 'No email'}
            </Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Manager',
      key: 'manager',
      render: (_, record) => (
        <div>
          <Space>
            <UserOutlined style={{ color: '#13c2c2' }} />
            <Text style={{ fontSize: '12px' }}>
              {record.manager?.name || 'No manager'}
            </Text>
          </Space>
          <br />
          <Space style={{ marginTop: '4px' }}>
            <PhoneOutlined style={{ color: '#fa8c16' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.manager?.phone || 'No contact'}
            </Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive) => (
        <Tag 
          color={isActive ? 'success' : 'error'}
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Warehouse">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="View Stock">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => openStockDrawer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Warehouse"
            description="Are you sure you want to delete this warehouse? This action cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete Warehouse">
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
            <Text>Loading warehouses...</Text>
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
            <Title level={2} style={{ margin: 0 }}>
              <Space>
                🏭 Warehouses
              </Space>
            </Title>
            <Text type="secondary">Manage your warehouse locations and settings</Text>
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
              Add New Warehouse
            </Button>
          </Col>
        </Row>

        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Warehouses"
                value={warehouses.length}
                valueStyle={{ color: '#1890ff' }}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Active"
                value={warehouses.filter(w => w.isActive).length}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Main Warehouses"
                value={warehouses.filter(w => w.type === 'main_warehouse').length}
                valueStyle={{ color: '#1890ff' }}
                prefix={<HomeOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Branch Offices"
                value={warehouses.filter(w => w.type === 'branch_office').length}
                valueStyle={{ color: '#722ed1' }}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card title="Filters" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Input
                placeholder="Search warehouses..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                placeholder="All Types"
                value={filters.type || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, type: value || '' }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="main_warehouse">Main Warehouse</Option>
                <Option value="branch_office">Branch Office</Option>
                <Option value="retail_store">Retail Store</Option>
                <Option value="distribution_center">Distribution Center</Option>
                <Option value="supplier_warehouse">Supplier Warehouse</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Select
                placeholder="All Statuses"
                value={filters.status || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="active">Active</Option>
                <Option value="inactive">Inactive</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Warehouses Table */}
        <Card title={`Warehouses (${filteredWarehouses.length})`}>
          <Table
            columns={columns}
            dataSource={filteredWarehouses}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} warehouses`,
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏭</div>
                  <Title level={4} type="secondary">No warehouses found</Title>
                  <Text type="secondary">
                    {warehouses.length === 0 ? 'Create your first warehouse to get started!' : 'Try adjusting your filters.'}
                  </Text>
                </div>
              )
            }}
          />
        </Card>

        {/* Warehouse Form Modal */}
        <Modal
          title={editingWarehouse ? 'Edit Warehouse' : 'Create New Warehouse'}
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
              type: 'main_warehouse',
              address: {
                country: 'Pakistan'
              },
              settings: {
                enableNotifications: true,
                lowStockThreshold: 10,
                criticalStockThreshold: 5,
                allowNegativeStock: false
              }
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Warehouse Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter warehouse name!' }]}
                >
                  <Input placeholder="Enter warehouse name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Warehouse Code"
                  name="code"
                  rules={[{ required: true, message: 'Please enter warehouse code!' }]}
                >
                  <Input 
                    placeholder="e.g., WH001" 
                    style={{ textTransform: 'uppercase' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Type" name="type">
                  <Select>
                    <Option value="main_warehouse">Main Warehouse</Option>
                    <Option value="branch_office">Branch Office</Option>
                    <Option value="retail_store">Retail Store</Option>
                    <Option value="distribution_center">Distribution Center</Option>
                    <Option value="supplier_warehouse">Supplier Warehouse</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Location" name="location">
                  <Input placeholder="e.g., Karachi, Pakistan" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Address Information</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Street Address" name={['address', 'street']}>
                  <Input placeholder="Street Address" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="City" name={['address', 'city']}>
                  <Input placeholder="City" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="State/Province" name={['address', 'state']}>
                  <Input placeholder="State/Province" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="ZIP/Postal Code" name={['address', 'zipCode']}>
                  <Input placeholder="ZIP/Postal Code" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Contact Information</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Phone Number" name={['contact', 'phone']}>
                  <Input placeholder="Phone Number" prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  label="Email Address" 
                  name={['contact', 'email']}
                  rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
                >
                  <Input placeholder="Email Address" prefix={<MailOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Website" name={['contact', 'website']}>
                  <Input placeholder="Website (optional)" prefix={<GlobalOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Manager Information</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Manager Name" name={['manager', 'name']}>
                  <Input placeholder="Manager Name" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Manager Phone" name={['manager', 'phone']}>
                  <Input placeholder="Manager Phone" prefix={<PhoneOutlined />} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  label="Manager Email" 
                  name={['manager', 'email']}
                  rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
                >
                  <Input placeholder="Manager Email" prefix={<MailOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Warehouse Settings</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name={['settings', 'enableNotifications']} valuePropName="checked">
                  <Checkbox>Enable Notifications</Checkbox>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Low Stock Threshold" name={['settings', 'lowStockThreshold']}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Critical Stock Threshold" name={['settings', 'criticalStockThreshold']}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Form.Item name={['settings', 'allowNegativeStock']} valuePropName="checked">
                  <Checkbox>Allow Negative Stock</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Row justify="end">
              <Space>
                <Button onClick={resetForm}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
                </Button>
              </Space>
            </Row>
          </Form>
        </Modal>

        {/* Stock Drawer */}
        <Drawer
          title={`Stock - ${stockWarehouse?.name} (${stockWarehouse?.code})`}
          placement="right"
          size="large"
          onClose={closeStockDrawer}
          open={stockDrawerVisible}
        >
          {stockLoading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text>Loading stock...</Text>
              </div>
            </div>
          ) : warehouseStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <Title level={4} type="secondary">No stock records found</Title>
              <Text type="secondary">This warehouse doesn't have any stock records yet.</Text>
            </div>
          ) : (
            <Table
              dataSource={warehouseStock}
              rowKey="_id"
              pagination={false}
              scroll={{ y: 400 }}
              columns={[
                {
                  title: 'Product',
                  key: 'product',
                  render: (_, record) => (
                    <Text strong>{record.product?.name || 'Unknown'}</Text>
                  ),
                },
                {
                  title: 'Code',
                  key: 'code',
                  render: (_, record) => (
                    <Text type="secondary">{record.product?.code || 'N/A'}</Text>
                  ),
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  render: (quantity) => (
                    <Badge count={quantity} showZero style={{ backgroundColor: '#52c41a' }} />
                  ),
                },
              ]}
            />
          )}
        </Drawer>
      </div>
    </Layout>
  );
}
