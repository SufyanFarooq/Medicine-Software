import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import { apiRequest } from '../../../lib/auth';
import dayjs from 'dayjs';
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
  ReloadOutlined,
  CopyOutlined,
  MoreOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// Department options
const DEPARTMENT_OPTIONS = [
  { value: 'HR', label: 'HR', color: 'blue' },
  { value: 'Finance', label: 'Finance', color: 'green' },
  { value: 'Sales', label: 'Sales', color: 'orange' },
  { value: 'Warehouse', label: 'Warehouse', color: 'purple' },
  { value: 'Operations', label: 'Operations', color: 'cyan' },
  { value: 'IT', label: 'IT', color: 'geekblue' },
  { value: 'Admin', label: 'Admin', color: 'red' }
];

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'red' }
];

export default function Employees() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [formDrawerVisible, setFormDrawerVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEmployees();
  }, [pagination.current, pagination.pageSize, searchText, departmentFilter, statusFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(searchText && { search: searchText }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(statusFilter && { status: statusFilter })
      });

      const data = await apiRequest(`/api/hr/employees?${params}`);
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (error.message.includes('No branch selected')) {
        message.error('Please select a branch first');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      } else if (error.message.includes('You do not have access to this branch')) {
        message.error('You do not have access to this branch. Please select a different branch.');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      } else {
        message.error('Failed to fetch employees');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDepartmentFilter = (value) => {
    setDepartmentFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    form.resetFields();
    setFormDrawerVisible(true);
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    form.setFieldsValue({
      code: employee.code,
      firstName: employee.firstName,
      lastName: employee.lastName,
      cnicOrPassport: employee.cnicOrPassport,
      dob: employee.dob ? dayjs(employee.dob) : null,
      address: employee.address,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      branchId: employee.branchId,
      supervisorId: employee.supervisorId,
      emergencyContact: employee.emergencyContact,
      documents: employee.documents || [],
      status: employee.status,
      joinedAt: employee.joinedAt ? dayjs(employee.joinedAt) : null,
      leftAt: employee.leftAt ? dayjs(employee.leftAt) : null
    });
    setFormDrawerVisible(true);
  };

  const handleViewEmployee = (employee) => {
    // Set a flag to indicate this is view mode
    const viewEmployee = { ...employee, _viewMode: true };
    setEditingEmployee(viewEmployee);
    form.setFieldsValue({
      code: employee.code,
      firstName: employee.firstName,
      lastName: employee.lastName,
      cnicOrPassport: employee.cnicOrPassport,
      dob: employee.dob ? dayjs(employee.dob) : null,
      address: employee.address,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      designation: employee.designation,
      branchId: employee.branchId,
      supervisorId: employee.supervisorId,
      emergencyContact: employee.emergencyContact,
      documents: employee.documents || [],
      status: employee.status,
      joinedAt: employee.joinedAt ? dayjs(employee.joinedAt) : null,
      leftAt: employee.leftAt ? dayjs(employee.leftAt) : null
    });
    setFormDrawerVisible(true);
  };

  const handleCopyId = (employee) => {
    navigator.clipboard.writeText(employee._id);
    message.success('Employee ID copied to clipboard');
  };

  const handleDeleteEmployee = async (employee) => {
    try {
      const response = await apiRequest(`/api/hr/employees/${employee._id}`, {
        method: 'DELETE'
      });
      
      message.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      message.error('Error deleting employee');
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      const url = editingEmployee 
        ? `/api/hr/employees/${editingEmployee._id}`
        : '/api/hr/employees';
      
      const method = editingEmployee 
        ? 'PUT' 
        : 'POST';
      
      const response = await apiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      message.success(
        editingEmployee 
          ? 'Employee updated successfully' 
          : 'Employee created successfully'
      );
      setFormDrawerVisible(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      if (error.message.includes('You do not have access to this branch')) {
        message.error('You do not have access to this branch. Please select a different branch.');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      } else {
        message.error('Error saving employee');
      }
    }
  };

  const getDepartmentColor = (department) => {
    const dept = DEPARTMENT_OPTIONS.find(d => d.value === department);
    return dept?.color || 'default';
  };

  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.color || 'default';
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <Text strong>{record.firstName} {record.lastName}</Text>
        </Space>
      )
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: (department) => (
        <Tag color={getDepartmentColor(department)}>
          {department}
        </Tag>
      )
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
      render: (text) => <Text>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'active' ? 'success' : 'error'} 
          text={status === 'active' ? 'Active' : 'Inactive'}
        />
      )
    },
    {
      title: 'Joined',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
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
                onClick: () => handleViewEmployee(record)
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditEmployee(record)
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
                    title="Delete Employee"
                    description={`Are you sure you want to delete "${record.firstName} ${record.lastName}"?`}
                    onConfirm={() => handleDeleteEmployee(record)}
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
            <Title level={2} style={{ margin: 0 }}>Employee List</Title>
          </Col>
          <Col>
            <Space>
              <Search
                placeholder="Search employees..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 200 }}
                allowClear
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchEmployees}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAddEmployee}
              >
                Add New Employee
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="Filter by Department"
                value={departmentFilter}
                onChange={handleDepartmentFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {DEPARTMENT_OPTIONS.map(dept => (
                  <Option key={dept.value} value={dept.value}>
                    <Tag color={dept.color} style={{ margin: 0 }}>
                      {dept.label}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by Status"
                value={statusFilter}
                onChange={handleStatusFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {STATUS_OPTIONS.map(status => (
                  <Option key={status.value} value={status.value}>
                    <Badge 
                      status={status.value === 'active' ? 'success' : 'error'} 
                      text={status.label}
                    />
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Employees Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={employees}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} employees`
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Add/Edit/View Employee Drawer */}
        <Drawer
          title={
            editingEmployee 
              ? (editingEmployee._viewMode ? 'View Employee' : 'Edit Employee')
              : 'Add New Employee'
          }
          width={800}
          open={formDrawerVisible}
          onClose={() => setFormDrawerVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="code"
                  label="Employee Code"
                  rules={[{ required: true, message: 'Please enter employee code' }]}
                >
                  <Input 
                    placeholder="EMP-0001" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select 
                    placeholder="Select status" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <Option key={status.value} value={status.value}>
                        <Badge 
                          status={status.value === 'active' ? 'success' : 'error'} 
                          text={status.label}
                        />
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input 
                    placeholder="Enter first name" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Please enter last name' }]}
                >
                  <Input 
                    placeholder="Enter last name" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="cnicOrPassport"
                  label="CNIC/Passport"
                  rules={[{ required: true, message: 'Please enter CNIC/Passport' }]}
                >
                  <Input 
                    placeholder="Enter CNIC or Passport" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="dob"
                  label="Date of Birth"
                  rules={[{ required: true, message: 'Please select date of birth' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="address"
              label="Address"
              rules={[{ required: true, message: 'Please enter address' }]}
            >
              <Input.TextArea 
                placeholder="Enter address" 
                rows={3}
                disabled={editingEmployee && editingEmployee._viewMode}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                >
                  <Input 
                    placeholder="Enter email" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Phone"
                >
                  <Input 
                    placeholder="Enter phone number" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="department"
                  label="Department"
                  rules={[{ required: true, message: 'Please select department' }]}
                >
                  <Select 
                    placeholder="Select department" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  >
                    {DEPARTMENT_OPTIONS.map(dept => (
                      <Option key={dept.value} value={dept.value}>
                        <Tag color={dept.color} style={{ margin: 0 }}>
                          {dept.label}
                        </Tag>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="designation"
                  label="Designation"
                  rules={[{ required: true, message: 'Please enter designation' }]}
                >
                  <Input 
                    placeholder="Enter designation" 
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="joinedAt"
                  label="Joined Date"
                  rules={[{ required: true, message: 'Please select joined date' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="leftAt"
                  label="Left Date"
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    disabled={editingEmployee && editingEmployee._viewMode}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                {!(editingEmployee && editingEmployee._viewMode) && (
                  <Button type="primary" htmlType="submit">
                    {editingEmployee ? 'Update Employee' : 'Create Employee'}
                  </Button>
                )}
                <Button onClick={() => setFormDrawerVisible(false)}>
                  {editingEmployee && editingEmployee._viewMode ? 'Close' : 'Cancel'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      </div>
    </Layout>
  );
}
