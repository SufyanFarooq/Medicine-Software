# Queue Invoice Functionality

## Overview
The Medicine Software now includes a Queue Invoice system that allows salesmen to handle multiple customers simultaneously. When a customer leaves to get more items, the salesman can save the current invoice to a queue and start a new invoice for the next customer.

## Features

### 1. **Save Current Invoice to Queue**
- Save incomplete invoices with all items and quantities
- Automatic customer naming (Customer 1, Customer 2, etc.)
- Preserves invoice number and timestamp
- Clear current invoice for new customer

### 2. **Load Invoice from Queue**
- Continue any pending invoice from the queue
- Automatically saves current invoice before loading
- Restores all items, quantities, and invoice number
- Removes loaded invoice from queue

### 3. **Delete Pending Invoices**
- Remove invoices from queue if customer doesn't return
- Clean up abandoned invoices
- Confirmation notifications

### 4. **Visual Queue Management**
- Grid display of all pending invoices
- Shows customer name, invoice number, time, items count, and total
- Color-coded notifications for different actions

## How It Works

### **Scenario 1: Customer Leaves for More Items**
1. **Salesman starts invoice** for Customer A
2. **Customer A adds items** (Paracetamol, Ibuprofen)
3. **Customer A leaves** to get more items
4. **Salesman clicks "Save to Queue"**
   - Invoice saved with Customer A's items
   - Current invoice cleared
   - New invoice number generated
5. **Salesman starts new invoice** for Customer B
6. **Customer A returns**
7. **Salesman clicks "Continue"** on Customer A's invoice
   - Customer A's invoice loaded
   - Customer B's invoice saved to queue

### **Scenario 2: Customer Doesn't Return**
1. **Invoice saved to queue** for Customer A
2. **Customer A doesn't return** after some time
3. **Salesman clicks "Delete"** on Customer A's invoice
4. **Invoice removed** from queue permanently

### **Scenario 3: Multiple Customers**
1. **Customer A**: Saves invoice, leaves
2. **Customer B**: Saves invoice, leaves  
3. **Customer C**: Current invoice
4. **Queue shows**: Customer A and Customer B pending
5. **Salesman can**: Continue any customer or delete abandoned invoices

## User Interface

### **Queue Display**
```
┌─────────────────────────────────────┐
│ Pending Invoices (2)                │
│ [Save Current to Queue]             │
├─────────────────────────────────────┤
│ Customer 1        #INV12345678ABC   │
│ 2:30 PM          3 items $15.60     │
│ [Continue] [Delete]                 │
├─────────────────────────────────────┤
│ Customer 2        #INV12345678DEF   │
│ 2:45 PM          1 item  $5.20      │
│ [Continue] [Delete]                 │
└─────────────────────────────────────┘
```

### **Action Buttons**
- **Generate Invoice**: Finalize current invoice
- **Save to Queue**: Save current invoice for later
- **Print Invoice**: Print current invoice

### **Notifications**
- **Info (Blue)**: Invoice saved to queue
- **Success (Green)**: Invoice loaded from queue
- **Warning (Yellow)**: Invoice deleted from queue

## Technical Implementation

### **State Management**
```javascript
const [pendingInvoices, setPendingInvoices] = useState([]);
const [currentInvoiceId, setCurrentInvoiceId] = useState(null);
```

### **Key Functions**
1. **saveCurrentInvoiceToQueue()**: Saves current invoice to queue
2. **loadInvoiceFromQueue()**: Loads invoice from queue
3. **deletePendingInvoice()**: Removes invoice from queue

### **Invoice Data Structure**
```javascript
{
  id: "pending_1234567890",
  invoiceNumber: "INV12345678ABC",
  items: [...selectedMedicines],
  originalQuantities: {...},
  timestamp: 1234567890,
  customerName: "Customer 1"
}
```

## Benefits

### **For Salesmen**
- **Handle multiple customers** efficiently
- **No lost invoices** when customers leave
- **Quick switching** between customers
- **Clean queue management**

### **For Business**
- **Improved customer service**
- **Reduced waiting times**
- **Better inventory management**
- **Accurate invoice tracking**

## Workflow Examples

### **Busy Pharmacy Scenario**
1. **Customer A**: Adds 5 items, leaves to check prices
2. **Customer B**: Adds 3 items, needs consultation
3. **Customer C**: Quick purchase, generates invoice
4. **Customer A returns**: Continue invoice, add more items
5. **Customer B ready**: Continue invoice, generate

### **Customer Service Scenario**
1. **Customer A**: Complex order, needs time to decide
2. **Customer B**: Simple order, generates invoice quickly
3. **Customer C**: Emergency purchase, priority
4. **Customer A decides**: Continue invoice, finalize

## Best Practices

### **When to Save to Queue**
- Customer leaves to get more items
- Customer needs time to decide
- Customer goes to check prices
- Complex order requiring consultation

### **When to Delete from Queue**
- Customer doesn't return after reasonable time
- Customer changes mind
- Duplicate or incorrect invoice
- System cleanup

### **Queue Management**
- **Monitor queue size** (don't let it get too large)
- **Regular cleanup** of old invoices
- **Clear communication** with customers
- **Backup important invoices**

## Error Handling

- **Empty Queue**: No invoices to save/load
- **Invalid Invoice**: Corrupted invoice data
- **Network Issues**: Queue persistence
- **Memory Management**: Large queue handling

The Queue Invoice functionality provides efficient customer management for busy pharmacies! 🎉 