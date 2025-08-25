import React, { useState, useRef, useEffect } from 'react';

const BarcodeScanner = ({ onScan, placeholder = "Scan or enter barcode...", className = '' }) => {
  const [scanValue, setScanValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleScan = (value) => {
    if (value && value.trim()) {
      setError('');
      onScan(value.trim());
      setScanValue('');
    } else {
      setError('Please enter a valid barcode');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleScan(scanValue);
    }
  };

  const handleManualInput = (e) => {
    setScanValue(e.target.value);
    setError('');
  };

  const startScanning = () => {
    setIsScanning(true);
    // Focus on input for manual entry
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanValue('');
    setError('');
  };

  useEffect(() => {
    // Auto-focus when scanning starts
    if (isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isScanning]);

  return (
    <div className={`barcode-scanner ${className}`}>
      <div className="scanner-controls mb-4">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            📷 Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            ⏹️ Stop Scanning
          </button>
        )}
      </div>

      {isScanning && (
        <div className="scanner-input-section">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={handleManualInput}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-gray-400">📱</span>
            </div>
          </div>
          
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
          
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleScan(scanValue)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              Scan
            </button>
            <button
              onClick={stopScanning}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="scanner-info mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          💡 <strong>Tip:</strong> Use a barcode scanner device or manually type the barcode number and press Enter
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
