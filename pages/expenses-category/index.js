import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  Input, 
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
  Switch,
  Select
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
  ArrowLeftOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Color options for expense categories
const COLOR_OPTIONS = [
  { value: 'default', label: 'Default', color: '#d9d9d9' },
  { value: 'magenta', label: 'Magenta', color: '#eb2f96' },
  { value: 'red', label: 'Red', color: '#f5222d' },
  { value: 'volcano', label: 'Volcano', color: '#fa541c' },
  { value: 'orange', label: 'Orange', color: '#fa8c16' },
  { value: 'gold', label: 'Gold', color: '#faad14' },
  { value: 'lime', label: 'Lime', color: '#a0d911' },
  { value: 'green', label: 'Green', color: '#52c41a' },
  { value: 'cyan', label: 'Cyan', color: '#13c2c2' },
  { value: 'blue', label: 'Blue', color: '#1890ff' },
  { value: 'geekblue', label: 'Geek Blue', color: '#2f54eb' },
  { value: 'purple', label: 'Purple', color: '#722ed1' }
];

export default function ExpenseCategories() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, [pagination.current, pagination.pageSize, searchText]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(searchText && { search: searchText })
      });

      const response = await apiRequest(`/api/expense-categories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      message.error('Failed to fetch expense categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    form.resetFields();
    setFormDrawerVisible(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      color: category.color,
      enabled: category.enabled
    });
    setFormDrawerVisible(true);
  };

  const handleViewCategory = (category) => {
    // Set a flag to indicate this is view mode
    const viewCategory = { ...category, _viewMode: true };
    setEditingCategory(viewCategory);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      color: category.color,
      enabled: category.enabled
    });
    setFormDrawerVisible(true);
  };

  const handleCopyId = (category) => {
    navigator.clipboard.writeText(category._id);
    message.success('Category ID copied to clipboard');
  };

  const handleDeleteCategory = async (category) => {
    try {
      const response = await apiRequest(`/api/expense-categories/${category._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        message.success('Expense category deleted successfully');
        fetchCategories();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to delete expense category');
      }
    } catch (error) {
      console.error('Error deleting expense category:', error);
      message.error('Error deleting expense category');
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      const url = editingCategory 
        ? `/api/expense-categories/${editingCategory._id}`
        : '/api/expense-categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success(
          editingCategory 
            ? 'Expense category updated successfully' 
            : 'Expense category created successfully'
        );
        setFormDrawerVisible(false);
        fetchCategories();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to save expense category');
      }
    } catch (error) {
      console.error('Error saving expense category:', error);
      message.error('Error saving expense category');
    }
  };

  const getColorTag = (color) => {
    const colorOption = COLOR_OPTIONS.find(opt => opt.value === color);
    return (
      <Tag color={color} style={{ margin: 0 }}>
        {colorOption?.label || color}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Tag color={record.color} style={{ margin: 0 }}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text) => <Text>{text}</Text>
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      render: (color) => getColorTag(color)
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => (
        <Switch 
          checked={isActive} 
          size="small"
          onChange={async (checked) => {
            try {
              console.log('Toggling category status:', {
                id: record._id,
                name: record.name,
                currentStatus: record.isActive,
                newStatus: checked
              });
              
              const response = await apiRequest(`/api/expense-categories/${record._id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: record.name,
                  description: record.description,
                  color: record.color,
                  isActive: checked
                })
              });
              
              console.log('Toggle response status:', response.status);
              
              if (response.ok) {
                message.success('Category status updated successfully');
                fetchCategories();
              } else {
                const errorData = await response.json();
                console.error('Toggle error response:', errorData);
                message.error(errorData.message || 'Failed to update category status');
              }
            } catch (error) {
              console.error('Error updating category status:', error);
              message.error('Error updating category status');
            }
          }}
        />
      )
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
                onClick: () => handleViewCategory(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditCategory(record)
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
                    title="Delete Expense Category"
                    description={`Are you sure you want to delete "${record.name}"?`}
                    onConfirm={() => handleDeleteCategory(record)}
                    okText="Delete"
                    cancelText="Cancel"
                    okType="danger"
                    icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
                  >
                    <span style={{ color: '#ff4d4f' }}>
                      <DeleteOutlined /> Delete
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
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Space align="center">
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.back()}
              />
              <Title level={2} style={{ margin: 0 }}>Expense Category List</Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="Search expense categories..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 200 }}
                allowClear
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchCategories}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddCategory}
              >
                Add New Expense Category
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Categories Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={categories}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} categories`
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Add/Edit/View Category Drawer */}
        <Drawer
          title={
            editingCategory 
              ? (editingCategory._viewMode ? 'View Expense Category' : 'Edit Expense Category')
              : 'Add New Expense Category'
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
              rules={[{ required: true, message: 'Please enter category name' }]}
            >
              <Input 
                placeholder="Enter category name" 
                disabled={editingCategory && editingCategory._viewMode}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <Input.TextArea 
                placeholder="Enter category description" 
                rows={3}
                disabled={editingCategory && editingCategory._viewMode}
              />
            </Form.Item>

            <Form.Item
              name="color"
              label="Color"
              rules={[{ required: true, message: 'Please select a color' }]}
            >
              <Select 
                placeholder="Select color" 
                disabled={editingCategory && editingCategory._viewMode}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {COLOR_OPTIONS.map(color => (
                  <Option key={color.value} value={color.value}>
                    <Space>
                      <div 
                        style={{ 
                          width: 12, 
                          height: 12, 
                          backgroundColor: color.color, 
                          borderRadius: '50%',
                          display: 'inline-block'
                        }} 
                      />
                      {color.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Status"
              valuePropName="checked"
              initialValue={true}
            >
              <Switch 
                disabled={editingCategory && editingCategory._viewMode}
                checkedChildren="Active"
                unCheckedChildren="Inactive"
                style={{ 
                  backgroundColor: editingCategory && editingCategory._viewMode ? '#f5f5f5' : undefined 
                }}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                {!(editingCategory && editingCategory._viewMode) && (
                  <Button type="primary" htmlType="submit">
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                )}
                <Button onClick={() => setFormDrawerVisible(false)}>
                  {editingCategory && editingCategory._viewMode ? 'Close' : 'Cancel'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}
