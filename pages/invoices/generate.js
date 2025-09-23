import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
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

export default function GenerateInvoice() {
  const [form] = Form.useForm();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ discountPercentage: 3 });
  const [loading, setLoading] = useState(true);
  const [invoiceItems, setInvoiceItems] = useState([
    { id: 1, productId: '', item: '', description: '', quantity: 1, price: 0, total: 0 }
  ]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const { Title, Text } = Typography;
  const { Option } = Select;

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchSettings();
    generateInvoiceNumber();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await apiRequest('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiRequest('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    setInvoiceNumber(`INV${year}${randomNum}`);
  };

  const addInvoiceItem = () => {
    const newId = Math.max(...invoiceItems.map(item => item.id)) + 1;
    setInvoiceItems([...invoiceItems, { 
      id: newId, 
      productId: '', 
      item: '', 
      description: '', 
      quantity: 1, 
      price: 0, 
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
        if (field === 'quantity' || field === 'price') {
          updated.total = updated.quantity * updated.price;
        }
        // If product is selected from dropdown, auto-fill name and price
        if (field === 'productId' && value) {
          const selectedProduct = products.find(p => p._id === value);
          if (selectedProduct) {
            console.log('Selected product:', selectedProduct); // Debug log
            updated.item = selectedProduct.name;
            updated.description = selectedProduct.description || '';
            // Use sellingPrice instead of price
            updated.price = parseFloat(selectedProduct.sellingPrice) || parseFloat(selectedProduct.price) || 0;
            updated.total = updated.quantity * updated.price;
            console.log('Updated item:', updated); // Debug log
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return invoiceItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.05; // 5% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const onFinish = async (values) => {
    if (!selectedCustomer) {
      message.error('Please select a customer');
      return;
    }

    const validItems = invoiceItems.filter(item => item.item && item.quantity > 0);
    if (validItems.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    const invoiceData = {
      ...values,
      invoiceNumber,
      items: validItems.map(item => ({
        description: item.item,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.total
      })),
      subtotal: calculateSubtotal(),
      discount: 0,
      total: calculateTotal(),
      globalDiscountPercentage: 0,
      type: 'product',
      date: values.date.format('YYYY-MM-DD'),
      customerId: selectedCustomer._id,
      customer: selectedCustomer
    };

    try {
      const res = await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(invoiceData)
      });

      if (res.ok) {
        message.success('Invoice generated successfully!');
        // Reset form
        form.resetFields();
        setInvoiceItems([{ id: 1, productId: '', item: '', description: '', quantity: 1, price: 0, total: 0 }]);
        generateInvoiceNumber();
        setSelectedCustomer(null);
      } else {
        const error = await res.json();
        message.error(error.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      message.error('Failed to generate invoice');
    }
  };

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
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
            <ArrowLeftOutlined style={{ marginRight: '8px', fontSize: '16px' }} />
            <Title level={3} style={{ margin: 0 }}>New Draft</Title>
          </div>
          <Space>
            <Button icon={<CloseOutlined />}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>
              Save
            </Button>
          </Space>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            number: 1,
            year: currentYear,
            currency: 'Rs (Pakistan)',
            status: 'Draft',
            date: dayjs(),
            expireDate: dayjs().add(30, 'day')
          }}
        >
          <Row gutter={24}>
            {/* Left Column - Invoice Details */}
            <Col span={16}>
              <Card title="Invoice Details" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Client" name="client" rules={[{ required: true, message: 'Please select a client!' }]}>
                      <Select
                        placeholder="Select client"
                        showSearch
                        optionFilterProp="children"
                        onChange={(value) => {
                          const customer = customers.find(c => c._id === value);
                          setSelectedCustomer(customer);
                        }}
                        filterOption={(input, option) =>
                          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {customers.map(customer => (
                          <Option key={customer._id} value={customer._id}>
                            {customer.companyName}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="Number" name="number">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="Year" name="year">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Currency" name="currency">
                      <Select>
                        <Option value="Rs (Pakistan)">Rs (Pakistan)</Option>
                        <Option value="USD">USD</Option>
                        <Option value="EUR">EUR</Option>
                      </Select>
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
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Date" name="date">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Expire Date" name="expireDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Note" name="note">
                  <Input.TextArea rows={3} placeholder="Additional notes..." />
                </Form.Item>
              </Card>

              {/* Invoice Items */}
              <Card title="Invoice Items" style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <Row gutter={8} style={{ fontWeight: 'bold', backgroundColor: '#fafafa', padding: '8px' }}>
                    <Col span={5}>Product</Col>
                    <Col span={5}>Item Name</Col>
                    <Col span={4}>Description</Col>
                    <Col span={3}>Quantity</Col>
                    <Col span={3}>Price</Col>
                    <Col span={3}>Total</Col>
                    <Col span={1}>Action</Col>
                  </Row>
                  {invoiceItems.map((item, index) => (
                    <Row key={`${item.id}-${item.productId}`} gutter={8} style={{ marginBottom: '8px', alignItems: 'center' }}>
                      <Col span={5}>
                        <Select
                          placeholder="Select Product"
                          style={{ width: '100%' }}
                          allowClear
                          showSearch
                          value={item.productId || undefined}
                          onChange={(value) => updateInvoiceItem(item.id, 'productId', value)}
                          filterOption={(input, option) => {
                            const product = products.find(p => p._id === option.value);
                            if (!product) return false;
                            const searchText = input.toLowerCase();
                            return (
                              product.name.toLowerCase().includes(searchText) ||
                              product.description?.toLowerCase().includes(searchText) ||
                              product.code?.toLowerCase().includes(searchText)
                            );
                          }}
                        >
                          {products.map(product => (
                            <Option key={product._id} value={product._id}>
                                {product.name} - Rs {product.sellingPrice}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col span={5}>
                        <Input
                          placeholder="Item Name"
                          value={item.item}
                          onChange={(e) => updateInvoiceItem(item.id, 'item', e.target.value)}
                        />
                      </Col>
                      <Col span={4}>
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                        />
                      </Col>
                      <Col span={3}>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </Col>
                      <Col span={3}>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price || 0}
                          onChange={(e) => updateInvoiceItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </Col>
                      <Col span={3}>
                        <Text strong>{item.total.toFixed(2)} Rs</Text>
                      </Col>
                      <Col span={1}>
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
                  Add Field
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
            <Button type="primary" size="large" icon={<SaveOutlined />} onClick={() => form.submit()}>
              Save
            </Button>
          </div>
        </Form>
      </div>
    </Layout>
  );
}