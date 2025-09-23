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
  Tag, 
  Input, 
  Select, 
  Modal, 
  message,
  Tooltip,
  Badge,
  Divider,
  Drawer,
  Dropdown,
  Form,
  DatePicker,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  MoreOutlined,
  CopyOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  BankOutlined,
  TagOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

export default function Leads() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  // Lead status options
  const statusOptions = [
    { value: 'New', color: 'blue', label: 'New' },
    { value: 'Assigned', color: 'cyan', label: 'Assigned' },
    { value: 'Contacted', color: 'orange', label: 'Contacted' },
    { value: 'Qualified', color: 'purple', label: 'Qualified' },
    { value: 'Proposal', color: 'gold', label: 'Proposal' },
    { value: 'Negotiation', color: 'lime', label: 'Negotiation' },
    { value: 'Closed Won', color: 'green', label: 'Closed Won' },
    { value: 'Closed Lost', color: 'red', label: 'Closed Lost' }
  ];

  // Lead type options
  const typeOptions = [
    { value: 'People', color: 'magenta', label: 'People' },
    { value: 'Company', color: 'blue', label: 'Company' },
    { value: 'Organization', color: 'purple', label: 'Organization' }
  ];

  // Source options
  const sourceOptions = [
    'Website', 'Social Media', 'Email Campaign', 'Referral', 
    'Cold Call', 'Trade Show', 'Advertisement', 'Friend', 'Other'
  ];

  // Country options (sample)
  const countryOptions = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
    'Australia', 'India', 'China', 'Japan', 'Brazil', 'Mexico',
    'Pakistan', 'Colombia', 'Other'
  ];

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, selectedStatus, selectedType, selectedCountry]);

  const fetchLeads = async () => {
    try {
      const response = await apiRequest('/api/leads');
      if (response.ok) {
        const data = await response.json();
        const leadsArray = data.leads || data || [];
        setLeads(Array.isArray(leadsArray) ? leadsArray : []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      message.error('Failed to fetch leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = Array.isArray(leads) ? leads : [];

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone?.includes(searchTerm) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.project?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter(lead => lead.status === selectedStatus);
    }

    if (selectedType !== 'All') {
      filtered = filtered.filter(lead => lead.type === selectedType);
    }

    if (selectedCountry !== 'All') {
      filtered = filtered.filter(lead => lead.country === selectedCountry);
    }

    setFilteredLeads(filtered);
  };

  const handleAddLead = async (values) => {
    try {
      const response = await apiRequest('/api/leads', {
        method: 'POST',
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Lead added successfully!');
        setFormDrawerVisible(false);
        form.resetFields();
        fetchLeads();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to add lead');
      }
    } catch (error) {
      message.error('An error occurred while adding the lead');
    }
  };

  const handleEditLead = async (values) => {
    try {
      const response = await apiRequest(`/api/leads/${editingLead._id}`, {
        method: 'PUT',
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('Lead updated successfully!');
        setFormDrawerVisible(false);
        setEditingLead(null);
        form.resetFields();
        fetchLeads();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to update lead');
      }
    } catch (error) {
      message.error('An error occurred while updating the lead');
    }
  };

  const handleDeleteLead = async (leadId) => {
    try {
      const response = await apiRequest(`/api/leads/${leadId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('Lead deleted successfully!');
        fetchLeads();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to delete lead');
      }
    } catch (error) {
      message.error('An error occurred while deleting the lead');
    }
  };

  const handleCopyId = (leadId) => {
    navigator.clipboard.writeText(leadId);
    message.success('Lead ID copied to clipboard!');
  };

  const resetForm = () => {
    setFormDrawerVisible(false);
    setEditingLead(null);
    form.resetFields();
  };

  const openEditForm = (lead) => {
    setEditingLead(lead);
    form.setFieldsValue({
      ...lead,
      followUpDate: lead.followUpDate ? new Date(lead.followUpDate) : null
    });
    setFormDrawerVisible(true);
  };

  const getStatusColor = (status) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? statusObj.color : 'default';
  };

  const getTypeColor = (type) => {
    const typeObj = typeOptions.find(t => t.value === type);
    return typeObj ? typeObj.color : 'default';
  };

  // Get unique countries from leads for filter dropdown
  const uniqueCountries = [...new Set(leads.map(lead => lead.country).filter(Boolean))];

  const columns = [
    {
      title: 'Branch',
      dataIndex: 'branch',
      key: 'branch',
      width: 120,
      render: (branch) => branch || <Text type="secondary">-</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={getTypeColor(type)} icon={<TagOutlined />}>
          {type}
        </Tag>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          {record.company && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.company}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 120,
      render: (source) => source || <Text type="secondary">-</Text>,
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      width: 120,
      render: (country) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <GlobalOutlined />
          <Text>{country}</Text>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone) => phone ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <PhoneOutlined />
          <Text>{phone}</Text>
        </div>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (email) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MailOutlined />
          <Text>{email}</Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => {
        const menuItems = [
          {
            key: 'view',
            label: 'Show',
            icon: <EyeOutlined />,
            onClick: () => router.push(`/leads/${record._id}`)
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined />,
            onClick: () => openEditForm(record)
          },
          {
            key: 'offer',
            label: 'Create Offer',
            icon: <TagOutlined />,
            onClick: () => router.push(`/offers/new?leadId=${record._id}`)
          },
          {
            key: 'copy',
            label: 'Copy ID',
            icon: <CopyOutlined />,
            onClick: () => handleCopyId(record._id)
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Delete Lead',
                content: `Are you sure you want to delete ${record.name}?`,
                okText: 'Yes, Delete',
                cancelText: 'Cancel',
                okType: 'danger',
                onOk: () => handleDeleteLead(record._id),
              });
            }
          }
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />}
              onClick={e => e.preventDefault()}
            />
          </Dropdown>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading leads...</div>
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
            <Title level={2} style={{ margin: 0 }}>Lead List</Title>
            <Text type="secondary">Manage your leads and prospects</Text>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<SearchOutlined />}
                onClick={() => fetchLeads()}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                size="large"
                onClick={() => {
                  setEditingLead(null);
                  form.resetFields();
                  setFormDrawerVisible(true);
                }}
              >
                Add New Lead
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
                placeholder="Filter by Status"
              >
                <Option value="All">All Status</Option>
                {statusOptions.map((status) => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Select
                value={selectedType}
                onChange={setSelectedType}
                style={{ width: '100%' }}
                placeholder="Filter by Type"
              >
                <Option value="All">All Types</Option>
                {typeOptions.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={24} md={6}>
              <Text type="secondary">
                Showing {filteredLeads.length} of {leads.length} leads
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Leads Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredLeads}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} leads`,
            }}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: searchTerm || selectedStatus !== 'All' || selectedType !== 'All'
                ? 'No leads match your search criteria.'
                : 'No leads found. Add your first lead to get started!'
            }}
          />
        </Card>

        {/* Lead Form Drawer */}
        <Drawer
          title={editingLead ? 'Edit Lead' : 'Add New Lead'}
          open={formDrawerVisible}
          onClose={resetForm}
          width={500}
          destroyOnClose
          placement="right"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={editingLead ? handleEditLead : handleAddLead}
            initialValues={{
              type: 'People',
              status: 'New',
              priority: 'Medium',
              preferredContactMethod: 'Email'
            }}
          >
            <Form.Item
              label="Branch"
              name="branch"
            >
              <Input placeholder="Enter branch name" />
            </Form.Item>

            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Please select lead type!' }]}
            >
              <Select placeholder="Select type">
                {typeOptions.map((type) => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Name"
              name="name"
              rules={[{ required: true, message: 'Please enter name!' }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
            >
              <Select placeholder="Select status">
                {statusOptions.map((status) => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Source"
              name="source"
            >
              <Select placeholder="Select source">
                {sourceOptions.map((source) => (
                  <Option key={source} value={source}>
                    {source}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Country"
              name="country"
              rules={[{ required: true, message: 'Please enter country!' }]}
            >
              <Select 
                placeholder="Select country"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {countryOptions.map((country) => (
                  <Option key={country} value={country}>
                    {country}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Phone"
              name="phone"
            >
              <Input placeholder="123 456 789" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter email!' },
                { type: 'email', message: 'Please enter valid email!' }
              ]}
            >
              <Input placeholder="email@example.com" />
            </Form.Item>

            <Form.Item
              label="Company"
              name="company"
            >
              <Input placeholder="Company name" />
            </Form.Item>

            <Form.Item
              label="Project"
              name="project"
            >
              <TextArea 
                rows={3} 
                placeholder="Describe the project or opportunity"
              />
            </Form.Item>

            <Form.Item
              label="Estimated Value"
              name="estimatedValue"
            >
              <InputNumber 
                style={{ width: '100%' }}
                placeholder="0"
                min={0}
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              label="Priority"
              name="priority"
            >
              <Select placeholder="Select priority">
                <Option value="Low">Low</Option>
                <Option value="Medium">Medium</Option>
                <Option value="High">High</Option>
                <Option value="Critical">Critical</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Follow Up Date"
              name="followUpDate"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <Button onClick={resetForm}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLead ? 'Update Lead' : 'Add Lead'}
              </Button>
            </div>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}
