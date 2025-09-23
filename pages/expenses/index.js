import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
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
  Select, 
  Modal, 
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Divider,
  Drawer,
  Dropdown,
  Tag,
  Form,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  CopyOutlined,
  MoreOutlined,
  ArrowLeftOutlined,
  DownOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Currency options
const CURRENCY_OPTIONS = [
  { value: 'PKR', label: 'PKR (Pakistan Rupee)', symbol: 'Rs' },
  { value: 'USD', label: 'USD (US Dollar)', symbol: '$' },
  { value: 'EUR', label: 'EUR (Euro)', symbol: '€' },
  { value: 'GBP', label: 'GBP (British Pound)', symbol: '£' },
  { value: 'INR', label: 'INR (Indian Rupee)', symbol: '₹' },
  { value: 'AED', label: 'AED (UAE Dirham)', symbol: 'د.إ' }
];

export default function Expenses() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [pagination.current, pagination.pageSize, searchText, categoryFilter, currencyFilter]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(searchText && { search: searchText }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(currencyFilter && { currency: currencyFilter })
      });

      const response = await apiRequest(`/api/expenses?${params}`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      message.error('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching ACTIVE expense categories for dropdown...');
      const response = await apiRequest('/api/expense-categories/active');
      console.log('Active categories response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Active categories response data:', data);
        const categoriesList = Array.isArray(data.categories) ? data.categories : [];
        console.log('Active categories list length:', categoriesList.length);
        console.log('Active categories list:', categoriesList);
        setCategories(categoriesList);
        
        if (categoriesList.length === 0) {
          console.warn('No active categories found in response');
        }
      } else {
        console.error('Failed to fetch active categories:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (error) {
      console.error('Error fetching active categories:', error);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleCategoryFilter = (value) => {
    setCategoryFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleCurrencyFilter = (value) => {
    setCurrencyFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    form.resetFields();
    setFormDrawerVisible(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      name: expense.name,
      category: expense.category,
      currency: expense.currency,
      total: expense.total,
      description: expense.description,
      ref: expense.ref
    });
    setFormDrawerVisible(true);
  };

  const handleViewExpense = (expense) => {
    setSelectedExpense(expense);
  };

  const handleCopyId = (expense) => {
    navigator.clipboard.writeText(expense._id);
    message.success('Expense ID copied to clipboard');
  };

  const handleDeleteExpense = async (expense) => {
    try {
      const response = await apiRequest(`/api/expenses/${expense._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        message.success('Expense deleted successfully');
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      message.error('Error deleting expense');
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      const url = editingExpense 
        ? `/api/expenses/${editingExpense._id}`
        : '/api/expenses';
      
      const method = editingExpense ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success(
          editingExpense 
            ? 'Expense updated successfully' 
            : 'Expense created successfully'
        );
        setFormDrawerVisible(false);
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      message.error('Error saving expense');
    }
  };

  const getCurrencySymbol = (currency) => {
    const currencyOption = CURRENCY_OPTIONS.find(opt => opt.value === currency);
    return currencyOption?.symbol || currency;
  };

  const formatAmount = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${amount.toFixed(2)} ${symbol}`;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Expense Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color="magenta" style={{ margin: 0 }}>
          {category}
        </Tag>
      )
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency',
      render: (currency) => <Text type="secondary">{currency}</Text>
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total, record) => (
        <Text strong style={{ color: '#f5222d' }}>
          {formatAmount(total, record.currency)}
        </Text>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: 'Ref',
      dataIndex: 'ref',
      key: 'ref',
      render: (text) => text || '-'
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
                label: 'Show',
                icon: <EyeOutlined />,
                onClick: () => handleViewExpense(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditExpense(record)
              },
              {
                key: 'copy',
                label: 'Copy ID',
                icon: <CopyOutlined />,
                onClick: () => handleCopyId(record)
              },
              {
                key: 'delete',
                label: (
                  <Popconfirm
                    title="Remove Expense"
                    description={`Are you sure you want to remove "${record.name}"?`}
                    onConfirm={() => handleDeleteExpense(record)}
                    okText="Remove"
                    cancelText="Cancel"
                    okType="danger"
                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                  >
                    <span style={{ color: '#ff4d4f' }}>
                      <DeleteOutlined /> Remove
                    </span>
                  </Popconfirm>
                ),
                danger: true
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
        {/* Header with Search and Add Button */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Expense List</Title>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 200 }}
                allowClear
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchExpenses}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddExpense}
              >
                Add New Expense
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Expenses Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={expenses}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} expenses`
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
          />
        </Card>


        {/* Expense Detail Side Panel */}
        <Drawer
          title={
            <Space align="center">
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => setSelectedExpense(null)}
              />
              <span>Expense</span>
            </Space>
          }
          width={500}
          open={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          footer={null}
          bodyStyle={{ padding: '16px' }}
        >
          {selectedExpense && (
            <div>
              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <Input
                  placeholder="search"
                  prefix={<SearchOutlined />}
                  suffix={<DownOutlined />}
                  style={{ width: '100%', marginBottom: '12px' }}
                />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleAddExpense}
                  style={{ width: '100%' }}
                >
                  Add New Expense
                </Button>
              </div>

              {/* Selected Expense */}
              <div style={{ 
                border: '1px solid #f0f0f0', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '20px',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Title level={4} style={{ margin: 0, flex: 1, marginRight: '8px' }}>{selectedExpense.name}</Title>
                    <Space>
                      <Button 
                        type="text" 
                        icon={<EditOutlined />}
                        onClick={() => {
                          setSelectedExpense(null);
                          handleEditExpense(selectedExpense);
                        }}
                        size="small"
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title="Remove Expense"
                        description={`Are you sure you want to remove "${selectedExpense.name}"?`}
                        onConfirm={() => {
                          handleDeleteExpense(selectedExpense);
                          setSelectedExpense(null);
                        }}
                        okText="Remove"
                        cancelText="Cancel"
                        okType="danger"
                      >
                        <Button 
                          type="text" 
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                        >
                          Remove
                        </Button>
                      </Popconfirm>
                    </Space>
                  </div>
                </div>

                <Divider style={{ margin: '12px 0' }} />

                {/* Expense Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <Text strong>Name:</Text> {selectedExpense.name}
                  </div>
                  <div>
                    <Text strong>Expense Category:</Text> 
                    <Tag color="magenta" style={{ marginLeft: '8px' }}>
                      {selectedExpense.category}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Currency:</Text> {selectedExpense.currency}
                  </div>
                  <div>
                    <Text strong>Total:</Text> 
                    <Text strong style={{ color: '#f5222d', marginLeft: '8px' }}>
                      {formatAmount(selectedExpense.total, selectedExpense.currency)}
                    </Text>
                  </div>
                  <div>
                    <Text strong>Description:</Text> {selectedExpense.description || '-'}
                  </div>
                  <div>
                    <Text strong>Ref:</Text> {selectedExpense.ref || '-'}
                  </div>
                </div>
              </div>

              {/* Add New Expense Button */}
              <div style={{ textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={handleAddExpense}
                  style={{ 
                    width: '100%',
                    height: '40px',
                    fontSize: '16px'
                  }}
                >
                  ADD NEW EXPENSE
                </Button>
              </div>
            </div>
          )}
        </Drawer>

        {/* Add/Edit/View Expense Drawer */}
        <Drawer
          title={
            editingExpense 
              ? (editingExpense._viewMode ? 'View Expense' : 'Edit Expense')
              : 'Add New Expense'
          }
          width={600}
          open={formDrawerVisible}
          onClose={() => setFormDrawerVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter expense name' }]}
            >
              <Input 
                placeholder="Enter expense name" 
                readOnly={editingExpense && editingExpense._viewMode}
                style={editingExpense && editingExpense._viewMode ? { backgroundColor: '#f5f5f5' } : {}}
              />
            </Form.Item>

            <Form.Item
              name="category"
              label="Expense Category"
              rules={[{ required: true, message: 'Please select category' }]}
            >
              <Select 
                placeholder="Select category" 
                disabled={editingExpense && editingExpense._viewMode}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                notFoundContent={
                  categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Text type="secondary">No categories found</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Create categories in Expense Categories section first
                      </Text>
                    </div>
                  ) : null
                }
              >
                {categories.map(category => (
                  <Option key={category._id} value={category.name}>
                    <Tag color={category.color} style={{ margin: 0 }}>
                      {category.name}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="currency"
              label="Currency"
              rules={[{ required: true, message: 'Please select currency' }]}
            >
              <Select 
                placeholder="Select currency" 
                disabled={editingExpense && editingExpense._viewMode}
                style={editingExpense && editingExpense._viewMode ? { backgroundColor: '#f5f5f5' } : {}}
              >
                {CURRENCY_OPTIONS.map(currency => (
                  <Option key={currency.value} value={currency.value}>
                    {currency.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="total"
              label="Total"
              rules={[
                { required: true, message: 'Please enter total amount' },
                { type: 'number', min: 0.01, message: 'Amount must be greater than 0' }
              ]}
            >
              <InputNumber
                placeholder="Enter amount"
                style={{ 
                  width: '100%',
                  backgroundColor: editingExpense && editingExpense._viewMode ? '#f5f5f5' : 'white'
                }}
                min={0.01}
                step={0.01}
                precision={2}
                readOnly={editingExpense && editingExpense._viewMode}
                addonAfter={
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.currency !== curr.currency}>
                    {({ getFieldValue }) => {
                      const currency = getFieldValue('currency');
                      return getCurrencySymbol(currency);
                    }}
                  </Form.Item>
                }
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <Input.TextArea 
                placeholder="Enter description" 
                rows={3}
                readOnly={editingExpense && editingExpense._viewMode}
                style={editingExpense && editingExpense._viewMode ? { backgroundColor: '#f5f5f5' } : {}}
              />
            </Form.Item>

            <Form.Item
              name="ref"
              label="Ref"
            >
              <Input 
                placeholder="Enter reference" 
                readOnly={editingExpense && editingExpense._viewMode}
                style={editingExpense && editingExpense._viewMode ? { backgroundColor: '#f5f5f5' } : {}}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                {!(editingExpense && editingExpense._viewMode) && (
                  <Button type="primary" htmlType="submit">
                    {editingExpense ? 'Update Expense' : 'Create Expense'}
                  </Button>
                )}
                <Button onClick={() => setFormDrawerVisible(false)}>
                  {editingExpense && editingExpense._viewMode ? 'Close' : 'Cancel'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}
