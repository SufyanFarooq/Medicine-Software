import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { setCurrency } from '../../lib/currency';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { logSettingsActivity } from '../../lib/activity-logger';
import Link from 'next/link';
import {
  Card,
  Tabs,
  Form,
  Input,
  Select,
  Button,
  Switch,
  InputNumber,
  Typography,
  Row,
  Col,
  Space,
  Alert,
  Table,
  Modal,
  Spin,
  Divider,
  Tag,
  Tooltip,
  notification,
  Popconfirm,
  Checkbox
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  ShopOutlined,
  RocketOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  DollarOutlined,
  PercentageOutlined,
  WarningOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

export default function Settings() {
  const [settings, setSettings] = useState({
    currency: '$',
    discountPercentage: 3,
    businessName: 'My Business',
    businessType: 'Retail Store',
    contactNumber: '',
    address: '',
    email: '',
    website: '',
    taxRate: 0,
    hasExpiryDates: true,
    hasBatchNumbers: false,
    lowStockThreshold: 10,
    notificationSettings: {
      lowStockThreshold: 20,
      expiryWarningDays: 30,
      criticalExpiryDays: 7,
      emailNotifications: true,
      inAppNotifications: true,
      notificationFrequency: 'realtime',
      autoCleanupDays: 30,
      stockoutAlert: true
    }
  });
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'sales_man'
  });
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();
  const [editUserForm] = Form.useForm();

  const { Title, Text, Paragraph } = Typography;
  const { Option } = Select;
  const { TextArea } = Input;

  const currencies = [
    { symbol: '$', name: 'US Dollar' },
    { symbol: '€', name: 'Euro' },
    { symbol: '£', name: 'British Pound' },
    { symbol: '₹', name: 'Indian Rupee' },
    { symbol: '¥', name: 'Japanese Yen' },
    { symbol: '₽', name: 'Russian Ruble' },
    { symbol: '₩', name: 'Korean Won' },
    { symbol: '₨', name: 'Pakistani Rupee' },
    { symbol: '₦', name: 'Nigerian Naira' }
  ];

  const businessTypes = [
    { value: 'Retail Store', label: 'Retail Store' },
    { value: 'Restaurant', label: 'Restaurant' },
    { value: 'Service Business', label: 'Service Business' },
    { value: 'Wholesale Business', label: 'Wholesale Business' },
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'E-commerce', label: 'E-commerce' },
    { value: 'Other', label: 'Other' }
  ];

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'sales_man', label: 'Sales Man' }
  ];

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    setIsLoadingUser(false);
    fetchSettings();
  }, []);

  useEffect(() => {
    if (currentUser && hasPermission(currentUser.role, 'canManageUsers')) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
        setCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const [originalSettings, setOriginalSettings] = useState({});

  const fetchUsers = async () => {
    try {
      const response = await apiRequest('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with users property
        const usersArray = data.users || data || [];
        setUsers(Array.isArray(usersArray) ? usersArray : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]); // Ensure users is always an array
    }
  };

  const testNotification = async () => {
    try {
      const response = await apiRequest('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          action: 'process',
          userId: 'test'
        })
      });

      if (response.ok) {
        notification.success({
          message: 'Test Notification Sent',
          description: 'Test notification processed successfully! Check the notification bell.',
          duration: 5,
        });
      } else {
        notification.error({
          message: 'Test Failed',
          description: 'Failed to process test notification',
        });
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      notification.error({
        message: 'Test Failed',
        description: 'Failed to test notification',
      });
    }
  };

  const handleSettingsSave = async () => {
    if (!hasPermission(currentUser?.role, 'canModifySettings')) {
      notification.error({
        message: 'Access Denied',
        description: 'You do not have permission to modify settings.',
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (activeTab === 'notifications') {
        response = await apiRequest('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            notificationSettings: settings.notificationSettings
          }),
        });
      } else {
        response = await apiRequest('/api/settings', {
          method: 'PUT',
          body: JSON.stringify(settings),
        });
      }

      if (response.ok) {
        if (activeTab !== 'notifications') {
          if (originalSettings.businessName !== settings.businessName) {
            logSettingsActivity.updated('businessName', originalSettings.businessName, settings.businessName);
          }
          if (originalSettings.contactNumber !== settings.contactNumber) {
            logSettingsActivity.updated('contactNumber', originalSettings.contactNumber, settings.contactNumber);
          }
          if (originalSettings.address !== settings.address) {
            logSettingsActivity.updated('address', originalSettings.address, settings.address);
          }
          if (originalSettings.currency !== settings.currency) {
            logSettingsActivity.updated('currency', originalSettings.currency, settings.currency);
          }
          if (originalSettings.discountPercentage !== settings.discountPercentage) {
            logSettingsActivity.updated('discountPercentage', originalSettings.discountPercentage, settings.discountPercentage);
          }
        }
        
        notification.success({
          message: 'Settings Saved',
          description: activeTab === 'notifications' ? 'Notification settings saved successfully!' : 'Settings saved successfully!',
        });
        
        if (activeTab !== 'notifications') {
          setCurrency(settings.currency);
        }
        setOriginalSettings(settings);
      } else {
        notification.error({
          message: 'Save Failed',
          description: 'Failed to save settings',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Error saving settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (values) => {
    if (!hasPermission(currentUser?.role, 'canCreateUsers')) {
      notification.error({
        message: 'Access Denied',
        description: 'You do not have permission to create users.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      if (response.ok) {
        notification.success({
          message: 'User Added',
          description: 'User added successfully!',
        });
        userForm.resetFields();
        setShowAddUser(false);
        fetchUsers();
      } else {
        const errorData = await response.json();
        notification.error({
          message: 'Add User Failed',
          description: errorData.message || 'Failed to add user',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Error adding user',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!hasPermission(currentUser?.role, 'canDeleteUsers')) {
      notification.error({
        message: 'Access Denied',
        description: 'You do not have permission to delete users.',
      });
      return;
    }

    try {
      const response = await apiRequest(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notification.success({
          message: 'User Deleted',
          description: 'User deleted successfully!',
        });
        fetchUsers();
      } else {
        notification.error({
          message: 'Delete Failed',
          description: 'Failed to delete user',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Error deleting user',
      });
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      _id: user._id,
      username: user.username,
      password: '',
      role: user.role
    });
    editUserForm.setFieldsValue({
      username: user.username,
      role: user.role,
      password: ''
    });
  };

  const handleUpdateUser = async (values) => {
    if (!hasPermission(currentUser?.role, 'canUpdateUsers')) {
      notification.error({
        message: 'Access Denied',
        description: 'You do not have permission to update users.',
      });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        username: values.username,
        role: values.role
      };
      
      // Only include password if it's not empty
      if (values.password && values.password.trim() !== '') {
        updateData.password = values.password;
      }

      const response = await apiRequest(`/api/users/${editingUser._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        notification.success({
          message: 'User Updated',
          description: 'User updated successfully!',
        });
        setEditingUser(null);
        editUserForm.resetFields();
        fetchUsers();
      } else {
        const errorData = await response.json();
        notification.error({
          message: 'Update Failed',
          description: errorData.message || 'Failed to update user',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'Error updating user',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <Layout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px' 
        }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!currentUser) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Text type="secondary">Please log in to access settings.</Text>
        </div>
      </Layout>
    );
  }

  // Define tab items
  const tabItems = [
    {
      key: 'company',
      label: (
        <span>
          <ShopOutlined />
          Company Information
        </span>
      ),
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined />
          System Settings
        </span>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          Notifications
        </span>
      ),
    },
    ...(hasPermission(currentUser?.role, 'canManageBusinessSetup') ? [{
      key: 'business-setup',
      label: (
        <span>
          <RocketOutlined />
          Business Setup
        </span>
      ),
    }] : []),
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined />
          User Management
        </span>
      ),
    },
  ];

  // Define sidebar menu items
  const sidebarMenuItems = [
    {
      key: 'general',
      icon: <SettingOutlined />,
      label: 'General Settings',
    },
    {
      key: 'company',
      icon: <ShopOutlined />,
      label: 'Company Settings',
    },
    {
      key: 'logo',
      icon: <BankOutlined />,
      label: 'Company Logo',
    },
    {
      key: 'currency',
      icon: <DollarOutlined />,
      label: 'Currency Settings',
    },
    {
      key: 'pdf',
      icon: <InfoCircleOutlined />,
      label: 'PDF Settings',
    },
    {
      key: 'finance',
      icon: <BankOutlined />,
      label: 'Finance Settings',
    },
    ...(hasPermission(currentUser?.role, 'canManageUsers') ? [{
      key: 'users',
      icon: <UserOutlined />,
      label: 'User Management',
    }] : []),
    ...(hasPermission(currentUser?.role, 'canModifySettings') ? [{
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    }] : []),
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <Row gutter={24} style={{ minHeight: '600px' }}>
          {/* Sidebar */}
          <Col xs={24} md={6}>
            <Card 
              title={
                <Space>
                  <SettingOutlined />
                  <span>Settings</span>
                </Space>
              }
              style={{ height: 'fit-content' }}
            >
              <div style={{ marginBottom: '16px' }}>
                {sidebarMenuItems.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      backgroundColor: activeTab === item.key ? '#e6f7ff' : 'transparent',
                      borderLeft: activeTab === item.key ? '3px solid #1890ff' : '3px solid transparent',
                      transition: 'all 0.3s ease',
                      color: activeTab === item.key ? '#1890ff' : '#666',
                      fontWeight: activeTab === item.key ? 500 : 400,
                    }}
                  >
                    <Space>
                      {item.icon}
                      <span>{item.label}</span>
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* Main Content */}
          <Col xs={24} md={18}>
            <Card style={{ minHeight: '500px' }}>
              
              {/* General Settings Tab */}
              {activeTab === 'general' && (
                <div>
                  <Title level={3} style={{ marginBottom: '8px' }}>General Settings</Title>
                  
                  <Divider />
                  
                  <Title level={4} style={{ marginTop: '32px', marginBottom: '16px' }}>App Settings</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                    Update Your App Configuration
                  </Text>
                  
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            Language:
                          </span>
                        }
                      >
                        <Select
                          defaultValue="english"
                          size="large"
                          style={{ width: '100%' }}
                          suffixIcon={<span>🇺🇸</span>}
                        >
                          <Option value="english">🇺🇸 English</Option>
                          <Option value="urdu">🇵🇰 Urdu</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            Country:
                          </span>
                        }
                      >
                        <Select
                          defaultValue="pakistan"
                          size="large"
                          style={{ width: '100%' }}
                          suffixIcon={<span>🇵🇰</span>}
                        >
                          <Option value="pakistan">🇵🇰 Pakistan</Option>
                          <Option value="usa">🇺🇸 United States</Option>
                          <Option value="uk">🇬🇧 United Kingdom</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            Date Format:
                          </span>
                        }
                      >
                        <Select
                          defaultValue="MM/DD/YYYY"
                          size="large"
                          style={{ width: '100%' }}
                        >
                          <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                          <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                          <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    
                    <Col xs={24} md={12}>
                      <Form.Item
                        label={
                          <span>
                            <span style={{ color: '#ff4d4f' }}>* </span>
                            Email:
                          </span>
                        }
                      >
                        <Input
                          size="large"
                          placeholder="sufyanmaviya400@gmail.com"
                          defaultValue="sufyanmaviya400@gmail.com"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <div style={{ marginTop: '32px' }}>
                    <Button 
                      type="primary" 
                      size="large"
                      style={{
                        backgroundColor: '#1890ff',
                        borderRadius: '6px',
                        fontWeight: 500,
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Company Settings Tab */}
              {activeTab === 'company' && (
                hasPermission(currentUser?.role, 'canModifySettings') ? (
                  <div>
                    <Title level={3} style={{ marginBottom: '8px' }}>Company Settings</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                      Core business details that appear on invoices and receipts
                    </Text>
                    
                    <Row gutter={[24, 24]}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <span>
                              <span style={{ color: '#ff4d4f' }}>* </span>
                              Business Name:
                            </span>
                          }
                          help="This will appear on all invoices and reports"
                        >
                          <Input
                            prefix={<BankOutlined />}
                            value={settings.businessName}
                            onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="Enter business name"
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Business Type:"
                          help="Determines default categories and features"
                        >
                          <Select
                            value={settings.businessType}
                            onChange={(value) => setSettings(prev => ({ ...prev, businessType: value }))}
                            size="large"
                            style={{ width: '100%' }}
                          >
                            {businessTypes.map((type) => (
                              <Option key={type.value} value={type.value}>
                                {type.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Contact Number:"
                          help="Customer service contact number"
                        >
                          <Input
                            prefix={<PhoneOutlined />}
                            value={settings.contactNumber}
                            onChange={(e) => setSettings(prev => ({ ...prev, contactNumber: e.target.value }))}
                            placeholder="+92 XXX XXXXXXX"
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="Email Address:"
                          help="Business email for customer inquiries"
                        >
                          <Input
                            prefix={<MailOutlined />}
                            type="email"
                            value={settings.email}
                            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="business@example.com"
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24}>
                        <Form.Item
                          label="Business Address:"
                          help="Full address for invoices and customer reference"
                        >
                          <TextArea
                            rows={3}
                            value={settings.address}
                            onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Enter complete business address"
                          />
                        </Form.Item>
                      </Col>
                      
                      <Col xs={24}>
                        <Form.Item
                          label="Website URL:"
                          help="Optional: Your business website"
                        >
                          <Input
                            prefix={<GlobalOutlined />}
                            type="url"
                            value={settings.website}
                            onChange={(e) => setSettings(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://www.example.com"
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <div style={{ marginTop: '32px' }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<SaveOutlined />}
                        onClick={handleSettingsSave}
                        loading={loading}
                        style={{
                          backgroundColor: '#1890ff',
                          borderRadius: '6px',
                          fontWeight: 500,
                        }}
                      >
                        Save Company Settings
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <Title level={4} type="secondary">Company Settings</Title>
                    <Text type="secondary">
                      You do not have permission to modify company information. Contact your Super Admin.
                    </Text>
                  </div>
                )
              )}

              {/* Currency Settings Tab */}
              {activeTab === 'currency' && (
                <div>
                  <Title level={3} style={{ marginBottom: '8px' }}>Currency Settings</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                    Configure currency and financial settings
                  </Text>
                  <Text type="secondary">Currency settings will be implemented in the next update.</Text>
                </div>
              )}

              {/* Company Logo Tab */}
              {activeTab === 'logo' && (
                <div>
                  <Title level={3} style={{ marginBottom: '8px' }}>Company Logo</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                    Upload and manage your company logo
                  </Text>
                  <Text type="secondary">Logo upload functionality will be implemented in the next update.</Text>
                </div>
              )}

              {/* PDF Settings Tab */}
              {activeTab === 'pdf' && (
                <div>
                  <Title level={3} style={{ marginBottom: '8px' }}>PDF Settings</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                    Configure PDF generation settings
                  </Text>
                  <Text type="secondary">PDF settings will be implemented in the next update.</Text>
                </div>
              )}

              {/* Finance Settings Tab */}
              {activeTab === 'finance' && (
                <div>
                  <Title level={3} style={{ marginBottom: '8px' }}>Finance Settings</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                    Configure financial and accounting settings
                  </Text>
                  <Text type="secondary">Finance settings will be implemented in the next update.</Text>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                hasPermission(currentUser?.role, 'canModifySettings') ? (
                  <div>
                    <Title level={3} style={{ marginBottom: '8px' }}>Notification Settings</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                      Configure notification preferences
                    </Text>
                    <Text type="secondary">Notification settings will be implemented in the next update.</Text>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <Title level={4} type="secondary">Notification Settings</Title>
                    <Text type="secondary">
                      You do not have permission to modify notification settings. Contact your Super Admin.
                    </Text>
                  </div>
                )
              )}

              {/* User Management Tab */}
              {activeTab === 'users' && (
                hasPermission(currentUser?.role, 'canManageUsers') ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div>
                        <Title level={3} style={{ marginBottom: '8px' }}>User Management</Title>
                        <Text type="secondary">
                          Manage system users and permissions
                        </Text>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          setShowAddUser(true);
                          userForm.resetFields();
                        }}
                        size="large"
                      >
                        Add User
                      </Button>
                    </div>

                    {/* Users Table */}
                    <Card>
                      <Table
                        dataSource={users}
                        rowKey="_id"
                        loading={loading}
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} users`,
                        }}
                        columns={[
                          {
                            title: 'Username',
                            dataIndex: 'username',
                            key: 'username',
                            render: (username) => (
                              <Space>
                                <UserOutlined />
                                <span style={{ fontWeight: 500 }}>{username}</span>
                              </Space>
                            ),
                          },
                          {
                            title: 'Role',
                            dataIndex: 'role',
                            key: 'role',
                            render: (role) => {
                              let color = 'default';
                              if (role === 'super_admin') color = 'red';
                              else if (role === 'manager') color = 'blue';
                              else if (role === 'sales_man') color = 'green';
                              
                              return (
                                <Tag color={color}>
                                  {role.replace('_', ' ').toUpperCase()}
                                </Tag>
                              );
                            },
                          },
                          {
                            title: 'Created Date',
                            dataIndex: 'createdAt',
                            key: 'createdAt',
                            render: (date) => (
                              <div>
                                <div>{new Date(date).toLocaleDateString()}</div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {new Date(date).toLocaleTimeString()}
                                </Text>
                              </div>
                            ),
                          },
                          {
                            title: 'Actions',
                            key: 'actions',
                            width: 120,
                            render: (_, user) => (
                              <Space>
                                <Tooltip title="Edit User">
                                  <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => handleEditUser(user)}
                                    disabled={!hasPermission(currentUser?.role, 'canUpdateUsers')}
                                  />
                                </Tooltip>
                                <Tooltip title="Delete User">
                                  <Popconfirm
                                    title="Delete User"
                                    description="Are you sure you want to delete this user?"
                                    onConfirm={() => handleDeleteUser(user._id)}
                                    okText="Yes"
                                    cancelText="No"
                                    disabled={user.role === 'super_admin' || user._id === currentUser?._id}
                                  >
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      disabled={
                                        user.role === 'super_admin' || 
                                        user._id === currentUser?._id ||
                                        !hasPermission(currentUser?.role, 'canDeleteUsers')
                                      }
                                    />
                                  </Popconfirm>
                                </Tooltip>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>

                    {/* Add User Modal */}
                    <Modal
                      title="Add New User"
                      open={showAddUser}
                      onCancel={() => {
                        setShowAddUser(false);
                        userForm.resetFields();
                      }}
                      footer={null}
                      width={600}
                    >
                      <Form
                        form={userForm}
                        layout="vertical"
                        onFinish={handleAddUser}
                        style={{ marginTop: '24px' }}
                      >
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="username"
                              label="Username"
                              rules={[
                                { required: true, message: 'Please enter username' },
                                { min: 3, message: 'Username must be at least 3 characters' }
                              ]}
                            >
                              <Input
                                prefix={<UserOutlined />}
                                placeholder="Enter username"
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="password"
                              label="Password"
                              rules={[
                                { required: true, message: 'Please enter password' },
                                { min: 6, message: 'Password must be at least 6 characters' }
                              ]}
                            >
                              <Input.Password
                                placeholder="Enter password"
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item
                          name="role"
                          label="Role"
                          rules={[{ required: true, message: 'Please select a role' }]}
                          initialValue="sales_man"
                        >
                          <Select size="large" placeholder="Select role">
                            {roles.map((role) => (
                              <Option key={role.value} value={role.value}>
                                {role.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                          <Space>
                            <Button
                              onClick={() => {
                                setShowAddUser(false);
                                userForm.resetFields();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="primary"
                              htmlType="submit"
                              loading={loading}
                              icon={<SaveOutlined />}
                            >
                              Add User
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                    </Modal>

                    {/* Edit User Modal */}
                    <Modal
                      title={`Edit User: ${editingUser?.username}`}
                      open={!!editingUser}
                      onCancel={() => {
                        setEditingUser(null);
                        editUserForm.resetFields();
                      }}
                      footer={null}
                      width={600}
                    >
                      <Form
                        form={editUserForm}
                        layout="vertical"
                        onFinish={handleUpdateUser}
                        initialValues={editingUser}
                        style={{ marginTop: '24px' }}
                      >
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="username"
                              label="Username"
                              rules={[
                                { required: true, message: 'Please enter username' },
                                { min: 3, message: 'Username must be at least 3 characters' }
                              ]}
                            >
                              <Input
                                prefix={<UserOutlined />}
                                placeholder="Enter username"
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="password"
                              label="Password (leave blank to keep current)"
                            >
                              <Input.Password
                                placeholder="Enter new password (optional)"
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.Item
                          name="role"
                          label="Role"
                          rules={[{ required: true, message: 'Please select a role' }]}
                        >
                          <Select size="large" placeholder="Select role">
                            {roles.map((role) => (
                              <Option key={role.value} value={role.value}>
                                {role.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                          <Space>
                            <Button
                              onClick={() => {
                                setEditingUser(null);
                                editUserForm.resetFields();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="primary"
                              htmlType="submit"
                              loading={loading}
                              icon={<SaveOutlined />}
                            >
                              Update User
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                    </Modal>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <Title level={4} type="secondary">User Management</Title>
                    <Text type="secondary">
                      You do not have permission to manage users. Contact your Super Admin.
                    </Text>
                  </div>
                )
              )}

            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
}