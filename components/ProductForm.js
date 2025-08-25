import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/auth';
import { logProductActivity } from '../lib/activity-logger';

export default function ProductForm({ product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '', // Add barcode field
    category: 'General',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    adminDiscount: 0, // Added admin discount field
    totalBuyingPrice: '', // Added this field
    expiryDate: '',
    batchNo: '',
    brand: '',
    description: '',
    unit: 'pcs'
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [existingProducts, setExistingProducts] = useState([]);

  useEffect(() => {
    fetchCategories();
    if (!product) {
      // Only fetch existing products for new products (not when editing)
      fetchExistingProducts();
    }
    if (product) {
      setFormData({
        name: product.name || '',
        code: product.code || '',
        category: product.category || 'General',
        quantity: product.quantity || '',
        purchasePrice: product.purchasePrice || '',
        sellingPrice: product.sellingPrice || '',
        adminDiscount: product.adminDiscount || 0, // Initialize admin discount
        totalBuyingPrice: product.totalBuyingPrice || (product.quantity * product.purchasePrice) || '',
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
        batchNo: product.batchNo || '',
        brand: product.brand || '',
        description: product.description || '',
        unit: product.unit || 'pcs'
      });
    }
  }, [product]);

  const fetchCategories = async () => {
    try {
      const response = await apiRequest('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchExistingProducts = async () => {
    try {
      const response = await apiRequest('/api/products');
      if (response.ok) {
        const data = await response.json();
        setExistingProducts(data);
      }
    } catch (error) {
      console.error('Error fetching existing products:', error);
    }
  };

  const isDuplicateCode = (code) => {
    if (!code) return false;
    return existingProducts.some(p => p.code?.toLowerCase() === code.toLowerCase());
  };

  const isDuplicateBarcode = (barcode) => {
    if (!barcode) return false;
    return existingProducts.some(p => (p.barcode || '').toLowerCase() === barcode.toLowerCase());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Real-time validation for name
    if (name === 'name' && value.trim()) {
      validateName(value);
    }

    // Real-time duplicate checks for code/barcode on create form
    if (!product && name === 'code') {
      if (isDuplicateCode(value)) {
        setValidationErrors(prev => ({ ...prev, code: 'This code already exists' }));
      }
    }
    if (!product && name === 'barcode') {
      if (isDuplicateBarcode(value)) {
        setValidationErrors(prev => ({ ...prev, barcode: 'This barcode already exists' }));
      }
    }

    // Validate selling price >= unit purchase price
    if (name === 'sellingPrice') {
      const selling = parseFloat(value) || 0;
      const purchase = parseFloat(formData.purchasePrice) || 0;
      if (purchase > 0 && selling < purchase) {
        setValidationErrors(prev => ({
          ...prev,
          sellingPrice: 'Selling price must be greater than or equal to unit purchase price'
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, sellingPrice: '' }));
      }
    }

    // Auto-calculate when quantity or total buying price changes
    if (name === 'quantity' || name === 'totalBuyingPrice') {
      calculateValues(name, value);
    }
  };

  // Helper: Generate next product code like PROD001, PROD002...
  const generateNextCode = () => {
    let maxNumber = 0;
    for (const p of existingProducts) {
      const code = p?.code || '';
      if (code.startsWith('PROD')) {
        const num = parseInt(code.replace('PROD', ''), 10);
        if (!isNaN(num)) maxNumber = Math.max(maxNumber, num);
      }
    }
    const next = (maxNumber + 1).toString().padStart(3, '0');
    return `PROD${next}`;
  };

  // Auto-calculation function
  const calculateValues = (changedField, value) => {
    if (changedField === 'quantity' || changedField === 'totalBuyingPrice') {
      // Calculate Unit Price from Total Buying Price and Quantity
      const quantity = changedField === 'quantity' ? parseFloat(value) || 0 : parseFloat(formData.quantity) || 0;
      const totalBuyingPrice = changedField === 'totalBuyingPrice' ? parseFloat(value) || 0 : parseFloat(formData.totalBuyingPrice) || 0;
      
      if (quantity > 0 && totalBuyingPrice > 0) {
        const unitPrice = (totalBuyingPrice / quantity).toFixed(2);
        setFormData(prev => ({
          ...prev,
          purchasePrice: unitPrice
        }));
        // Also validate selling price against new unit price
        const selling = parseFloat(formData.sellingPrice) || 0;
        if (selling < parseFloat(unitPrice)) {
          setValidationErrors(prev => ({
            ...prev,
            sellingPrice: 'Selling price must be greater than or equal to unit purchase price'
          }));
        } else {
          setValidationErrors(prev => ({ ...prev, sellingPrice: '' }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          purchasePrice: ''
        }));
        // Clear selling price validation when unit price is not computable
        setValidationErrors(prev => ({ ...prev, sellingPrice: '' }));
      }
    }
  };

  // Duplicate name validation
  const validateName = (name) => {
    if (!product) { // Only validate for new products
      const existingProduct = existingProducts.find(
        prod => prod.name.toLowerCase() === name.toLowerCase()
      );
      if (existingProduct) {
        setValidationErrors(prev => ({
          ...prev,
          name: 'Product with this name already exists'
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for validation errors
    if (Object.keys(validationErrors).some(key => validationErrors[key])) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    // Business rule: Selling price must be >= purchase price
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (selling < purchase) {
      setError('Selling price must be greater than or equal to unit purchase price');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        quantity: parseInt(formData.quantity) || 0,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        adminDiscount: parseFloat(formData.adminDiscount) || 0,
        totalBuyingPrice: parseFloat(formData.totalBuyingPrice) || 0
      };

      if (product) {
        // Update existing product
        const response = await apiRequest(`/api/products/${product._id}`, {
          method: 'PUT',
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          onSubmit({ ...product, ...submitData });
          // Log activity
          try { logProductActivity.updated(submitData.name || product.name, submitData.code || product.code, product._id); } catch {}
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to update product');
        }
      } else {
        // Create new product
        const response = await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(submitData)
        });

        if (response.ok) {
          const newProduct = await response.json();
          
          // Record initial inventory inflow transaction for new product
          if (submitData.quantity > 0) {
            try {
              const inflowData = {
                productId: newProduct._id,
                type: 'inflow',
                quantity: submitData.quantity,
                unitPrice: submitData.purchasePrice,
                totalAmount: submitData.totalBuyingPrice,
                batchNo: submitData.batchNo || null,
                expiryDate: submitData.expiryDate || null,
                supplier: 'Initial Stock',
                notes: 'Initial product creation',
                referenceType: 'creation',
                referenceId: newProduct._id,
                date: new Date().toISOString()
              };

              const inventoryResponse = await apiRequest('/api/inventory', {
                method: 'POST',
                body: JSON.stringify(inflowData)
              });

              if (!inventoryResponse.ok) {
                console.error('Failed to record initial inventory inflow');
              }
            } catch (error) {
              console.error('Error recording initial inventory inflow:', error);
              // Continue with product creation even if inventory recording fails
            }
          }
          
          // Log activity
          try { logProductActivity.added(newProduct.name, newProduct.code, newProduct._id); } catch {}
          
          onSubmit(newProduct);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to create product');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {product ? 'Edit Product' : 'Add New Product'}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
              }`}
              placeholder="Enter product name"
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Code *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                readOnly={!!product}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${product ? 'bg-gray-50 cursor-not-allowed' : ''} ${validationErrors.code ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter product code"
              />
              {!product && (
                <button
                  type="button"
                  onClick={() => {
                    const newCode = generateNextCode();
                    setFormData(prev => ({ ...prev, code: newCode }));
                    setValidationErrors(prev => ({ ...prev, code: '' }));
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  ⚙️ Generate
                </button>
              )}
            </div>
            {!product && validationErrors.code && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
            )}
            {!product && (
              <p className="text-xs text-gray-500 mt-1">Leave empty or click Generate to auto-create like PROD001</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.barcode ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder="Enter barcode or leave empty for auto-generation"
              />
              <button
                type="button"
                onClick={() => {
                  const newBarcode = `BAR${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
                  setFormData(prev => ({ ...prev, barcode: newBarcode }));
                  setValidationErrors(prev => ({ ...prev, barcode: '' }));
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                🏷️ Generate
              </button>
            </div>
            {validationErrors.barcode && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.barcode}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to auto-generate a unique barcode
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat._id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter brand name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pcs">Pieces</option>
              <option value="kg">Kilograms</option>
              <option value="g">Grams</option>
              <option value="l">Liters</option>
              <option value="ml">Milliliters</option>
              <option value="m">Meters</option>
              <option value="cm">Centimeters</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Buying Price *
            </label>
            <input
              type="number"
              name="totalBuyingPrice"
              value={formData.totalBuyingPrice}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter total buying price"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Price (Unit Price) - Auto-calculated
            </label>
            <input
              type="number"
              name="purchasePrice"
              value={formData.purchasePrice}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-gray-500 mt-1">
              Total Buying Price ÷ Quantity = Unit Price
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selling Price *
            </label>
            <input
              type="number"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.sellingPrice ? 'border-red-300 focus:ring-red-500' : ''}`}
              placeholder="Enter selling price"
            />
            {validationErrors.sellingPrice && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.sellingPrice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Discount (%)
            </label>
            <input
              type="number"
              name="adminDiscount"
              value={formData.adminDiscount}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter admin discount percentage"
            />
            <p className="text-xs text-gray-500 mt-1">
              Product-specific discount (default: 0%)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Number
            </label>
            <input
              type="text"
              name="batchNo"
              value={formData.batchNo}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter batch number"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product description"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
}
