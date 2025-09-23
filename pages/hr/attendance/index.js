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
  TimePicker,
  Badge,
  Tag,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, [pagination.current, pagination.pageSize, selectedDate, employeeFilter]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Ensure selectedDate is not null, use current date as fallback
      const dateToUse = selectedDate || dayjs();
      
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.pageSize,
        date: dateToUse.toISOString().split('T')[0],
        ...(employeeFilter && { employeeId: employeeFilter })
      });

      const data = await apiRequest(`/api/hr/attendance?${params}`);
      setAttendance(Array.isArray(data.attendance) ? data.attendance : []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Error fetching attendance:', error);
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
        message.error('Failed to fetch attendance');
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

  const handleDateChange = (date) => {
    // Ensure we always have a valid date, use current date as fallback
    setSelectedDate(date || dayjs());
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleEmployeeFilter = (value) => {
    setEmployeeFilter(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pagination) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
  };

  const handleEditAttendance = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      checkIn: record.checkIn ? dayjs(record.checkIn) : null,
      checkOut: record.checkOut ? dayjs(record.checkOut) : null,
      notes: record.notes
    });
    setEditModalVisible(true);
  };

  const handleSaveAttendance = async (values) => {
    try {
      const response = await apiRequest('/api/hr/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: editingRecord.employeeId,
          date: (selectedDate || dayjs()).toISOString().split('T')[0],
          checkIn: values.checkIn ? values.checkIn.toISOString() : null,
          checkOut: values.checkOut ? values.checkOut.toISOString() : null,
          notes: values.notes
        })
      });

      message.success('Attendance updated successfully');
      setEditModalVisible(false);
      fetchAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      message.error('Error saving attendance');
    }
  };

  const handleAddAttendance = async (values) => {
    try {
      const response = await apiRequest('/api/hr/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employeeId: values.employeeId,
          date: values.date.toISOString().split('T')[0],
          checkIn: values.checkIn ? values.checkIn.toISOString() : null,
          checkOut: values.checkOut ? values.checkOut.toISOString() : null,
          notes: values.notes
        })
      });

      message.success('Attendance added successfully');
      setAddModalVisible(false);
      addForm.resetFields();
      fetchAttendance();
    } catch (error) {
      console.error('Error adding attendance:', error);
      message.error('Error adding attendance');
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getStatusColor = (record) => {
    if (!record.checkIn && !record.checkOut) return 'red';
    if (record.checkIn && !record.checkOut) return 'orange';
    if (record.checkIn && record.checkOut) return 'green';
    return 'default';
  };

  const getStatusText = (record) => {
    if (!record.checkIn && !record.checkOut) return 'Absent';
    if (record.checkIn && !record.checkOut) return 'Checked In';
    if (record.checkIn && record.checkOut) return 'Completed';
    return 'Unknown';
  };

  const getWorkDuration = (record) => {
    if (record.checkIn && record.checkOut) {
      const duration = new Date(record.checkOut) - new Date(record.checkIn);
      const hours = Math.floor(duration / (1000 * 60 * 60));
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    return '-';
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined />
          <Text strong>{getEmployeeName(record.employeeId)}</Text>
        </Space>
      )
    },
    {
      title: 'Check In',
      dataIndex: 'checkIn',
      key: 'checkIn',
      render: (time) => time ? new Date(time).toLocaleTimeString() : '-'
    },
    {
      title: 'Check Out',
      dataIndex: 'checkOut',
      key: 'checkOut',
      render: (time) => time ? new Date(time).toLocaleTimeString() : '-'
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_, record) => getWorkDuration(record)
    },
    {
      title: 'Overtime',
      dataIndex: 'overtimeMins',
      key: 'overtimeMins',
      render: (mins) => mins > 0 ? `${mins} mins` : '-'
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Badge 
          status={getStatusColor(record) === 'green' ? 'success' : 
                  getStatusColor(record) === 'orange' ? 'processing' : 'error'} 
          text={getStatusText(record)}
        />
      )
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (text) => text || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<EditOutlined />} 
          onClick={() => handleEditAttendance(record)}
        >
          Edit
        </Button>
      )
    }
  ];

  // Calculate statistics
  const totalEmployees = employees.length;
  const presentToday = attendance.filter(record => record.checkIn).length;
  const absentToday = totalEmployees - presentToday;
  const completedShifts = attendance.filter(record => record.checkIn && record.checkOut).length;
  const totalOvertime = attendance.reduce((sum, record) => sum + (record.overtimeMins || 0), 0);

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Attendance Management</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary"
                icon={<PlusOutlined />} 
                onClick={() => setAddModalVisible(true)}
              >
                Add Attendance
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchAttendance}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Employees"
                value={totalEmployees}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Present Today"
                value={presentToday}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Absent Today"
                value={absentToday}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Completed Shifts"
                value={completedShifts}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16}>
            <Col span={6}>
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                style={{ width: '100%' }}
                placeholder="Select Date"
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filter by Employee"
                value={employeeFilter}
                onChange={handleEmployeeFilter}
                style={{ width: '100%' }}
                allowClear
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
            </Col>
          </Row>
        </Card>

        {/* Attendance Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={attendance}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} records`
            }}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Edit Attendance Modal */}
        <Modal
          title="Edit Attendance"
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSaveAttendance}
          >
            <Form.Item
              name="checkIn"
              label="Check In Time"
            >
              <TimePicker 
                style={{ width: '100%' }}
                format="HH:mm"
                placeholder="Select check in time"
              />
            </Form.Item>

            <Form.Item
              name="checkOut"
              label="Check Out Time"
            >
              <TimePicker 
                style={{ width: '100%' }}
                format="HH:mm"
                placeholder="Select check out time"
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <Input.TextArea 
                placeholder="Enter notes"
                rows={3}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Save Changes
                </Button>
                <Button onClick={() => setEditModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Attendance Modal */}
        <Modal
          title="Add New Attendance"
          open={addModalVisible}
          onCancel={() => setAddModalVisible(false)}
          footer={null}
        >
          <Form
            form={addForm}
            layout="vertical"
            onFinish={handleAddAttendance}
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
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select a date' }]}
              initialValue={selectedDate || dayjs()}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="checkIn"
              label="Check In Time"
            >
              <TimePicker 
                style={{ width: '100%' }} 
                format="HH:mm"
                placeholder="Select check-in time"
              />
            </Form.Item>

            <Form.Item
              name="checkOut"
              label="Check Out Time"
            >
              <TimePicker 
                style={{ width: '100%' }} 
                format="HH:mm"
                placeholder="Select check-out time"
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <Input.TextArea 
                rows={3} 
                placeholder="Optional notes about attendance"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Add Attendance
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
