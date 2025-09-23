import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Button, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  InputNumber,
  Table,
  message,
  Divider
} from 'antd';
import { 
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function NewQuote() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [items, setItems] = useState([
    { key: 1, item: '', description: '', quantity: 1, price: 0, total: 0 }
  ]);
  const [calculations, setCalculations] = useState({
    subTotal: 0,
    taxRate: 0,
    taxAmount: 0,
    discountRate: 0,
    discountAmount: 0,
    total: 0
  });

  // Currency options
  const currencyOptions = [
    { value: 'USD', label: '$ (USD)', symbol: '$' },
    { value: 'EUR', label: '€ (EUR)', symbol: '€' },
    { value: 'GBP', label: '£ (GBP)', symbol: '£' },
    { value: 'INR', label: '₹ (Indian Rupee)', symbol: '₹' },
    { value: 'PKR', label: '₨ (Pakistani Rupee)', symbol: '₨' },
    { value: 'CAD', label: '$ (CAD)', symbol: 'C$' },
    { value: 'AUD', label: '$ (AUD)', symbol: 'A$' },
    { value: 'JPY', label: '¥ (JPY)', symbol: '¥' },
    { value: 'CNY', label: '¥ (CNY)', symbol: '¥' }
  ];

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchLeads();
    
    // Set default values
    const today = dayjs();
    const expireDate = dayjs().add(30, 'day');
    
    form.setFieldsValue({
      year: currentYear,
      date: today,
      expireDate: expireDate,
      currency: 'USD',
      status: 'Draft'
    });
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [items, calculations.taxRate, calculations.discountRate]);

  const fetchLeads = async () => {
    try {
      const response = await apiRequest('/api/leads');
      if (response.ok) {
        const data = await response.json();
        const leadsArray = data.leads || data || [];
        setLeads(Array.isArray(leadsArray) ? leadsArray : []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      message.error('Failed to fetch leads');
    }
  };

  const calculateTotals = () => {
    const subTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = (subTotal * calculations.taxRate) / 100;
    const discountAmount = (subTotal * calculations.discountRate) / 100;
    const total = subTotal + taxAmount - discountAmount;

    setCalculations(prev => ({
      ...prev,
      subTotal,
      taxAmount,
      discountAmount,
      total
    }));
  };

  const handleItemChange = (key, field, value) => {
    const newItems = items.map(item => {
      if (item.key === key) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total for this item
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = (updatedItem.quantity || 0) * (updatedItem.price || 0);
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(newItems);
  };

  const addItem = () => {
    const newKey = Math.max(...items.map(item => item.key)) + 1;
    setItems([...items, {
      key: newKey,
      item: '',
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    }]);
  };

  const removeItem = (key) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.key !== key));
    }
  };

  const handleTaxChange = (value) => {
    setCalculations(prev => ({ ...prev, taxRate: value || 0 }));
  };

  const handleDiscountChange = (value) => {
    setCalculations(prev => ({ ...prev, discountRate: value || 0 }));
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    
    try {
      // Validate items
      const validItems = items.filter(item => item.item.trim() !== '');
      if (validItems.length === 0) {
        message.error('Please add at least one item');
        setLoading(false);
        return;
      }

      const selectedCurrency = currencyOptions.find(c => c.value === values.currency);
      
      const quoteData = {
        ...values,
        currencySymbol: selectedCurrency?.symbol || '$',
        date: values.date ? values.date.toDate().toISOString() : new Date().toISOString(),
        expireDate: values.expireDate ? values.expireDate.toDate().toISOString() : null,
        items: validItems,
        taxRate: calculations.taxRate,
        discountRate: calculations.discountRate
      };

      console.log('Submitting quote data:', quoteData);

      const response = await apiRequest('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(quoteData)
      });

      if (response.ok) {
        const result = await response.json();
        message.success('Quote created successfully!');
        router.push('/quotes');
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to create quote');
      }
    } catch (error) {
      console.error('Error creating quote:', error);
      message.error('An error occurred while creating the quote');
    } finally {
      setLoading(false);
    }
  };

  const itemColumns = [
    {
      title: 'Item',
      dataIndex: 'item',
      key: 'item',
      width: 200,
      render: (_, record) => (
        <Input
          placeholder="Item Name"
          value={record.item}
          onChange={(e) => handleItemChange(record.key, 'item', e.target.value)}
        />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (_, record) => (
        <Input
          placeholder="description Name"
          value={record.description}
          onChange={(e) => handleItemChange(record.key, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={0.01}
          step={0.01}
          value={record.quantity}
          onChange={(value) => handleItemChange(record.key, 'quantity', value || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          step={0.01}
          value={record.price}
          onChange={(value) => handleItemChange(record.key, 'price', value || 0)}
          style={{ width: '100%' }}
          formatter={value => `₹ ${value}`}
          parser={value => value.replace('₹ ', '')}
        />
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (_, record) => (
        <InputNumber
          value={record.total}
          disabled
          style={{ width: '100%' }}
          formatter={value => `₹ ${parseFloat(value || 0).toFixed(2)}`}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
          disabled={items.length <= 1}
        />
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.push('/quotes')}
              />
              <div>
                <Title level={2} style={{ margin: 0 }}>New</Title>
                <Text type="secondary">Draft</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<CloseOutlined />}
                onClick={() => router.push('/quotes')}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
                loading={loading}
              >
                Save
              </Button>
            </Space>
          </Col>
        </Row>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Card>
            {/* Quote Header Information */}
            <Row gutter={24}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Lead"
                  name="leadId"
                  rules={[{ required: true, message: 'Please select a lead!' }]}
                >
                  <Select
                    placeholder="search"
                    showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {leads.map((lead) => (
                      <Option key={lead._id} value={lead._id}>
                        {lead.name} {lead.company && `(${lead.company})`}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Number"
                  name="number"
                  rules={[{ required: true, message: 'Please enter quote number!' }]}
                >
                  <Input placeholder="4" />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Year"
                  name="year"
                  rules={[{ required: true, message: 'Please enter year!' }]}
                >
                  <Input placeholder="2025" />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Currency"
                  name="currency"
                  rules={[{ required: true, message: 'Please select currency!' }]}
                >
                  <Select placeholder="₹ (Indian Rupee)">
                    {currencyOptions.map((currency) => (
                      <Option key={currency.value} value={currency.value}>
                        {currency.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Status"
                  name="status"
                >
                  <Select>
                    <Option value="Draft">Draft</Option>
                    <Option value="Sent">Sent</Option>
                    <Option value="Viewed">Viewed</Option>
                    <Option value="Accepted">Accepted</Option>
                    <Option value="Rejected">Rejected</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Date"
                  name="date"
                  rules={[{ required: true, message: 'Please select date!' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="MM.DD.YYYY" />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  label="Expire Date"
                  name="expireDate"
                  rules={[{ required: true, message: 'Please select expire date!' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="MM.DD.YYYY" />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={12}>
                <Form.Item
                  label="Note"
                  name="note"
                >
                  <TextArea rows={2} placeholder="Add any notes..." />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            {/* Items Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={4} style={{ margin: 0 }}>Items</Title>
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />}
                  onClick={addItem}
                >
                  Add Field
                </Button>
              </div>

              <Table
                columns={itemColumns}
                dataSource={items}
                pagination={false}
                size="small"
                bordered
              />
            </div>

            <Divider />

            {/* Totals Section */}
            <Row justify="end">
              <Col xs={24} md={12} lg={8}>
                <div style={{ padding: '16px', border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                  <Row justify="space-between" style={{ marginBottom: '8px' }}>
                    <Col>
                      <Text>Sub Total :</Text>
                    </Col>
                    <Col>
                      <Text>₹ {calculations.subTotal.toFixed(2)}</Text>
                    </Col>
                  </Row>

                  <Row justify="space-between" align="middle" style={{ marginBottom: '8px' }}>
                    <Col>
                      <Select
                        placeholder="Select Tax Value"
                        style={{ width: 150 }}
                        onChange={handleTaxChange}
                        value={calculations.taxRate || undefined}
                      >
                        <Option value={0}>No Tax</Option>
                        <Option value={5}>5% Tax</Option>
                        <Option value={10}>10% Tax</Option>
                        <Option value={15}>15% Tax</Option>
                        <Option value={18}>18% GST</Option>
                        <Option value={28}>28% GST</Option>
                      </Select>
                    </Col>
                    <Col>
                      <Text>₹ {calculations.taxAmount.toFixed(2)}</Text>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '12px 0' }} />

                  <Row justify="space-between">
                    <Col>
                      <Text strong>Total :</Text>
                    </Col>
                    <Col>
                      <Text strong>₹ {calculations.total.toFixed(2)}</Text>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>

            <Row style={{ marginTop: '24px' }}>
              <Col span={24}>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  size="large"
                  onClick={() => form.submit()}
                  loading={loading}
                >
                  Save
                </Button>
              </Col>
            </Row>
          </Card>
        </Form>
      </div>
    </Layout>
  );
}
