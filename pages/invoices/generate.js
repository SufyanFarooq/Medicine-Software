import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import InvoiceTable from '../../components/InvoiceTable';

export default function GenerateInvoice() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/medicines');
      
      if (response.ok) {
        const data = await response.json();
        // Only show medicines with stock > 0
        const availableMedicines = data.filter(medicine => medicine.quantity > 0);
        setMedicines(availableMedicines);
      } else {
        setError('Failed to fetch medicines');
      }
    } catch (error) {
      setError('Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceGenerated = (invoiceData) => {
    // Refresh medicines list after invoice generation
    fetchMedicines();
    
    // Show success message
    alert(`Invoice ${invoiceData.invoiceNumber} generated successfully!`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading medicines...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={fetchMedicines}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate Invoice</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new customer invoice
          </p>
        </div>

        {medicines.length === 0 ? (
          <div className="card">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No medicines available for sale</p>
              <p className="text-sm text-gray-400">
                Add medicines to your inventory first
              </p>
            </div>
          </div>
        ) : (
          <InvoiceTable 
            medicines={medicines} 
            onInvoiceGenerated={handleInvoiceGenerated}
          />
        )}
      </div>
    </Layout>
  );
} 