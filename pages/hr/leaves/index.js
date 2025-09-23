import { useState, useEffect } from 'react';
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
  DatePicker,
  message,
  Modal,
  Form,
  Badge,
  Tag,
  Popconfirm,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

// Leave types
const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave', color: 'blue' },
  { value: 'casual', label: 'Casual Leave', color: 'green' },
  { value: 'sick', label: 'Sick Leave', color: 'orange' },
  { value: 'unpaid', label: 'Unpaid Leave', color: 'red' }
];

// Status options
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  useEffect(() => {
    fetchLeaves();
    fetchEmployees();
  }, [pagination.current, pagination.pageSize, statusFilter, typeFilter]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { type: typeFilter })
      });

      const data = await apiRequest(`/api/hr/leaves?${params}`);
      setLeaves(Array.isArray(data.leaves) ? data.leaves : []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching leaves:', error);
      if (error.message.includes('No branch selected')) {
        message.error('Please select a branch first');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      } else if (error.message.includes('You do not have access to this branch')) {
        message.error('You You do not have access to this branch. Please select a different branch.');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      } else {
        message.error('Failed to fetch leaves');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest('/api/hr/employees?limit=1000');
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      if (error.message.includes('No branch selected')) {
        message.error('Please select a branch first');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      } else if (error.message.includes('You do not have access to this branch')) {
        message.error('You You do not have access to this branch. Please select a different branch.');
        if (typeof window !== 'undefined') {
          window.location.href = '/branch-picker';
        }
      }
    }
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTypeFilter = (value) => {
    setTypeFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleApproveLeave = (leave) => {
    setSelectedLeave(leave);
    setApprovalModalVisible(true);
  };

  const handleRejectLeave = (leave) => {
    setSelectedLeave(leave);
    setApprovalModalVisible(true);
  };

  const handleAddLeave = async (values) => {
    try {
      const response = await apiRequest('/api/hr/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: values.employeeId,
          type: values.type,
          startDate: values.startDate.toISOString().split('T')[0],
          endDate: values.endDate.toISOString().split('T')[0],
          reason: values.reason
        })
      });

      message.success('Leave request submitted successfully');
      setAddModalVisible(false);
      addForm.resetFields();
      fetchLeaves();
    } catch (error) {
      console.error('Error adding leave:', error);
      message.error('Error adding leave request');
    }
  };

  const handleApprovalSubmit = async (values) => {
    try {
      const action = values.action;
      const url = `/api/hr/leaves/${selectedLeave._id}/${action}`;
      
      const response = await apiRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalNotes: values.approvalNotes
        })
      });

      message.success(`Leave ${action}d successfully`);
      setApprovalModalVisible(false);
      fetchLeaves();
    } catch (error) {
      console.error('Error processing leave:', error);
      message.error('Error processing leave');
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getTypeColor = (type) => {
    const leaveType = LEAVE_TYPES.find(t => t.value === type);
    return leaveType?.color || 'default';
  };

  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.color || 'default';
  };

  const getDuration = (startDate, endDate) => {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <Space>
          <CalendarOutlined />
          <Text strong>{getEmployeeName(record.employeeId)}</Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const leaveType = LEAVE_TYPES.find(t => t.value === type);
        return (
          <Tag color={getTypeColor(type)}>
            {leaveType?.label || type}
          </Tag>
        );
      }
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => `${getDuration(record.startDate, record.endDate)} days`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'approved' ? 'success' : 
                  status === 'pending' ? 'processing' : 'error'} 
          text={status.charAt(0).toUpperCase() + status.slice(1)}
        />
      )
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (text) => text || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />}
                onClick={() => handleApproveLeave(record)}
                style={{ color: '#52c41a' }}
              >
                Approve
              </Button>
              <Button 
                type="text" 
                icon={<CloseCircleOutlined />}
                onClick={() => handleRejectLeave(record)}
                danger
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  // Filter leaves by status for tabs
  const pendingLeaves = leaves.filter(leave => leave.status === 'pending');
  const approvedLeaves = leaves.filter(leave => leave.status === 'approved');
  const rejectedLeaves = leaves.filter(leave => leave.status === 'rejected');

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Leave Management</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary"
                icon={<PlusOutlined />} 
                onClick={() => setAddModalVisible(true)}
              >
                Add Leave
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchLeaves}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
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
                      status={status.value === 'approved' ? 'success' : 
                              status.value === 'pending' ? 'processing' : 'error'} 
                      text={status.label}
                    />
                  </Option>
                ))}
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by Type"
                value={typeFilter}
                onChange={handleTypeFilter}
                style={{ width: '100%' }}
                allowClear
              >
                {LEAVE_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>
                    <Tag color={type.color} style={{ margin: 0 }}>
                      {type.label}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Leave Tabs */}
        <Card>
          <Tabs defaultActiveKey="all">
            <TabPane tab={`All Leaves (${leaves.length})`} key="all">
              <Table
                columns={columns}
                dataSource={leaves}
                rowKey="_id"
                loading={loading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} leaves`
                }}
                onChange={handleTableChange}
                scroll={{ x: 800 }}
              />
            </TabPane>
            <TabPane tab={`Pending (${pendingLeaves.length})`} key="pending">
              <Table
                columns={columns}
                dataSource={pendingLeaves}
                rowKey="_id"
                loading={loading}
                pagination={false}
                scroll={{ x: 800 }}
              />
            </TabPane>
            <TabPane tab={`Approved (${approvedLeaves.length})`} key="approved">
              <Table
                columns={columns}
                dataSource={approvedLeaves}
                rowKey="_id"
                loading={loading}
                pagination={false}
                scroll={{ x: 800 }}
              />
            </TabPane>
            <TabPane tab={`Rejected (${rejectedLeaves.length})`} key="rejected">
              <Table
                columns={columns}
                dataSource={rejectedLeaves}
                rowKey="_id"
                loading={loading}
                pagination={false}
                scroll={{ x: 800 }}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* Approval Modal */}
        <Modal
          title="Leave Approval"
          open={approvalModalVisible}
          onCancel={() => setApprovalModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleApprovalSubmit}
          >
            <Form.Item
              name="action"
              label="Action"
              rules={[{ required: true, message: 'Please select action' }]}
            >
              <Select placeholder="Select action">
                <Option value="approve">
                  <Badge status="success" text="Approve" />
                </Option>
                <Option value="reject">
                  <Badge status="error" text="Reject" />
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="approvalNotes"
              label="Notes"
            >
              <Input.TextArea 
                placeholder="Enter approval notes"
                rows={3}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
                <Button onClick={() => setApprovalModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Leave Modal */}
        <Modal
          title="Add New Leave Request"
          open={addModalVisible}
          onCancel={() => setAddModalVisible(false)}
          footer={null}
        >
          <Form
            form={addForm}
            layout="vertical"
            onFinish={handleAddLeave}
          >
            <Form.Item
              name="employeeId"
              label="Employee"
              rules={[{ required: true, message: 'Please select an employee' }]}
            >
              <Select
                placeholder="Select Employee"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {employees.map(employee => (
                  <Option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="type"
              label="Leave Type"
              rules={[{ required: true, message: 'Please select leave type' }]}
            >
              <Select placeholder="Select Leave Type">
                {LEAVE_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>
                    <Tag color={type.color}>{type.label}</Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="endDate"
              label="End Date"
              rules={[{ required: true, message: 'Please select end date' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: 'Please provide a reason' }]}
            >
              <Input.TextArea 
                rows={3} 
                placeholder="Please provide a reason for leave"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Submit Leave Request
                </Button>
                <Button onClick={() => setAddModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
}
