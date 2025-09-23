import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { apiRequest } from '../../../lib/auth';
import {
  Card,
  Button,
  Typography,
  Row,
  Col,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Space,
  message,
  Spin,
  Alert,
  Descriptions,
  Tag,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function EditPayment() {
  const router = useRouter();
  const { id } = router.query;
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchPaymentDetails();
    }
  }, [id]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/payments/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPayment(data);
        
        // Set form values
        form.setFieldsValue({
          paymentType: data.paymentType,
          direction: data.direction,
          amount: data.amount,
          paymentDate: data.paymentDate ? dayjs(data.paymentDate) : null,
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber || '',
          notes: data.notes || ''
        });
      } else {
        message.error('Payment not found');
        router.push('/payments');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      message.error('Failed to fetch payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const updateData = {
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        amount: parseFloat(values.amount)
      };

      const response = await apiRequest(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        message.success('Payment updated successfully');
        router.push(`/payments/${id}`);
      } else {
        const error = await response.json();
        message.error(error.message || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      message.error('Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      processing: 'blue',
      completed: 'green',
      failed: 'red',
      cancelled: 'default',
      refunded: 'purple'
    };
    return colors[status] || 'default';
  };

  const getDirectionColor = (direction) => {
    return direction === 'incoming' ? 'green' : 'red';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!payment) {
    return (
      <Layout>
        <div style={{ padding: '24px' }}>
          <Alert
            message="Payment not found"
            description="The payment you're looking for doesn't exist or has been deleted."
            type="error"
            showIcon
          />
        </div>
      </Layout>
    );
  }

  const clientName = payment.customer 
    ? (payment.customer.companyName || `${payment.customer.firstName} ${payment.customer.lastName}`)
    : payment.supplier?.name || payment.payer?.name || 'N/A';

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
                onClick={() => router.push(`/payments/${id}`)}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Update Payment # {payment.paymentNumber || `${payment._id?.slice(-6)}/2025`}
                <Tag 
                  color={getStatusColor(payment.status)} 
                  style={{ marginLeft: '12px' }}
                >
                  {payment.status?.toUpperCase()}
                </Tag>
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => router.push(`/payments/${id}`)}
              >
                Cancel
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={() => router.push(`/payments/${id}`)}
              >
                Show Invoice
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={24}>
          {/* Edit Form */}
          <Col xs={24} lg={16}>
            <Card>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="paymentDate"
                      label="Date"
                      rules={[{ required: true, message: 'Please select payment date' }]}
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="amount"
                      label="Amount"
                      rules={[{ required: true, message: 'Please enter amount' }]}
                    >
                      <InputNumber
                        min={0.01}
                        precision={2}
                        style={{ width: '100%' }}
                        addonAfter="Rs"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="paymentMethod"
                      label="Payment Mode"
                      rules={[{ required: true, message: 'Please select payment method' }]}
                    >
                      <Select placeholder="Select payment method">
                        <Option value="cash">Cash</Option>
                        <Option value="bank_transfer">Bank Transfer</Option>
                        <Option value="credit_card">Credit Card</Option>
                        <Option value="debit_card">Debit Card</Option>
                        <Option value="check">Check</Option>
                        <Option value="mobile_payment">Mobile Payment</Option>
                        <Option value="other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="referenceNumber" label="Reference">
                      <Input placeholder="Enter reference number" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="notes" label="Description">
                  <TextArea rows={4} placeholder="Enter payment description" />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={saving}
                    icon={<SaveOutlined />}
                    size="large"
                  >
                    Update
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Client Information */}
          <Col xs={24} lg={8}>
            <Card title={`Client: ${clientName}`} size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Email">
                  {payment.customer?.email || 
                   payment.supplier?.email || 
                   payment.payer?.email || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {payment.customer?.phone || 
                   payment.supplier?.phone || 
                   payment.payer?.phone || 'N/A'}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <div>
                <Text strong>Payment Status:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color={getStatusColor(payment.status)}>
                    {payment.status?.toUpperCase()}
                  </Tag>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">Subtotal:</Text>
                    <br />
                    <Text strong>{payment.amount?.toFixed(2)} Rs</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Total:</Text>
                    <br />
                    <Text strong>{payment.amount?.toFixed(2)} Rs</Text>
                  </Col>
                </Row>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Text type="secondary">Discount:</Text>
                    <br />
                    <Text strong>0.00 Rs</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Balance:</Text>
                    <br />
                    <Text strong>{payment.amount?.toFixed(2)} Rs</Text>
                  </Col>
                </Row>
              </div>

              <Divider />

              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Payment Type:
                </Text>
                <br />
                <Tag color="blue">
                  {payment.paymentType?.replace('_', ' ').toUpperCase()}
                </Tag>
              </div>

              <div style={{ marginTop: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Direction:
                </Text>
                <br />
                <Tag color={getDirectionColor(payment.direction)}>
                  {payment.direction === 'incoming' ? '↓ INCOMING' : '↑ OUTGOING'}
                </Tag>
              </div>

              <div style={{ marginTop: '12px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Created: {dayjs(payment.createdAt).format('MMM DD, YYYY')}
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
}
