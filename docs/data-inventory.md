# Data Inventory - Crane Management System

## Overview
This document outlines all MongoDB collections, their structure, and relationships found in the codebase.

## Collections

### 1. Users
**Purpose**: System users and authentication
**Key Fields**:
- `_id`: ObjectId (primary key)
- `username`: String (unique, required)
- `email`: String (optional)
- `password`: String (hashed, required)
- `role`: String (enum: 'Super Admin', 'manager', 'sales_man')
- `fullName`: String (optional)
- `phone`: String (optional)
- `department`: String (optional)
- `permissions`: Array of Strings
- `isActive`: Boolean (default: true)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: Referenced by activities, invoices, returns

### 2. Cranes
**Purpose**: Crane inventory and specifications
**Key Fields**:
- `_id`: ObjectId (primary key)
- `name`: String (required)
- `code`: String (unique, required)
- `type`: String (enum: 'Mobile Crane', 'All Terrain Crane', 'Crawler Crane')
- `capacity`: String (e.g., '100 tons')
- `boomLength`: String (e.g., '60m')
- `location`: String
- `status`: String (enum: 'Available', 'In Use', 'Maintenance', 'Out of Service')
- `operator`: String
- `lastMaintenance`: Date
- `nextMaintenance`: Date
- `purchasePrice`: Number
- `dailyRate`: Number
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: Referenced by crane_rentals, invoices

### 3. Customers
**Purpose**: Customer information and management
**Key Fields**:
- `_id`: ObjectId (primary key)
- `name`: String (required)
- `email`: String (optional)
- `phone`: String (optional)
- `address`: String (optional)
- `company`: String (optional)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: Referenced by crane_rentals, invoices, returns

### 4. Crane Rentals
**Purpose**: Crane rental contracts and bookings
**Key Fields**:
- `_id`: ObjectId (primary key)
- `customerId`: ObjectId (ref: customers)
- `craneId`: ObjectId (ref: cranes)
- `startDate`: Date (required)
- `endDate`: Date (required)
- `duration`: Number (days)
- `dailyRate`: Number
- `totalAmount`: Number
- `status`: String (enum: 'Pending', 'Active', 'Completed', 'Cancelled')
- `notes`: String (optional)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: References customers, cranes; referenced by invoices

### 5. Invoices
**Purpose**: Customer invoices and billing
**Key Fields**:
- `_id`: ObjectId (primary key)
- `invoiceNumber`: String (unique, required)
- `customerId`: ObjectId (ref: customers)
- `craneRentalId`: ObjectId (ref: crane_rentals, optional)
- `items`: Array of Objects (crane rentals or other services)
- `subtotal`: Number
- `discount`: Number
- `total`: Number
- `date`: Date
- `status`: String (enum: 'Draft', 'Sent', 'Paid', 'Overdue')
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: References customers, crane_rentals; referenced by returns

### 6. Returns
**Purpose**: Return and refund records
**Key Fields**:
- `_id`: ObjectId (primary key)
- `invoiceId`: ObjectId (ref: invoices)
- `customerId`: ObjectId (ref: customers)
- `craneId`: ObjectId (ref: cranes)
- `returnDate`: Date
- `reason`: String
- `refundAmount`: Number
- `status`: String (enum: 'Pending', 'Approved', 'Rejected')
- `notes`: String (optional)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: References invoices, customers, cranes

### 7. Inventory Transactions
**Purpose**: Stock movement and inventory tracking
**Key Fields**:
- `_id`: ObjectId (primary key)
- `craneId`: ObjectId (ref: cranes)
- `type`: String (enum: 'Rental', 'Return', 'Maintenance', 'Purchase')
- `quantity`: Number
- `date`: Date
- `notes`: String (optional)
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: References cranes

### 8. Activities
**Purpose**: User activity logging and audit trail
**Key Fields**:
- `_id`: ObjectId (primary key)
- `userId`: ObjectId (ref: users)
- `username`: String
- `action`: String (enum: various actions)
- `details`: String
- `entityType`: String (optional)
- `entityId`: ObjectId (optional)
- `createdAt`: Date

**Relationships**: References users

### 9. Settings
**Purpose**: System configuration and business settings
**Key Fields**:
- `_id`: ObjectId (primary key)
- `currency`: String (default: '$')
- `discountPercentage`: Number (default: 3)
- `shopName`: String (default: 'Medical Shop')
- `createdAt`: Date
- `updatedAt`: Date

**Relationships**: None (singleton collection)

## Current Issues Identified

1. **Mixed Connection Patterns**: Some routes use `connectToDatabase()`, others use `getCollection()`
2. **No Schema Validation**: Collections are created ad-hoc without proper schemas
3. **Embedded vs Referenced Data**: Some routes embed full documents instead of using ObjectId refs
4. **Missing Indexes**: No compound indexes for frequent queries
5. **No TypeScript**: All code is JavaScript without type safety
6. **Duplicate Connection Logic**: Multiple connection functions across files

## Recommended Refactoring

1. **Centralize Connection**: Single Mongoose singleton in `lib/db.ts`
2. **Create Schemas**: Proper Mongoose schemas for all collections
3. **Use ObjectId Refs**: Replace embedded documents with proper references
4. **Add Indexes**: Compound indexes for common query patterns
5. **TypeScript Migration**: Convert to TypeScript for better type safety
6. **Validation**: Add Zod schemas for request validation
