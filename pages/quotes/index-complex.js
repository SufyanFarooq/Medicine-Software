import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { 
  Table, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Tag, 
  Input, 
  Select, 
  Modal, 
  message,
  Dropdown
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  MoreOutlined,
  DownloadOutlined,
  RefreshOutlined
} from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

export default function Quotes() {
  const router = useRouter();
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

  // Quote status options
  const statusOptions = [
    { value: 'Draft', color: 'default', label: 'Draft' },
    { value: 'Sent', color: 'blue', label: 'Sent' },
    { value: 'Viewed', color: 'cyan', label: 'Viewed' },
    { value: 'Accepted', color: 'green', label: 'Accepted' },
    { value: 'Rejected', color: 'red', label: 'Rejected' },
    { value: 'Expired', color: 'orange', label: 'Expired' },
    { value: 'Converted', color: 'purple', label: 'Converted' }
  ];

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [quotes, searchTerm, selectedStatus, selectedYear]);

  const fetchQuotes = async () => {
    try {
      const response = await apiRequest('/api/quotes');
      if (response.ok) {
        const data = await response.json();
        const quotesArray = data.quotes || data || [];
        setQuotes(Array.isArray(quotesArray) ? quotesArray : []);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      message.error('Failed to fetch quotes');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    let filtered = Array.isArray(quotes) ? quotes : [];

    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.note?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter(quote => quote.status === selectedStatus);
    }

    if (selectedYear !== 'All') {
      filtered = filtered.filter(quote => quote.year === parseInt(selectedYear));
    }

    setFilteredQuotes(filtered);
  };

  const handleDeleteQuote = async (quoteId) => {
    try {
      const response = await apiRequest(`/api/quotes/${quoteId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('Quote deleted successfully!');
        fetchQuotes();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to delete quote');
      }
    } catch (error) {
      message.error('An error occurred while deleting the quote');
    }
  };

  const handleDownloadQuote = (quote) => {
    // TODO: Implement PDF download functionality
    message.info('Download functionality will be implemented soon');
  };

  const getStatusColor = (status) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? statusObj.color : 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Get unique years from quotes for filter dropdown
  const uniqueYears = [...new Set(quotes.map(quote => quote.year).filter(Boolean))].sort((a, b) => b - a);

  const columns = [
    {
      title: 'Number',
      dataIndex: 'number',
      key: 'number',
      width: 100,
      render: (number, record) => {
        if (!record) return '-';
        return (
          <div>
            <Typography.Text strong>{number || '-'}</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {record.year || '-'}
              </Typography.Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      width: 150,
      render: (company, record) => {
        if (!record) return '-';
        return (
          <div>
            <Typography.Text strong>{record.leadName || '-'}</Typography.Text>
            {company && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                  {company}
                </Typography.Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: 'Sub Total',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 120,
      render: (subTotal, record) => (
        <Typography.Text>{record.currencySymbol || '$'} {subTotal?.toFixed(2) || '0.00'}</Typography.Text>
      ),
      sorter: (a, b) => (a.subTotal || 0) - (b.subTotal || 0),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: (total, record) => (
        <Typography.Text strong>{record.currencySymbol || '$'} {total?.toFixed(2) || '0.00'}</Typography.Text>
      ),
      sorter: (a, b) => (a.total || 0) - (b.total || 0),
    },
    {
      title: 'Note',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      render: (note) => (
        <Typography.Text ellipsis title={note}>
          {note || '-'}
        </Typography.Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => {
        const menuItems = [
          {
            key: 'view',
            label: 'Show',
            icon: <EyeOutlined />,
            onClick: () => {
              // TODO: Implement quote view page
              message.info('Quote view page will be implemented soon');
            }
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <EditOutlined />,
            onClick: () => {
              // TODO: Implement quote edit functionality
              message.info('Quote edit functionality will be implemented soon');
            }
          },
          {
            key: 'download',
            label: 'Download',
            icon: <DownloadOutlined />,
            onClick: () => handleDownloadQuote(record)
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: 'Delete Quote',
                content: `Are you sure you want to delete quote #${record.number}?`,
                okText: 'Yes, Delete',
                cancelText: 'Cancel',
                okType: 'danger',
                onOk: () => handleDeleteQuote(record._id),
              });
            }
          }
        ];

        return (
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button 
              type="text" 
              icon={<MoreOutlined />}
              onClick={e => e.preventDefault()}
            />
          </Dropdown>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading quotes...</div>
        </div>
      </Layout>
    );
  }



  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>Quotes For Leads</Title>
            <Typography.Text type="secondary">Manage quotes and proposals for your leads</Typography.Text>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<RefreshOutlined />}
                onClick={() => fetchQuotes()}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                size="large"
                onClick={() => router.push('/quotes/new')}
              >
                Add New Quote (for Lead)
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: '24px' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Search
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                style={{ width: '100%' }}
                placeholder="Filter by Status"
              >
                <Option value="All">All Status</Option>
                {statusOptions.map((status) => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Select
                value={selectedYear}
                onChange={setSelectedYear}
                style={{ width: '100%' }}
                placeholder="Filter by Year"
              >
                <Option value="All">All Years</Option>
                {uniqueYears.map((year) => (
                  <Option key={year} value={year.toString()}>
                    {year}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={24} md={6}>
              <Typography.Text type="secondary">
                Showing {filteredQuotes.length} of {quotes.length} quotes
              </Typography.Text>
            </Col>
          </Row>
        </Card>

        {/* Quotes Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredQuotes}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} quotes`,
            }}
            scroll={{ x: 1000 }}
            locale={{
              emptyText: searchTerm || selectedStatus !== 'All' || selectedYear !== 'All'
                ? 'No quotes match your search criteria.'
                : 'No quotes found. Create your first quote to get started!'
            }}
          />
        </Card>
      </div>
    </Layout>
  );
}
