import { useState, useEffect } from 'react';
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
  message,
  Drawer,
  Form,
  Tag,
  Badge,
  Divider,
  Dropdown,
  Menu
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  SearchOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  MoreOutlined,
  EyeOutlined,
  CopyOutlined,
  DeleteOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [branchTypeFilter, setBranchTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [viewingBranch, setViewingBranch] = useState(null);
  const [form] = Form.useForm();

  const branchTypes = [
    { value: 'head_office', label: 'Head Office' },
    { value: 'branch_office', label: 'Branch Office' },
    { value: 'retail_store', label: 'Retail Store' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'distribution_center', label: 'Distribution Center' },
    { value: 'service_center', label: 'Service Center' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'red' },
    { value: 'temporarily_closed', label: 'Temporarily Closed', color: 'orange' },
    { value: 'under_maintenance', label: 'Under Maintenance', color: 'blue' }
  ];

  useEffect(() => {
    fetchBranches();
  }, [pagination.current, pagination.pageSize, searchText, branchTypeFilter, statusFilter]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize
      });
      
      if (searchText) params.append('search', searchText);
      if (branchTypeFilter) params.append('branchType', branchTypeFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiRequest(`/api/branches?${params}`);
      
      if (response.branches) {
        setBranches(response.branches);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total
        }));
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      message.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = () => {
    setEditingBranch(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleViewBranch = (branch) => {
    setViewingBranch(branch);
    setEditingBranch(null);
    form.setFieldsValue({
      name: branch.name,
      code: branch.code,
      description: branch.description,
      branchType: branch.branchType,
      status: branch.status,
      currency: branch.currency,
      timezone: branch.timezone,
      address: branch.address,
      contactInfo: branch.contactInfo,
      manager: branch.manager
    });
    setDrawerVisible(true);
  };

  const handleEditBranch = (branch) => {
    setEditingBranch(branch);
    setViewingBranch(null);
    form.setFieldsValue({
      name: branch.name,
      code: branch.code,
      description: branch.description,
      branchType: branch.branchType,
      status: branch.status,
      currency: branch.currency,
      timezone: branch.timezone,
      address: branch.address,
      contactInfo: branch.contactInfo,
      manager: branch.manager
    });
    setDrawerVisible(true);
  };

  const handleSaveBranch = async (values) => {
    try {
      if (editingBranch) {
        await apiRequest(`/api/branches/${editingBranch._id}`, {
          method: 'PUT',
          body: JSON.stringify(values)
        });
        message.success('Branch updated successfully');
      } else {
        await apiRequest('/api/branches', {
          method: 'POST',
          body: JSON.stringify(values)
        });
        message.success('Branch created successfully');
      }
      
      setDrawerVisible(false);
      fetchBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      message.error('Failed to save branch');
    }
  };

  const handleCopyId = (branch) => {
    navigator.clipboard.writeText(branch._id);
    message.success('Branch ID copied to clipboard');
  };

  const handleDeleteBranch = async (branch) => {
    try {
      await apiRequest(`/api/branches/${branch._id}`, {
        method: 'DELETE'
      });
      message.success('Branch deleted successfully');
      fetchBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      message.error('Failed to delete branch');
    }
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return statusOption?.color || 'default';
  };

  const getBranchTypeLabel = (type) => {
    const typeOption = branchTypes.find(t => t.value === type);
    return typeOption?.label || type;
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.code}
          </Text>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'branchType',
      key: 'branchType',
      render: (type) => getBranchTypeLabel(type)
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => (
        <div>
          <Text>{record.address.city}, {record.address.country}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.address.street}
          </Text>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          {record.contactInfo.phone && (
            <div>
              <PhoneOutlined /> {record.contactInfo.phone}
            </div>
          )}
          {record.contactInfo.email && (
            <div>
              <MailOutlined /> {record.contactInfo.email}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Manager',
      key: 'manager',
      render: (_, record) => (
        <div>
          <Text>{record.manager.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.manager.email}
          </Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {statusOptions.find(s => s.value === status)?.label || status}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const menu = (
          <Menu>
            <Menu.Item 
              key="view" 
              icon={<EyeOutlined />}
              onClick={() => handleViewBranch(record)}
            >
              Show
            </Menu.Item>
            <Menu.Item 
              key="edit" 
              icon={<EditOutlined />}
              onClick={() => handleEditBranch(record)}
            >
              Edit
            </Menu.Item>
            <Menu.Item 
              key="copy" 
              icon={<CopyOutlined />}
              onClick={() => handleCopyId(record)}
            >
              Copy ID
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item 
              key="delete" 
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteBranch(record)}
            >
              Delete
            </Menu.Item>
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                🏢 Branch Management
              </Title>
              <Text type="secondary">
                Manage company branches and locations
              </Text>
            </Col>
            <Col>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddBranch}
              >
                Add Branch
              </Button>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={8}>
              <Input
                placeholder="Search branches..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by type"
                value={branchTypeFilter}
                onChange={setBranchTypeFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {branchTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {statusOptions.map(status => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchBranches}
                style={{ width: '100%' }}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Table
            columns={columns}
            dataSource={branches}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} branches`
            }}
            onChange={(pagination) => {
              setPagination(prev => ({
                ...prev,
                current: pagination.current,
                pageSize: pagination.pageSize
              }));
            }}
          />
        </Card>

        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EnvironmentOutlined style={{ color: '#1890ff' }} />
              {viewingBranch ? 'View Branch' : editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </div>
          }
          open={drawerVisible}
          onClose={() => {
            setDrawerVisible(false);
            setViewingBranch(null);
            setEditingBranch(null);
          }}
          width={600}
          placement="right"
          styles={{
            body: { padding: '24px' }
          }}
        >
          {viewingBranch ? (
            // View Mode - Display as text
            <div>
              <Card title="Branch Information" style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div>
                      <Text strong>Branch Name:</Text>
                      <br />
                      <Text>{viewingBranch.name}</Text>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text strong>Branch Code:</Text>
                      <br />
                      <Text>{viewingBranch.code}</Text>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div>
                      <Text strong>Description:</Text>
                      <br />
                      <Text>{viewingBranch.description || 'No description provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Branch Type:</Text>
                      <br />
                      <Text>{getBranchTypeLabel(viewingBranch.branchType)}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Status:</Text>
                      <br />
                      <Tag color={getStatusColor(viewingBranch.status)}>
                        {statusOptions.find(s => s.value === viewingBranch.status)?.label || viewingBranch.status}
                      </Tag>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Currency:</Text>
                      <br />
                      <Text>{viewingBranch.currency}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card title="Address Information" style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <div>
                      <Text strong>Street Address:</Text>
                      <br />
                      <Text>{viewingBranch.address?.street || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>City:</Text>
                      <br />
                      <Text>{viewingBranch.address?.city || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>State:</Text>
                      <br />
                      <Text>{viewingBranch.address?.state || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Postal Code:</Text>
                      <br />
                      <Text>{viewingBranch.address?.postalCode || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={24}>
                    <div>
                      <Text strong>Country:</Text>
                      <br />
                      <Text>{viewingBranch.address?.country || 'Not provided'}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card title="Contact Information" style={{ marginBottom: '16px' }}>
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div>
                      <Text strong>Phone:</Text>
                      <br />
                      <Text>{viewingBranch.contactInfo?.phone || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Email:</Text>
                      <br />
                      <Text>{viewingBranch.contactInfo?.email || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Fax:</Text>
                      <br />
                      <Text>{viewingBranch.contactInfo?.fax || 'Not provided'}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card title="Manager Information">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <div>
                      <Text strong>Manager Name:</Text>
                      <br />
                      <Text>{viewingBranch.manager?.name || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Manager Email:</Text>
                      <br />
                      <Text>{viewingBranch.manager?.email || 'Not provided'}</Text>
                    </div>
                  </Col>
                  <Col span={8}>
                    <div>
                      <Text strong>Manager Phone:</Text>
                      <br />
                      <Text>{viewingBranch.manager?.phone || 'Not provided'}</Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          ) : (
            // Edit/Add Mode - Form
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveBranch}
            >
            <Row gutter={16}>
              <Col span={12}>
            <Form.Item
              name="name"
              label="Branch Name"
              rules={[{ required: true, message: 'Please enter branch name' }]}
            >
              <Input 
                placeholder="Enter branch name" 
                disabled={!!viewingBranch}
                style={viewingBranch ? { backgroundColor: '#f5f5f5' } : {}}
              />
            </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="code"
                  label="Branch Code"
                  rules={[{ required: true, message: 'Please enter branch code' }]}
                >
                  <Input 
                    placeholder="Enter branch code" 
                    disabled={!!viewingBranch}
                    style={viewingBranch ? { backgroundColor: '#f5f5f5' } : {}}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Description"
            >
              <Input.TextArea 
                placeholder="Enter branch description" 
                disabled={!!viewingBranch}
                style={viewingBranch ? { backgroundColor: '#f5f5f5' } : {}}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="branchType"
                  label="Branch Type"
                  rules={[{ required: true, message: 'Please select branch type' }]}
                >
                  <Select 
                    placeholder="Select branch type"
                    disabled={!!viewingBranch}
                    style={viewingBranch ? { backgroundColor: '#f5f5f5' } : {}}
                  >
                    {branchTypes.map(type => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select 
                    placeholder="Select status"
                    disabled={!!viewingBranch}
                    style={viewingBranch ? { backgroundColor: '#f5f5f5' } : {}}
                  >
                    {statusOptions.map(status => (
                      <Option key={status.value} value={status.value}>
                        {status.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="currency"
                  label="Currency"
                >
                  <Select 
                    placeholder="Select currency" 
                    defaultValue="PKR"
                    disabled={!!viewingBranch}
                    style={viewingBranch ? { backgroundColor: '#f5f5f5' } : {}}
                  >
                    <Option value="PKR">PKR</Option>
                    <Option value="USD">USD</Option>
                    <Option value="EUR">EUR</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Address Information</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['address', 'street']}
                  label="Street Address"
                  rules={[{ required: true, message: 'Please enter street address' }]}
                >
                  <Input placeholder="Enter street address" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['address', 'city']}
                  label="City"
                  rules={[{ required: true, message: 'Please enter city' }]}
                >
                  <Input placeholder="Enter city" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['address', 'state']}
                  label="State"
                >
                  <Input placeholder="Enter state" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['address', 'postalCode']}
                  label="Postal Code"
                >
                  <Input placeholder="Enter postal code" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['address', 'country']}
                  label="Country"
                  rules={[{ required: true, message: 'Please enter country' }]}
                >
                  <Input placeholder="Enter country" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Contact Information</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['contactInfo', 'phone']}
                  label="Phone"
                >
                  <Input placeholder="Enter phone number" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['contactInfo', 'email']}
                  label="Email"
                >
                  <Input placeholder="Enter email address" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['contactInfo', 'fax']}
                  label="Fax"
                >
                  <Input placeholder="Enter fax number" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Manager Information</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['manager', 'name']}
                  label="Manager Name"
                >
                  <Input placeholder="Enter manager name" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['manager', 'email']}
                  label="Manager Email"
                >
                  <Input placeholder="Enter manager email" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['manager', 'phone']}
                  label="Manager Phone"
                >
                  <Input placeholder="Enter manager phone" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                {!viewingBranch && (
                  <Button type="primary" htmlType="submit">
                    {editingBranch ? 'Update Branch' : 'Create Branch'}
                  </Button>
                )}
                <Button onClick={() => {
                  setDrawerVisible(false);
                  setViewingBranch(null);
                  setEditingBranch(null);
                }}>
                  {viewingBranch ? 'Close' : 'Cancel'}
                </Button>
              </Space>
            </Form.Item>
            </Form>
          )}
        </Drawer>
      </div>
    </Layout>
  );
}
