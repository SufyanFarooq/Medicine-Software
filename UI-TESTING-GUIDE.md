# UI Testing Guide - Medicine Software

## Overview
This guide provides comprehensive testing scenarios for the Medicine Software with 50 sample medicines, 20 sample invoices, and 15 sample returns.

## Sample Data Summary

### 📦 **50 Sample Medicines** (10 Categories)
- **Pain Relief** (5): Paracetamol, Ibuprofen, Aspirin, Diclofenac, Naproxen
- **Antibiotics** (5): Amoxicillin 250mg/500mg, Ciprofloxacin, Azithromycin, Doxycycline
- **Gastrointestinal** (5): Omeprazole, Ranitidine, Lansoprazole, Metronidazole, Cimetidine
- **Allergy** (5): Cetirizine, Loratadine, Fexofenadine, Chlorpheniramine, Diphenhydramine
- **Cardiovascular** (5): Amlodipine, Lisinopril, Metoprolol, Atenolol, Losartan
- **Diabetes** (5): Metformin 500mg/850mg, Gliclazide, Glimepiride, Pioglitazone
- **Respiratory** (5): Salbutamol, Theophylline, Montelukast, Budesonide, Ipratropium
- **Psychiatric** (5): Sertraline, Fluoxetine, Escitalopram, Venlafaxine, Bupropion
- **Vitamins & Supplements** (5): Vitamin C, D3, B12, Calcium, Iron
- **Topical Medicines** (5): Betamethasone, Mupirocin, Clotrimazole, Hydrocortisone, Neomycin

### 🧾 **20 Sample Invoices**
- Random medicines with 1-5 items per invoice
- 3% admin discount applied
- Dates spread over last 30 days
- Realistic pricing and quantities

### 🔄 **15 Sample Returns**
- Various return reasons (Expired, Damaged, Wrong Medicine, etc.)
- 80% return value of selling price
- Dates spread over last 30 days

## Testing Scenarios

### 1. **Dashboard Testing**
**URL**: `http://localhost:3000/`
- ✅ View total medicines count (50)
- ✅ View low stock medicines (quantities ≤ 10)
- ✅ View expiring medicines (within 30 days)
- ✅ View total sales from invoices
- ✅ View gross profit calculations
- ✅ View recent activity feed
- ✅ Test currency symbol display

### 2. **Medicines List Testing**
**URL**: `http://localhost:3000/medicines`
- ✅ View all 50 medicines in table
- ✅ Test search functionality (by name/code)
- ✅ View quantity badges (green/yellow/red)
- ✅ View purchase and selling prices with currency
- ✅ Test pagination (if implemented)
- ✅ Test edit and delete actions

### 3. **Medicine Details Testing**
**URL**: `http://localhost:3000/medicines/[id]`
- ✅ View individual medicine details
- ✅ View all medicine information
- ✅ Test edit functionality
- ✅ Test delete functionality

### 4. **Add/Edit Medicine Testing**
**URL**: `http://localhost:3000/medicines/add` or `/medicines/[id]`
- ✅ Test form validation
- ✅ Test code generation
- ✅ Test price input with currency
- ✅ Test expiry date validation
- ✅ Test save functionality

### 5. **Invoice Generation Testing**
**URL**: `http://localhost:3000/invoices/generate`
- ✅ View all available medicines
- ✅ Test medicine search functionality
- ✅ Add medicines to invoice
- ✅ Test quantity adjustments
- ✅ View admin discount calculation (3%)
- ✅ Test invoice generation
- ✅ Test print functionality
- ✅ Test currency symbol display

### 6. **Invoices List Testing**
**URL**: `http://localhost:3000/invoices`
- ✅ View all 20 sample invoices
- ✅ View invoice statistics
- ✅ Test invoice details
- ✅ Test print functionality
- ✅ Test delete functionality
- ✅ View currency symbols

### 7. **Returns Testing**
**URL**: `http://localhost:3000/returns`
- ✅ View all 15 sample returns
- ✅ View return statistics
- ✅ Test return details
- ✅ Test currency symbols

### 8. **Add Return Testing**
**URL**: `http://localhost:3000/returns/add`
- ✅ Test medicine search
- ✅ Test invoice search
- ✅ Test return reason selection
- ✅ Test quantity validation
- ✅ Test return submission

### 9. **Settings Testing**
**URL**: `http://localhost:3000/settings`
- ✅ Test currency symbol change
- ✅ Test discount percentage change
- ✅ Test shop name change
- ✅ View user management (if admin)
- ✅ Test settings save functionality

### 10. **Search and Filter Testing**
- ✅ Test medicine search by name
- ✅ Test medicine search by code
- ✅ Test invoice search by number
- ✅ Test return search by number
- ✅ Test date filtering (if available)

## Currency Testing

### Test Different Currencies
1. Go to Settings page
2. Change currency symbol to:
   - **₹** (Indian Rupee)
   - **€** (Euro)
   - **£** (British Pound)
   - **¥** (Japanese Yen)
3. Navigate through all pages to verify currency display

## Admin Discount Testing

### Test Discount Changes
1. Go to Settings page
2. Change discount percentage to:
   - **0%** (no discount)
   - **5%** (5% discount)
   - **10%** (10% discount)
3. Generate new invoices to test discount calculation

## Data Validation Testing

### Medicine Validation
- ✅ Test required fields (name, code, quantity, prices, expiry)
- ✅ Test duplicate code validation
- ✅ Test negative quantity validation
- ✅ Test future expiry date validation

### Invoice Validation
- ✅ Test empty invoice validation
- ✅ Test quantity validation
- ✅ Test discount calculation accuracy

### Return Validation
- ✅ Test required fields validation
- ✅ Test quantity validation
- ✅ Test reason selection validation

## Performance Testing

### Large Data Set
- ✅ Test with 50 medicines (current)
- ✅ Test search performance
- ✅ Test page loading speed
- ✅ Test table rendering

## Browser Testing

### Cross-Browser Compatibility
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### Responsive Design
- ✅ Desktop view
- ✅ Tablet view
- ✅ Mobile view

## Quick Commands

### Reset Sample Data
```bash
# Reset all data
npm run seed-all

# Reset only medicines
npm run seed

# Reset only invoices
npm run seed-invoices

# Reset only returns
npm run seed-returns
```

### Start Development Server
```bash
npm run dev
```

## Expected Results

### Dashboard Stats (with 3% discount)
- **Total Medicines**: 50
- **Low Stock**: ~5-8 medicines (≤10 quantity)
- **Expiring Soon**: ~3-5 medicines (within 30 days)
- **Total Sales**: Calculated from 20 invoices
- **Gross Profit**: Sales - Purchase costs

### Currency Display
- All prices should show selected currency symbol
- No hardcoded "$" symbols should appear
- Currency should be consistent across all pages

### Admin Discount
- All invoices should show 3% discount by default
- Discount should be applied to subtotal
- Total should be: Subtotal - Discount

## Notes
- All sample data uses realistic medicine names and dosages
- Prices are set for testing purposes
- Dates are spread over the last 30 days
- Quantities vary to test different stock levels
- Return values are 80% of selling price

Happy Testing! 🎉 