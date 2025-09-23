import { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { apiRequest } from '../../../lib/auth';
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
  Steps,
  Statistic,
  Tag,
  Badge,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Step } = Steps;

export default function Payroll() {
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayrollRuns();
    fetchEmployees();
  }, []);

  const fetchPayrollRuns = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/hr/payroll/run');
      setPayrollRuns(Array.isArray(data.runs) ? data.runs : []);
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
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
        message.error('Failed to fetch payroll runs');
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

  const handleRunPayroll = () => {
    setCurrentStep(0);
    setRunModalVisible(true);
  };

  const handleStepNext = () => {
    if (currentStep === 0) {
      // Validate period
      if (!period) {
        message.error('Please select a period');
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Validate selected employees
      if (selectedEmployees.length === 0) {
        message.error('Please select at least one employee');
        return;
      }
      setCurrentStep(2);
      generatePreview();
    }
  };

  const handleStepPrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const generatePreview = async () => {
    try {
      // This would typically call an API to generate preview data
      // For now, we'll create mock data
      const preview = selectedEmployees.map(employeeId => {
        const employee = employees.find(emp => emp._id === employeeId);
        return {
          employeeId,
          employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
          base: 50000, // Mock base salary
          allowances: 5000, // Mock allowances
          deductions: 2000, // Mock deductions
          overtime: 1000, // Mock overtime
          gross: 56000,
          net: 54000
        };
      });
      setPreviewData(preview);
    } catch (error) {
      console.error('Error generating preview:', error);
      message.error('Error generating preview');
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      const response = await apiRequest('/api/hr/payroll/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          period: period,
          employeeIds: selectedEmployees
        })
      });

      message.success('Payroll generated successfully');
      setRunModalVisible(false);
      fetchPayrollRuns();
    } catch (error) {
      console.error('Error generating payroll:', error);
      message.error('Error generating payroll');
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getPeriodOptions = () => {
    const options = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value: period, label: period });
    }
    return options;
  };

  const columns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_, record) => (
        <Space>
          <DollarOutlined />
          <Text strong>{getEmployeeName(record.employeeId)}</Text>
        </Space>
      )
    },
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
      render: (period) => <Tag color="blue">{period}</Tag>
    },
    {
      title: 'Earnings',
      dataIndex: 'earnings',
      key: 'earnings',
      render: (amount) => `Rs ${amount.toLocaleString()}`
    },
    {
      title: 'Deductions',
      dataIndex: 'deductions',
      key: 'deductions',
      render: (amount) => `Rs ${amount.toLocaleString()}`
    },
    {
      title: 'Net Pay',
      dataIndex: 'net',
      key: 'net',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>
          Rs {amount.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Badge 
          status={record.paidAt ? 'success' : 'processing'} 
          text={record.paidAt ? 'Paid' : 'Pending'}
        />
      )
    },
    {
      title: 'Generated',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      render: (date) => new Date(date).toLocaleDateString()
    }
  ];

  // Calculate statistics
  const totalRuns = payrollRuns.length;
  const paidRuns = payrollRuns.filter(run => run.paidAt).length;
  const pendingRuns = totalRuns - paidRuns;
  const totalNetPay = payrollRuns.reduce((sum, run) => sum + run.net, 0);

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Payroll Management</Title>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchPayrollRuns}
                loading={loading}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<CalculatorOutlined />} 
                onClick={handleRunPayroll}
              >
                Run Payroll
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Runs"
                value={totalRuns}
                prefix={<CalculatorOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Paid Runs"
                value={paidRuns}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Pending Runs"
                value={pendingRuns}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Net Pay"
                value={totalNetPay}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
                formatter={(value) => `Rs ${value.toLocaleString()}`}
              />
            </Card>
          </Col>
        </Row>

        {/* Payroll Runs Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={payrollRuns}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} runs`
            }}
            scroll={{ x: 800 }}
          />
        </Card>

        {/* Run Payroll Modal */}
        <Modal
          title="Run Payroll"
          open={runModalVisible}
          onCancel={() => setRunModalVisible(false)}
          footer={null}
          width={800}
        >
          <Steps current={currentStep} style={{ marginBottom: '24px' }}>
            <Step title="Select Period" />
            <Step title="Select Employees" />
            <Step title="Preview & Generate" />
          </Steps>

          {currentStep === 0 && (
            <div>
              <Form.Item label="Payroll Period" required>
                <Select
                  placeholder="Select period (YYYY-MM)"
                  value={period}
                  onChange={setPeriod}
                  style={{ width: '100%' }}
                >
                  {getPeriodOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <Form.Item label="Select Employees" required>
                <Select
                  mode="multiple"
                  placeholder="Select employees"
                  value={selectedEmployees}
                  onChange={setSelectedEmployees}
                  style={{ width: '100%' }}
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
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <Table
                columns={[
                  { title: 'Employee', dataIndex: 'employeeName', key: 'employeeName' },
                  { title: 'Base', dataIndex: 'base', key: 'base', render: (val) => `Rs ${val.toLocaleString()}` },
                  { title: 'Allowances', dataIndex: 'allowances', key: 'allowances', render: (val) => `Rs ${val.toLocaleString()}` },
                  { title: 'Deductions', dataIndex: 'deductions', key: 'deductions', render: (val) => `Rs ${val.toLocaleString()}` },
                  { title: 'Overtime', dataIndex: 'overtime', key: 'overtime', render: (val) => `Rs ${val.toLocaleString()}` },
                  { title: 'Gross', dataIndex: 'gross', key: 'gross', render: (val) => `Rs ${val.toLocaleString()}` },
                  { title: 'Net', dataIndex: 'net', key: 'net', render: (val) => <Text strong>Rs {val.toLocaleString()}</Text> }
                ]}
                dataSource={previewData}
                rowKey="employeeId"
                pagination={false}
                size="small"
              />
            </div>
          )}

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              {currentStep > 0 && (
                <Button onClick={handleStepPrev}>
                  Previous
                </Button>
              )}
              {currentStep < 2 ? (
                <Button type="primary" onClick={handleStepNext}>
                  Next
                </Button>
              ) : (
                <Button type="primary" onClick={handleGeneratePayroll}>
                  Generate Payroll
                </Button>
              )}
              <Button onClick={() => setRunModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
