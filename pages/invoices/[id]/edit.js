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
  message
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';

export default function EditInvoice() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { id: invoiceId } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([]);

  const { Title, Text } = Typography;
  const { Option } = Select;

  useEffect(() => {
    if (router.isReady && invoiceId) {
      fetchInvoice();
    }
  }, [router.isReady, invoiceId]);

  const fetchInvoice = async () => {
    try {
      const res = await apiRequest(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
        setInvoiceItems(data.items || []);
        
        // Set form values
        form.setFieldsValue({
          invoiceNumber: data.invoiceNumber,
          date: dayjs(data.date),
          dueDate: data.dueDate ? dayjs(data.dueDate) : null,
          status: data.status,
          note: data.note || '',
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerContactPerson: data.customerContactPerson,
          customerVatNumber: data.customerVatNumber,
          customerLpoNumber: data.customerLpoNumber,
        });
      } else {
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

  const addInvoiceItem = () => {
    const newId = Math.max(...invoiceItems.map(item => item.id || 0), 0) + 1;
    setInvoiceItems([...invoiceItems, { 
      id: newId, 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      total: 0 
    }]);
  };

  const removeInvoiceItem = (id) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter(item => item.id !== id));
    }
  };

  const updateInvoiceItem = (id, field, value) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.05; // 5% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const validItems = invoiceItems.filter(item => item.description && item.quantity > 0);
      if (validItems.length === 0) {
        message.error('Please add at least one item');
        setSubmitting(false);
        return;
      }

      const invoiceData = {
        ...values,
        items: validItems,
        subtotal: calculateSubtotal(),
        discount: 0,
        total: calculateTotal(),
        globalDiscountPercentage: 0,
        type: 'product',
        date: values.date.format('YYYY-MM-DD'),
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : null,
      };

      const res = await apiRequest(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify(invoiceData)
      });

      if (res.ok) {
        message.success('Invoice updated successfully!');
        router.push(`/invoices/${invoiceId}`);
      } else {
        const error = await res.json();
        message.error(error.message || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      message.error('Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

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
              Edit Invoice #{invoice.invoiceNumber}
            </Title>
          </div>
          <Space>
            <Button icon={<CloseOutlined />} onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>
              Save
            </Button>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Row gutter={24}>
            {/* Left Column - Invoice Details */}
            <Col span={16}>
              <Card title="Invoice Details" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Invoice Number" name="invoiceNumber">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Date" name="date">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Due Date" name="dueDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Status" name="status">
                      <Select>
                        <Option value="Draft">Draft</Option>
                        <Option value="Pending">Pending</Option>
                        <Option value="Sent">Sent</Option>
                        <Option value="Paid">Paid</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Note" name="note">
                  <Input.TextArea rows={3} placeholder="Additional notes..." />
                </Form.Item>
              </Card>

              {/* Client Information */}
              <Card title="Client Information" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Customer Name" name="customerName">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Contact Person" name="customerContactPerson">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Email" name="customerEmail">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Phone" name="customerPhone">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="VAT Number" name="customerVatNumber">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="LPO Number" name="customerLpoNumber">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Invoice Items */}
              <Card title="Invoice Items" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Row gutter={8} style={{ fontWeight: 'bold', backgroundColor: '#fafafa', padding: '8px' }}>
                    <Col span={8}>Description</Col>
                    <Col span={4}>Quantity</Col>
                    <Col span={4}>Unit Price</Col>
                    <Col span={4}>Total</Col>
                    <Col span={4}>Action</Col>
                  </Row>
                  {invoiceItems.map((item, index) => (
                    <Row key={item.id || index} gutter={8} style={{ marginBottom: '8px', alignItems: 'center' }}>
                      <Col span={8}>
                        <Input
                          placeholder="Item Description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                        />
                      </Col>
                      <Col span={4}>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </Col>
                      <Col span={4}>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </Col>
                      <Col span={4}>
                        <Text strong>{item.total?.toFixed(2)} Rs</Text>
                      </Col>
                      <Col span={4}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeInvoiceItem(item.id)}
                          disabled={invoiceItems.length === 1}
                        />
                      </Col>
                    </Row>
                  ))}
                </div>
                <Button type="dashed" icon={<PlusOutlined />} onClick={addInvoiceItem} block>
                  Add Item
                </Button>
              </Card>
            </Col>

            {/* Right Column - Summary */}
            <Col span={8}>
              <Card title="Summary">
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text>Sub Total:</Text>
                    <Text strong>{calculateSubtotal().toFixed(2)} Rs</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <Text>Tax:</Text>
                    <Text strong>{calculateTax().toFixed(2)} Rs</Text>
                  </div>
                  <Divider />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>Total:</Text>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      {calculateTotal().toFixed(2)} Rs
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Bottom Save Button */}
          <div style={{ textAlign: 'left', marginTop: '24px' }}>
            <Button 
              type="primary" 
              size="large" 
              icon={<SaveOutlined />} 
              onClick={() => form.submit()}
              loading={submitting}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </div>
    </Layout>
  );
}
