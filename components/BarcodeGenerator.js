import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeGenerator = ({ 
  value, 
  format = 'CODE128', 
  width = 2, 
  height = 100, 
  displayValue = true,
  fontSize = 20,
  margin = 10,
  className = ''
}) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format: format,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: margin,
          background: '#ffffff',
          lineColor: '#000000',
          valid: (valid) => {
            if (!valid) {
              console.warn('Invalid barcode value:', value);
            }
          }
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, margin]);

  if (!value) {
    return (
      <div className={`barcode-placeholder ${className}`}>
        <p className="text-gray-500 text-center">No barcode value provided</p>
      </div>
    );
  }

  return (
    <div className={`barcode-container ${className}`}>
      <svg ref={barcodeRef} className="barcode-svg" />
      {displayValue && (
        <div className="barcode-value text-center mt-2 text-sm font-medium">
          {value}
        </div>
      )}
    </div>
  );
};

export default BarcodeGenerator;
