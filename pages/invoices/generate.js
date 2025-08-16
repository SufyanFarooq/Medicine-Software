import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import InvoiceTable from '../../components/InvoiceTable';
import { apiRequest } from '../../lib/auth';

export default function GenerateInvoice() {
  const [medicines, setMedicines] = useState([]);
  const [settings, setSettings] = useState({ discountPercentage: 3 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicines();
    fetchSettings();
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

  const fetchSettings = async () => {
    try {
      const response = await apiRequest('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('Failed to fetch settings:', response.statusText);
        // Use default settings if API fails
        setSettings({ discountPercentage: 3 });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use default settings if API fails
      setSettings({ discountPercentage: 3 });
    }
  };

  const handleInvoiceGenerated = async (invoiceData) => {
    alert('Invoice generated successfully!');
    // Refresh medicines list to show updated quantities
    await fetchMedicines();
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
      <InvoiceTable 
        medicines={medicines} 
        settings={settings}
        onInvoiceGenerated={handleInvoiceGenerated} 
      />
    </Layout>
  );
} 