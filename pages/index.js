import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';
import { apiRequest } from '../lib/auth';
import { formatCurrency } from '../lib/currency';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Button,
  Modal,
  Select,
  DatePicker,
  Radio,
  Switch,
  Alert,
  Timeline,
  Tag,
  Divider,
  Progress,
  Empty,
  Tooltip,
  notification
} from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  DollarOutlined,
  TrophyOutlined,
  WarningOutlined,
  CalendarOutlined,
  BarChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  PlusOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  RocketOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalSales: 0,
    inventoryValue: 0,
    netProfit: 0,
    totalReturns: 0,
    totalReturnsValue: 0,
    grossProfit: 0,
    totalCost: 0,
  });
  const [settings, setSettings] = useState({
    currency: '$',
    discountPercentage: 3,
    businessName: 'My Business'
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState({
    salesData: [],
    profitData: [],
    monthlyData: [],
    dailyData: [],
    weeklyData: []
  });
  const [timePeriod, setTimePeriod] = useState('monthly');
  const [exportFilter, setExportFilter] = useState('monthly');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });
  const [customDateEnabled, setCustomDateEnabled] = useState(false);

  const { Title, Text, Paragraph } = Typography;
  const { Option } = Select;
  const { RangePicker } = DatePicker;

  useEffect(() => {
    fetchSettings();
    fetchStats();
    fetchRecentActivity();
    fetchChartData();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const [productsRes, invoicesRes, returnsRes] = await Promise.all([
        apiRequest('/api/products'),
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
      ]);

      let products = [];
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        products = productsData.products || productsData;
        const lowStock = products.filter(p => p.quantity <= 10).length;
        const expiringSoon = products.filter(p => {
          if (!p.expiryDate) return false;
          const expiryDate = new Date(p.expiryDate);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }).length;

        const inventoryValue = products.reduce((sum, product) => {
          return sum + (product.quantity * product.purchasePrice);
        }, 0);

        const totalCost = products.reduce((sum, product) => {
          return sum + (product.quantity * product.purchasePrice);
        }, 0);

        setStats(prev => ({
          ...prev,
          totalProducts: products.length,
          lowStock,
          expiringSoon,
          inventoryValue,
          totalCost,
        }));
      }

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
        
        let totalPurchasePrice = 0;
        let totalSellingPrice = 0;
        
        invoices.forEach(invoice => {
          invoice.items.forEach(item => {
            const product = products.find(p => p._id === item.productId);
            if (product) {
              totalPurchasePrice += item.quantity * product.purchasePrice;
              totalSellingPrice += item.quantity * item.price;
            }
          });
        });
        
        const grossProfit = totalSales - totalPurchasePrice;
        
        setStats(prev => ({ 
          ...prev, 
          totalSales,
          grossProfit,
          totalPurchasePrice,
          totalSellingPrice,
        }));
      }

      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        const totalReturns = returns.length;
        const totalReturnsValue = returns.reduce((sum, returnItem) => {
          return sum + (returnItem.returnValue || 0);
        }, 0);

        const netProfit = stats.grossProfit - totalReturnsValue;

        setStats(prev => ({ 
          ...prev, 
          totalReturns,
          totalReturnsValue,
          netProfit,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [invoicesRes, returnsRes, productsRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/products'),
      ]);

      const activities = [];

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const recentInvoices = invoices
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        recentInvoices.forEach(invoice => {
          activities.push({
            id: invoice._id,
            type: 'invoice',
            title: `Invoice ${invoice.invoiceNumber} generated`,
            description: `${invoice.items.length} item(s) - ${formatCurrency(invoice.total)}`,
            date: new Date(invoice.createdAt),
            icon: '🧾',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
          });
        });
      }

      if (returnsRes.ok) {
        const returns = await returnsRes.json();
        const recentReturns = returns
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        
        recentReturns.forEach(returnItem => {
          activities.push({
            id: returnItem._id,
            type: 'return',
            title: `Return ${returnItem.returnNumber} processed`,
            description: `${returnItem.medicineName} - ${returnItem.quantity} qty - ${formatCurrency(returnItem.returnValue)}`,
            date: new Date(returnItem.createdAt),
            icon: '🔄',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
          });
        });
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        const medicines = productsData.products || productsData;
        const recentMedicines = medicines
          .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
          .slice(0, 3);
        
        recentMedicines.forEach(medicine => {
          activities.push({
            id: medicine._id,
            type: 'medicine',
            title: `${medicine.name} updated`,
            description: `Stock: ${medicine.quantity} | Price: ${formatCurrency(medicine.sellingPrice)}`,
            date: new Date(medicine.updatedAt || medicine.createdAt),
            icon: '💊',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
          });
        });
      }

      const sortedActivities = activities
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);

      setRecentActivity(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchChartData = async () => {
    try {
      const [invoicesRes, returnsRes, productsRes] = await Promise.all([
        apiRequest('/api/invoices'),
        apiRequest('/api/returns'),
        apiRequest('/api/products'),
      ]);

      const monthlyData = [];
      const dailyData = [];
      const weeklyData = [];

      if (invoicesRes.ok && productsRes.ok) {
        const invoices = await invoicesRes.json();
        const productsData = await productsRes.json();
        const medicines = productsData.products || productsData;
        
        const monthlySales = {};
        const dailySales = {};
        const weeklySales = {};
        
        invoices.forEach(invoice => {
          const date = new Date(invoice.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const weekKey = `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`;
          
          if (!monthlySales[monthKey]) {
            monthlySales[monthKey] = { sales: 0, purchasePrice: 0, count: 0, month: monthKey };
          }
          monthlySales[monthKey].sales += invoice.total;
          monthlySales[monthKey].count += 1;
          
          if (!dailySales[dayKey]) {
            dailySales[dayKey] = { sales: 0, purchasePrice: 0, count: 0, day: dayKey };
          }
          dailySales[dayKey].sales += invoice.total;
          dailySales[dayKey].count += 1;
          
          if (!weeklySales[weekKey]) {
            weeklySales[weekKey] = { sales: 0, purchasePrice: 0, count: 0, week: weekKey };
          }
          weeklySales[weekKey].sales += invoice.total;
          weeklySales[weekKey].count += 1;
          
          invoice.items.forEach(item => {
            const medicine = medicines.find(m => m._id === item.medicineId);
            if (medicine) {
              const purchaseCost = item.quantity * medicine.purchasePrice;
              monthlySales[monthKey].purchasePrice += purchaseCost;
              dailySales[dayKey].purchasePrice += purchaseCost;
              weeklySales[weekKey].purchasePrice += purchaseCost;
            }
          });
        });

        Object.values(monthlySales).forEach(month => {
          const profit = month.sales - month.purchasePrice;
          monthlyData.push({
            period: month.month,
            sales: month.sales,
            profit: profit,
            count: month.count
          });
        });

        Object.values(dailySales).forEach(day => {
          const profit = day.sales - day.purchasePrice;
          dailyData.push({
            period: day.day,
            sales: day.sales,
            profit: profit,
            count: day.count
          });
        });

        Object.values(weeklySales).forEach(week => {
          const profit = week.sales - week.purchasePrice;
          weeklyData.push({
            period: week.week,
            sales: week.sales,
            profit: profit,
            count: week.count
          });
        });

        monthlyData.sort((a, b) => b.period.localeCompare(a.period));
        dailyData.sort((a, b) => b.period.localeCompare(a.period));
        weeklyData.sort((a, b) => b.period.localeCompare(a.period));
      }

      setChartData({
        monthlyData,
        dailyData,
        weeklyData
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const handleExportExcel = async () => {
    setShowExportModal(true);
  };

  const handleExportWithDateRange = async () => {
    const hasCustomDates = customDateEnabled && exportDateRange.fromDate && exportDateRange.toDate;
    
    try {
      let response;
      let filename;
      let apiUrl;
      
      if (hasCustomDates) {
        apiUrl = `/api/export/sales-data?fromDate=${exportDateRange.fromDate}&toDate=${exportDateRange.toDate}`;
        filename = `sales-report-${exportDateRange.fromDate}-to-${exportDateRange.toDate}.xlsx`;
      } else {
        apiUrl = `/api/export/sales-data?filter=${exportFilter}`;
        const filterLabel = exportFilter === 'all' ? 'all-time' : exportFilter;
        const currentDate = new Date().toISOString().split('T')[0];
        filename = `sales-report-${filterLabel}-${currentDate}.xlsx`;
      }
      
      response = await apiRequest(apiUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setShowExportModal(false);
        setExportDateRange({
          fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          toDate: new Date().toISOString().split('T')[0]
        });
        setExportFilter('monthly');
        setCustomDateEnabled(false);
        
        if (hasCustomDates) {
          notification.success({
            message: 'Export Complete',
            description: `Excel file downloaded successfully! (${exportDateRange.fromDate} to ${exportDateRange.toDate})`,
          });
        } else {
          const filterText = exportFilter === 'all' ? 'All Time' : 
                           exportFilter === 'daily' ? 'Last 30 Days' : 
                           exportFilter === 'weekly' ? 'Last 12 Weeks' : 'Last 12 Months';
          notification.success({
            message: 'Export Complete',
            description: `Excel file downloaded successfully! (${filterText})`,
          });
        }
      } else {
        throw new Error('Failed to generate Excel file');
      }
    } catch (error) {
      console.error('Export error:', error);
      notification.error({
        message: 'Export Failed',
        description: 'Error downloading Excel file. Please try again.',
      });
    }
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <DashboardOutlined /> Dashboard
          </Title>
          <Text type="secondary">
            Welcome to {settings.businessName} Management System
          </Text>
        </div>

        {/* Business Setup Notification */}
        {settings.businessName === 'My Business' && (
          <Alert
            message="Complete Your Business Setup"
            description={
              <div>
                <Paragraph style={{ marginBottom: '16px' }}>
                  Welcome! To get started, please complete your business configuration. 
                  This will set up your system according to your business type and requirements.
                </Paragraph>
                <Space>
                  <Link href="/setup/business-config">
                    <Button type="primary" icon={<RocketOutlined />}>
                      Launch Business Setup Wizard
                    </Button>
                  </Link>
                  <Link href="/settings?tab=business-setup">
                    <Button icon={<SettingOutlined />}>
                      Go to Settings
                    </Button>
                  </Link>
                </Space>
              </div>
            }
            type="info"
            showIcon
            icon={<RocketOutlined />}
            style={{ marginBottom: '24px' }}
            closable
          />
        )}

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
          <Col xs={24} sm={12} lg={8}>
            <Link href="/products">
              <Card hoverable>
                <Statistic
                  title="Total Products"
                  value={stats.totalProducts}
                  prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Link>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <Link href="/products">
              <Card hoverable>
                <Statistic
                  title="Inventory Value"
                  value={stats.inventoryValue}
                  prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </Card>
            </Link>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <Link href="/products">
              <Card hoverable>
                <Statistic
                  title="Total Cost"
                  value={stats.totalPurchasePrice || 0}
                  prefix={<ShoppingCartOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </Card>
            </Link>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <Link href="/invoices">
              <Card hoverable>
                <Statistic
                  title="Total Sales Value"
                  value={stats.totalSellingPrice || 0}
                  prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </Card>
            </Link>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <Link href="/invoices">
              <Card hoverable>
                <Statistic
                  title="Total Sales"
                  value={stats.totalSales}
                  prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </Card>
            </Link>
          </Col>
          
          <Col xs={24} sm={12} lg={8}>
            <Link href="/invoices">
              <Card hoverable>
                <Statistic
                  title="Gross Profit"
                  value={stats.grossProfit}
                  prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                  formatter={(value) => formatCurrency(value)}
                />
              </Card>
            </Link>
          </Col>
        </Row>

        {/* Quick Actions */}
        <Card 
          title={
            <Space>
              <PlusOutlined />
              <span>Quick Actions</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Link href="/products/add">
                <Card hoverable size="small" style={{ textAlign: 'center' }}>
                  <Space direction="vertical">
                    <PlusOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                    <div>
                      <Title level={5} style={{ margin: 0 }}>Add New Product</Title>
                      <Text type="secondary">Add a new product to inventory</Text>
                    </div>
                  </Space>
                </Card>
              </Link>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Link href="/invoices/generate">
                <Card hoverable size="small" style={{ textAlign: 'center' }}>
                  <Space direction="vertical">
                    <FileTextOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                    <div>
                      <Title level={5} style={{ margin: 0 }}>Generate Invoice</Title>
                      <Text type="secondary">Create a new customer invoice</Text>
                    </div>
                  </Space>
                </Card>
              </Link>
            </Col>
            
            <Col xs={24} sm={12} lg={8}>
              <Link href="/products">
                <Card hoverable size="small" style={{ textAlign: 'center' }}>
                  <Space direction="vertical">
                    <ShoppingOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />
                    <div>
                      <Title level={5} style={{ margin: 0 }}>View Products</Title>
                      <Text type="secondary">Browse and manage products</Text>
                    </div>
                  </Space>
                </Card>
              </Link>
            </Col>
          </Row>
        </Card>

        {/* Sales & Profit Overview */}
        <Card 
          title={
            <Space>
              <BarChartOutlined />
              <span>Sales & Profit Overview</span>
            </Space>
          }
          extra={
            <Space>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Export Excel
              </Button>
              <Radio.Group
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="daily">Daily</Radio.Button>
                <Radio.Button value="weekly">Weekly</Radio.Button>
                <Radio.Button value="monthly">Monthly</Radio.Button>
              </Radio.Group>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          {(() => {
            const currentData = timePeriod === 'daily' ? chartData.dailyData : 
                               timePeriod === 'weekly' ? chartData.weeklyData : 
                               chartData.monthlyData;
            const periodLabel = timePeriod === 'daily' ? 'Daily' : 
                               timePeriod === 'weekly' ? 'Weekly' : 'Monthly';
            
            return currentData.length > 0 ? (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Charts Row */}
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={12}>
                    <Card 
                      title={
                        <Space>
                          <BarChartOutlined />
                          <span>{periodLabel} Sales Chart</span>
                        </Space>
                      }
                      size="small"
                    >
                      <div style={{ height: '200px', background: '#fafafa', borderRadius: '6px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text type="secondary">Chart visualization will be enhanced in next update</Text>
                      </div>
                    </Card>
                  </Col>
                  
                  <Col xs={24} lg={12}>
                    <Card 
                      title={
                        <Space>
                          <LineChartOutlined />
                          <span>{periodLabel} Profit Trend</span>
                        </Space>
                      }
                      size="small"
                    >
                      <div style={{ height: '200px', background: '#fafafa', borderRadius: '6px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text type="secondary">Trend chart will be enhanced in next update</Text>
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Summary Table */}
                <Card 
                  title={`${periodLabel} Summary`}
                  size="small"
                >
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {currentData.slice(0, 6).map((period, index) => {
                        const periodLabel = timePeriod === 'daily' ? 
                          new Date(period.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                          timePeriod === 'weekly' ? 
                          `Week ${period.period.split('-W')[1]}, ${period.period.split('-W')[0]}` :
                          new Date(period.period + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                        
                        return (
                          <Card key={period.period} size="small" style={{ background: '#fafafa' }}>
                            <Row justify="space-between" align="middle">
                              <Col>
                                <div>
                                  <Text strong>{periodLabel}</Text>
                                  <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      {period.count} invoices, {period.returnCount || 0} returns
                                    </Text>
                                  </div>
                                </div>
                              </Col>
                              <Col>
                                <div style={{ textAlign: 'right' }}>
                                  <div>
                                    <Text type="success" strong>
                                      Sales: {settings.currency}{period.sales.toFixed(2)}
                                    </Text>
                                  </div>
                                  <div>
                                    <Text type={period.profit >= 0 ? 'success' : 'danger'} strong>
                                      Profit: {settings.currency}{period.profit.toFixed(2)}
                                    </Text>
                                  </div>
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        );
                      })}
                    </Space>
                  </div>
                </Card>
              </Space>
            ) : (
              <Empty 
                description={
                  <div>
                    <Text type="secondary">No {timePeriod} data available</Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Generate invoices to see {timePeriod} trends
                      </Text>
                    </div>
                  </div>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            );
          })()}
        </Card>

        {/* Recent Activity */}
        <Card 
          title={
            <Space>
              <CalendarOutlined />
              <span>Recent Activity</span>
            </Space>
          }
          extra={
            <Space split={<Divider type="vertical" />}>
              <Link href="/invoices">
                <Button type="link" size="small">View Invoices</Button>
              </Link>
              <Link href="/returns">
                <Button type="link" size="small">View Returns</Button>
              </Link>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
          {recentActivity.length === 0 ? (
            <Empty 
              description={
                <div>
                  <Text type="secondary">No recent activity</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Start by adding products or generating invoices
                    </Text>
                  </div>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Timeline>
                {recentActivity.map((activity) => (
                  <Timeline.Item
                    key={activity.id}
                    dot={<span style={{ fontSize: '16px' }}>{activity.icon}</span>}
                    color={
                      activity.type === 'invoice' ? 'green' :
                      activity.type === 'return' ? 'orange' : 'blue'
                    }
                  >
                    <div>
                      <Text strong>{activity.title}</Text>
                      <div>
                        <Text type="secondary">{activity.description}</Text>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          )}
        </Card>
      </div>

      {/* Export Date Range Modal */}
      <Modal
        title="Export Sales Report"
        open={showExportModal}
        onCancel={() => {
          setShowExportModal(false);
          setExportDateRange({
            fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            toDate: new Date().toISOString().split('T')[0]
          });
          setExportFilter('monthly');
          setCustomDateEnabled(false);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowExportModal(false);
              setExportDateRange({
                fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                toDate: new Date().toISOString().split('T')[0]
              });
              setExportFilter('monthly');
              setCustomDateEnabled(false);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportWithDateRange}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Download Report
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Export Mode Selection */}
          <Card size="small" style={{ background: '#fafafa' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Text strong>Export Mode Selection</Text>
              </Col>
              <Col>
                <Space>
                  <Text>Custom Dates</Text>
                  <Switch
                    checked={customDateEnabled}
                    onChange={setCustomDateEnabled}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Quick Filter Options */}
          {!customDateEnabled && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                Quick Filter Options
              </Text>
              <Radio.Group
                value={exportFilter}
                onChange={(e) => setExportFilter(e.target.value)}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio value="daily">
                    <div>
                      <Text strong>Last 30 Days</Text>
                      <div><Text type="secondary" style={{ fontSize: '12px' }}>Daily breakdown</Text></div>
                    </div>
                  </Radio>
                  <Radio value="weekly">
                    <div>
                      <Text strong>Last 12 Weeks</Text>
                      <div><Text type="secondary" style={{ fontSize: '12px' }}>Weekly breakdown</Text></div>
                    </div>
                  </Radio>
                  <Radio value="monthly">
                    <div>
                      <Text strong>Last 12 Months</Text>
                      <div><Text type="secondary" style={{ fontSize: '12px' }}>Monthly breakdown</Text></div>
                    </div>
                  </Radio>
                  <Radio value="all">
                    <div>
                      <Text strong>All Time</Text>
                      <div><Text type="secondary" style={{ fontSize: '12px' }}>Complete history</Text></div>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>
          )}

          {/* Custom Date Range */}
          {customDateEnabled && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                Custom Date Range
              </Text>
              <Row gutter={16}>
                <Col span={12}>
                  <Text style={{ display: 'block', marginBottom: '8px' }}>From Date</Text>
                  <DatePicker
                    value={dayjs(exportDateRange.fromDate)}
                    onChange={(date) => setExportDateRange(prev => ({
                      ...prev,
                      fromDate: date ? date.format('YYYY-MM-DD') : ''
                    }))}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={12}>
                  <Text style={{ display: 'block', marginBottom: '8px' }}>To Date</Text>
                  <DatePicker
                    value={dayjs(exportDateRange.toDate)}
                    onChange={(date) => setExportDateRange(prev => ({
                      ...prev,
                      toDate: date ? date.format('YYYY-MM-DD') : ''
                    }))}
                    style={{ width: '100%' }}
                  />
                </Col>
              </Row>
            </div>
          )}

          {/* Export Status */}
          <Alert
            message="Export Mode"
            description={
              customDateEnabled 
                ? `Custom Range (${exportDateRange.fromDate} to ${exportDateRange.toDate})`
                : `Quick Filter (${exportFilter === 'all' ? 'All Time' : 
                   exportFilter === 'daily' ? 'Last 30 Days' : 
                   exportFilter === 'weekly' ? 'Last 12 Weeks' : 'Last 12 Months'})`
            }
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </Layout>
  );
}