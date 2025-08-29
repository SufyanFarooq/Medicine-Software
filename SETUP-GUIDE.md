# 🏗️ CRAIN MANAGEMENT SYSTEM - UAE SETUP GUIDE

## Overview
This is a complete business management system designed specifically for Crain Management UAE operations. It provides comprehensive inventory management, invoicing, and business tracking capabilities.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Git (optional)

### 2. Installation
```bash
# Clone or download the project
cd "Medicine Software"

# Install dependencies
npm install

# Build the application
npm run build
```

### 3. Database Setup
```bash
# Create admin user
npm run create-admin

# Seed sample data
npm run seed-all
```

### 4. Start Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🗄️ Database Configuration

**Database Name:** `crain_management_uae`
**Connection:** `mongodb://localhost:27017`

### Collections Created:
- `medicines` - Business inventory items
- `users` - System users and permissions
- `invoices` - Customer invoices and sales
- `returns` - Return and refund records
- `inventory_transactions` - Stock movement history
- `activities` - User activity logs

## 💰 Currency & Business Settings

**Default Currency:** UAE Dirham (AED)
**Default Discount:** 3%
**Business Name:** Crain Management UAE

### Supported Currencies:
- AED (UAE Dirham) - **Default**
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- INR (Indian Rupee)
- And more...

## 🔧 Configuration

### Environment Variables
No environment variables required - all settings are stored in the database.

### MongoDB Connection
The system automatically connects to local MongoDB instance. Ensure MongoDB is running before starting the application.

## 📱 Features

### Core Business Functions:
- **Inventory Management** - Track stock levels, prices, and item details
- **Invoice Generation** - Create professional invoices with automatic calculations
- **Sales Tracking** - Monitor sales performance and trends
- **Returns Management** - Handle customer returns and refunds
- **User Management** - Role-based access control
- **Activity Logging** - Track all system activities

### UAE Business Features:
- **AED Currency Support** - Native UAE Dirham support
- **Local Business Focus** - Designed for UAE business operations
- **Offline Operation** - Works without internet connection
- **Data Export** - Export reports in Excel format
- **Printable Invoices** - Professional invoice printing

## 🚀 Deployment

### Local Development
```bash
npm run dev
# Access at: http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Windows Users
Double-click `Medicine Software.bat` to start the application.

## 🔒 Security

- **Local Database** - No external connections
- **User Authentication** - Role-based access control
- **Activity Logging** - Track all user actions
- **Data Validation** - Input sanitization and validation

## 📊 Reports & Analytics

- **Sales Reports** - Daily, weekly, monthly sales data
- **Inventory Reports** - Stock levels and movement
- **Profit Analysis** - Gross and net profit calculations
- **Export Functionality** - Excel export for external analysis

## 🆘 Support

For technical support or questions:
1. Check the troubleshooting section in README.txt
2. Verify MongoDB is running
3. Check console for error messages
4. Ensure all dependencies are installed

## 📝 License

This system is designed for Crain Management UAE business operations.
Built with Next.js, MongoDB, and Tailwind CSS.

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Business:** Crain Management UAE 