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
  Drawer,
  Form,
  TimePicker,
  Switch,
  InputNumber,
  Divider,
  Tabs,
  Tag,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  EyeOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  SettingOutlined,
  DollarOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export default function HRRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [viewingRule, setViewingRule] = useState(null);
  const [hasExistingRules, setHasExistingRules] = useState(false);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();

  useEffect(() => {
    fetchRules();
  }, []);

  // Populate form when rules exist and modal opens
  useEffect(() => {
    if (addModalVisible && hasExistingRules && rules.length > 0) {
      const existingRule = rules[0];
      
      // Convert string times to dayjs objects for TimePicker
      const dutyHours = existingRule.dutyHours ? {
        ...existingRule.dutyHours,
        startTime: existingRule.dutyHours.startTime ? dayjs(existingRule.dutyHours.startTime, 'HH:mm') : null,
        endTime: existingRule.dutyHours.endTime ? dayjs(existingRule.dutyHours.endTime, 'HH:mm') : null
      } : existingRule.dutyHours;
      
      addForm.setFieldsValue({
        dutyHours: dutyHours,
        leavePolicies: existingRule.leavePolicies,
        weekends: existingRule.weekends,
        holidays: existingRule.holidays,
        attendanceRules: existingRule.attendanceRules,
        payrollConfig: existingRule.payrollConfig
      });
    }
  }, [addModalVisible, hasExistingRules, rules, addForm]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/hr/rules');
      const rulesList = Array.isArray(data.rules) ? data.rules : [];
      setRules(rulesList);
      setHasExistingRules(rulesList.length > 0);
    } catch (error) {
      console.error('Error fetching HR rules:', error);
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
        message.error('Failed to fetch HR rules');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (values) => {
    try {
      console.log('Form values:', values);
      
      // Convert dayjs objects to strings for API
      const processedValues = {
        ...values,
        dutyHours: values.dutyHours ? {
          ...values.dutyHours,
          startTime: values.dutyHours.startTime ? values.dutyHours.startTime.format('HH:mm') : values.dutyHours.startTime,
          endTime: values.dutyHours.endTime ? values.dutyHours.endTime.format('HH:mm') : values.dutyHours.endTime
        } : values.dutyHours
      };
      
      const response = await apiRequest('/api/hr/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(processedValues)
      });

      console.log('API response:', response);
      
      // Show appropriate message based on whether it's new or updated
      if (response.isNew) {
        message.success('HR rules created successfully');
      } else {
        message.success('HR rules updated successfully');
      }
      
      setAddModalVisible(false);
      addForm.resetFields();
      fetchRules();
    } catch (error) {
      console.error('Error adding HR rules:', error);
      message.error('Error saving HR rules');
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      companyName: rule.companyName,
      dutyHours: {
        startTime: dayjs(rule.dutyHours.startTime, 'HH:mm'),
        endTime: dayjs(rule.dutyHours.endTime, 'HH:mm'),
        workingHoursPerDay: rule.dutyHours.workingHoursPerDay,
        overtimeThreshold: rule.dutyHours.overtimeThreshold
      },
      leavePolicies: rule.leavePolicies,
      weekends: rule.weekends,
      holidays: rule.holidays,
      attendanceRules: rule.attendanceRules,
      payrollConfig: rule.payrollConfig
    });
    setEditModalVisible(true);
  };

  const handleViewRule = (rule) => {
    setViewingRule(rule);
    setViewModalVisible(true);
  };

  const columns = [
    {
      title: 'Branch',
      key: 'branch',
      render: (_, record) => (
        <Text strong>Branch HR Rules</Text>
      )
    },
    {
      title: 'Duty Hours',
      key: 'dutyHours',
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{record.dutyHours.startTime} - {record.dutyHours.endTime}</Text>
        </Space>
      )
    },
    {
      title: 'Leave Policies',
      key: 'leavePolicies',
      render: (_, record) => (
        <Space wrap>
          <Tag color="blue">Annual: {record.leavePolicies.annualLeave.totalDays} days</Tag>
          <Tag color="orange">Sick: {record.leavePolicies.sickLeave.totalDays} days</Tag>
          <Tag color="green">Casual: {record.leavePolicies.casualLeave.totalDays} days</Tag>
        </Space>
      )
    },
    {
      title: 'Weekends',
      dataIndex: 'weekends',
      key: 'weekends',
      render: (weekends) => weekends.join(', ')
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? 'Active' : 'Inactive'} 
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<EyeOutlined />} 
          onClick={() => handleViewRule(record)}
        >
          View
        </Button>
      )
    }
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              HR Rules & Policies
            </Title>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary"
                icon={hasExistingRules ? <EditOutlined /> : <PlusOutlined />} 
                onClick={() => setAddModalVisible(true)}
              >
                {hasExistingRules ? 'Update HR Rules' : 'Add HR Rules'}
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchRules}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Rules Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={rules}
            loading={loading}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} rules`
            }}
          />
        </Card>

        {/* Add HR Rules Modal */}
        <Modal
          title={hasExistingRules ? "Update HR Rules & Policies" : "Add HR Rules & Policies"}
          open={addModalVisible}
          onCancel={() => setAddModalVisible(false)}
          footer={null}
          width={800}
        >
          <Form
            form={addForm}
            layout="vertical"
            onFinish={handleAddRule}
          >
            <Tabs defaultActiveKey="duty">
              <TabPane tab="Duty Hours" key="duty">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['dutyHours', 'startTime']}
                      label="Start Time"
                      rules={[{ required: true, message: 'Please select start time' }]}
                    >
                      <TimePicker 
                        style={{ width: '100%' }} 
                        format="HH:mm"
                        placeholder="Select start time"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['dutyHours', 'endTime']}
                      label="End Time"
                      rules={[{ required: true, message: 'Please select end time' }]}
                    >
                      <TimePicker 
                        style={{ width: '100%' }} 
                        format="HH:mm"
                        placeholder="Select end time"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['dutyHours', 'workingHoursPerDay']}
                      label="Working Hours Per Day"
                      rules={[{ required: true, message: 'Please enter working hours' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={12} 
                        placeholder="8"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['dutyHours', 'overtimeThreshold']}
                      label="Overtime Threshold (hours)"
                      rules={[{ required: true, message: 'Please enter overtime threshold' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={12} 
                        placeholder="8"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="Leave Policies" key="leaves">
                <Title level={4}>Annual Leave</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'annualLeave', 'totalDays']}
                      label="Total Days"
                      rules={[{ required: true, message: 'Please enter total days' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={365} 
                        placeholder="21"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'annualLeave', 'maxCarryForward']}
                      label="Max Carry Forward Days"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={0} 
                        max={30} 
                        placeholder="5"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Title level={4}>Sick Leave</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'sickLeave', 'totalDays']}
                      label="Total Days"
                      rules={[{ required: true, message: 'Please enter total days' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={365} 
                        placeholder="12"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'sickLeave', 'medicalCertificateRequired']}
                      label="Medical Certificate Required"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Title level={4}>Casual Leave</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'casualLeave', 'totalDays']}
                      label="Total Days"
                      rules={[{ required: true, message: 'Please enter total days' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={365} 
                        placeholder="10"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'casualLeave', 'maxConsecutiveDays']}
                      label="Max Consecutive Days"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={30} 
                        placeholder="3"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Title level={4}>Unpaid Leave</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'unpaidLeave', 'maxDaysPerYear']}
                      label="Max Days Per Year"
                      rules={[{ required: true, message: 'Please enter max days' }]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={365} 
                        placeholder="30"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['leavePolicies', 'unpaidLeave', 'approvalRequired']}
                      label="Approval Required"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="Weekends & Holidays" key="weekends">
                <Form.Item
                  name="weekends"
                  label="Weekends"
                  rules={[{ required: true, message: 'Please select weekends' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select weekends"
                    style={{ width: '100%' }}
                  >
                    <Option value="Monday">Monday</Option>
                    <Option value="Tuesday">Tuesday</Option>
                    <Option value="Wednesday">Wednesday</Option>
                    <Option value="Thursday">Thursday</Option>
                    <Option value="Friday">Friday</Option>
                    <Option value="Saturday">Saturday</Option>
                    <Option value="Sunday">Sunday</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="holidays"
                  label="Holidays"
                >
                  <Input.TextArea 
                    rows={4} 
                    placeholder="Add holidays in JSON format: [{'name': 'New Year', 'date': '2024-01-01', 'type': 'National'}]"
                  />
                </Form.Item>
              </TabPane>

              <TabPane tab="Attendance Rules" key="attendance">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['attendanceRules', 'lateArrivalThreshold']}
                      label="Late Arrival Threshold (minutes)"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={60} 
                        placeholder="15"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['attendanceRules', 'earlyDepartureThreshold']}
                      label="Early Departure Threshold (minutes)"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={60} 
                        placeholder="15"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['attendanceRules', 'halfDayThreshold']}
                      label="Half Day Threshold (hours)"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={8} 
                        placeholder="4"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['attendanceRules', 'gracePeriod']}
                      label="Grace Period (minutes)"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={0} 
                        max={30} 
                        placeholder="5"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </TabPane>

              <TabPane tab="Payroll Config" key="payroll">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['payrollConfig', 'payFrequency']}
                      label="Pay Frequency"
                      rules={[{ required: true, message: 'Please select pay frequency' }]}
                    >
                      <Select placeholder="Select pay frequency">
                        <Option value="Monthly">Monthly</Option>
                        <Option value="Bi-weekly">Bi-weekly</Option>
                        <Option value="Weekly">Weekly</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['payrollConfig', 'payDay']}
                      label="Pay Day"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={31} 
                        placeholder="1"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name={['payrollConfig', 'overtimeRate']}
                      label="Overtime Rate (multiplier)"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={1} 
                        max={3} 
                        step={0.1}
                        placeholder="1.5"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name={['payrollConfig', 'bonusEligibility', 'minAttendance']}
                      label="Min Attendance for Bonus (%)"
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        min={0} 
                        max={100} 
                        placeholder="95"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </TabPane>
            </Tabs>

            <Divider />
            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  onClick={() => {
                    console.log('Form submit clicked');
                    addForm.validateFields().then(values => {
                      console.log('Form validation passed:', values);
                    }).catch(err => {
                      console.log('Form validation failed:', err);
                    });
                  }}
                >
                  {hasExistingRules ? 'Update HR Rules' : 'Create HR Rules'}
                </Button>
                <Button onClick={() => setAddModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* View HR Rules Drawer */}
        <Drawer
          title="View HR Rules & Policies"
          open={viewModalVisible}
          onClose={() => setViewModalVisible(false)}
          width={800}
          placement="right"
        >
          {viewingRule && (
            <div>
              <Tabs defaultActiveKey="duty">
                <TabPane tab="Duty Hours" key="duty">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Start Time:</Text>
                      <br />
                      <Text>{viewingRule.dutyHours?.startTime || 'N/A'}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>End Time:</Text>
                      <br />
                      <Text>{viewingRule.dutyHours?.endTime || 'N/A'}</Text>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Text strong>Working Hours per Day:</Text>
                      <br />
                      <Text>{viewingRule.dutyHours?.workingHoursPerDay || 'N/A'} hours</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Overtime Threshold:</Text>
                      <br />
                      <Text>{viewingRule.dutyHours?.overtimeThreshold || 'N/A'} hours</Text>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tab="Leave Policies" key="leave">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card size="small" title="Annual Leave">
                        <Text>Total Days: {viewingRule.leavePolicies?.annualLeave?.totalDays || 'N/A'}</Text>
                        <br />
                        <Text>Carry Forward: {viewingRule.leavePolicies?.annualLeave?.carryForward ? 'Yes' : 'No'}</Text>
                        <br />
                        <Text>Max Carry Forward: {viewingRule.leavePolicies?.annualLeave?.maxCarryForward || 'N/A'} days</Text>
                        <br />
                        <Text>Min Notice: {viewingRule.leavePolicies?.annualLeave?.minNoticeDays || 'N/A'} days</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" title="Sick Leave">
                        <Text>Total Days: {viewingRule.leavePolicies?.sickLeave?.totalDays || 'N/A'}</Text>
                        <br />
                        <Text>Medical Certificate Required: {viewingRule.leavePolicies?.sickLeave?.medicalCertificateRequired ? 'Yes' : 'No'}</Text>
                        <br />
                        <Text>Min Notice: {viewingRule.leavePolicies?.sickLeave?.minNoticeDays || 'N/A'} days</Text>
                      </Card>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Card size="small" title="Casual Leave">
                        <Text>Total Days: {viewingRule.leavePolicies?.casualLeave?.totalDays || 'N/A'}</Text>
                        <br />
                        <Text>Max Consecutive: {viewingRule.leavePolicies?.casualLeave?.maxConsecutiveDays || 'N/A'} days</Text>
                        <br />
                        <Text>Min Notice: {viewingRule.leavePolicies?.casualLeave?.minNoticeDays || 'N/A'} days</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" title="Unpaid Leave">
                        <Text>Max Days per Year: {viewingRule.leavePolicies?.unpaidLeave?.maxDaysPerYear || 'N/A'}</Text>
                        <br />
                        <Text>Approval Required: {viewingRule.leavePolicies?.unpaidLeave?.approvalRequired ? 'Yes' : 'No'}</Text>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tab="Weekends & Holidays" key="weekends">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Weekends:</Text>
                      <br />
                      <Text>{viewingRule.weekends?.join(', ') || 'N/A'}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Holidays:</Text>
                      <br />
                      <Text>{viewingRule.holidays?.length > 0 ? viewingRule.holidays.join(', ') : 'No holidays configured'}</Text>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tab="Attendance Rules" key="attendance">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Late Arrival Threshold:</Text>
                      <br />
                      <Text>{viewingRule.attendanceRules?.lateArrivalThreshold || 'N/A'} minutes</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Early Departure Threshold:</Text>
                      <br />
                      <Text>{viewingRule.attendanceRules?.earlyDepartureThreshold || 'N/A'} minutes</Text>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Text strong>Half Day Threshold:</Text>
                      <br />
                      <Text>{viewingRule.attendanceRules?.halfDayThreshold || 'N/A'} hours</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Grace Period:</Text>
                      <br />
                      <Text>{viewingRule.attendanceRules?.gracePeriod || 'N/A'} minutes</Text>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tab="Payroll Config" key="payroll">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Pay Frequency:</Text>
                      <br />
                      <Text>{viewingRule.payrollConfig?.payFrequency || 'N/A'}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Pay Day:</Text>
                      <br />
                      <Text>{viewingRule.payrollConfig?.payDay || 'N/A'}</Text>
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Text strong>Overtime Rate:</Text>
                      <br />
                      <Text>{viewingRule.payrollConfig?.overtimeRate || 'N/A'}x</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Min Attendance for Bonus:</Text>
                      <br />
                      <Text>{viewingRule.payrollConfig?.bonusEligibility?.minAttendance || 'N/A'}%</Text>
                    </Col>
                  </Row>
                </TabPane>
              </Tabs>
            </div>
          )}
        </Drawer>
      </div>
    </Layout>
  );
}
