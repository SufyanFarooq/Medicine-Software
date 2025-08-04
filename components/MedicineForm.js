import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiRequest } from '../lib/auth';
import { logMedicineActivity } from '../lib/activity-logger';

export default function MedicineForm({ medicine = null, isEditing = false }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    quantity: '',
    purchasePrice: '',
    sellingPrice: '',
    expiryDate: '',
    batchNo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [existingMedicines, setExistingMedicines] = useState([]);

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || '',
        code: medicine.code || '',
        quantity: medicine.quantity || '',
        purchasePrice: medicine.purchasePrice || '',
        sellingPrice: medicine.sellingPrice || '',
        expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split('T')[0] : '',
        batchNo: medicine.batchNo || '',
      });
    }
    
    // Fetch existing medicines for validation (only for new medicines)
    if (!isEditing) {
      fetchExistingMedicines();
    }
  }, [medicine, isEditing]);

  const fetchExistingMedicines = async () => {
    try {
      const response = await apiRequest('/api/medicines');
      if (response.ok) {
        const data = await response.json();
        setExistingMedicines(data);
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
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

    // Real-time validation for name and code
    if (name === 'name' && value.trim()) {
      validateName(value);
    }
    if (name === 'code' && value.trim()) {
      validateCode(value);
    }
  };

  const validateName = (name) => {
    if (!isEditing) {
      const existingMedicine = existingMedicines.find(
        med => med.name.toLowerCase() === name.toLowerCase()
      );
      if (existingMedicine) {
        setValidationErrors(prev => ({
          ...prev,
          name: 'Medicine with this name already exists'
        }));
      }
    }
  };

  const validateCode = (code) => {
    if (!isEditing) {
      const existingMedicine = existingMedicines.find(
        med => med.code === code
      );
      if (existingMedicine) {
        setValidationErrors(prev => ({
          ...prev,
          code: 'Medicine code already exists'
        }));
      }
    }
  };

  const generateCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const code = `MED${timestamp}${random}`;
    setFormData(prev => ({ ...prev, code }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for validation errors
    if (Object.keys(validationErrors).some(key => validationErrors[key])) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = isEditing ? `/api/medicines/${medicine._id}` : '/api/medicines';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Log activity
        if (isEditing) {
          logMedicineActivity.updated(formData.name, formData.code);
        } else {
          logMedicineActivity.added(formData.name, formData.code);
        }
        
        router.push('/medicines');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to save medicine');
      }
    } catch (error) {
      if (error.message === 'Unauthorized') {
        setError('Please log in to continue');
      } else {
        setError('Error connecting to database');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Medicine Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Medicine Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={`input-field ${validationErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Enter medicine name"
          />
          {validationErrors.name && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
          )}
        </div>

        {/* Medicine Code */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
            Medicine Code *
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              required
              className={`input-field ${validationErrors.code ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter or generate code"
            />
            {!isEditing && (
              <button
                type="button"
                onClick={generateCode}
                className="btn-secondary whitespace-nowrap"
              >
                Generate
              </button>
            )}
          </div>
          {validationErrors.code && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.code}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
            min="0"
            className="input-field"
            placeholder="Enter quantity"
          />
        </div>

        {/* Purchase Price */}
        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Price *
          </label>
          <input
            type="number"
            id="purchasePrice"
            name="purchasePrice"
            value={formData.purchasePrice}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="input-field"
            placeholder="Enter purchase price"
          />
        </div>

        {/* Selling Price */}
        <div>
          <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Selling Price *
          </label>
          <input
            type="number"
            id="sellingPrice"
            name="sellingPrice"
            value={formData.sellingPrice}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="input-field"
            placeholder="Enter selling price"
          />
        </div>

        {/* Expiry Date */}
        <div>
          <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
            Expiry Date *
          </label>
          <input
            type="date"
            id="expiryDate"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        {/* Batch Number */}
        <div className="sm:col-span-2">
          <label htmlFor="batchNo" className="block text-sm font-medium text-gray-700 mb-2">
            Batch Number
          </label>
          <input
            type="text"
            id="batchNo"
            name="batchNo"
            value={formData.batchNo}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter batch number (optional)"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Medicine' : 'Add Medicine')}
        </button>
      </div>
    </form>
  );
} 