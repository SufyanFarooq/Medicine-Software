import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { 
  Button, 
  Card, 
  Row, 
  Col, 
  Space,
  Typography,
  Tag,
  Table,
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined, 
  CloseOutlined, 
  DownloadOutlined, 
  MailOutlined, 
  EditOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';

const { Title, Text } = Typography;

export default function InvoiceDetail() {
  const router = useRouter();
  const { id: invoiceId } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    if (router.isReady && invoiceId) {
      fetchInvoice();
      fetchPayments();
    }
  }, [router.isReady, invoiceId]);

  const fetchInvoice = async () => {
    try {
      const res = await apiRequest(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await apiRequest(`/api/invoices/${invoiceId}/payments`);
      if (res.ok) {
        const data = await res.json();
        const paymentsArray = data.payments || data || [];
        setPayments(Array.isArray(paymentsArray) ? paymentsArray : []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]); // Ensure payments is always an array
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'green';
      case 'Pending': return 'orange';
      case 'Sent': return 'blue';
      case 'Draft': return 'default';
      case 'Overdue': return 'red';
      default: return 'default';
    }
  };

  const getPaymentColor = (invoice) => {
    const paidAmount = invoice.paidAmount || 0;
    const total = invoice.total || 0;
    
    if (paidAmount >= total) return 'green';
    if (paidAmount > 0) return 'orange';
    return 'red';
  };

  const getPaymentText = (invoice) => {
    const paidAmount = invoice.paidAmount || 0;
    const total = invoice.total || 0;
    
    if (paidAmount >= total) return 'Paid';
    if (paidAmount > 0) return 'Partial';
    return 'Unpaid';
  };

  const columns = [
    {
      title: 'Product',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (price) => `${price?.toFixed(2)} Rs`,
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (total) => `${total?.toFixed(2)} Rs`,
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div>Loading invoice details...</div>
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
          <Button type="primary" onClick={() => router.push('/invoices')}>
            Back to Invoice List
          </Button>
        </div>
      </Layout>
    );
  }

  const remainingAmount = invoice.total - (invoice.paidAmount || 0);
  const taxAmount = invoice.total - invoice.subtotal;

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
              Invoice #{invoice.invoiceNumber}
            </Title>
            <Tag color={getStatusColor(invoice.status)} style={{ marginLeft: '12px' }}>
              {invoice.status}
            </Tag>
            <Tag color={getPaymentColor(invoice)} style={{ marginLeft: '8px' }}>
              {getPaymentText(invoice)}
            </Tag>
          </div>
          <Space>
            <Button icon={<CloseOutlined />} onClick={() => router.back()}>
              Close
            </Button>
            <Button icon={<DownloadOutlined />}>
              Download Pdf
            </Button>
            <Button icon={<MailOutlined />}>
              Send By Email
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
              Edit
            </Button>
          </Space>
        </div>

        <Row gutter={24}>
          {/* Left Column - Invoice Details */}
          <Col span={16}>
            {/* Invoice Summary */}
            <Card title="Invoice Summary" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Status</Text>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                      {invoice.status?.toLowerCase()}
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Subtotal</Text>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                      {invoice.subtotal?.toFixed(2)} Rs
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Total</Text>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
                      {invoice.total?.toFixed(2)} Rs
                    </div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Paid</Text>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', color: '#52c41a' }}>
                      {(invoice.paidAmount || 0).toFixed(2)} Rs
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            {/* Client Information */}
            <Card title="Client Information" style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Client: </Text>
                <Text>{invoice.customerName || 'N/A'}</Text>
                {invoice.customerContactPerson && (
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary">{invoice.customerContactPerson}</Text>
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Address: </Text>
                <Text>{invoice.customerAddress || 'N/A'}</Text>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Email: </Text>
                <Text>{invoice.customerEmail || 'N/A'}</Text>
              </div>
              <div>
                <Text strong>Phone: </Text>
                <Text>{invoice.customerPhone || 'N/A'}</Text>
              </div>
            </Card>

            {/* Product Details */}
            <Card title="Product Details">
              <Table
                columns={columns}
                dataSource={invoice.items || []}
                rowKey={(item, index) => index}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          {/* Right Column - Financial Summary */}
          <Col span={8}>
            <Card title="Financial Summary">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Sub Total:</Text>
                  <Text>{invoice.subtotal?.toFixed(2)} Rs</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Tax Total (0%):</Text>
                  <Text>{taxAmount.toFixed(2)} Rs</Text>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>Total:</Text>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    {invoice.total?.toFixed(2)} Rs
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>Paid:</Text>
                  <Text style={{ color: '#52c41a' }}>
                    {(invoice.paidAmount || 0).toFixed(2)} Rs
                  </Text>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong>Remaining:</Text>
                  <Text strong style={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
                    {remainingAmount.toFixed(2)} Rs
                  </Text>
                </div>
              </div>

              {remainingAmount > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Button 
                    type="primary" 
                    block
                    onClick={() => router.push(`/invoices/${invoiceId}/payment`)}
                  >
                    Record Payment
                  </Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Payment History Section */}
        {payments.length > 0 && (
          <Row style={{ marginTop: '24px' }}>
            <Col span={24}>
              <Card title="Payment History">
                <Table
                  dataSource={payments}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  defaultSortOrder="descend"
                  columns={[
                    {
                      title: 'Payment #',
                      dataIndex: 'paymentNumber',
                      key: 'paymentNumber',
                      render: (text, record) => text || `PAY-${record._id?.slice(-6)?.toUpperCase()}`
                    },
                    {
                      title: 'Date',
                      dataIndex: 'paymentDate',
                      key: 'paymentDate',
                      sorter: (a, b) => new Date(a.paymentDate || a.createdAt) - new Date(b.paymentDate || b.createdAt),
                      defaultSortOrder: 'descend',
                      render: (date) => new Date(date).toLocaleDateString()
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amount) => (
                        <Text strong style={{ color: '#1890ff' }}>
                          {amount?.toFixed(2)} Rs
                        </Text>
                      )
                    },
                    {
                      title: 'Method',
                      dataIndex: 'paymentMethod',
                      key: 'paymentMethod',
                      render: (method) => method?.replace('_', ' ').toUpperCase()
                    },
                    {
                      title: 'Reference',
                      dataIndex: 'referenceNumber',
                      key: 'referenceNumber',
                      render: (ref) => ref || 'N/A'
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status) => (
                        <Tag color={status === 'completed' ? 'green' : 'orange'}>
                          {status?.toUpperCase()}
                        </Tag>
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </Layout>
  );
}
