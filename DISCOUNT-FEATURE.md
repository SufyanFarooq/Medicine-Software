# Admin-Configured Discount Feature

## Overview
The Medicine Software now supports admin-configured discount percentages that are applied to the entire invoice subtotal. The admin can set a global discount percentage in the settings, and this discount will be automatically applied to all invoices.

## Features

### 1. Admin Settings
- Admin can configure discount percentage in Settings page
- Default discount is 3%
- Discount is applied to the entire invoice subtotal
- Settings are stored in the database

### 2. Invoice Generation
- Admin-configured discount is automatically applied to invoice subtotal
- Discount calculation: `Subtotal × (Admin Discount Percentage / 100)`
- Final total: `Subtotal - Discount Amount`
- Invoice shows:
  - Original subtotal
  - Admin discount percentage and amount
  - Final total after discount

### 3. Database Schema
- Settings collection stores `discountPercentage` field
- Field type: Number (0-100)
- Default value: 3

## Usage

### Setting Admin Discount
1. Go to Settings page
2. Set the desired "Discount Percentage"
3. Save settings
4. Discount will be applied to all future invoices

### Generating Invoice with Admin Discount
1. Go to Invoice Generation page
2. Add medicines to invoice
3. Admin discount is automatically applied to subtotal
4. View discount amount and final total
5. Generate invoice with discounted total

## Migration
The system has been updated to use admin-configured discounts instead of individual medicine discounts. Individual medicine discount fields have been removed.

## Sample Data
The seed script includes sample medicines without individual discounts since the system now uses admin-configured discounts.

## Technical Details

### API Changes
- `GET /api/settings` - Returns admin discount percentage
- `PUT /api/settings` - Updates admin discount percentage
- Invoice generation uses admin discount instead of individual discounts

### Frontend Changes
- InvoiceTable component updated to use admin discount
- Medicine forms no longer include discount percentage field
- Medicines list no longer shows individual discounts
- Print functionality shows admin discount

### Database Changes
- Individual medicine `discountPercentage` fields removed
- Settings collection stores global discount percentage
- Migration completed for existing data 