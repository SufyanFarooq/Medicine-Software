import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { Typography, Button, Card, Table, Tag, Space, Modal, message } from 'antd';

const { Title } = Typography;

export default function Offers() {
  const router = useRouter();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Offer status options
  const statusOptions = [
    { value: 'Draft', color: 'default', label: 'Draft' },
    { value: 'Sent', color: 'blue', label: 'Sent' },
    { value: 'Viewed', color: 'cyan', label: 'Viewed' },
    { value: 'Interested', color: 'orange', label: 'Interested' },
    { value: 'Accepted', color: 'green', label: 'Accepted' },
    { value: 'Rejected', color: 'red', label: 'Rejected' },
    { value: 'Expired', color: 'volcano', label: 'Expired' },
    { value: 'Converted', color: 'purple', label: 'Converted' }
  ];

  // Offer type options
  const typeOptions = [
    { value: 'Discount', color: 'blue', label: 'Discount' },
    { value: 'Bundle', color: 'green', label: 'Bundle' },
    { value: 'Special Price', color: 'orange', label: 'Special Price' },
    { value: 'Limited Time', color: 'red', label: 'Limited Time' },
    { value: 'Volume Discount', color: 'purple', label: 'Volume Discount' },
    { value: 'First Time Customer', color: 'cyan', label: 'First Time Customer' },
    { value: 'Seasonal', color: 'gold', label: 'Seasonal' }
  ];

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await apiRequest('/api/offers');
      if (response.ok) {
        const data = await response.json();
        const offersArray = data.offers || data || [];
        setOffers(Array.isArray(offersArray) ? offersArray : []);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      message.error('Failed to fetch offers');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    try {
      const response = await apiRequest(`/api/offers/${offerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('Offer deleted successfully!');
        fetchOffers();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to delete offer');
      }
    } catch (error) {
      message.error('An error occurred while deleting the offer');
    }
  };

  const handleConvertToQuote = async (offer) => {
    Modal.confirm({
      title: 'Convert to Quote',
      content: `Are you sure you want to convert offer "${offer.title}" to a quote?`,
      okText: 'Yes, Convert',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // Create quote from offer
          const quoteData = {
            leadId: offer.leadId,
            number: `Q-${offer.number}`,
            year: new Date().getFullYear(),
            date: new Date().toISOString(),
            expireDate: offer.validUntil,
            currency: offer.currency,
            currencySymbol: offer.currencySymbol,
            items: offer.items.map(item => ({
              item: item.item,
              description: item.description,
              quantity: item.quantity,
              price: item.offerPrice
            })),
            note: `Converted from offer: ${offer.title}`,
            status: 'Draft'
          };

          const response = await apiRequest('/api/quotes', {
            method: 'POST',
            body: JSON.stringify(quoteData)
          });

          if (response.ok) {
            message.success('Offer converted to quote successfully!');
            // TODO: Update offer status to 'Converted'
            fetchOffers();
            router.push('/quotes');
          } else {
            const errorData = await response.json();
            message.error(errorData.message || 'Failed to convert offer to quote');
          }
        } catch (error) {
          message.error('An error occurred while converting the offer');
        }
      }
    });
  };

  const getStatusColor = (status) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? statusObj.color : 'default';
  };

  const getTypeColor = (type) => {
    const typeObj = typeOptions.find(t => t.value === type);
    return typeObj ? typeObj.color : 'default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const columns = [
    {
      title: 'Number',
      dataIndex: 'number',
      key: 'number',
      width: 100,
      render: (number) => <Typography.Text strong>OF-{number}</Typography.Text>
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title) => <Typography.Text strong>{title}</Typography.Text>
    },
    {
      title: 'Lead',
      dataIndex: 'leadName',
      key: 'leadName',
      width: 150,
      render: (leadName, record) => (
        <div>
          <Typography.Text>{leadName}</Typography.Text>
          {record.company && (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {record.company}
              </Typography.Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'offerType',
      key: 'offerType',
      width: 120,
      render: (type) => <Tag color={getTypeColor(type)}>{type}</Tag>
    },
    {
      title: 'Discount',
      dataIndex: 'discountPercent',
      key: 'discountPercent',
      width: 100,
      render: (discount) => (
        <Typography.Text strong style={{ color: '#52c41a' }}>
          {discount?.toFixed(1) || '0'}%
        </Typography.Text>
      )
    },
    {
      title: 'Offer Total',
      dataIndex: 'offerTotal',
      key: 'offerTotal',
      width: 120,
      render: (total, record) => (
        <Typography.Text strong>
          {record.currencySymbol || '$'}{total?.toFixed(2) || '0.00'}
        </Typography.Text>
      )
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      key: 'validUntil',
      width: 120,
      render: (date) => formatDate(date)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => <Tag color={getStatusColor(status)}>{status}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            onClick={() => message.info('View functionality coming soon')}
          >
            View
          </Button>
          {record.status === 'Accepted' && (
            <Button 
              size="small" 
              type="primary"
              onClick={() => handleConvertToQuote(record)}
            >
              Convert to Quote
            </Button>
          )}
          <Button 
            size="small" 
            danger
            onClick={() => {
              Modal.confirm({
                title: 'Delete Offer',
                content: `Are you sure you want to delete offer "${record.title}"?`,
                okText: 'Yes, Delete',
                cancelText: 'Cancel',
                okType: 'danger',
                onOk: () => handleDeleteOffer(record._id),
              });
            }}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading offers...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Offers For Leads</Title>
            <Typography.Text type="secondary">Special offers and discounts to engage leads</Typography.Text>
          </div>
          <Button 
            type="primary" 
            size="large"
            onClick={() => router.push('/offers/new')}
          >
            Create New Offer
          </Button>
        </div>

        {/* Statistics Cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <Card style={{ flex: 1 }}>
            <Typography.Text type="secondary">Total Offers</Typography.Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
              {offers.length}
            </div>
          </Card>
          <Card style={{ flex: 1 }}>
            <Typography.Text type="secondary">Accepted Offers</Typography.Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
              {offers.filter(o => o.status === 'Accepted').length}
            </div>
          </Card>
          <Card style={{ flex: 1 }}>
            <Typography.Text type="secondary">Conversion Rate</Typography.Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
              {offers.length > 0 ? ((offers.filter(o => o.status === 'Accepted').length / offers.length) * 100).toFixed(1) : '0'}%
            </div>
          </Card>
        </div>

        {/* Offers Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={offers}
            rowKey="_id"
            loading={loading}
            pagination={{ 
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} offers`
            }}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: 'No offers found. Create your first offer to engage leads!'
            }}
          />
        </Card>
      </div>
    </Layout>
  );
}

