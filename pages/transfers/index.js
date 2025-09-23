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
  DatePicker,
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Alert,
  Divider,
  Badge,
  Statistic,
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SwapOutlined,
  BankOutlined,
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SendOutlined,
  StopOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    fromWarehouse: '',
    toWarehouse: '',
    status: '',
    type: '',
    dateRange: null
  });

  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/transfers');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with transfers property
        const transfersArray = data.transfers || data || [];
        setTransfers(Array.isArray(transfersArray) ? transfersArray : []);
      } else {
        message.error('Failed to fetch transfers');
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
      message.error('Error fetching transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await apiRequest('/api/warehouses');
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      message.error('Error fetching warehouses');
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
      message.error('Error fetching products');
    }
  };

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await apiRequest('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        const newTransfer = await response.json();
        setTransfers(prev => [newTransfer, ...prev]);
        resetForm();
        message.success('Transfer created successfully!');
      } else {
        const error = await response.json();
        message.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      message.error('Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormModalVisible(false);
    setEditingTransfer(null);
    form.resetFields();
  };

  const handleAction = async (transferId, action) => {
    try {
      setLoading(true);
      const response = await apiRequest(`/api/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const result = await response.json();
        message.success(result.message);
        fetchTransfers(); // Refresh the list
      } else {
        const error = await response.json();
        message.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error processing action:', error);
      message.error('Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'processing',
      in_transit: 'purple',
      completed: 'success',
      cancelled: 'error',
      rejected: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <ClockCircleOutlined />,
      approved: <CheckCircleOutlined />,
      in_transit: <TruckOutlined />,
      completed: <CheckCircleOutlined />,
      cancelled: <CloseCircleOutlined />,
      rejected: <ExclamationCircleOutlined />
    };
    return icons[status] || <ClockCircleOutlined />;
  };

  const filteredTransfers = transfers.filter(transfer => {
    if (filters.fromWarehouse && transfer.fromWarehouseId !== filters.fromWarehouse) return false;
    if (filters.toWarehouse && transfer.toWarehouseId !== filters.toWarehouse) return false;
    if (filters.status && transfer.status !== filters.status) return false;
    if (filters.type && transfer.type !== filters.type) return false;
    if (filters.dateRange && filters.dateRange.length === 2) {
      const transferDate = dayjs(transfer.createdAt);
      if (transferDate.isBefore(filters.dateRange[0]) || transferDate.isAfter(filters.dateRange[1])) return false;
    }
    return true;
  });

  // Define table columns
  const columns = [
    {
      title: 'Transfer',
      key: 'transfer',
      render: (_, record) => (
        <div>
          <Text strong>{record.transferNumber}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.type} • {record.reason}
          </Text>
        </div>
      ),
    },
    {
      title: 'From → To',
      key: 'warehouses',
      render: (_, record) => (
        <div>
          <Space>
            <BankOutlined style={{ color: '#1890ff' }} />
            <Text>{record.fromWarehouse?.name || 'Unknown'} ({record.fromWarehouse?.code || 'N/A'})</Text>
          </Space>
          <br />
          <Space style={{ marginTop: '4px' }}>
            <SwapOutlined style={{ color: '#52c41a' }} />
            <Text>{record.toWarehouse?.name || 'Unknown'} ({record.toWarehouse?.code || 'N/A'})</Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => (
        <div>
          <Badge count={record.totalItems || record.items?.length || 0} showZero>
            <ShoppingCartOutlined style={{ fontSize: '16px' }} />
          </Badge>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.totalQuantity || 0} units
          </Text>
        </div>
      ),
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
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: '#722ed1' }} />
          <Text style={{ fontSize: '12px' }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Tooltip title="Approve Transfer">
                <Button 
                  type="text" 
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleAction(record._id, 'approve')}
                  style={{ color: '#52c41a' }}
                >
                  Approve
                </Button>
              </Tooltip>
              <Popconfirm
                title="Reject Transfer"
                description="Are you sure you want to reject this transfer?"
                onConfirm={() => handleAction(record._id, 'reject')}
                okText="Yes"
                cancelText="No"
                okType="danger"
              >
                <Tooltip title="Reject Transfer">
                  <Button 
                    type="text" 
                    danger 
                    icon={<CloseCircleOutlined />}
                  >
                    Reject
                  </Button>
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === 'approved' && (
            <Tooltip title="Process Transfer">
              <Button 
                type="text" 
                icon={<SendOutlined />}
                onClick={() => handleAction(record._id, 'process')}
                style={{ color: '#1890ff' }}
              >
                Process
              </Button>
            </Tooltip>
          )}
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
            <Text>Loading transfers...</Text>
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
                🔄 Stock Transfers
              </Space>
            </Title>
            <Text type="secondary">Manage stock movements between warehouses</Text>
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
              Create New Transfer
            </Button>
          </Col>
        </Row>

        {/* Summary Cards */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Transfers"
                value={transfers.length}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SwapOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Pending"
                value={transfers.filter(t => t.status === 'pending').length}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="In Progress"
                value={transfers.filter(t => ['approved', 'in_transit'].includes(t.status)).length}
                valueStyle={{ color: '#1890ff' }}
                prefix={<TruckOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Completed"
                value={transfers.filter(t => t.status === 'completed').length}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card title="Filters" style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Text strong>From Warehouse</Text>
              <Select
                placeholder="All Source Warehouses"
                style={{ width: '100%', marginTop: '8px' }}
                value={filters.fromWarehouse || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, fromWarehouse: value || '' }))}
                allowClear
              >
                {warehouses.map(warehouse => (
                  <Option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name} ({warehouse.code})
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Text strong>To Warehouse</Text>
              <Select
                placeholder="All Destination Warehouses"
                style={{ width: '100%', marginTop: '8px' }}
                value={filters.toWarehouse || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, toWarehouse: value || '' }))}
                allowClear
              >
                {warehouses.map(warehouse => (
                  <Option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name} ({warehouse.code})
                  </Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Text strong>Status</Text>
              <Select
                placeholder="All Statuses"
                style={{ width: '100%', marginTop: '8px' }}
                value={filters.status || undefined}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
                allowClear
              >
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="in_transit">In Transit</Option>
                <Option value="completed">Completed</Option>
                <Option value="cancelled">Cancelled</Option>
                <Option value="rejected">Rejected</Option>
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Text strong>Date Range</Text>
              <RangePicker
                style={{ width: '100%', marginTop: '8px' }}
                value={filters.dateRange}
                onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                format="DD/MM/YYYY"
              />
            </Col>
          </Row>
        </Card>

        {/* Transfers Table */}
        <Card title={`Transfers (${filteredTransfers.length})`}>
          <Table
            columns={columns}
            dataSource={filteredTransfers}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} transfers`,
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: (
                <div style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
                  <Title level={4} type="secondary">No transfers found</Title>
                  <Text type="secondary">
                    {transfers.length === 0 ? 'Create your first transfer to get started!' : 'Try adjusting your filters.'}
                  </Text>
                </div>
              )
            }}
          />
        </Card>

        {/* Transfer Form Modal */}
        <Modal
          title={editingTransfer ? 'Edit Transfer' : 'Create New Transfer'}
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
              type: 'manual',
              reason: 'stock_replenishment',
              items: [{ productId: '', quantity: 1 }]
            }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="From Warehouse"
                  name="fromWarehouseId"
                  rules={[{ required: true, message: 'Please select source warehouse!' }]}
                >
                  <Select placeholder="Select Source Warehouse" showSearch>
                    {warehouses.map(warehouse => (
                      <Option key={warehouse._id} value={warehouse._id}>
                        <Space>
                          <BankOutlined />
                          {warehouse.name} ({warehouse.code})
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label="To Warehouse"
                  name="toWarehouseId"
                  rules={[{ required: true, message: 'Please select destination warehouse!' }]}
                >
                  <Select placeholder="Select Destination Warehouse" showSearch>
                    {warehouses.map(warehouse => (
                      <Option key={warehouse._id} value={warehouse._id}>
                        <Space>
                          <BankOutlined />
                          {warehouse.name} ({warehouse.code})
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Transfer Type" name="type">
                  <Select>
                    <Option value="manual">Manual Transfer</Option>
                    <Option value="automatic">Automatic Transfer</Option>
                    <Option value="emergency">Emergency Transfer</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item label="Reason" name="reason">
                  <Select>
                    <Option value="stock_replenishment">Stock Replenishment</Option>
                    <Option value="seasonal_adjustment">Seasonal Adjustment</Option>
                    <Option value="damage_replacement">Damage Replacement</Option>
                    <Option value="new_branch_setup">New Branch Setup</Option>
                    <Option value="inventory_optimization">Inventory Optimization</Option>
                    <Option value="emergency_supply">Emergency Supply</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item label="Notes" name="notes">
              <TextArea 
                rows={3} 
                placeholder="Additional notes about this transfer..."
                prefix={<FileTextOutlined />}
              />
            </Form.Item>

            <Divider>Transfer Items</Divider>
            
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row key={key} gutter={8} align="middle" style={{ marginBottom: '8px' }}>
                      <Col span={16}>
                        <Form.Item
                          {...restField}
                          name={[name, 'productId']}
                          rules={[{ required: true, message: 'Please select product!' }]}
                        >
                          <Select placeholder="Select Product" showSearch>
                            {products.map(product => (
                              <Option key={product._id} value={product._id}>
                                <Space>
                                  <ShoppingCartOutlined />
                                  {product.name} ({product.code})
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          rules={[{ required: true, message: 'Enter quantity!' }]}
                        >
                          <InputNumber
                            placeholder="Qty"
                            min={1}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        {fields.length > 1 && (
                          <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Col>
                    </Row>
                  ))}
                  <Form.Item>
                    <Button 
                      type="dashed" 
                      onClick={() => add({ productId: '', quantity: 1 })} 
                      block 
                      icon={<PlusOutlined />}
                    >
                      Add Item
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
            
            <Row justify="end">
              <Space>
                <Button onClick={resetForm}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  Create Transfer
                </Button>
              </Space>
            </Row>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
}
