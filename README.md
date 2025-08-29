# 🏗️ Crane Management System - UAE

A comprehensive crane management system designed for UAE-based construction and logistics companies. This system manages crane operations, maintenance, rentals, and financial tracking across multiple emirates.

## 🌟 Features

### 🚁 Crane Management
- **Crane Inventory**: Track 20+ cranes with detailed specifications
- **Crane Types**: Mobile, Tower, Crawler, All Terrain, Truck Mounted
- **Capacity Range**: 15 tons to 3000 tons
- **Location Tracking**: Real-time crane location across UAE
- **Status Monitoring**: Available, In Use, Maintenance

### 👷‍♂️ Operations Management
- **Project Tracking**: Monitor crane usage across construction projects
- **Client Management**: UAE-based client database
- **Rental Management**: Daily/weekly/monthly rental tracking
- **Operator Assignment**: Skilled operator management

### 🔧 Maintenance & Returns
- **Scheduled Maintenance**: Preventive maintenance scheduling
- **Emergency Repairs**: Quick response to critical issues
- **Cost Tracking**: Maintenance cost management
- **Technician Management**: Skilled maintenance team

### 💰 Financial Management
- **Invoice Generation**: Professional crane rental invoices
- **Payment Tracking**: Multiple payment methods support
- **Tax Management**: UAE VAT compliance (5%)
- **Revenue Reports**: Detailed financial analytics

### 📊 Reporting & Analytics
- **Inventory Reports**: Crane utilization analysis
- **Sales Reports**: Revenue and project tracking
- **Maintenance Reports**: Equipment health monitoring
- **Performance Metrics**: Operational efficiency tracking

## 🗺️ UAE Coverage

### Emirates Served
- **Dubai**: Marina, Hills Estate, Creek Harbour, World Central
- **Abu Dhabi**: Downtown, Global Market, Corniche, Airport
- **Sharjah**: Industrial, University City, Al Qasimiya
- **Ras Al Khaimah**: Port operations
- **Fujairah**: Free Zone, Port development
- **Ajman**: Free Zone expansion
- **Umm Al Quwain**: Municipal development
- **Al Ain**: Industrial City development

### Project Types
- **High-rise Construction**: Financial districts, residential towers
- **Infrastructure**: Ports, airports, transportation hubs
- **Industrial**: Manufacturing facilities, warehouses
- **Government**: Municipal projects, university buildings
- **Commercial**: Shopping centers, office complexes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd crane-management-system

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string

# Seed the database
npm run seed

# Start development server
npm run dev
```

### Database Setup
```bash
# Create database and seed data
node scripts/seed-data.js
node scripts/create-admin.js
node scripts/seed-invoices.js
node scripts/seed-returns.js
node scripts/seed-inventory.js
```

### Default Login
- **Username**: `superadmin`
- **Password**: `admin123`
- **Role**: Super Admin

## 🏗️ System Architecture

### Frontend
- **Next.js 12**: React-based framework
- **Tailwind CSS**: Modern UI design
- **Responsive Design**: Mobile-first approach

### Backend
- **Node.js**: Server-side JavaScript
- **MongoDB**: NoSQL database
- **RESTful APIs**: Clean API design

### Database Collections
- `cranes`: Crane inventory and specifications
- `users`: System users and permissions
- `invoices`: Financial transactions
- `returns`: Maintenance and repair records
- `inventory_transactions`: Crane operations tracking
- `activities`: System audit trail

## 📱 User Roles

### Super Admin
- Full system access
- User management
- System configuration
- Financial oversight

### Manager
- Crane operations
- Project management
- Client relations
- Maintenance coordination

### Operator
- Crane operation
- Daily reporting
- Safety compliance
- Equipment checks

## 🔒 Security Features

- **JWT Authentication**: Secure login system
- **Role-based Access**: Permission management
- **Password Encryption**: bcrypt hashing
- **Session Management**: Secure user sessions

## 📈 Business Benefits

### Operational Efficiency
- **Real-time Tracking**: Monitor crane locations and status
- **Automated Billing**: Streamlined invoice generation
- **Maintenance Scheduling**: Prevent equipment downtime
- **Resource Optimization**: Maximize crane utilization

### Financial Control
- **Revenue Tracking**: Monitor rental income
- **Cost Management**: Track maintenance expenses
- **Client Billing**: Professional invoice management
- **Financial Reporting**: Business performance insights

### Compliance & Safety
- **UAE Regulations**: Local compliance requirements
- **Safety Standards**: Equipment safety monitoring
- **Certification Tracking**: License and permit management
- **Audit Trail**: Complete operation history

## 🌍 UAE Market Focus

### Localization
- **Arabic Support**: Bilingual interface (planned)
- **UAE Currency**: AED (UAE Dirham)
- **Local Timezone**: GST (Gulf Standard Time)
- **VAT Compliance**: 5% UAE VAT

### Industry Standards
- **Construction Codes**: UAE building regulations
- **Safety Standards**: International safety protocols
- **Quality Assurance**: ISO compliance
- **Environmental**: Green construction practices

## 🚧 Development Roadmap

### Phase 1 (Current)
- ✅ Basic crane management
- ✅ User authentication
- ✅ Invoice generation
- ✅ Maintenance tracking

### Phase 2 (Planned)
- 🔄 Mobile app development
- 🔄 GPS tracking integration
- 🔄 Real-time notifications
- 🔄 Advanced analytics

### Phase 3 (Future)
- 🔮 AI-powered maintenance prediction
- 🔮 IoT sensor integration
- 🔮 Blockchain for contracts
- 🔮 AR/VR training modules

## 🤝 Contributing

We welcome contributions from the UAE construction community:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

### Technical Support
- **Email**: support@cranemanagement.ae
- **Phone**: +971-50-123-4567
- **Hours**: Sunday-Thursday, 8 AM - 6 PM GST

### Business Inquiries
- **Sales**: sales@cranemanagement.ae
- **Partnerships**: partnerships@cranemanagement.ae
- **Training**: training@cranemanagement.ae

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- UAE construction industry partners
- International crane manufacturers
- Safety and compliance experts
- Development team and contributors

---

**Built with ❤️ for the UAE Construction Industry**

*Empowering construction excellence across the Emirates*
