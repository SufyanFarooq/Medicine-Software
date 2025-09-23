import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { SYSTEM_CONFIG, getBusinessTypeConfig, getDefaultCategories, getDefaultDiscount } from '../../lib/config';
import {
  Steps,
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Checkbox,
  InputNumber,
  Tag,
  Alert,
  Divider,
  Modal,
  notification,
  Progress,
  Descriptions
} from 'antd';
import {
  ShopOutlined,
  EnvironmentOutlined,
  SettingOutlined,
  CheckOutlined,
  RocketOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';

export default function BusinessSetup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // Changed to 0 for Ant Design Steps
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { Title, Text, Paragraph } = Typography;
  const { Option } = Select;
  const { TextArea } = Input;
  
  const [businessConfig, setBusinessConfig] = useState({
    businessName: '',
    businessType: 'retail-store',
    industry: 'General',
    currency: 'Rs',
    currencySymbol: '₹',
    timezone: 'Asia/Karachi',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    address: '',
    contactNumber: '',
    email: '',
    website: '',
    taxRate: 0,
    defaultDiscount: 3,
    hasExpiryDates: true,
    hasBatchNumbers: true,
    hasSerialNumbers: false,
    hasWarranty: false
  });

  const [categories, setCategories] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  useEffect(() => {
    // Load existing business settings if available
    loadExistingSettings();
  }, []);

  const loadExistingSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        if (settings.businessName) {
          setBusinessConfig(prev => ({
            ...prev,
            ...settings
          }));
          form.setFieldsValue(settings);
          setCurrentStep(3); // Skip to final step if already configured (0-based index)
        }
      }
    } catch (error) {
      console.log('No existing settings found, starting fresh setup');
    }
  };

  const updateBusinessConfig = (field, value) => {
    setBusinessConfig(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-update related fields based on business type
    if (field === 'businessType') {
      const typeConfig = getBusinessTypeConfig(value);
      setBusinessConfig(prev => ({
        ...prev,
        businessType: value,
        defaultDiscount: typeConfig.defaultDiscount,
        hasExpiryDates: typeConfig.hasExpiryDates,
        hasBatchNumbers: typeConfig.hasBatchNumbers,
        hasSerialNumbers: typeConfig.hasSerialNumbers,
        hasWarranty: typeConfig.hasWarranty
      }));
      
      // Set default categories for the business type
      setCategories(getDefaultCategories(value));
    }
  };

  const addCustomCategory = () => {
    setIsModalVisible(true);
  };

  const handleAddCategory = () => {
    if (newCategoryName && newCategoryName.trim()) {
      setCustomCategories(prev => [...prev, newCategoryName.trim()]);
      setNewCategoryName('');
      setIsModalVisible(false);
    }
  };

  const removeCustomCategory = (index) => {
    setCustomCategories(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    setError('');

    try {
      // Combine default and custom categories
      const allCategories = [...categories, ...customCategories].map((name, index) => ({
        name,
        description: `${name} category`,
        color: getCategoryColor(index),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Save categories first
      for (const category of allCategories) {
        try {
          const categoryResponse = await apiRequest('/api/categories', {
            method: 'POST',
            body: JSON.stringify(category)
          });
          
          if (!categoryResponse.ok) {
            console.warn(`Failed to save category: ${category.name}`);
          }
        } catch (error) {
          console.warn(`Error saving category ${category.name}:`, error);
        }
      }

      // Prepare settings data for POST method
      const settingsData = {
        businessName: businessConfig.businessName,
        businessType: businessConfig.businessType,
        industry: businessConfig.industry,
        currency: businessConfig.currency,
        currencySymbol: businessConfig.currencySymbol,
        timezone: businessConfig.timezone,
        language: businessConfig.language,
        dateFormat: businessConfig.dateFormat,
        timeFormat: businessConfig.timeFormat,
        address: businessConfig.address,
        contactNumber: businessConfig.contactNumber,
        email: businessConfig.email,
        website: businessConfig.website,
        taxRate: businessConfig.taxRate,
        discountPercentage: businessConfig.defaultDiscount,
        hasExpiryDates: businessConfig.hasExpiryDates,
        hasBatchNumbers: businessConfig.hasBatchNumbers,
        hasSerialNumbers: businessConfig.hasSerialNumbers,
        hasWarranty: businessConfig.hasWarranty,
        lowStockThreshold: 10
      };

      console.log('Saving business setup:', settingsData);

      // Use POST method for business setup
      const response = await apiRequest('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
      });

      if (response.ok) {
        const result = await response.json();
        notification.success({
          message: 'Setup Complete!',
          description: 'Business setup completed successfully!',
          duration: 5,
        });
        console.log('Setup result:', result);
        router.push('/');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete business setup');
      }
    } catch (error) {
      notification.error({
        message: 'Setup Failed',
        description: 'Failed to complete business setup: ' + error.message,
      });
      setError('Failed to complete business setup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (index) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#6B7280', '#374151', '#059669', '#DC2626'];
    return colors[index % colors.length];
  };

  const renderStep1 = () => (
      <div>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <ShopOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <Title level={3} style={{ margin: 0 }}>Business Information</Title>
        <Text type="secondary">Let's start with your basic business details</Text>
      </div>
      
      <Form
        form={form}
        layout="vertical"
        initialValues={businessConfig}
        onValuesChange={(changedValues) => {
          Object.keys(changedValues).forEach(key => {
            updateBusinessConfig(key, changedValues[key]);
          });
        }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="businessName"
              label="Business Name"
              rules={[{ required: true, message: 'Please enter your business name' }]}
            >
              <Input
                size="large"
              placeholder="Enter your business name"
                prefix={<ShopOutlined />}
              />
            </Form.Item>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="businessType"
              label="Business Type"
              rules={[{ required: true, message: 'Please select your business type' }]}
            >
              <Select size="large" placeholder="Select business type">
              {Object.entries(SYSTEM_CONFIG.businessTypes).map(([key, type]) => (
                  <Option key={key} value={key}>
                  {type.name} - {type.description}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="industry"
              label="Industry"
            >
              <Input
                size="large"
              placeholder="e.g., Electronics, Fashion, Food"
            />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="currency"
              label="Currency"
              rules={[{ required: true, message: 'Please select currency' }]}
            >
              <Select size="large" placeholder="Select currency">
                <Option value="Rs">🇵🇰 Pakistani Rupee (Rs)</Option>
                <Option value="$">🇺🇸 US Dollar ($)</Option>
                <Option value="€">🇪🇺 Euro (€)</Option>
                <Option value="£">🇬🇧 British Pound (£)</Option>
                <Option value="₹">🇮🇳 Indian Rupee (₹)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  const renderStep2 = () => (
      <div>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <EnvironmentOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <Title level={3} style={{ margin: 0 }}>Contact & Location</Title>
        <Text type="secondary">Where can customers find and reach you?</Text>
          </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={businessConfig}
        onValuesChange={(changedValues) => {
          Object.keys(changedValues).forEach(key => {
            updateBusinessConfig(key, changedValues[key]);
          });
        }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24}>
            <Form.Item
              name="address"
              label="Business Address"
            >
              <TextArea
                rows={3}
                placeholder="Enter your complete business address"
                size="large"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="contactNumber"
              label="Contact Number"
              rules={[{ required: true, message: 'Please enter contact number' }]}
            >
              <Input
                size="large"
              placeholder="+92 XXX XXXXXXX"
                prefix="📞"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email Address"
              rules={[{ type: 'email', message: 'Please enter valid email' }]}
            >
              <Input
                size="large"
              placeholder="business@example.com"
                prefix="📧"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="website"
              label="Website"
              rules={[{ type: 'url', message: 'Please enter valid URL' }]}
            >
              <Input
                size="large"
              placeholder="https://www.example.com"
                prefix="🌐"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="timezone"
              label="Timezone"
            >
              <Select size="large" placeholder="Select timezone">
                <Option value="Asia/Karachi">🇵🇰 Pakistan (UTC+5)</Option>
                <Option value="Asia/Dubai">🇦🇪 UAE (UTC+4)</Option>
                <Option value="Asia/Kolkata">🇮🇳 India (UTC+5:30)</Option>
                <Option value="America/New_York">🇺🇸 US Eastern (UTC-5)</Option>
                <Option value="Europe/London">🇬🇧 UK (UTC+0)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  const renderStep3 = () => (
      <div>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <SettingOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <Title level={3} style={{ margin: 0 }}>Business Settings</Title>
        <Text type="secondary">Configure your business operations and features</Text>
          </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={businessConfig}
        onValuesChange={(changedValues) => {
          Object.keys(changedValues).forEach(key => {
            updateBusinessConfig(key, changedValues[key]);
          });
        }}
      >
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="defaultDiscount"
              label="Default Discount (%)"
            >
              <InputNumber
                size="large"
                min={0}
                max={100}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="Enter default discount percentage"
                prefix="💰"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="taxRate"
              label="Tax Rate (%)"
            >
              <InputNumber
                size="large"
                min={0}
                max={100}
                step={0.1}
                style={{ width: '100%' }}
                placeholder="Enter tax rate"
                prefix="📊"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">
          <Title level={4}>Inventory Features</Title>
        </Divider>
        
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              name="hasExpiryDates"
              valuePropName="checked"
            >
              <Checkbox>
                <Space>
                  📅 <span>Track Expiry Dates</span>
                </Space>
              </Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="hasBatchNumbers"
              valuePropName="checked"
            >
              <Checkbox>
                <Space>
                  🏷️ <span>Track Batch Numbers</span>
                </Space>
              </Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="hasSerialNumbers"
              valuePropName="checked"
            >
              <Checkbox>
                <Space>
                  🔢 <span>Track Serial Numbers</span>
                </Space>
              </Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="hasWarranty"
              valuePropName="checked"
            >
              <Checkbox>
                <Space>
                  🛡️ <span>Track Warranty</span>
                </Space>
              </Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );

  const renderStep4 = () => (
      <div>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <CheckOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
        <Title level={3} style={{ margin: 0 }}>Categories & Final Setup</Title>
        <Text type="secondary">Review and finalize your business configuration</Text>
      </div>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Default Categories */}
        <Card title="Default Categories" size="small">
          <Row gutter={[8, 8]}>
            {categories.map((category, index) => (
              <Col key={index} xs={12} sm={8} md={6}>
                <Tag color="blue" style={{ width: '100%', textAlign: 'center', padding: '8px' }}>
                  {category}
                </Tag>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Custom Categories */}
        <Card 
          title="Custom Categories" 
          size="small"
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={addCustomCategory}
              size="small"
            >
              Add Category
            </Button>
          }
        >
          {customCategories.length > 0 ? (
            <Row gutter={[8, 8]}>
            {customCategories.map((category, index) => (
                <Col key={index} xs={12} sm={8} md={6}>
                  <Tag 
                    color="green" 
                    closable
                    onClose={() => removeCustomCategory(index)}
                    style={{ width: '100%', textAlign: 'center', padding: '8px' }}
                  >
                    {category}
                  </Tag>
                </Col>
              ))}
            </Row>
          ) : (
            <Text type="secondary">No custom categories added yet</Text>
          )}
        </Card>

        {/* Configuration Summary */}
        <Card title="Configuration Summary" size="small">
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Business Name">
              {businessConfig.businessName}
            </Descriptions.Item>
            <Descriptions.Item label="Business Type">
              {getBusinessTypeConfig(businessConfig.businessType).name}
            </Descriptions.Item>
            <Descriptions.Item label="Currency">
              {businessConfig.currency}
            </Descriptions.Item>
            <Descriptions.Item label="Default Discount">
              {businessConfig.defaultDiscount}%
            </Descriptions.Item>
            <Descriptions.Item label="Tax Rate">
              {businessConfig.taxRate}%
            </Descriptions.Item>
            <Descriptions.Item label="Total Categories">
              {categories.length + customCategories.length}
            </Descriptions.Item>
            <Descriptions.Item label="Expiry Tracking">
              <Tag color={businessConfig.hasExpiryDates ? 'green' : 'red'}>
                {businessConfig.hasExpiryDates ? 'Enabled' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Batch Numbers">
              <Tag color={businessConfig.hasBatchNumbers ? 'green' : 'red'}>
                {businessConfig.hasBatchNumbers ? 'Enabled' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Serial Numbers">
              <Tag color={businessConfig.hasSerialNumbers ? 'green' : 'red'}>
                {businessConfig.hasSerialNumbers ? 'Enabled' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Warranty Tracking">
              <Tag color={businessConfig.hasWarranty ? 'green' : 'red'}>
                {businessConfig.hasWarranty ? 'Enabled' : 'Disabled'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep1();
      case 1: return renderStep2();
      case 2: return renderStep3();
      case 3: return renderStep4();
      default: return renderStep1();
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return businessConfig.businessName.trim() !== '';
    if (currentStep === 1) return businessConfig.contactNumber.trim() !== '';
    if (currentStep === 2) return true;
    if (currentStep === 3) return true;
    return false;
  };

  // Define steps for Ant Design Steps component
  const stepsConfig = [
    {
      title: 'Business Info',
      description: 'Basic details',
      icon: <ShopOutlined />,
    },
    {
      title: 'Contact',
      description: 'Location & contact',
      icon: <EnvironmentOutlined />,
    },
    {
      title: 'Settings',
      description: 'Business settings',
      icon: <SettingOutlined />,
    },
    {
      title: 'Finish',
      description: 'Review & complete',
      icon: <CheckOutlined />,
    },
  ];

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <RocketOutlined style={{ fontSize: '72px', color: '#1890ff', marginBottom: '24px' }} />
          <Title level={1} style={{ margin: 0, color: '#1890ff' }}>
            Business Setup Wizard
          </Title>
          <Paragraph style={{ fontSize: '18px', color: '#666', marginTop: '8px' }}>
            Configure your Universal Business Management System
          </Paragraph>
        </div>

        {/* Steps Progress */}
        <Card style={{ marginBottom: '32px' }}>
          <Steps
            current={currentStep}
            items={stepsConfig}
            size="small"
          />
        </Card>

        {/* Step Content */}
        <Card style={{ marginBottom: '32px', minHeight: '500px' }}>
          {renderCurrentStep()}
        </Card>

        {/* Navigation */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              icon={<ArrowLeftOutlined />}
            onClick={prevStep}
              disabled={currentStep === 0}
              size="large"
          >
            Previous
            </Button>

            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">
                Step {currentStep + 1} of 4
              </Text>
            </div>

            <Space>
              {currentStep < 3 ? (
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                onClick={nextStep}
                disabled={!canProceed()}
                  size="large"
              >
                Next
                </Button>
            ) : (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                onClick={saveConfiguration}
                disabled={loading || !canProceed()}
                  loading={loading}
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                    border: 'none',
                  }}
                >
                  {loading ? 'Saving Configuration...' : 'Complete Setup'}
                </Button>
              )}
            </Space>
          </div>
        </Card>

        {/* Add Category Modal */}
        <Modal
          title="Add Custom Category"
          open={isModalVisible}
          onOk={handleAddCategory}
          onCancel={() => {
            setIsModalVisible(false);
            setNewCategoryName('');
          }}
          okText="Add Category"
          cancelText="Cancel"
        >
          <Input
            placeholder="Enter category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onPressEnter={handleAddCategory}
            size="large"
            prefix={<PlusOutlined />}
          />
        </Modal>

        {/* Error Alert */}
        {error && (
          <Alert
            message="Setup Error"
            description={error}
            type="error"
            closable
            style={{ marginTop: '16px' }}
            onClose={() => setError('')}
          />
        )}
      </div>
    </Layout>
  );
}
