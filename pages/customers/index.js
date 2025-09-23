import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { apiRequest, getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { formatCurrency } from '../../lib/currency';
import { 
  Table, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Input, 
  Modal, 
  Form, 
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Divider,
  Alert,
  Tag
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  EyeOutlined,
  AppstoreOutlined,
  TableOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchCustomers();
  }, []);

  const fetchCustomers = async (search = '') => {
    try {
      const url = search ? `/api/customers?q=${encodeURIComponent(search)}` : '/api/customers';
      const res = await apiRequest(url);
      if (res.ok) {
        const data = await res.json();
        // Handle both array response and object with customers property
        const customersArray = data.customers || data || [];
        setCustomers(Array.isArray(customersArray) ? customersArray : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Ensure customers is always an array
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    try {
      const res = await apiRequest(`/api/invoices?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerOrders(data);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setCustomerOrders([]);
    }
  };

  const resetForm = () => {
    setEditing(null);
    form.resetFields();
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      if (values.vatNumber && !/^\d{14}$/.test(values.vatNumber)) {
        message.error('VAT Number must be exactly 14 digits');
        setLoading(false);
        return;
      }
      const method = editing ? 'PUT' : 'POST';
      const path = editing ? `/api/customers/${editing._id}` : '/api/customers';
      const res = await apiRequest(path, { method, body: JSON.stringify(values) });
      if (res.ok) {
        message.success(editing ? 'Customer updated successfully!' : 'Customer created successfully!');
        setFormModalVisible(false);
        resetForm();
        fetchCustomers(query);
      } else {
        const err = await res.json();
        message.error(err.message || 'Failed to save customer');
      }
    } catch {
      message.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    const res = await apiRequest(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      message.success('Customer deleted successfully!');
      fetchCustomers(query);
    } else {
      message.error('Failed to delete customer');
    }
  };

  const viewCustomerOrders = async (customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerOrders(customer._id);
    setOrdersModalVisible(true);
  };

  const handleEdit = (customer) => {
    setEditing(customer);
    form.setFieldsValue({
      companyName: customer.companyName || '',
      contactPerson: customer.contactPerson || '',
      email: customer.email || '',
      phone: customer.phone || '',
      vatNumber: customer.vatNumber || '',
      lpoNumber: customer.lpoNumber || ''
    });
    setFormModalVisible(true);
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading customers...</div>
        </div>
      </Layout>
    );
  }

  if (!hasPermission(currentUser?.role, 'canManageProducts')) {
    return (
      <Layout>
        <div style={{ padding: '24px' }}>
          <Alert
            message="Access Denied"
            description="You do not have permission to manage customers."
            type="error"
            showIcon
          />
        </div>
      </Layout>
    );
  }

  // Table columns for table view
  const columns = [
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: 'VAT Number',
      dataIndex: 'vatNumber',
      key: 'vatNumber',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'LPO Number',
      dataIndex: 'lpoNumber',
      key: 'lpoNumber',
      render: (text) => text ? <Tag color="green">{text}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View Orders">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => viewCustomerOrders(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Customer"
            description="Are you sure you want to delete this customer?"
            onConfirm={() => onDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okType="danger"
          >
            <Tooltip title="Delete">
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

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Customers</Title>
            <Text type="secondary">Manage your customer database</Text>
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
              Add Customer
            </Button>
          </Col>
        </Row>

        {/* Search and View Mode */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Search by company, person, email or phone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onSearch={(value) => fetchCustomers(value)}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Space>
                <Button
                  type={viewMode === 'cards' ? 'primary' : 'default'}
                  icon={<AppstoreOutlined />}
                  onClick={() => setViewMode('cards')}
                >
                  Cards View
                </Button>
                <Button
                  type={viewMode === 'table' ? 'primary' : 'default'}
                  icon={<TableOutlined />}
                  onClick={() => setViewMode('table')}
                >
                  Table View
                </Button>
              </Space>
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Text type="secondary">
                Showing {customers.length} customers
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Cards View */}
        {viewMode === 'cards' && (
          <Card>
            <Row gutter={[16, 16]}>
              {customers.map(customer => (
                <Col xs={24} sm={12} lg={8} key={customer._id}>
                  <Card 
                    hoverable
                    style={{ height: '100%' }}
                    bodyStyle={{ padding: '16px' }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
                        {customer.companyName}
                      </Title>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {customer.contactPerson && (
                          <div>
                            <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            <Text type="secondary">{customer.contactPerson}</Text>
                          </div>
                        )}
                        {customer.email && (
                          <div>
                            <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            <Text type="secondary">{customer.email}</Text>
                          </div>
                        )}
                        {customer.phone && (
                          <div>
                            <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            <Text type="secondary">{customer.phone}</Text>
                          </div>
                        )}
                      </Space>
                    </div>
                    
                    <Divider style={{ margin: '12px 0' }} />
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <IdcardOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                          <Text type="secondary">
                            VAT: {customer.vatNumber || 'Not provided'}
                          </Text>
                        </div>
                        <div>
                          <FileTextOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                          <Text type="secondary">
                            LPO: {customer.lpoNumber || 'Not provided'}
                          </Text>
                        </div>
                      </Space>
                    </div>

                    <Space style={{ width: '100%' }}>
                      <Button 
                        type="default"
                        icon={<EyeOutlined />}
                        onClick={() => viewCustomerOrders(customer)}
                        style={{ flex: 1 }}
                      >
                        Orders
                      </Button>
                      <Button 
                        type="default"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(customer)}
                        style={{ flex: 1 }}
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title="Delete Customer"
                        description="Are you sure?"
                        onConfirm={() => onDelete(customer._id)}
                        okText="Yes"
                        cancelText="No"
                        okType="danger"
                      >
                        <Button 
                          danger
                          icon={<DeleteOutlined />}
                          style={{ flex: 1 }}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            {customers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                <Title level={4} type="secondary">No customers found</Title>
                <Text type="secondary">Add your first customer to get started</Text>
              </div>
            )}
          </Card>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <Table
              columns={columns}
              dataSource={customers}
              rowKey="_id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} customers`,
              }}
              scroll={{ x: 800 }}
              locale={{
                emptyText: 'No customers found'
              }}
            />
          </Card>
        )}

        {/* Customer Form Modal */}
        <Modal
          title={editing ? 'Edit Customer' : 'Add New Customer'}
          open={formModalVisible}
          onCancel={() => {
            setFormModalVisible(false);
            resetForm();
          }}
          footer={null}
          width={600}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{
              companyName: '',
              contactPerson: '',
              email: '',
              phone: '',
              vatNumber: '',
              lpoNumber: ''
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Company Name"
                  name="companyName"
                  rules={[{ required: true, message: 'Please enter company name!' }]}
                >
                  <Input placeholder="Enter company name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Contact Person"
                  name="contactPerson"
                >
                  <Input placeholder="Enter contact person name" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
                >
                  <Input placeholder="Enter email address" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Phone"
                  name="phone"
                >
                  <Input placeholder="Enter phone number" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="VAT Number"
                  name="vatNumber"
                  rules={[
                    { len: 14, message: 'VAT Number must be exactly 14 digits!' }
                  ]}
                >
                  <Input 
                    placeholder="Enter 14-digit VAT number"
                    maxLength={14}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      form.setFieldsValue({ vatNumber: value.slice(0, 14) });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="LPO Number"
                  name="lpoNumber"
                >
                  <Input placeholder="Enter LPO number" />
                </Form.Item>
              </Col>
            </Row>
            <Row justify="end">
              <Space>
                <Button onClick={() => {
                  setFormModalVisible(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editing ? 'Update' : 'Save'}
                </Button>
              </Space>
            </Row>
          </Form>
        </Modal>

        {/* Customer Orders Modal */}
        <Modal
          title={`Orders for ${selectedCustomer?.companyName}`}
          open={ordersModalVisible}
          onCancel={() => setOrdersModalVisible(false)}
          footer={null}
          width={800}
        >
          {customerOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <Text type="secondary">No orders found for this customer.</Text>
            </div>
          ) : (
            <Table
              columns={[
                {
                  title: 'Invoice #',
                  dataIndex: 'invoiceNumber',
                  key: 'invoiceNumber',
                  render: (text) => <Text strong>{text}</Text>,
                },
                {
                  title: 'Date',
                  dataIndex: 'date',
                  key: 'date',
                  render: (date, record) => new Date(date || record.createdAt).toLocaleDateString(),
                },
                {
                  title: 'Items',
                  dataIndex: 'items',
                  key: 'items',
                  render: (items) => `${items?.length || 0} items`,
                },
                {
                  title: 'Subtotal',
                  dataIndex: 'subtotal',
                  key: 'subtotal',
                  render: (amount) => formatCurrency(amount || 0),
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  render: (amount) => <Text strong>{formatCurrency(amount || 0)}</Text>,
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => {
                    const color = status === 'Paid' ? 'green' : 
                                 status === 'Pending' ? 'orange' : 'default';
                    return <Tag color={color}>{status || 'Draft'}</Tag>;
                  },
                },
              ]}
              dataSource={customerOrders}
              rowKey="_id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          )}
        </Modal>
      </div>
    </Layout>
  );
}
