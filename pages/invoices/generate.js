import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import InvoiceTable from '../../components/InvoiceTable';
import { apiRequest } from '../../lib/auth';

export default function GenerateInvoice() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ discountPercentage: 3 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
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
    // Refresh products list to show updated quantities
    await fetchProducts();
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
        products={products} 
        settings={settings}
        onInvoiceGenerated={handleInvoiceGenerated} 
      />
    </Layout>
  );
} 