# Dynamic Currency Symbol Feature

## Overview
The Medicine Software now supports dynamic currency symbols that can be configured by the admin. All price displays throughout the application will automatically use the selected currency symbol.

## Features

### 1. Admin Currency Configuration
- Admin can set currency symbol in Settings page
- Available currencies: $, €, £, ₹, ¥, ₽, ₩, ₪, ₨, ₦
- Currency symbol is stored in database settings
- Default currency: $ (US Dollar)

### 2. Global Currency Display
- All price displays use the configured currency symbol
- Currency is automatically applied to:
  - Medicine prices (purchase and selling)
  - Invoice totals and subtotals
  - Return values
  - Dashboard statistics
  - All financial calculations

### 3. Automatic Currency Loading
- Currency symbol is loaded when the app starts
- Settings are fetched in Layout component
- Global currency is set for the entire application

## Usage

### Setting Currency Symbol
1. Go to Settings page
2. Select desired currency from dropdown
3. Save settings
4. Currency symbol will be applied throughout the app

### Available Currencies
- **$** - US Dollar
- **€** - Euro
- **£** - British Pound
- **₹** - Indian Rupee
- **¥** - Japanese Yen
- **₽** - Russian Ruble
- **₩** - Korean Won
- **₪** - Israeli Shekel
- **₨** - Pakistani Rupee
- **₦** - Nigerian Naira

## Technical Implementation

### Currency Utility Functions
```javascript
// Set global currency
setCurrency('€');

// Get current currency
getCurrency(); // Returns '€'

// Format price with currency
formatCurrency(100.50); // Returns '€100.50'
formatPrice(100.50); // Returns '€100.50'
```

### Files Updated
- `lib/currency.js` - Currency utility functions
- `components/Layout.js` - Loads settings and sets global currency
- `components/InvoiceTable.js` - Uses formatCurrency for all price displays
- `pages/medicines/index.js` - Medicine list with formatted prices
- `pages/invoices/index.js` - Invoice list with formatted totals
- `pages/returns/index.js` - Returns list with formatted values
- `pages/index.js` - Dashboard with formatted statistics
- All other components and pages with price displays

### Database Changes
- Settings collection stores `currency` field
- Default value: '$'
- Currency is loaded on app startup

## Example
If admin sets currency to "₹" (Indian Rupee):
- Medicine price: ₹1.00 (instead of $1.00)
- Invoice total: ₹150.00 (instead of $150.00)
- Dashboard stats: ₹2,500.00 (instead of $2,500.00)

The currency symbol is now dynamically applied throughout the entire application! 🎉 