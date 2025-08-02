import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import InvoiceTable from '../../components/InvoiceTable';
import { apiRequest } from '../../lib/auth';

export default function GenerateInvoice() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const response = await apiRequest('/api/medicines');
      if (response.ok) {
        const data = await response.json();
        setMedicines(data);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceGenerated = (invoiceData) => {
    alert('Invoice generated successfully!');
    // Optionally redirect to invoices list
    // window.location.href = '/invoices';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <InvoiceTable medicines={medicines} onInvoiceGenerated={handleInvoiceGenerated} />
    </Layout>
  );
} 