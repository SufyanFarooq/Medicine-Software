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
    totalBuyingPrice: '',
    purchasePrice: '',
    sellingPrice: '',
    expiryDate: '',
    batchNo: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [existingMedicines, setExistingMedicines] = useState([]);
  const [showStockUpdate, setShowStockUpdate] = useState(false);
  const [stockUpdateData, setStockUpdateData] = useState({
    additionalQuantity: '',
    newTotalBuyingPrice: '',
    newBatchNo: '',
    supplier: ''
  });
  const [priceChangeAlert, setPriceChangeAlert] = useState('');

  useEffect(() => {
    if (medicine) {
      setFormData({
        name: medicine.name || '',
        code: medicine.code || '',
        quantity: medicine.quantity || '',
        totalBuyingPrice: medicine.totalBuyingPrice || '',
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

    // Auto-calculate purchase price when quantity or total buying price changes
    if (name === 'quantity' || name === 'totalBuyingPrice') {
      calculatePurchasePrice(name, value);
    }

    // Validate selling price when it changes
    if (name === 'sellingPrice' && value.trim()) {
      validateSellingPrice(value);
    }
  };

    const calculatePurchasePrice = (changedField, value) => {
      if (isEditing) {
        // When editing: Calculate Total Buying Price from Quantity × Purchase Price
        if (changedField === 'quantity') {
          const quantity = parseFloat(value) || 0;
          const purchasePrice = parseFloat(formData.purchasePrice) || 0;
          
          if (quantity > 0 && purchasePrice > 0) {
            const totalBuyingPrice = (quantity * purchasePrice).toFixed(2);
            setFormData(prev => ({
              ...prev,
              totalBuyingPrice: totalBuyingPrice
            }));
          }
        } else if (changedField === 'purchasePrice') {
          const purchasePrice = parseFloat(value) || 0;
          const quantity = parseFloat(formData.quantity) || 0;
          
          if (quantity > 0 && purchasePrice > 0) {
            const totalBuyingPrice = (quantity * purchasePrice).toFixed(2);
            setFormData(prev => ({
              ...prev,
              totalBuyingPrice: totalBuyingPrice
            }));
          }
          
          // Re-validate selling price when purchase price changes
          if (formData.sellingPrice) {
            validateSellingPrice(formData.sellingPrice);
          }
        }
      } else {
        // When adding new medicine: Calculate Purchase Price from Total Buying Price ÷ Quantity
        const quantity = changedField === 'quantity' ? parseFloat(value) || 0 : parseFloat(formData.quantity) || 0;
        const totalBuyingPrice = changedField === 'totalBuyingPrice' ? parseFloat(value) || 0 : parseFloat(formData.totalBuyingPrice) || 0;
        
        if (quantity > 0 && totalBuyingPrice > 0) {
          const purchasePrice = (totalBuyingPrice / quantity).toFixed(2);
          setFormData(prev => ({
            ...prev,
            purchasePrice: purchasePrice
          }));
          
          // Re-validate selling price when purchase price changes
          if (formData.sellingPrice) {
            validateSellingPrice(formData.sellingPrice);
          }
        } else {
          setFormData(prev => ({
            ...prev,
            purchasePrice: ''
          }));
        }
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

  const validateSellingPrice = (sellingPrice) => {
    const purchasePrice = parseFloat(formData.purchasePrice) || 0;
    const sellingPriceValue = parseFloat(sellingPrice) || 0;
    
    if (sellingPriceValue < purchasePrice) {
      setValidationErrors(prev => ({
        ...prev,
        sellingPrice: `Selling price cannot be less than purchase price (${purchasePrice})`
      }));
    } else {
      // Clear validation error if selling price is valid
      setValidationErrors(prev => ({
        ...prev,
        sellingPrice: ''
      }));
    }
  };

  const generateCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const code = `MED${timestamp}${random}`;
    setFormData(prev => ({ ...prev, code }));
  };

  const handleStockUpdate = async () => {
    const { additionalQuantity, newTotalBuyingPrice, newBatchNo } = stockUpdateData;
    
    if (!additionalQuantity || !newTotalBuyingPrice) {
      setError('Please provide additional quantity and total buying price');
      return;
    }

    // Check if we have a valid medicine ID
    if (!medicine || !medicine._id) {
      setError('Medicine ID not found. Please refresh the page and try again.');
      return;
    }

    // Check if we have the required form data
    if (!formData.quantity || !formData.purchasePrice) {
      setError('Current medicine data is incomplete. Please refresh the page and try again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const additionalQty = parseInt(additionalQuantity);
      const newTotalBuyingPriceValue = parseFloat(newTotalBuyingPrice);
      
      // Validate the values
      if (additionalQty <= 0) {
        throw new Error('Additional quantity must be greater than 0');
      }
      if (newTotalBuyingPriceValue <= 0) {
        throw new Error('Total buying price must be greater than 0');
      }
      
      const unitPrice = newTotalBuyingPriceValue / additionalQty;



      // Record the inflow transaction
      const transactionData = {
        medicineId: medicine._id,
        type: 'inflow',
        quantity: additionalQty,
        unitPrice: unitPrice,
        totalAmount: newTotalBuyingPriceValue,
        batchNo: newBatchNo || formData.batchNo,
        expiryDate: formData.expiryDate,
        supplier: stockUpdateData.supplier || '',
        notes: 'Stock update via form',
        referenceType: 'purchase',
        referenceId: null,
        date: new Date().toISOString()
      };

      const response = await apiRequest('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to record inventory transaction');
      }

      const result = await response.json();

      // Calculate new values BEFORE updating the medicine document
      const currentQuantity = parseInt(formData.quantity) || 0;
      const currentPurchasePrice = parseFloat(formData.purchasePrice) || 0;
      const currentTotalValue = currentQuantity * currentPurchasePrice;
      const newTotalValue = currentTotalValue + newTotalBuyingPriceValue;
      const newQuantity = currentQuantity + additionalQty;
      const newPurchasePrice = newTotalValue / newQuantity;
      const currentSellingPrice = parseFloat(formData.sellingPrice) || 0;



      // Also update the medicine document to include a transaction history
      try {
        const medicineUpdateResponse = await apiRequest(`/api/medicines/${medicine._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formData,
            quantity: newQuantity,
            purchasePrice: newPurchasePrice.toFixed(2),
            lastStockUpdate: new Date().toISOString(),
            lastStockUpdateQuantity: additionalQty,
            lastStockUpdatePrice: newTotalBuyingPriceValue,
            // Add a simple transaction record in the medicine document
            stockTransactions: [
              ...(formData.stockTransactions || []),
              {
                date: new Date().toISOString(),
                type: 'inflow',
                quantity: additionalQty,
                unitPrice: unitPrice,
                totalAmount: newTotalBuyingPriceValue,
                batchNo: newBatchNo || formData.batchNo,
                supplier: stockUpdateData.supplier || '',
                notes: 'Stock update via form'
              }
            ]
          })
        });
        
        if (!medicineUpdateResponse.ok) {
          console.error('Failed to update medicine:', await medicineUpdateResponse.json());
        }
      } catch (updateError) {
        console.error('Error updating medicine:', updateError);
      }

      // Check for price changes and alerts
      let alertMessage = '';
      let needsSellingPriceUpdate = false;

      if (Math.abs(newPurchasePrice - currentPurchasePrice) > 0.01) {
        alertMessage = `Purchase price changed from Rs${currentPurchasePrice.toFixed(2)} to Rs${newPurchasePrice.toFixed(2)}. Please review selling price.`;
        
        if (newPurchasePrice > currentSellingPrice) {
          alertMessage += ` WARNING: New purchase price (Rs${newPurchasePrice.toFixed(2)}) is higher than current selling price (Rs${currentSellingPrice.toFixed(2)}). You must update the selling price!`;
          needsSellingPriceUpdate = true;
        }
      }

      setPriceChangeAlert(alertMessage);

      // Update form data
      setFormData(prev => ({
        ...prev,
        quantity: newQuantity.toString(),
        purchasePrice: newPurchasePrice.toFixed(2),
        batchNo: newBatchNo || prev.batchNo,
        totalBuyingPrice: (parseFloat(prev.totalBuyingPrice || 0) + newTotalBuyingPriceValue).toString(),
        // Add transaction to local form data
        stockTransactions: [
          ...(prev.stockTransactions || []),
          {
            date: new Date().toISOString(),
            type: 'inflow',
            quantity: additionalQty,
            unitPrice: unitPrice,
            totalAmount: newTotalBuyingPriceValue,
            batchNo: newBatchNo || prev.batchNo,
            supplier: stockUpdateData.supplier || '',
            notes: 'Stock update via form'
          }
        ]
      }));

      // If selling price needs update, focus on it
      if (needsSellingPriceUpdate) {
        // Auto-suggest a selling price (purchase price + 20% margin)
        const suggestedSellingPrice = newPurchasePrice * 1.2;
        setFormData(prev => ({
          ...prev,
          sellingPrice: suggestedSellingPrice.toFixed(2)
        }));
      }

              // Reset stock update form
        setStockUpdateData({
          additionalQuantity: '',
          newTotalBuyingPrice: '',
          newBatchNo: '',
          supplier: ''
        });
      setShowStockUpdate(false);

      // Show success message
      alert(`Stock updated successfully! New quantity: ${newQuantity}, New purchase price: Rs${newPurchasePrice.toFixed(2)}`);

    } catch (error) {
      console.error('Stock update error:', error);
      
              // Even if inventory transaction fails, update the medicine quantity locally
        // This ensures the user doesn't lose their work
        try {
          const currentQuantity = parseInt(formData.quantity) || 0;
          const additionalQty = parseInt(stockUpdateData.additionalQuantity);
          const newQuantity = currentQuantity + additionalQty;
          
          // Update form data locally
          setFormData(prev => ({
            ...prev,
            quantity: newQuantity.toString()
          }));
          
          setError(`Inventory transaction failed: ${error.message}. However, quantity has been updated locally.`);
        } catch (localError) {
          setError(`Failed to update stock: ${error.message}`);
        }
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdateCancel = () => {
    setStockUpdateData({
      additionalQuantity: '',
      newTotalBuyingPrice: '',
      newBatchNo: ''
    });
    setShowStockUpdate(false);
    setPriceChangeAlert('');
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

      // Ensure purchase price is calculated before submission
      const submissionData = {
        ...formData,
        purchasePrice: formData.purchasePrice || '0'
      };

      const response = await apiRequest(url, {
        method,
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        // Log activity
        if (isEditing) {
          logMedicineActivity.updated(formData.name, formData.code);
        } else {
          logMedicineActivity.added(formData.name, formData.code);
          
          // For new medicines, create initial inflow transaction
          try {
            const medicineData = await response.json();
            console.log('New medicine created, creating initial inflow transaction...');
            
            const initialInflowTransaction = {
              medicineId: medicineData._id,
              type: 'inflow',
              quantity: parseFloat(formData.quantity) || 0,
              unitPrice: parseFloat(formData.purchasePrice) || 0,
              totalAmount: parseFloat(formData.totalBuyingPrice) || (parseFloat(formData.quantity) * parseFloat(formData.purchasePrice)),
              batchNo: formData.batchNo || null,
              expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
              supplier: 'Initial Stock',
              notes: 'Initial medicine creation',
              referenceType: 'creation',
              referenceId: medicineData._id,
              date: new Date().toISOString()
            };
            
            console.log('Initial inflow transaction data:', initialInflowTransaction);
            
            const inflowResponse = await apiRequest('/api/inventory', {
              method: 'POST',
              body: JSON.stringify(initialInflowTransaction)
            });
            
            if (inflowResponse.ok) {
              const inflowResult = await inflowResponse.json();
              console.log('Initial inflow transaction created:', inflowResult);
            } else {
              console.error('Failed to create initial inflow transaction:', await inflowResponse.json());
            }
          } catch (inflowError) {
            console.error('Error creating initial inflow transaction:', inflowError);
            // Continue with redirect even if inflow creation fails
          }
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
                🔄 Generate
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

        {/* Total Buying Price */}
        <div>
          <label htmlFor="totalBuyingPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Total Buying Price  *
          </label>
          <input
            type="number"
            id="totalBuyingPrice"
            name="totalBuyingPrice"
            value={formData.totalBuyingPrice}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className={`input-field ${isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            placeholder={isEditing ? "Auto-calculated" : "Enter total buying price"}
            readOnly={isEditing}
          />
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              This field is calculated automatically based on quantity and purchase price
            </p>
          )}
        </div>

        {/* Calculated Purchase Price */}
        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-2">
            Purchase Price (per unit) *
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
            className={`input-field ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            placeholder={!isEditing ? "Auto-calculated" : "Enter purchase price per unit"}
            readOnly={!isEditing}
          />
          {!isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              This field is calculated automatically based on total buying price and quantity
            </p>
          )}
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
            className={`input-field ${validationErrors.sellingPrice ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
            placeholder="Enter selling price"
          />
          {validationErrors.sellingPrice && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.sellingPrice}</p>
          )}
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
        <div >
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

      {/* Price Change Alert */}
      {priceChangeAlert && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <div>
              <strong>Price Change Alert:</strong>
              <p>{priceChangeAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Section */}
      {isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-blue-900">Inventory Management</h3>
            {!showStockUpdate && (
              <button
                type="button"
                onClick={() => setShowStockUpdate(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <span>📦</span>
                <span>Update Stock</span>
              </button>
            )}
          </div>

          {showStockUpdate && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stockUpdateData.additionalQuantity}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      additionalQuantity: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity to add"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Current stock: {formData.quantity || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Buying Price for New Stock *
                  </label>
                                    <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={stockUpdateData.newTotalBuyingPrice}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      newTotalBuyingPrice: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter total buying price"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Batch Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={stockUpdateData.newBatchNo}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      newBatchNo: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new batch number (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier (Optional)
                  </label>
                  <input
                    type="text"
                    value={stockUpdateData.supplier}
                    onChange={(e) => setStockUpdateData(prev => ({
                      ...prev,
                      supplier: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter supplier name (optional)"
                  />
                </div>
              </div>

              {/* Stock Update Preview */}
              {stockUpdateData.additionalQuantity && stockUpdateData.newTotalBuyingPrice && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Update Preview:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Current Quantity: {formData.quantity || 0} @ Rs{(parseFloat(formData.purchasePrice) || 0).toFixed(2)} each</p>
                    <p>Additional Quantity: +{stockUpdateData.additionalQuantity}</p>
                    <p className="font-medium">New Total Quantity: {(parseInt(formData.quantity) || 0) + (parseInt(stockUpdateData.additionalQuantity) || 0)}</p>
                    {stockUpdateData.newTotalBuyingPrice && stockUpdateData.additionalQuantity && (
                      <>
                        <div className="border-t pt-2 mt-2">
                          <p className="font-medium text-gray-800">Calculation Breakdown:</p>
                          <p>Previous Stock Value: {formData.quantity || 0} × Rs{(parseFloat(formData.purchasePrice) || 0).toFixed(2)} = Rs{((parseInt(formData.quantity) || 0) * (parseFloat(formData.purchasePrice) || 0)).toFixed(2)}</p>
                          <p>New Stock Value: Rs{parseFloat(stockUpdateData.newTotalBuyingPrice).toFixed(2)}</p>
                          <p>Total Stock Value: Rs{((parseInt(formData.quantity) || 0) * (parseFloat(formData.purchasePrice) || 0) + parseFloat(stockUpdateData.newTotalBuyingPrice)).toFixed(2)}</p>
                          <p className="font-medium text-blue-600">New Purchase Price (per unit): Rs{(() => {
                            const currentQty = parseInt(formData.quantity) || 0;
                            const currentPrice = parseFloat(formData.purchasePrice) || 0;
                            const additionalQty = parseInt(stockUpdateData.additionalQuantity) || 0;
                            const newBuyingPrice = parseFloat(stockUpdateData.newTotalBuyingPrice) || 0;
                            
                            const previousValue = currentQty * currentPrice;
                            const totalValue = previousValue + newBuyingPrice;
                            const totalQty = currentQty + additionalQty;
                            
                            return totalQty > 0 ? (totalValue / totalQty).toFixed(2) : '0.00';
                          })()}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleStockUpdateCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStockUpdate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <span>✅</span>
                  <span>Apply Stock Update</span>
                </button>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={loading}
        >
          ❌ Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? '⏳ Saving...' : (isEditing ? '✏️ Update Medicine' : '💊 Add Medicine')}
        </button>
      </div>
    </form>
  );
} 