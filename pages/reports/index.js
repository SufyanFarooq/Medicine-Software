import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { getUser } from '../../lib/auth';
import { hasPermission } from '../../lib/permissions';
import { formatCurrency as formatAppCurrency } from '../../lib/currency';
import { 
  Tabs,
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Select,
  DatePicker,
  Statistic,
  Table,
  Progress,
  Tag,
  Alert,
  Divider,
  Spin,
  Empty
} from 'antd';
import { 
  BarChartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BankOutlined,
  WarningOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Reports() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('month');
  const [customDateRange, setCustomDateRange] = useState(null);
  const [reportsData, setReportsData] = useState({});

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    fetchReportsData();
  }, [dateRange, customDateRange]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      let url = '/api/reports?type=overview';
      const { start, end } = getRange();
      if (start && end) {
        url += `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
      }
      const response = await apiRequest(url);
      if (response.ok) {
        const data = await response.json();
        // Ensure array properties are always arrays
        const safeData = {
          ...data,
          topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
          inventoryStatus: Array.isArray(data.inventoryStatus) ? data.inventoryStatus : [],
          categoryPerformance: Array.isArray(data.categoryPerformance) ? data.categoryPerformance : []
        };
        setReportsData(safeData);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setReportsData({
        topProducts: [],
        inventoryStatus: [],
        categoryPerformance: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getRange = () => {
    const now = new Date();
    const toISO = (d) => new Date(d).toISOString();

    switch (dateRange) {
      case 'week': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'year': {
        const start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start: toISO(start), end: toISO(end) };
      }
      case 'custom': {
        if (!customDateRange || customDateRange.length !== 2) return { start: null, end: null };
        const start = customDateRange[0].startOf('day').toDate();
        const end = customDateRange[1].endOf('day').toDate();
        return { start: toISO(start), end: toISO(end) };
      }
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'custom': return 'Custom Range';
      case 'all': return 'All Time';
      default: return 'Last 30 Days';
    }
  };

  // Business Report Tab Content
  const BusinessReportTab = () => (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Loading business report...</Text>
          </div>
        </div>
      ) : (
        <Row gutter={16}>
          {/* Key Metrics */}
          <Col span={24} style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Revenue"
                    value={reportsData.totalRevenue || 0}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                    formatter={(value) => `Rs ${formatNumber(value)}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Orders"
                    value={reportsData.totalOrders || 0}
                    prefix={<ShoppingCartOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Products"
                    value={reportsData.totalProducts || 0}
                    prefix={<ShoppingOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Customers"
                    value={reportsData.totalCustomers || 0}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#eb2f96' }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Revenue Chart Placeholder */}
          <Col span={24}>
            <Card title="Revenue Overview" style={{ marginBottom: '16px' }}>
              <div style={{ textAlign: 'center', padding: '48px' }}>
                <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">Revenue chart will be displayed here</Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );

  // Sales Report Tab Content
  const SalesReportTab = () => (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Loading sales report...</Text>
          </div>
        </div>
      ) : (
        <Row gutter={16}>
          {/* Sales Metrics */}
          <Col span={24} style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Total Sales"
                    value={reportsData.totalSales || 0}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                    formatter={(value) => `Rs ${formatNumber(value)}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Average Order Value"
                    value={reportsData.averageOrderValue || 0}
                    prefix={<ShoppingCartOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                    formatter={(value) => `Rs ${formatNumber(value)}`}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Conversion Rate"
                    value={reportsData.conversionRate || 0}
                    suffix="%"
                    prefix={<TrophyOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Top Products Table */}
          <Col span={24}>
            <Card title="Top Selling Products">
              <Table
                dataSource={reportsData.topProducts || []}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Product',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text) => <Text strong>{text}</Text>
                  },
                  {
                    title: 'Sales',
                    dataIndex: 'totalSales',
                    key: 'totalSales',
                    render: (value) => `Rs ${formatNumber(value || 0)}`
                  },
                  {
                    title: 'Quantity Sold',
                    dataIndex: 'quantitySold',
                    key: 'quantitySold',
                    render: (value) => formatNumber(value || 0)
                  },
                  {
                    title: 'Performance',
                    key: 'performance',
                    render: (_, record) => {
                      const percentage = ((record.totalSales || 0) / (reportsData.totalSales || 1)) * 100;
                      return (
                        <Progress 
                          percent={percentage} 
                          size="small" 
                          status={percentage > 20 ? 'success' : percentage > 10 ? 'active' : 'exception'}
                        />
                      );
                    }
                  }
                ]}
                locale={{
                  emptyText: (
                    <Empty 
                      description="No sales data available" 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )
                }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );

  // Inventory Report Tab Content
  const InventoryReportTab = () => (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text>Loading inventory report...</Text>
          </div>
        </div>
      ) : (
        <Row gutter={16}>
          {/* Inventory Metrics */}
          <Col span={24} style={{ marginBottom: '24px' }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Products"
                    value={reportsData.totalProducts || 0}
                    prefix={<ShoppingOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Low Stock Items"
                    value={reportsData.lowStockItems || 0}
                    prefix={<WarningOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Out of Stock"
                    value={reportsData.outOfStockItems || 0}
                    prefix={<ExclamationCircleOutlined />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Total Stock Value"
                    value={reportsData.totalStockValue || 0}
                    prefix={<BankOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                    formatter={(value) => `Rs ${formatNumber(value)}`}
                  />
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Inventory Status Table */}
          <Col span={24}>
            <Card title="Inventory Status">
              <Table
                dataSource={reportsData.inventoryStatus || []}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Product',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text) => <Text strong>{text}</Text>
                  },
                  {
                    title: 'Current Stock',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    render: (value) => formatNumber(value || 0)
                  },
                  {
                    title: 'Status',
                    key: 'status',
                    render: (_, record) => {
                      const quantity = record.quantity || 0;
                      if (quantity === 0) {
                        return <Tag color="error">Out of Stock</Tag>;
                      } else if (quantity <= 10) {
                        return <Tag color="warning">Low Stock</Tag>;
                      }
                      return <Tag color="success">In Stock</Tag>;
                    }
                  },
                  {
                    title: 'Stock Level',
                    key: 'stockLevel',
                    render: (_, record) => {
                      const quantity = record.quantity || 0;
                      const maxStock = record.maxStock || 100;
                      const percentage = (quantity / maxStock) * 100;
                      return (
                        <Progress 
                          percent={percentage} 
                          size="small" 
                          status={percentage < 20 ? 'exception' : percentage < 50 ? 'active' : 'success'}
                        />
                      );
                    }
                  }
                ]}
                locale={{
                  emptyText: (
                    <Empty 
                      description="No inventory data available" 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )
                }}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );

  // Check permissions
  if (!hasPermission(currentUser?.role, 'canViewReports')) {
    return (
      <Layout>
        <div style={{ padding: '24px' }}>
          <Alert
            message="Access Denied"
            description="You do not have permission to view reports."
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
            <Title level={2} style={{ margin: 0 }}>
              <Space>
                📊 Business Reports
              </Space>
            </Title>
            <Text type="secondary">Comprehensive business insights and performance analytics</Text>
          </Col>
        </Row>

        {/* Date Range Selector */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Text strong>Date Range</Text>
              <Select
                value={dateRange}
                onChange={(value) => setDateRange(value)}
                style={{ width: '100%', marginTop: '8px' }}
              >
                <Option value="week">Last 7 Days</Option>
                <Option value="month">This Month</Option>
                <Option value="quarter">This Quarter</Option>
                <Option value="year">This Year</Option>
                <Option value="all">All Time</Option>
                <Option value="custom">Custom Range</Option>
              </Select>
            </Col>

            {dateRange === 'custom' && (
              <Col xs={24} sm={12} md={8}>
                <Text strong>Custom Date Range</Text>
                <RangePicker
                  style={{ width: '100%', marginTop: '8px' }}
                  value={customDateRange}
                  onChange={(dates) => setCustomDateRange(dates)}
                  format="DD/MM/YYYY"
                />
              </Col>
            )}

            <Col xs={24} sm={8} md={6} offset={dateRange === 'custom' ? 0 : 4}>
              <div style={{ textAlign: 'right', marginTop: '24px' }}>
                <Tag color="blue" icon={<CalendarOutlined />}>
                  {getDateRangeLabel()}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Reports Tabs */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="large"
            items={[
              {
                key: 'business',
                label: (
                  <Space>
                    <BarChartOutlined />
                    Business Report
                  </Space>
                ),
                children: <BusinessReportTab />
              },
              {
                key: 'sales',
                label: (
                  <Space>
                    <DollarOutlined />
                    Sales Report
                  </Space>
                ),
                children: <SalesReportTab />
              },
              {
                key: 'inventory',
                label: (
                  <Space>
                    <ShoppingOutlined />
                    Inventory Report
                  </Space>
                ),
                children: <InventoryReportTab />
              }
            ]}
          />
        </Card>
      </div>
    </Layout>
  );
}
