import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { apiRequest } from '../../../lib/auth';
import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space,
  Typography,
  Divider,
  message,
  Tag
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  CloseOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';

export default function RecordPayment() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { id: invoiceId } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { Title, Text } = Typography;
  const { Option } = Select;
  const fetchInvoice = async () => {
    try {
      const res = await apiRequest(`/api/invoices/${invoiceId}`);
      
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        form.setFieldsValue({
          number: data.invoiceNumber,
          date: dayjs(),
          amount: data.total - (data.paidAmount || 0),
          paymentMode: 'Cash'
        });
      } else {
        const errorData = await res.json();
        message.error('Invoice not found');
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      message.error('Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Wait for router to be ready before accessing query
    if (router.isReady && invoiceId) {
      fetchInvoice();
    }
  }, [router.isReady, invoiceId]);
  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const paymentData = {
        invoiceId: invoice._id,
        amount: values.amount,
        paymentMode: values.paymentMode,
        paymentDate: values.date.format('YYYY-MM-DD'),
        description: values.description || '',
        reference: values.reference || ''
      };

      const res = await apiRequest(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });

      if (res.ok) {
        message.success('Payment recorded successfully!');
        router.push(`/invoices/${invoiceId}`);
      } else {
        const error = await res.json();
        message.error(error.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      message.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'green';
      case 'Pending': return 'orange';
      case 'Overdue': return 'red';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div>Loading invoice details...</div>
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
            Invoice ID: {invoiceId}
          </div>
        </div>
      </Layout>
    );
  }

  if (!invoice) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ color: '#ff4d4f', fontSize: '18px', marginBottom: '16px' }}>
            Invoice not found
          </div>
          <div style={{ marginBottom: '16px' }}>
            Invoice ID: {invoiceId}
          </div>
          <Button type="primary" onClick={() => router.push('/invoices')}>
            Back to Invoice List
          </Button>
        </div>
      </Layout>
    );
  }

  const remainingAmount = invoice.total - (invoice.paidAmount || 0);
  const isFullyPaid = remainingAmount <= 0;

  return (
    <Layout>
      <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          backgroundColor: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              style={{ marginRight: '8px', fontSize: '16px', cursor: 'pointer' }}
              onClick={() => router.back()}
            />
            <Title level={3} style={{ margin: 0 }}>
              Record Payment for Invoice #{invoice.invoiceNumber}
            </Title>
            <Tag color={getPaymentStatusColor(invoice.status)} style={{ marginLeft: '12px' }}>
              {invoice.status}
            </Tag>
          </div>
          <Space>
            <Button icon={<CloseOutlined />} onClick={() => router.back()}>
              Cancel
            </Button>
            <Button icon={<FileTextOutlined />}>
              Show Invoice
            </Button>
          </Space>
        </div>

        <Row gutter={24}>
          {/* Left Column - Payment Form */}
          <Col span={16}>
            <Card title="Payment Details">
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                disabled={isFullyPaid}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Number" name="number">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Date" name="date" rules={[{ required: true, message: 'Please select payment date!' }]}>
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item 
                      label="Amount" 
                      name="amount" 
                      rules={[
                        { required: true, message: 'Please enter amount!' },
                        { 
                          validator: (_, value) => {
                            if (!value || value <= 0) {
                              return Promise.reject(new Error('Amount must be greater than 0'));
                            }
                            if (value > remainingAmount) {
                              return Promise.reject(new Error(`Amount cannot exceed remaining balance of ${remainingAmount.toFixed(2)} Rs`));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Input 
                        type="number" 
                        suffix="Rs"
                        step={0.01}
                        placeholder="Enter payment amount"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Payment Mode" name="paymentMode" rules={[{ required: true, message: 'Please select payment mode!' }]}>
                      <Select>
                        <Option value="Cash">Cash</Option>
                        <Option value="Bank Transfer">Bank Transfer</Option>
                        <Option value="Cheque">Cheque</Option>
                        <Option value="Credit Card">Credit Card</Option>
                        <Option value="Other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Reference" name="reference">
                      <Input placeholder="Payment reference number" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Description" name="description">
                  <Input.TextArea rows={3} placeholder="Payment description..." />
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting}
                    disabled={isFullyPaid}
                    size="large"
                  >
                    Record Payment
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* Right Column - Invoice Summary */}
          <Col span={8}>
            <Card title="Invoice Summary">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>Client: </Text>
                  <Text>{invoice.customerName || 'N/A'}</Text>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>Email: </Text>
                  <Text>{invoice.customerEmail || 'N/A'}</Text>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <Text strong>Phone: </Text>
                  <Text>{invoice.customerPhone || 'N/A'}</Text>
                </div>
              </div>
              
              <Divider />
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Payment Status:</Text>
                  <Tag color={getPaymentStatusColor(invoice.status)}>
                    {invoice.status}
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Sub Total:</Text>
                  <Text>{invoice.subtotal?.toFixed(2)} Rs</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Total:</Text>
                  <Text strong>{invoice.total?.toFixed(2)} Rs</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Discount:</Text>
                  <Text>{(invoice.discount || 0).toFixed(2)} Rs</Text>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Paid:</Text>
                  <Text strong style={{ color: '#52c41a' }}>
                    {(invoice.paidAmount || 0).toFixed(2)} Rs
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <Text strong>Remaining:</Text>
                  <Text strong style={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
                    {remainingAmount.toFixed(2)} Rs
                  </Text>
                </div>
              </div>

              {isFullyPaid && (
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <Text style={{ color: '#52c41a' }}>✅ Invoice is fully paid</Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
}
