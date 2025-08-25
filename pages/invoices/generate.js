import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import InvoiceTable from '../../components/InvoiceTable';
import BarcodeScanner from '../../components/BarcodeScanner';
import { apiRequest } from '../../lib/auth';

export default function GenerateInvoice() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({ discountPercentage: 3 });
  const [loading, setLoading] = useState(true);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [invoiceTableKey, setInvoiceTableKey] = useState(0); // Force re-render
  const [autoAddProduct, setAutoAddProduct] = useState(null); // Product to auto-add

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

  const handleBarcodeScan = (barcodeValue) => {
    // Find product by barcode or code
    const foundProduct = products.find(product => 
      product.barcode === barcodeValue || product.code === barcodeValue
    );
    
    if (foundProduct) {
      // Auto-add to invoice, no search-bar mutation
      setScannedProduct(foundProduct);
      setAutoAddProduct(foundProduct);
      setInvoiceTableKey(prev => prev + 1);
    } else {
      // No mutation to search bar; optional future UX: brief toast
      console.warn('No product found for scanned value:', barcodeValue);
    }
  };

  const handleInvoiceGenerated = async () => {
    // Refresh products list to show updated quantities
    await fetchProducts();
    // Reset scanner-related state
    setScannedProduct(null);
    setAutoAddProduct(null);
  };

  const handleProductAdded = () => {
    // Reset auto-add after product is added
    setAutoAddProduct(null);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Generate Invoice</h1>

        {/* Barcode Scanner Section (minimal UI, no details/alerts) */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🏷️ Barcode Scanner</h2>
          <BarcodeScanner 
            onScan={handleBarcodeScan}
            placeholder="Scan product barcode or enter product code..."
          />
        </div>
      </div>

      <InvoiceTable 
        key={invoiceTableKey}
        medicines={products} 
        settings={settings}
        onInvoiceGenerated={handleInvoiceGenerated}
        scannedProduct={scannedProduct}
        autoAddProduct={autoAddProduct}
        onProductAdded={handleProductAdded}
      />
    </Layout>
  );
} 