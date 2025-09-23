import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { getUser } from '../../lib/auth';
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
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Alert,
  ColorPicker,
  Divider,
  Switch,
  Drawer
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  BgColorsOutlined,
  TagOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [form] = Form.useForm();

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B',
    '#6B7280', '#374151', '#EC4899', '#F97316', '#6366F1',
    '#84CC16', '#06B6D4', '#F43F5E', '#A855F7', '#EAB308'
  ];

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await apiRequest('/api/categories');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with categories property
        const categoriesArray = data.categories || data || [];
        setCategories(Array.isArray(categoriesArray) ? categoriesArray : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Failed to fetch categories');
      setCategories([]); // Ensure categories is always an array
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);

    try {
      if (editingCategory) {
        // Update existing category
        const response = await apiRequest(`/api/categories/${editingCategory._id}`, {
          method: 'PUT',
          body: JSON.stringify(values)
        });

        if (response.ok) {
          message.success('Category updated successfully!');
          setEditingCategory(null);
          setFormDrawerVisible(false);
          form.resetFields();
          fetchCategories();
        } else {
          const errorData = await response.json();
          message.error(errorData.error || 'Failed to update category');
        }
      } else {
        // Create new category
        const response = await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(values)
        });

        if (response.ok) {
          message.success('Category created successfully!');
          setFormDrawerVisible(false);
          form.resetFields();
          fetchCategories();
        } else {
          const errorData = await response.json();
          message.error(errorData.error || 'Failed to create category');
        }
      }
    } catch (error) {
      message.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      description: category.description,
      color: category.color
    });
    setFormDrawerVisible(true);
  };

  const handleDelete = async (categoryId) => {
    try {
      const response = await apiRequest(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('Category deleted successfully!');
        fetchCategories();
      } else {
        const errorData = await response.json();
        message.error(errorData.error || 'Failed to delete category');
      }
    } catch (error) {
      message.error('Error deleting category');
    }
  };

  const handleActiveToggle = async (categoryId, currentStatus) => {
    try {
      const response = await apiRequest(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        // Update local state
        setCategories(prev => prev.map(c => 
          c._id === categoryId ? { ...c, isActive: !currentStatus } : c
        ));
        message.success(`Category ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        message.error('Failed to update category status');
      }
    } catch (error) {
      console.error('Error updating category status:', error);
      message.error('Failed to update category status');
    }
  };

  const resetForm = () => {
    setFormDrawerVisible(false);
    setEditingCategory(null);
    form.resetFields();
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Text>Loading categories...</Text>
        </div>
      </Layout>
    );
  }

  // Check if user has permission to manage categories (mapped to canManageProducts)
  if (!hasPermission(currentUser?.role, 'canManageCategories')) {
    return (
      <Layout>
        <div style={{ padding: '24px' }}>
          <Alert
            message="Access Denied"
            description="You do not have permission to manage categories. Only Super Admins and Managers can access this page."
            type="error"
            showIcon
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
            <Title level={2} style={{ margin: 0 }}>Categories Management</Title>
            <Text type="secondary">Organize your products with categories</Text>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              size="large"
              onClick={() => {
                resetForm();
                setFormDrawerVisible(true);
              }}
          >
            Add New Category
            </Button>
          </Col>
        </Row>

        {/* Categories Grid */}
        <Card>
          <Row gutter={[16, 16]}>
            {categories.map((category) => (
              <Col xs={24} sm={12} lg={8} key={category._id}>
                <Card 
                  hoverable
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Space>
                        <div
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '50%',
                            backgroundColor: category.color 
                          }}
                        />
                        <Title level={4} style={{ margin: 0 }}>
                          {category.name}
                        </Title>
                      </Space>
                      <Space>
                        <Tooltip title={`${category.isActive !== false ? 'Deactivate' : 'Activate'} Category`}>
                          <Switch
                            checked={category.isActive !== false} // Default to true if undefined
                            onChange={(checked) => handleActiveToggle(category._id, category.isActive !== false)}
                            size="small"
                          />
                        </Tooltip>
                        <Tooltip title="Edit Category">
                          <Button 
                            type="text" 
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(category)}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete Category"
                          description="Are you sure you want to delete this category? Products using this category will be moved to 'General' category."
                          onConfirm={() => handleDelete(category._id)}
                          okText="Yes"
                          cancelText="No"
                          okType="danger"
                        >
                          <Tooltip title="Delete Category">
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
        </div>

                    {category.description && (
                      <Text type="secondary" style={{ display: 'block', marginBottom: '12px' }}>
                        {category.description}
                      </Text>
                    )}
                    
                    <Divider style={{ margin: '8px 0' }} />
                    
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          <Tag color={category.color} style={{ margin: 0 }}>
                            {category.color}
                          </Tag>
                        </Space>
                      </Col>
                      <Col>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          ID: {category._id?.slice(-8)}
                        </Text>
                      </Col>
                    </Row>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
          
          {categories.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
              <Title level={4} type="secondary">No categories found</Title>
              <Text type="secondary">Create your first category to get started!</Text>
                  </div>
          )}
        </Card>

        {/* Category Form Drawer */}
        <Drawer
          title={editingCategory ? 'Edit Category' : 'Add New Category'}
          open={formDrawerVisible}
          onClose={resetForm}
          width={500}
          destroyOnClose
          placement="right"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{
              name: '',
              description: '',
              color: '#3B82F6'
            }}
          >
            <Form.Item
              label="Category Name"
              name="name"
              rules={[{ required: true, message: 'Please enter category name!' }]}
            >
              <Input placeholder="Enter category name" />
            </Form.Item>

            <Form.Item
              label="Color"
              name="color"
              rules={[{ required: true, message: 'Please select a color!' }]}
            >
              <div>
                <ColorPicker 
                  showText 
                  style={{ width: '100%' }}
                  format="hex"
                />
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {predefinedColors.map((color) => (
                    <div
                      key={color}
                      onClick={() => form.setFieldsValue({ color })}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: '2px solid #d9d9d9',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.borderColor = '#40a9ff'}
                      onMouseLeave={(e) => e.target.style.borderColor = '#d9d9d9'}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </Form.Item>
            
            <Form.Item
              label="Description"
              name="description"
            >
              <TextArea 
                rows={3} 
                placeholder="Enter category description"
              />
            </Form.Item>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <Button onClick={resetForm}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingCategory ? 'Update Category' : 'Add Category'}
              </Button>
            </div>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}
