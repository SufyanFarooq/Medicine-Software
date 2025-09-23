import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { apiRequest } from '../../lib/auth';

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
      setQuotes([]);
    } finally {
      setLoading(false);
    }
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
        <h2>Quotes For Leads</h2>
        <p>Found {quotes.length} quotes</p>
        
        <button onClick={() => router.push('/quotes/new')}>
          Add New Quote
        </button>
        
        <div style={{ marginTop: '20px' }}>
          {quotes.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Number</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Company</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Total</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote._id}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {quote.number}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {quote.leadName || quote.company || '-'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {quote.currencySymbol || '$'}{quote.total?.toFixed(2) || '0.00'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {quote.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No quotes found. Create your first quote to get started!</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

