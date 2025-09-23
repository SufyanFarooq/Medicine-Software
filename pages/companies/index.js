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
  Form
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

export default function Companies() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, [pagination.current, pagination.pageSize, searchText, countryFilter]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(searchText && { search: searchText }),
        ...(countryFilter && { country: countryFilter })
      });

      const response = await apiRequest(`/api/companies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(Array.isArray(data.companies) ? data.companies : []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      message.error('Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleCountryFilter = (value) => {
    setCountryFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleAddCompany = () => {
    setEditingCompany(null);
    form.resetFields();
    setFormDrawerVisible(true);
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      contact: company.contact,
      country: company.country,
      phone: company.phone,
      email: company.email,
      website: company.website
    });
    setFormDrawerVisible(true);
  };

  const handleViewCompany = (company) => {
    // Set a flag to indicate this is view mode
    const viewCompany = { ...company, _viewMode: true };
    setEditingCompany(viewCompany);
    form.setFieldsValue({
      name: company.name,
      contact: company.contact,
      country: company.country,
      phone: company.phone,
      email: company.email,
      website: company.website
    });
    setFormDrawerVisible(true);
  };

  const handleCopyId = (company) => {
    navigator.clipboard.writeText(company._id);
    message.success('Company ID copied to clipboard');
  };

  const handleDeleteCompany = async (company) => {
    try {
      const response = await apiRequest(`/api/companies/${company._id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        message.success('Company deleted successfully');
        fetchCompanies();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to delete company');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      message.error('Error deleting company');
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      const url = editingCompany 
        ? `/api/companies/${editingCompany._id}`
        : '/api/companies';
      
      const method = editingCompany ? 'PUT' : 'POST';
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success(
          editingCompany 
            ? 'Company updated successfully' 
            : 'Company created successfully'
        );
        setFormDrawerVisible(false);
        fetchCompanies();
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to save company');
      }
    } catch (error) {
      console.error('Error saving company:', error);
      message.error('Error saving company');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
      render: (text) => text || '-'
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      render: (text) => text || '-'
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => text || '-'
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <Text type="secondary">{text}</Text>
    },
    {
      title: 'Website',
      dataIndex: 'website',
      key: 'website',
      render: (text) => text ? (
        <a href={text.startsWith('http') ? text : `http://${text}`} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ) : '-'
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
                onClick: () => handleViewCompany(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditCompany(record)
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
                    title="Delete Company"
                    description={`Are you sure you want to delete "${record.name}"?`}
                    onConfirm={() => handleDeleteCompany(record)}
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
              <Title level={2} style={{ margin: 0 }}>Company List</Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="Search companies..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 200 }}
                allowClear
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchCompanies}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddCompany}
              >
                Add New Company
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="Filter by Country"
                value={countryFilter}
                onChange={handleCountryFilter}
                style={{ width: '100%' }}
                allowClear
              >
                <Option value="Pakistan">Pakistan</Option>
                <Option value="USA">USA</Option>
                <Option value="UK">UK</Option>
                <Option value="Canada">Canada</Option>
                <Option value="Australia">Australia</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Companies Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={companies}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} companies`
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Add/Edit/View Company Drawer */}
        <Drawer
          title={
            editingCompany 
              ? (editingCompany._viewMode ? 'View Company' : 'Edit Company')
              : 'Add New Company'
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
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <Input 
                placeholder="Enter company name" 
                disabled={editingCompany && editingCompany._viewMode}
              />
            </Form.Item>

            <Form.Item
              name="contact"
              label="Contact"
            >
              <Input 
                placeholder="Enter contact person" 
                disabled={editingCompany && editingCompany._viewMode}
              />
            </Form.Item>

            <Form.Item
              name="country"
              label="Country"
            >
              <Select 
                placeholder="Select country" 
                allowClear
                disabled={editingCompany && editingCompany._viewMode}
              >
                <Option value="Pakistan">Pakistan</Option>
                <Option value="USA">USA</Option>
                <Option value="UK">UK</Option>
                <Option value="Canada">Canada</Option>
                <Option value="Australia">Australia</Option>
                <Option value="India">India</Option>
                <Option value="UAE">UAE</Option>
                <Option value="Germany">Germany</Option>
                <Option value="France">France</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone"
            >
              <Input 
                placeholder="+1 123 456 789" 
                disabled={editingCompany && editingCompany._viewMode}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter valid email' }
              ]}
            >
              <Input 
                placeholder="email@example.com" 
                disabled={editingCompany && editingCompany._viewMode}
              />
            </Form.Item>

            <Form.Item
              name="website"
              label="Website"
            >
              <Input 
                placeholder="www.example.com" 
                addonBefore="http://"
                disabled={editingCompany && editingCompany._viewMode}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                {!(editingCompany && editingCompany._viewMode) && (
                  <Button type="primary" htmlType="submit">
                    {editingCompany ? 'Update Company' : 'Create Company'}
                  </Button>
                )}
                <Button onClick={() => setFormDrawerVisible(false)}>
                  {editingCompany && editingCompany._viewMode ? 'Close' : 'Cancel'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}
