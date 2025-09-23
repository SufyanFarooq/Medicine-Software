import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Dropdown,
  Menu
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  FilterOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function PaymentList() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    paymentType: '',
    direction: '',
    paymentMethod: '',
    status: '',
    dateRange: null
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayments();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(filters.search && { search: filters.search }),
        ...(filters.paymentType && { paymentType: filters.paymentType }),
        ...(filters.direction && { direction: filters.direction }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateRange && {
          startDate: filters.dateRange[0].format('YYYY-MM-DD'),
          endDate: filters.dateRange[1].format('YYYY-MM-DD')
        })
      });

      const response = await apiRequest(`/api/payments?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Payments API response:', data);
        const paymentsArray = data.payments || data || [];
        console.log('Payments array:', paymentsArray, 'Is array:', Array.isArray(paymentsArray));
        // Ensure we always set an array
        setPayments(Array.isArray(paymentsArray) ? paymentsArray : []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      message.error('Failed to fetch payments');
      // Ensure payments is always an array even on error
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (values) => {
    try {
      const paymentData = {
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        amount: parseFloat(values.amount)
      };

      const response = await apiRequest('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        message.success('Payment created successfully');
        setShowAddModal(false);
        form.resetFields();
        fetchPayments();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      message.error('Failed to create payment');
    }
  };

  const handleDeletePayment = async (id) => {
    console.log('handleDeletePayment called with ID:', id);
    try {
      console.log('Making DELETE request to:', `/api/payments/${id}`);
      const response = await apiRequest(`/api/payments/${id}`, {
        method: 'DELETE'
      });

      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        message.success('Payment deleted successfully');
        fetchPayments();
      } else {
        const error = await response.json();
        console.error('Delete API error:', error);
        message.error(error.message || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      message.error('Failed to delete payment');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      processing: 'blue',
      completed: 'green',
      failed: 'red',
      cancelled: 'default',
      refunded: 'purple'
    };
    return colors[status] || 'default';
  };

  const getPaymentTypeColor = (type) => {
    const colors = {
      invoice_payment: 'blue',
      advance_payment: 'cyan',
      refund: 'orange',
      supplier_payment: 'green',
      expense_payment: 'red',
      other: 'default'
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: 'Number',
      key: 'paymentNumber',
      width: 120,
      render: (_, record) => (
        <Text strong>
          {record.paymentNumber || record.invoiceNumber || `PAY-${record._id?.slice(-6)?.toUpperCase()}`}
        </Text>
      )
    },
    {
      title: 'Client',
      key: 'client',
      width: 200,
      render: (_, record) => {
        // Handle customer data
        if (record.customer) {
          if (typeof record.customer === 'object') {
            const customerName = record.customer.companyName || 
              `${record.customer.firstName || ''} ${record.customer.lastName || ''}`.trim();
            return customerName || 'Customer';
          }
          return 'Customer';
        }
        
        // Handle supplier data
        if (record.supplier) {
          if (typeof record.supplier === 'object') {
            return record.supplier.name || 'Supplier';
          }
          return 'Supplier';
        }
        
        // Handle payer data
        if (record.payer?.name) {
          return record.payer.name;
        }
        
        // Fallback based on payment type
        if (record.paymentType === 'supplier_payment') {
          return 'Supplier Payment';
        }
        if (record.paymentType === 'invoice_payment') {
          return 'Customer Payment';
        }
        
        return record.direction === 'incoming' ? 'Customer' : 'Supplier';
      }
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          {amount?.toFixed(2)} Rs
        </Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 120,
      sorter: (a, b) => new Date(a.paymentDate) - new Date(b.paymentDate),
      defaultSortOrder: 'descend',
      render: (date) => dayjs(date).format('MM/DD/YYYY')
    },
    {
      title: 'Type',
      dataIndex: 'paymentType',
      key: 'paymentType',
      width: 140,
      render: (type) => (
        <Tag color={getPaymentTypeColor(type)}>
          {type?.replace('_', ' ').toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Direction',
      dataIndex: 'direction',
      key: 'direction',
      width: 100,
      render: (direction) => (
        <Tag color={direction === 'incoming' ? 'green' : 'red'}>
          {direction === 'incoming' ? '↓ IN' : '↑ OUT'}
        </Tag>
      )
    },
    {
      title: 'Payment Mode',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 140,
      render: (method) => method?.replace('_', ' ').toUpperCase() || 'N/A'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Created By',
      key: 'createdBy',
      width: 150,
      render: (_, record) => {
        if (record.createdByUser) {
          return (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                {record.createdByUser.username}
              </div>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'capitalize' }}>
                {record.createdByUser.role?.replace('_', ' ')}
              </div>
            </div>
          );
        }
        return record.createdBy || 'N/A';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <EyeOutlined />,
                onClick: () => router.push(`/payments/${record._id}`)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => router.push(`/payments/${record._id}/edit`)
              },
              {
                type: 'divider'
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => {
                  console.log('Delete clicked for payment:', record._id);
                  Modal.confirm({
                    title: 'Delete Payment',
                    content: 'Are you sure you want to delete this payment?',
                    okText: 'Yes, Delete',
                    cancelText: 'Cancel',
                    okType: 'danger',
                    onOk: () => {
                      console.log('Confirmed delete for payment:', record._id);
                      handleDeletePayment(record._id);
                    },
                    onCancel: () => {
                      console.log('Delete cancelled');
                    }
                  });
                }
              }
            ]
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
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <Button
                type="text"
                icon={<div>←</div>}
                onClick={() => router.back()}
                style={{ marginRight: '8px' }}
              />
              Payment List
            </Title>
          </Col>
          <Col>
            <Space>
              <Input
                placeholder="Search payments..."
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{ width: 250 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchPayments}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowAddModal(true)}
              >
                Add Payment
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Payment Type"
                value={filters.paymentType}
                onChange={(value) => setFilters(prev => ({ ...prev, paymentType: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="invoice_payment">Invoice Payment</Option>
                <Option value="advance_payment">Advance Payment</Option>
                <Option value="refund">Refund</Option>
                <Option value="supplier_payment">Supplier Payment</Option>
                <Option value="expense_payment">Expense Payment</Option>
                <Option value="other">Other</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Direction"
                value={filters.direction}
                onChange={(value) => setFilters(prev => ({ ...prev, direction: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="incoming">Incoming</Option>
                <Option value="outgoing">Outgoing</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Payment Method"
                value={filters.paymentMethod}
                onChange={(value) => setFilters(prev => ({ ...prev, paymentMethod: value }))}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="cash">Cash</Option>
                <Option value="bank_transfer">Bank Transfer</Option>
                <Option value="credit_card">Credit Card</Option>
                <Option value="debit_card">Debit Card</Option>
                <Option value="check">Check</Option>
                <Option value="mobile_payment">Mobile Payment</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
        </Card>

        {/* Payments Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={payments}
            loading={loading}
            rowKey="_id"
            defaultSortOrder="descend"
            sortDirections={['descend', 'ascend']}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} payments`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({
                  ...prev,
                  current: page,
                  pageSize: pageSize
                }));
              }
            }}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* Add Payment Modal */}
        <Modal
          title="Add New Payment"
          open={showAddModal}
          onCancel={() => {
            setShowAddModal(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddPayment}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="paymentType"
                  label="Payment Type"
                  rules={[{ required: true, message: 'Please select payment type' }]}
                >
                  <Select placeholder="Select payment type">
                    <Option value="invoice_payment">Invoice Payment</Option>
                    <Option value="advance_payment">Advance Payment</Option>
                    <Option value="refund">Refund</Option>
                    <Option value="supplier_payment">Supplier Payment</Option>
                    <Option value="expense_payment">Expense Payment</Option>
                    <Option value="other">Other</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="direction"
                  label="Direction"
                  rules={[{ required: true, message: 'Please select direction' }]}
                >
                  <Select placeholder="Select direction">
                    <Option value="incoming">Incoming</Option>
                    <Option value="outgoing">Outgoing</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="amount"
                  label="Amount"
                  rules={[{ required: true, message: 'Please enter amount' }]}
                >
                  <InputNumber
                    min={0.01}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="Enter amount"
                    addonAfter="Rs"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="paymentDate"
                  label="Payment Date"
                  rules={[{ required: true, message: 'Please select payment date' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="paymentMethod"
                  label="Payment Method"
                  rules={[{ required: true, message: 'Please select payment method' }]}
                >
                  <Select placeholder="Select payment method">
                    <Option value="cash">Cash</Option>
                    <Option value="bank_transfer">Bank Transfer</Option>
                    <Option value="credit_card">Credit Card</Option>
                    <Option value="debit_card">Debit Card</Option>
                    <Option value="check">Check</Option>
                    <Option value="mobile_payment">Mobile Payment</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="referenceNumber" label="Reference Number">
                  <Input placeholder="Enter reference number" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} placeholder="Enter payment notes" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  Create Payment
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
}
