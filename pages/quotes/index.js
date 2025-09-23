import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';
import { Typography, Button, Card, Table, Tag, Space, Modal, message } from 'antd';

const { Title } = Typography;

export default function Quotes() {
  const router = useRouter();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

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

  const handleConvertToCustomer = async (quote) => {
    Modal.confirm({
      title: 'Convert to Customer',
      content: `Convert quote #${quote.number} to customer and create invoice?`,
      okText: 'Yes, Convert',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // First create customer from lead
          const customerData = {
            name: quote.leadName,
            email: quote.leadEmail,
            company: quote.company,
            phone: quote.lead?.phone || '',
            country: quote.lead?.country || '',
            convertedFromLead: true,
            leadId: quote.leadId,
            quoteId: quote._id
          };

          const customerResponse = await apiRequest('/api/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
          });

          if (customerResponse.ok) {
            const customer = await customerResponse.json();
            
            // Then create invoice from quote
            const invoiceData = {
              customerId: customer._id,
              customerName: customer.name,
              customerEmail: customer.email,
              items: quote.items,
              subTotal: quote.subTotal,
              total: quote.total,
              currency: quote.currency,
              note: `Converted from quote #${quote.number}`,
              status: 'Draft',
              convertedFromQuote: true,
              quoteId: quote._id
            };

            const invoiceResponse = await apiRequest('/api/invoices', {
              method: 'POST',
              body: JSON.stringify(invoiceData)
            });

            if (invoiceResponse.ok) {
              message.success('Quote converted to customer and invoice successfully!');
              router.push('/invoices');
            } else {
              message.error('Customer created but failed to create invoice');
            }
          } else {
            const errorData = await customerResponse.json();
            message.error(errorData.message || 'Failed to create customer');
          }
        } catch (error) {
          message.error('An error occurred during conversion');
        }
      }
    });
  };

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
        <Title level={2}>Quotes For Leads</Title>
        <Typography.Text type="secondary">Found {quotes.length} quotes</Typography.Text>
        
        <div style={{ marginBottom: '16px' }}>
          <Button type="primary" onClick={() => router.push('/quotes/new')}>
            Add New Quote
          </Button>
        </div>
        
        <Card style={{ marginTop: '20px' }}>
          <Table
            columns={[
              {
                title: 'Number',
                dataIndex: 'number',
                key: 'number',
                render: (number) => <Typography.Text strong>{number}</Typography.Text>
              },
              {
                title: 'Company',
                dataIndex: 'company',
                key: 'company',
                render: (company, record) => (
                  <Typography.Text>{record.leadName || company || '-'}</Typography.Text>
                )
              },
              {
                title: 'Total',
                dataIndex: 'total',
                key: 'total',
                render: (total, record) => (
                  <Typography.Text>
                    {record.currencySymbol || '$'}{total?.toFixed(2) || '0.00'}
                  </Typography.Text>
                )
              },
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (status) => <Tag>{status}</Tag>
              },
              {
                title: 'Actions',
                key: 'actions',
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
                        onClick={() => handleConvertToCustomer(record)}
                      >
                        Convert to Customer
                      </Button>
                    )}
                    <Button 
                      size="small" 
                      danger
                      onClick={() => {
                        Modal.confirm({
                          title: 'Delete Quote',
                          content: `Are you sure you want to delete quote #${record.number}?`,
                          okText: 'Yes, Delete',
                          cancelText: 'Cancel',
                          okType: 'danger',
                          onOk: () => handleDeleteQuote(record._id),
                        });
                      }}
                    >
                      Delete
                    </Button>
                  </Space>
                )
              }
            ]}
            dataSource={quotes}
            rowKey="_id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: 'No quotes found. Create your first quote to get started!'
            }}
          />
        </Card>
      </div>
    </Layout>
  );
}
