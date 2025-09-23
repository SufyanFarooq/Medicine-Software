import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Dropdown, 
  Modal, 
  message, 
  Popconfirm,
  Tooltip,
  Row,
  Col,
  Typography,
  Drawer,
  Form,
  DatePicker,
  InputNumber,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  ReloadOutlined, 
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0
  });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, [pagination.current, pagination.pageSize, searchText, statusFilter, paymentStatusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(searchText && { search: searchText }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter })
      });

      const response = await apiRequest(`/api/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setPagination(prev => ({
          ...prev,
          total: data.total || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiRequest('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePaymentStatusChange = (value) => {
    setPaymentStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleDelete = async (orderId) => {
    try {
      const response = await apiRequest(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('Order deleted successfully');
        fetchOrders();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      message.error('Failed to delete order');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await apiRequest(`/api/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        message.success(`Order status updated to ${newStatus}`);
        fetchOrders();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      message.error('Failed to update order status');
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    form.setFieldsValue({
      ...order,
      orderDate: order.orderDate ? dayjs(order.orderDate) : null,
      deliveryDate: order.deliveryDate ? dayjs(order.deliveryDate) : null
    });
    setDrawerVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const orderData = {
        ...values,
        orderDate: values.orderDate ? values.orderDate.toISOString() : null,
        deliveryDate: values.deliveryDate ? values.deliveryDate.toISOString() : null
      };

      const response = editingOrder 
        ? await apiRequest(`/api/orders/${editingOrder._id}`, {
            method: 'PUT',
            body: JSON.stringify(orderData)
          })
        : await apiRequest('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
          });

      if (response.ok) {
        message.success(editingOrder ? 'Order updated successfully' : 'Order created successfully');
        setDrawerVisible(false);
        setEditingOrder(null);
        form.resetFields();
        fetchOrders();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to save order');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      message.error('Failed to save order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'default',
      'Pending': 'processing',
      'Confirmed': 'processing',
      'Processing': 'processing',
      'Shipped': 'warning',
      'Delivered': 'success',
      'Cancelled': 'error',
      'Returned': 'error'
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'Unpaid': 'error',
      'Partially Paid': 'warning',
      'Paid': 'success',
      'Refunded': 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Draft': <ClockCircleOutlined />,
      'Pending': <ClockCircleOutlined />,
      'Confirmed': <CheckCircleOutlined />,
      'Processing': <ClockCircleOutlined />,
      'Shipped': <TruckOutlined />,
      'Delivered': <CheckCircleOutlined />,
      'Cancelled': <CloseCircleOutlined />,
      'Returned': <CloseCircleOutlined />
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  const columns = [
    {
      title: 'Order Number',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
      render: (text) => (
        <Text strong style={{ color: '#1890ff' }}>{text}</Text>
      )
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 200,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.customerEmail && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.customerEmail}
            </Text>
          )}
        </div>
      )
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      width: 100,
      render: (items) => (
        <Text>{items ? items.length : 0} items</Text>
      )
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (amount) => (
        <Text strong>₹{parseFloat(amount || 0).toFixed(2)}</Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Payment',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 120,
      render: (status) => (
        <Tag color={getPaymentStatusColor(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 120,
      render: (date) => (
        <Text>{date ? dayjs(date).format('DD/MM/YYYY') : '-'}</Text>
      )
    },
    {
      title: 'Created By',
      dataIndex: 'createdByUser',
      key: 'createdByUser',
      width: 150,
      render: (user) => (
        <div>
          {user ? (
            <>
              <div style={{ fontWeight: 500 }}>{user.name}</div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {user.role}
              </Text>
            </>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View',
                icon: <EyeOutlined />
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />
              },
              {
                key: 'copy',
                label: 'Copy ID',
                icon: <CopyOutlined />
              },
              {
                type: 'divider'
              },
              ...(record.status !== 'Delivered' ? [
                {
                  key: 'status-update',
                  label: 'Update Status',
                  children: [
                    { key: 'pending', label: 'Pending' },
                    { key: 'confirmed', label: 'Confirmed' },
                    { key: 'processing', label: 'Processing' },
                    { key: 'shipped', label: 'Shipped' },
                    { key: 'delivered', label: 'Delivered' },
                    { key: 'cancelled', label: 'Cancelled' }
                  ]
                }
              ] : []),
              {
                type: 'divider'
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true
              }
            ],
            onClick: ({ key }) => {
              if (key === 'view') {
                router.push(`/orders/${record._id}`);
              } else if (key === 'edit') {
                handleEdit(record);
              } else if (key === 'copy') {
                navigator.clipboard.writeText(record._id);
                message.success('Order ID copied to clipboard');
              } else if (key.startsWith('status-')) {
                const newStatus = key.replace('status-', '').charAt(0).toUpperCase() + key.replace('status-', '').slice(1);
                handleStatusUpdate(record._id, newStatus);
              } else if (key === 'delete') {
                Modal.confirm({
                  title: 'Delete Order',
                  content: `Are you sure you want to delete order ${record.orderNumber}?`,
                  okText: 'Delete',
                  okType: 'danger',
                  cancelText: 'Cancel',
                  onOk: () => handleDelete(record._id)
                });
              }
            }
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: '16px' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Title level={2} style={{ margin: 0 }}>Orders</Title>
                <Text type="secondary">Manage sales orders</Text>
              </Col>
              <Col>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingOrder(null);
                    form.resetFields();
                    setDrawerVisible(true);
                  }}
                >
                  Add New Order
                </Button>
              </Col>
            </Row>
          </div>

          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={8} md={6}>
              <Input
                placeholder="Search orders..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Select
                placeholder="Status"
                value={statusFilter}
                onChange={handleStatusChange}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="Draft">Draft</Option>
                <Option value="Pending">Pending</Option>
                <Option value="Confirmed">Confirmed</Option>
                <Option value="Processing">Processing</Option>
                <Option value="Shipped">Shipped</Option>
                <Option value="Delivered">Delivered</Option>
                <Option value="Cancelled">Cancelled</Option>
                <Option value="Returned">Returned</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Select
                placeholder="Payment"
                value={paymentStatusFilter}
                onChange={handlePaymentStatusChange}
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="Unpaid">Unpaid</Option>
                <Option value="Partially Paid">Partially Paid</Option>
                <Option value="Paid">Paid</Option>
                <Option value="Refunded">Refunded</Option>
              </Select>
            </Col>
            <Col xs={24} sm={8} md={4}>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchOrders}
                loading={loading}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={orders}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} orders`
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Order Form Drawer */}
        <Drawer
          title={editingOrder ? 'Edit Order' : 'Add New Order'}
          width={800}
          open={drawerVisible}
          onClose={() => {
            setDrawerVisible(false);
            setEditingOrder(null);
            form.resetFields();
          }}
          footer={
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDrawerVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" onClick={() => form.submit()}>
                  {editingOrder ? 'Update' : 'Create'} Order
                </Button>
              </Space>
            </div>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Customer"
                  name="customerId"
                  rules={[{ required: true, message: 'Please select a customer!' }]}
                >
                  <Select
                    placeholder="Select customer"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {customers.map((customer) => (
                      <Option key={customer._id} value={customer._id}>
                        {customer.name} {customer.email && `(${customer.email})`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Status"
                  name="status"
                >
                  <Select>
                    <Option value="Draft">Draft</Option>
                    <Option value="Pending">Pending</Option>
                    <Option value="Confirmed">Confirmed</Option>
                    <Option value="Processing">Processing</Option>
                    <Option value="Shipped">Shipped</Option>
                    <Option value="Delivered">Delivered</Option>
                    <Option value="Cancelled">Cancelled</Option>
                    <Option value="Returned">Returned</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Order Date"
                  name="orderDate"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Delivery Date"
                  name="deliveryDate"
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Payment Status"
                  name="paymentStatus"
                >
                  <Select>
                    <Option value="Unpaid">Unpaid</Option>
                    <Option value="Partially Paid">Partially Paid</Option>
                    <Option value="Paid">Paid</Option>
                    <Option value="Refunded">Refunded</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Payment Method"
                  name="paymentMethod"
                >
                  <Select>
                    <Option value="Cash">Cash</Option>
                    <Option value="Card">Card</Option>
                    <Option value="Bank Transfer">Bank Transfer</Option>
                    <Option value="Cheque">Cheque</Option>
                    <Option value="Online">Online</Option>
                    <Option value="Other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Notes"
              name="notes"
            >
              <TextArea rows={3} placeholder="Add any notes..." />
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}

