# Discount Percentage Feature

## Overview
The Medicine Software now supports individual discount percentages for each medicine. This allows you to set specific discounts on medicines and have them automatically applied during invoice generation.

## Features

### 1. Medicine Form
- Added "Discount Percentage (%)" field to the medicine form
- Accepts values from 0 to 100 with decimal precision
- Optional field - defaults to 0% if not specified

### 2. Medicine List
- New "Discount %" column in the medicines table
- Shows discount percentage with green badge if > 0%
- Shows "-" if no discount is set

### 3. Invoice Generation
- Individual medicine discounts are automatically applied
- Each medicine's discount is calculated separately
- Total discount is the sum of all individual medicine discounts
- Invoice shows:
  - Original price per item
  - Individual discount percentage
  - Final price after discount
  - Total discount amount
  - Final total

### 4. Database Schema
- Added `discountPercentage` field to medicines collection
- Field type: Number (0-100)
- Default value: 0

## Usage

### Adding Discount to Medicine
1. Go to Medicines page
2. Click "Add Medicine" or edit existing medicine
3. Fill in the "Discount Percentage (%)" field
4. Save the medicine

### Generating Invoice with Discounts
1. Go to Invoice Generation page
2. Add medicines to invoice
3. Discounts are automatically applied
4. View individual discounts in the invoice items
5. Generate invoice with discounted totals

## Migration
If you have existing medicines without discount percentages:
```bash
npm run add-discount
```

This will add a default 0% discount to all existing medicines.

## Sample Data
The seed script includes sample medicines with various discount percentages:
- Paracetamol: 5% discount
- Ibuprofen: 0% discount
- Amoxicillin: 10% discount
- Omeprazole: 0% discount
- Cetirizine: 3% discount

## Technical Details

### API Changes
- `POST /api/medicines` - Now accepts `discountPercentage` field
- `PUT /api/medicines/[id]` - Now accepts `discountPercentage` field
- Invoice generation includes individual medicine discounts

### Frontend Changes
- MedicineForm component updated with discount field
- InvoiceTable component updated to handle individual discounts
- Medicines list updated to display discount information
- Print functionality updated to show discount details

### Database Changes
- New field: `discountPercentage` (Number, default: 0)
- Migration script available for existing data 