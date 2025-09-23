import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import {
  Card,
  Button,
  Typography,
  Row,
  Col,
  Tag,
  Descriptions,
  Space,
  Divider,
  Modal,
  message,
  Spin,
  Alert,
  Badge
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PrinterOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function PaymentDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = () => {
    console.log('handleDelete called for payment ID:', id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    console.log('Delete confirmed, making API call to:', `/api/payments/${id}`);
    setDeleting(true);
    try {
      const response = await apiRequest(`/api/payments/${id}`, {
        method: 'DELETE'
      });

      console.log('Delete API response status:', response.status);

      if (response.ok) {
        message.success('Payment deleted successfully');
        setDeleteModalVisible(false);
        router.push('/payments');
      } else {
        const error = await response.json();
        console.error('Delete API error:', error);
        message.error(error.message || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      message.error('Failed to delete payment');
    } finally {
      setDeleting(false);
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

  const getStatusIcon = (status) => {
    const icons = {
      completed: <CheckCircleOutlined />,
      failed: <CloseCircleOutlined />,
      cancelled: <CloseCircleOutlined />,
      pending: <ExclamationCircleOutlined />,
      processing: <ExclamationCircleOutlined />
    };
    return icons[status] || <ExclamationCircleOutlined />;
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
                onClick={() => router.push('/payments')}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Payment # {payment.paymentNumber || `${payment._id?.slice(-6)}/2025`}
                <Tag 
                  color={getStatusColor(payment.status)} 
                  style={{ marginLeft: '12px' }}
                  icon={getStatusIcon(payment.status)}
                >
                  {payment.status?.toUpperCase()}
                </Tag>
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<PrinterOutlined />}>
                Download Pdf
              </Button>
              <Button icon={<MailOutlined />}>
                Send By Email
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => router.push(`/payments/${id}/edit`)}
              >
                Edit
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  console.log('Delete button clicked on payment details page');
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                Delete
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={24}>
          {/* Main Details */}
          <Col xs={24} lg={16}>
            <Card>
              {/* Payment Summary */}
              <Row gutter={24} style={{ marginBottom: '24px' }}>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Status</Text>
                    <br />
                    <Tag 
                      color={getStatusColor(payment.status)}
                      style={{ fontSize: '14px', padding: '4px 12px' }}
                    >
                      {payment.status?.toUpperCase()}
                    </Tag>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Paid</Text>
                    <br />
                    <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                      {payment.amount?.toFixed(2)} Rs
                    </Title>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text type="secondary">Total</Text>
                    <br />
                    <Title level={4} style={{ margin: 0 }}>
                      {payment.amount?.toFixed(2)} Rs
                    </Title>
                  </div>
                </Col>
              </Row>

              <Divider />

              {/* Client Information */}
              <div style={{ marginBottom: '24px' }}>
                <Title level={4}>Client: {clientName}</Title>
                <Row gutter={24}>
                  <Col xs={24} md={8}>
                    <Text type="secondary">Address:</Text>
                    <br />
                    <Text>
                      {payment.customer?.address?.street || 
                       payment.supplier?.address?.street || 
                       payment.payer?.address || 'N/A'}
                    </Text>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary">Email:</Text>
                    <br />
                    <Text>
                      {payment.customer?.email || 
                       payment.supplier?.email || 
                       payment.payer?.email || 'N/A'}
                    </Text>
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary">Phone:</Text>
                    <br />
                    <Text>
                      {payment.customer?.phone || 
                       payment.supplier?.phone || 
                       payment.payer?.phone || 'N/A'}
                    </Text>
                  </Col>
                </Row>
              </div>

              <Divider />

              {/* Payment Information */}
              <div style={{ marginBottom: '24px' }}>
                <Title level={4}>Payment Information:</Title>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>Paid:</Text>
                      <div style={{ float: 'right' }}>
                        <Text style={{ fontSize: '16px' }}>
                          {payment.amount?.toFixed(2)} Rs
                        </Text>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>Total:</Text>
                      <div style={{ float: 'right' }}>
                        <Text style={{ fontSize: '16px' }}>
                          {payment.amount?.toFixed(2)} Rs
                        </Text>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>Total Paid:</Text>
                      <div style={{ float: 'right' }}>
                        <Text style={{ fontSize: '16px' }}>
                          {payment.amount?.toFixed(2)} Rs
                        </Text>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={{ marginBottom: '16px' }}>
                      <Text strong>Total Remaining:</Text>
                      <div style={{ float: 'right' }}>
                        <Text style={{ fontSize: '16px' }}>
                          0.00 Rs
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>

              {payment.invoice && (
                <div style={{ textAlign: 'right' }}>
                  <Button 
                    type="link" 
                    onClick={() => router.push(`/invoices/${payment.invoice}`)}
                  >
                    Show Invoice
                  </Button>
                </div>
              )}
            </Card>
          </Col>

          {/* Side Details */}
          <Col xs={24} lg={8}>
            <Card title="Payment Details" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Payment Number">
                  {payment.paymentNumber || 'Auto-generated'}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Date">
                  {dayjs(payment.paymentDate).format('MMM DD, YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Type">
                  <Tag color="blue">
                    {payment.paymentType?.replace('_', ' ').toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Direction">
                  <Tag color={getDirectionColor(payment.direction)}>
                    {payment.direction === 'incoming' ? '↓ INCOMING' : '↑ OUTGOING'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Payment Method">
                  {payment.paymentMethod?.replace('_', ' ').toUpperCase()}
                </Descriptions.Item>
                <Descriptions.Item label="Reference Number">
                  {payment.referenceNumber || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Currency">
                  {payment.currency || 'PKR'}
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                  <Text strong style={{ color: '#1890ff' }}>
                    {payment.amount?.toFixed(2)} Rs
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              {payment.notes && (
                <>
                  <Divider />
                  <div>
                    <Text strong>Notes:</Text>
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                      <Text>{payment.notes}</Text>
                    </div>
                  </div>
                </>
              )}

              <Divider />
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Created: {dayjs(payment.createdAt).format('MMM DD, YYYY HH:mm')}
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Updated: {dayjs(payment.updatedAt).format('MMM DD, YYYY HH:mm')}
                </Text>
              </div>
            </Card>

            {payment.refundAmount > 0 && (
              <Card title="Refund Information" size="small" style={{ marginTop: '16px' }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Refund Amount">
                    <Text style={{ color: '#f5222d' }}>
                      {payment.refundAmount?.toFixed(2)} Rs
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Refund Date">
                    {payment.refundDate ? dayjs(payment.refundDate).format('MMM DD, YYYY') : 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Refund Reason">
                    {payment.refundReason || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}
          </Col>
        </Row>

        {/* Delete Confirmation Modal */}
        <Modal
          title="Delete Payment"
          open={deleteModalVisible}
          onOk={confirmDelete}
          onCancel={() => {
            console.log('Delete modal cancelled');
            setDeleteModalVisible(false);
          }}
          okText="Yes, Delete"
          cancelText="Cancel"
          okType="danger"
          confirmLoading={deleting}
        >
          <p>Are you sure you want to delete this payment? This action cannot be undone.</p>
        </Modal>
      </div>
    </Layout>
  );
}
