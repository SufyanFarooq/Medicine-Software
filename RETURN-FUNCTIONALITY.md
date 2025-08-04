# Return Functionality in Invoice Generation

## Overview
The Medicine Software includes return functionality that handles negative quantities during invoice generation. When users set negative quantities, the system treats them as returns and processes them accordingly.

## Features

### 1. **Negative Quantity Handling**
- When quantity is negative: Medicine stays in list with red styling
- Negative quantities reduce the invoice total
- Negative quantities are added back to stock
- Return records are created for negative quantities

### 2. **Return Processing at Invoice Generation**
- Returns are created only when invoice is generated
- Negative quantities are added back to stock
- Return value includes admin discount calculation

### 3. **Visual Indicators**
- Negative quantities shown with red background and text
- Negative totals shown in red
- Clear visual distinction between positive and negative quantities

### 4. **Return Value Calculation**
- Return Value = |Negative Quantity| × Selling Price × (1 - Admin Discount %)
- Example: -5 units × $2.00 × (1 - 0.03) = $9.70

## How It Works

### **Scenario 1: Negative Quantity**
1. User adds 10 units of Paracetamol to invoice
2. User changes quantity to -3 units
3. System immediately:
   - Shows medicine with red styling
   - Reduces total by 3 × price
   - Keeps medicine in list
4. When invoice is generated:
   - Creates return for 3 units
   - Adds 3 units back to stock
   - Shows success notification

### **Scenario 2: Mixed Quantities**
1. User adds 10 units of Paracetamol (positive)
2. User adds -5 units of Ibuprofen (negative)
3. System shows:
   - Paracetamol: normal styling, positive total
   - Ibuprofen: red styling, negative total
4. When invoice is generated:
   - Creates return for 5 units of Ibuprofen
   - Adds 5 units of Ibuprofen back to stock
   - Subtracts 10 units of Paracetamol from stock

### **Scenario 3: All Negative**
1. User adds -3 units of Aspirin
2. User adds -2 units of Paracetamol
3. System shows all items in red
4. When invoice is generated:
   - Creates returns for all items
   - Adds all quantities back to stock
   - Shows multiple success notifications

## Invoice Summary Display

### **With Negative Quantities**
```
Subtotal: $15.00 (includes negative amounts)
Admin Discount (3%): -$0.45
Total: $14.55
```

### **Example with Mixed Quantities**
```
Item 1: Paracetamol 500mg × 10 = $6.00
Item 2: Ibuprofen 400mg × -3 = -$2.70
Subtotal: $3.30
Admin Discount (3%): -$0.10
Total: $3.20
```

## Return Record Details

### **Processed Return Data**
```javascript
{
  returnNumber: "RET12345678ABC",
  medicineId: "medicine_id",
  medicineName: "Paracetamol 500mg",
  medicineCode: "MED001",
  quantity: 3, // Absolute value of negative quantity
  reason: "Negative Quantity Adjustment",
  notes: "Negative quantity during invoice generation",
  returnValue: 9.70, // With discount applied
  date: "2024-01-15T10:30:00Z",
  status: "Approved",
  invoiceNumber: "INV12345678", // Linked to generated invoice
  invoiceId: "invoice_id"
}
```

## User Interface

### **Visual Feedback**
- **Red Styling**: Negative quantities have red background and text
- **Red Totals**: Negative item totals shown in red
- **Success Notifications**: When returns are processed

### **Quantity Input**
- **Range**: -999 to 999
- **Negative Allowed**: Users can enter negative values
- **Visual Feedback**: Red styling for negative values

### **Notification Examples**
```
✅ Return created: 3 units of Paracetamol 500mg ($9.70)
✅ Return created: 5 units of Ibuprofen 400mg ($14.55)
```

## Technical Implementation

### **Key Functions**
1. **updateQuantity()**: Handles negative quantities without removing items
2. **calculateSubtotal()**: Includes negative quantities in calculation
3. **handleGenerateInvoice()**: Processes negative quantities as returns
4. **Stock Updates**: Adds absolute value of negative quantities to stock

### **State Management**
- `selectedMedicines`: Current items in invoice (including negative)
- `originalQuantities`: Tracks quantities for reference
- `returnNotifications`: Success messages

### **API Integration**
- Creates return records via `/api/returns` when invoice is generated
- Updates medicine stock via `/api/medicines/[id]`
- Links returns to generated invoice
- Handles authentication and error cases

## Benefits

### **For Users**
- Simple negative quantity input
- Clear visual feedback for negative items
- Automatic return processing
- Accurate total calculations

### **For Business**
- Accurate inventory tracking
- Proper financial calculations
- Linked returns to invoices
- Audit trail for negative quantities

## Example Workflow

1. **Add Medicines**: User adds 10 units of Paracetamol
2. **Set Negative**: User changes quantity to -3
3. **Visual Feedback**: Item shows in red, total reduces
4. **Generate Invoice**: User clicks "Generate Invoice"
5. **Process Returns**: System creates return for 3 units
6. **Update Stock**: Adds 3 units back to stock
7. **Show Notifications**: Success message for return

## Error Handling

- **Network Errors**: Console logging for debugging
- **API Failures**: Graceful degradation
- **Invalid Quantities**: Input validation
- **Stock Conflicts**: Proper error messages
- **Return Processing**: Individual error handling for each return

The negative quantity functionality provides a simple way to handle returns during invoice generation! 🎉 