import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Dropdown, 
  Input,
  Card,
  Typography,
  message
} from 'antd';
import { 
  PlusOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DownloadOutlined, 
  DollarOutlined, 
  DeleteOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/router';

const { Title } = Typography;
const { Search } = Input;

export default function InvoiceList() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await apiRequest('/api/invoices');
      if (res.ok) {
        const data = await res.json();
        // Handle both array response and object with invoices property
        setInvoices(Array.isArray(data) ? data : (data.invoices || []));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      message.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
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

  const handleRecordPayment = (invoice) => {
    router.push(`/invoices/${invoice._id}/payment`);
  };

  const handleViewInvoice = (invoice) => {
    router.push(`/invoices/${invoice._id}`);
  };

  const handleEditInvoice = (invoice) => {
    router.push(`/invoices/${invoice._id}/edit`);
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      const res = await apiRequest(`/api/invoices/${invoice._id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        message.success('Invoice deleted successfully');
        fetchInvoices();
      } else {
        message.error('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      message.error('Failed to delete invoice');
    }
  };

  const columns = [
    {
      title: 'Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 120,
    },
    {
      title: 'Client',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 150,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text || 'N/A'}</div>
          {record.customerContactPerson && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.customerContactPerson}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      sorter: (a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt),
      defaultSortOrder: 'descend',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Expired Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (amount) => `Rs ${(amount || 0).toFixed(2)}`,
    },
    {
      title: 'Paid',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 100,
      render: (amount) => `Rs ${(amount || 0).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status || 'Draft'}
        </Tag>
      ),
    },
    {
      title: 'Payment',
      key: 'payment',
      width: 100,
      render: (_, record) => (
        <Tag color={getPaymentColor(record)}>
          {getPaymentText(record)}
        </Tag>
      ),
    },
    {
      title: 'Created By',
      key: 'createdBy',
      width: 150,
      sorter: (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date),
      defaultSortOrder: 'descend',
      render: (_, record) => {
        if (record.createdByUser) {
          return (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                {record.createdByUser.username}
              </div>
              <div style={{ fontSize: '11px', color: '#666', textTransform: 'capitalize' }}>
                {record.createdByUser.role?.replace('_', ' ')}
              </div>
            </div>
          );
        }
        return record.createdBy || 'N/A';
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'Show',
                icon: <EyeOutlined />,
                onClick: () => handleViewInvoice(record),
              },
              {
                key: 'edit',
                label: 'Edit',
                icon: <EditOutlined />,
                onClick: () => handleEditInvoice(record),
              },
              {
                key: 'download',
                label: 'Download',
                icon: <DownloadOutlined />,
                onClick: () => message.info('Download feature coming soon'),
              },
              {
                key: 'payment',
                label: 'Record Payment',
                icon: <DollarOutlined />,
                onClick: () => handleRecordPayment(record),
              },
              {
                key: 'delete',
                label: 'Delete',
                icon: <DeleteOutlined />,
                danger: true,
                onClick: () => handleDeleteInvoice(record),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
      invoice.customerName?.toLowerCase().includes(searchLower) ||
      invoice.customerContactPerson?.toLowerCase().includes(searchLower)
    );
  });

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
            <Title level={3} style={{ margin: 0 }}>Invoice List</Title>
          </div>
          <Space>
            <Search
              placeholder="Search invoices"
              allowClear
              style={{ width: 300 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => router.push('/invoices/generate')}
            >
              Add New Invoice
            </Button>
          </Space>
        </div>

        {/* Invoice Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredInvoices}
            rowKey="_id"
            loading={loading}
            defaultSortOrder="descend"
            sortDirections={['descend', 'ascend']}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} invoices`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>
    </Layout>
  );
}