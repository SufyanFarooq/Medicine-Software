import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { formatCurrency } from '../../lib/currency';
import {
  Card,
  Table,
  Select,
  Input,
  DatePicker,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Spin,
  Empty,
  Tooltip,
  Divider
} from 'antd';
import {
  ClearOutlined,
  UserOutlined,
  CalendarOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchActivities();
  }, [filters]);

  const fetchActivities = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('limit', '100');

      const response = await apiRequest(`/api/activities?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Activities data received:', data);
        // Handle both array response and object with activities property
        const activitiesArray = data.activities || data || [];
        setActivities(Array.isArray(activitiesArray) ? activitiesArray : []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]); // Ensure activities is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      userId: '',
      startDate: '',
      endDate: ''
    });
  };

  const getActionIcon = (actionType) => {
    if (!actionType) return '📝';
    
    switch (actionType) {
      // Product activities
      case 'PRODUCT_ADDED': return '📦';
      case 'PRODUCT_UPDATED': return '✏️';
      case 'PRODUCT_DELETED': return '🗑️';
      
      // Inventory activities
      case 'INVENTORY_INFLOW': return '📥';
      case 'INVENTORY_OUTFLOW': return '📤';
      
      // Invoice activities
      case 'INVOICE_CREATED': return '🧾';
      case 'INVOICE_UPDATED': return '✏️';
      case 'INVOICE_DELETED': return '🗑️';
      
      // Return activities
      case 'RETURN_PROCESSED': return '↩️';
      case 'RETURN_UPDATED': return '✏️';
      case 'RETURN_DELETED': return '🗑️';
      
      // Business setup activities
      case 'BUSINESS_SETUP_COMPLETED': return '⚙️';
      case 'BUSINESS_SETUP_UPDATED': return '✏️';
      
      // Supplier activities
      case 'SUPPLIER_ADDED': return '🏢';
      case 'SUPPLIER_UPDATED': return '✏️';
      case 'SUPPLIER_DELETED': return '🗑️';
      
      // Purchase Order activities
      case 'PURCHASE_ORDER_CREATED': return '📋';
      case 'PURCHASE_ORDER_UPDATED': return '✏️';
      case 'PURCHASE_ORDER_RECEIVED': return '✅';
      case 'PURCHASE_ORDER_CANCELLED': return '❌';
      
      // User activities
      case 'USER_LOGIN': return '🔑';
      case 'USER_LOGOUT': return '🚪';
      case 'USER_CREATED': return '👤';
      case 'USER_UPDATED': return '✏️';
      case 'USER_DELETED': return '🗑️';
      
      // Legacy medicine activities (for backward compatibility)
      case 'MEDICINE_ADDED': return '📦';
      case 'MEDICINE_UPDATED': return '✏️';
      case 'MEDICINE_DELETED': return '🗑️';
      
      default: return '📝';
    }
  };

  const getActionColor = (actionType) => {
    if (!actionType) return 'text-gray-600 bg-gray-100';
    
    switch (actionType) {
      // Product activities
      case 'PRODUCT_ADDED': return 'text-green-600 bg-green-100';
      case 'PRODUCT_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'PRODUCT_DELETED': return 'text-red-600 bg-red-100';
      
      // Inventory activities
      case 'INVENTORY_INFLOW': return 'text-green-600 bg-green-100';
      case 'INVENTORY_OUTFLOW': return 'text-orange-600 bg-orange-100';
      
      // Invoice activities
      case 'INVOICE_CREATED': return 'text-green-600 bg-green-100';
      case 'INVOICE_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'INVOICE_DELETED': return 'text-red-600 bg-red-100';
      
      // Return activities
      case 'RETURN_PROCESSED': return 'text-purple-600 bg-purple-100';
      case 'RETURN_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'RETURN_DELETED': return 'text-red-600 bg-red-100';
      
      // Business setup activities
      case 'BUSINESS_SETUP_COMPLETED': return 'text-green-600 bg-green-100';
      case 'BUSINESS_SETUP_UPDATED': return 'text-blue-600 bg-blue-100';
      
      // Supplier activities
      case 'SUPPLIER_ADDED': return 'text-green-600 bg-green-100';
      case 'SUPPLIER_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'SUPPLIER_DELETED': return 'text-red-600 bg-red-100';
      
      // Purchase Order activities
      case 'PURCHASE_ORDER_CREATED': return 'text-green-600 bg-green-100';
      case 'PURCHASE_ORDER_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'PURCHASE_ORDER_RECEIVED': return 'text-green-600 bg-green-100';
      case 'PURCHASE_ORDER_CANCELLED': return 'text-red-600 bg-red-100';
      
      // User activities
      case 'USER_LOGIN': return 'text-green-600 bg-green-100';
      case 'USER_LOGOUT': return 'text-gray-600 bg-gray-100';
      case 'USER_CREATED': return 'text-green-600 bg-green-100';
      case 'USER_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'USER_DELETED': return 'text-red-600 bg-red-100';
      
      // Legacy medicine activities (for backward compatibility)
      case 'MEDICINE_ADDED': return 'text-green-600 bg-green-100';
      case 'MEDICINE_UPDATED': return 'text-blue-600 bg-blue-100';
      case 'MEDICINE_DELETED': return 'text-red-600 bg-red-100';
      
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Function to safely convert details to readable string
  const formatDetails = (details) => {
    if (!details) return 'No details available';
    
    // If details is already a string, return it
    if (typeof details === 'string') return details;
    
    // If details is an object, convert it to a readable string
    if (typeof details === 'object') {
      try {
        // Handle return objects specifically
        if (details.returnNumber) {
          return `Return ${details.returnNumber} - ${details.reason || 'No reason'} - Amount: ${details.refundAmount || 'N/A'}`;
        }
        
        // Handle invoice objects
        if (details.invoiceNumber) {
          return `Invoice ${details.invoiceNumber} - Items: ${details.items ? details.items.length : 0}`;
        }
        
        // Handle other objects - convert to JSON string but limit length
        const jsonString = JSON.stringify(details);
        return jsonString.length > 100 ? jsonString.substring(0, 100) + '...' : jsonString;
      } catch (error) {
        return 'Complex data (cannot display)';
      }
    }
    
    // For any other type, convert to string
    return String(details);
  };

  const { Title, Text } = Typography;
  const { Option, OptGroup } = Select;
  const { RangePicker } = DatePicker;

  // Define table columns
  const columns = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (action) => (
        <Space>
          <span style={{ fontSize: '16px' }}>{getActionIcon(action)}</span>
          <Tag color={getTagColor(action)}>
            {action ? action.replace(/_/g, ' ') : 'Unknown Action'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'user',
      width: 150,
      render: (username, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{username || 'Unknown User'}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ID: {record.userId || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: {
        showTitle: false,
      },
      render: (details) => (
        <Tooltip title={formatDetails(details)}>
          <Text>{formatDetails(details)}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Entity',
      dataIndex: 'entityType',
      key: 'entity',
      width: 120,
      render: (entityType, record) => (
        <div>
          {entityType ? (
            <Text type="secondary" style={{ textTransform: 'capitalize' }}>
              {entityType}
            </Text>
          ) : (
            <Text type="secondary" disabled>No entity</Text>
          )}
          {record.entityId && (
            <div>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ({String(record.entityId)})
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt) => (
        <div>
          <div>{createdAt ? dayjs(createdAt).format('MMM DD, YYYY') : 'N/A'}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {createdAt ? dayjs(createdAt).format('HH:mm:ss') : 'N/A'}
          </Text>
        </div>
      ),
    },
  ];

  // Helper function to get tag color based on action type
  const getTagColor = (actionType) => {
    if (!actionType) return 'default';
    
    switch (actionType) {
      case 'PRODUCT_ADDED':
      case 'INVENTORY_INFLOW':
      case 'INVOICE_CREATED':
      case 'BUSINESS_SETUP_COMPLETED':
      case 'SUPPLIER_ADDED':
      case 'PURCHASE_ORDER_CREATED':
      case 'PURCHASE_ORDER_RECEIVED':
      case 'USER_LOGIN':
      case 'USER_CREATED':
      case 'MEDICINE_ADDED':
        return 'green';
      
      case 'PRODUCT_UPDATED':
      case 'INVOICE_UPDATED':
      case 'RETURN_UPDATED':
      case 'BUSINESS_SETUP_UPDATED':
      case 'SUPPLIER_UPDATED':
      case 'PURCHASE_ORDER_UPDATED':
      case 'USER_UPDATED':
      case 'MEDICINE_UPDATED':
        return 'blue';
      
      case 'PRODUCT_DELETED':
      case 'INVOICE_DELETED':
      case 'RETURN_DELETED':
      case 'SUPPLIER_DELETED':
      case 'PURCHASE_ORDER_CANCELLED':
      case 'USER_DELETED':
      case 'MEDICINE_DELETED':
        return 'red';
      
      case 'INVENTORY_OUTFLOW':
        return 'orange';
      
      case 'RETURN_PROCESSED':
        return 'purple';
      
      case 'USER_LOGOUT':
        return 'default';
      
      default:
        return 'default';
    }
  };

  if (loading) {
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

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            👥 User Activities
          </Title>
          <Text type="secondary">
            Track activity across products, sales, returns, inventory, and settings
          </Text>
        </div>

        {/* Filters */}
        <Card 
          title={
            <Space>
              <FilterOutlined />
              <span>Filters</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  Action Type
                </Text>
                <Select
                  value={filters.action || undefined}
                  onChange={(value) => handleFilterChange('action', value || '')}
                  placeholder="All Action Types"
                  style={{ width: '100%' }}
                  allowClear
                >
                  <OptGroup label="📦 Product Management">
                    <Option value="PRODUCT_ADDED">Product Added</Option>
                    <Option value="PRODUCT_UPDATED">Product Updated</Option>
                    <Option value="PRODUCT_DELETED">Product Deleted</Option>
                  </OptGroup>
                  
                  <OptGroup label="📊 Inventory Management">
                    <Option value="INVENTORY_INFLOW">Stock Inflow</Option>
                    <Option value="INVENTORY_OUTFLOW">Stock Outflow</Option>
                  </OptGroup>
                  
                  <OptGroup label="🧾 Sales & Invoicing">
                    <Option value="INVOICE_CREATED">Invoice Created</Option>
                    <Option value="INVOICE_UPDATED">Invoice Updated</Option>
                    <Option value="INVOICE_DELETED">Invoice Deleted</Option>
                  </OptGroup>
                  
                  <OptGroup label="↩️ Returns & Refunds">
                    <Option value="RETURN_PROCESSED">Return Processed</Option>
                    <Option value="RETURN_UPDATED">Return Updated</Option>
                    <Option value="RETURN_DELETED">Return Deleted</Option>
                  </OptGroup>
                  
                  <OptGroup label="📋 Purchase Orders">
                    <Option value="PURCHASE_ORDER_CREATED">PO Created</Option>
                    <Option value="PURCHASE_ORDER_UPDATED">PO Updated</Option>
                    <Option value="PURCHASE_ORDER_RECEIVED">PO Received</Option>
                    <Option value="PURCHASE_ORDER_CANCELLED">PO Cancelled</Option>
                  </OptGroup>
                  
                  <OptGroup label="🏢 Supplier Management">
                    <Option value="SUPPLIER_ADDED">Supplier Added</Option>
                    <Option value="SUPPLIER_UPDATED">Supplier Updated</Option>
                    <Option value="SUPPLIER_DELETED">Supplier Deleted</Option>
                  </OptGroup>
                  
                  <OptGroup label="⚙️ System Configuration">
                    <Option value="BUSINESS_SETUP_COMPLETED">Business Setup Completed</Option>
                    <Option value="BUSINESS_SETUP_UPDATED">Business Setup Updated</Option>
                  </OptGroup>
                  
                  <OptGroup label="👤 User Management">
                    <Option value="USER_LOGIN">User Login</Option>
                    <Option value="USER_LOGOUT">User Logout</Option>
                    <Option value="USER_CREATED">User Created</Option>
                    <Option value="USER_UPDATED">User Updated</Option>
                    <Option value="USER_DELETED">User Deleted</Option>
                  </OptGroup>
                  
                  <OptGroup label="💊 Legacy Medicine Activities">
                    <Option value="MEDICINE_ADDED">Medicine Added</Option>
                    <Option value="MEDICINE_UPDATED">Medicine Updated</Option>
                    <Option value="MEDICINE_DELETED">Medicine Deleted</Option>
                  </OptGroup>
                </Select>
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  <UserOutlined /> User ID
                </Text>
                <Input
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  placeholder="Filter by user ID"
                  allowClear
                />
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  <CalendarOutlined /> Start Date
                </Text>
                <DatePicker
                  value={filters.startDate ? dayjs(filters.startDate) : null}
                  onChange={(date) => handleFilterChange('startDate', date ? date.format('YYYY-MM-DD') : '')}
                  style={{ width: '100%' }}
                  placeholder="Start date"
                />
              </div>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  <CalendarOutlined /> End Date
                </Text>
                <DatePicker
                  value={filters.endDate ? dayjs(filters.endDate) : null}
                  onChange={(date) => handleFilterChange('endDate', date ? date.format('YYYY-MM-DD') : '')}
                  style={{ width: '100%' }}
                  placeholder="End date"
                />
              </div>
            </Col>
          </Row>
          
          <Divider />
          
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchActivities()}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={clearFilters}
                type="default"
              >
                Clear Filters
              </Button>
            </Space>
          </div>
        </Card>

        {/* Activities Table */}
        <Card title="Activities Log">
          <Table
            columns={columns}
            dataSource={activities.filter(activity => activity && typeof activity === 'object')}
            rowKey={(record) => record._id ? String(record._id) : Math.random()}
            loading={loading}
            pagination={{
              total: activities.length,
              pageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} activities`,
            }}
            locale={{
              emptyText: (
                <Empty 
                  description="No activities found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            scroll={{ x: 1000 }}
            size="middle"
          />
        </Card>
      </div>
    </Layout>
  );
} 