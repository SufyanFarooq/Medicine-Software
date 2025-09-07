const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crane_management_db';

async function migrateToMongoose() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Connect Mongoose
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to Mongoose');
    
    // Define schemas inline for migration (since we can't import TypeScript models directly)
    console.log('\n📝 Setting up Mongoose schemas...');
    
    // User Schema
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      email: String,
      password: { type: String, required: true },
      role: { type: String, enum: ['Super Admin', 'manager', 'sales_man'], default: 'manager' },
      fullName: String,
      phone: String,
      department: String,
      permissions: [String],
      isActive: { type: Boolean, default: true },
    }, { timestamps: true });
    
    // Crane Schema
    const craneSchema = new mongoose.Schema({
      name: { type: String, required: true },
      code: { type: String, required: true, unique: true },
      type: { type: String, enum: ['Mobile Crane', 'All Terrain Crane', 'Crawler Crane'] },
      capacity: String,
      boomLength: String,
      location: String,
      status: { type: String, enum: ['Available', 'In Use', 'Maintenance', 'Out of Service'], default: 'Available' },
      operator: String,
      lastMaintenance: Date,
      nextMaintenance: Date,
      purchasePrice: Number,
      dailyRate: Number,
    }, { timestamps: true });
    
    // Customer Schema
    const customerSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: String,
      phone: String,
      address: String,
      company: String,
    }, { timestamps: true });
    
    // CraneRental Schema
    const craneRentalSchema = new mongoose.Schema({
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      craneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crane' },
      startDate: Date,
      endDate: Date,
      duration: Number,
      dailyRate: Number,
      totalAmount: Number,
      status: { type: String, enum: ['Pending', 'Active', 'Completed', 'Cancelled'], default: 'Pending' },
      notes: String,
    }, { timestamps: true });
    
    // Invoice Schema
    const invoiceSchema = new mongoose.Schema({
      invoiceNumber: { type: String, required: true, unique: true },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      craneRentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'CraneRental' },
      items: [{
        craneRentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'CraneRental' },
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      }],
      subtotal: Number,
      discount: Number,
      total: Number,
      date: Date,
      status: { type: String, enum: ['Draft', 'Sent', 'Paid', 'Overdue'], default: 'Draft' },
      dueDate: Date,
      notes: String,
    }, { timestamps: true });
    
    // Return Schema
    const returnSchema = new mongoose.Schema({
      invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      craneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crane' },
      returnDate: Date,
      reason: String,
      refundAmount: Number,
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
      notes: String,
    }, { timestamps: true });
    
    // Activity Schema
    const activitySchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      action: String,
      details: String,
      entityType: String,
      entityId: mongoose.Schema.Types.ObjectId,
    }, { timestamps: true });
    
    // Settings Schema
    const settingsSchema = new mongoose.Schema({
      currency: { type: String, default: '$' },
      discountPercentage: { type: Number, default: 3 },
      shopName: { type: String, default: 'Medical Shop' },
    }, { timestamps: true });
    
    // InventoryTransaction Schema
    const inventoryTransactionSchema = new mongoose.Schema({
      craneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Crane' },
      type: { type: String, enum: ['Rental', 'Return', 'Maintenance', 'Purchase'] },
      quantity: Number,
      date: Date,
      notes: String,
    }, { timestamps: true });
    
    // Create models
    const User = mongoose.model('User', userSchema);
    const Crane = mongoose.model('Crane', craneSchema);
    const Customer = mongoose.model('Customer', customerSchema);
    const CraneRental = mongoose.model('CraneRental', craneRentalSchema);
    const Invoice = mongoose.model('Invoice', invoiceSchema);
    const Return = mongoose.model('Return', returnSchema);
    const Activity = mongoose.model('Activity', activitySchema);
    const Settings = mongoose.model('Settings', settingsSchema);
    const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
    
    console.log('✅ Mongoose schemas created');
    
    console.log('\n🚀 Starting migration...\n');
    
    // Migrate Users
    console.log('👥 Migrating users...');
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    for (const user of users) {
      const existingUser = await User.findById(user._id);
      if (!existingUser) {
        await User.create({
          _id: user._id,
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role || 'manager',
          fullName: user.fullName,
          phone: user.phone,
          department: user.department,
          permissions: user.permissions || [],
          isActive: user.isActive !== false,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        });
        console.log(`  ✅ Created user: ${user.username}`);
      } else {
        console.log(`  ⏭️  User already exists: ${user.username}`);
      }
    }
    
    // Migrate Cranes
    console.log('\n🚁 Migrating cranes...');
    const cranesCollection = db.collection('cranes');
    const cranes = await cranesCollection.find({}).toArray();
    
    for (const crane of cranes) {
      const existingCrane = await Crane.findById(crane._id);
      if (!existingCrane) {
        await Crane.create({
          _id: crane._id,
          name: crane.name,
          code: crane.code,
          type: crane.type || 'Mobile Crane',
          capacity: crane.capacity,
          boomLength: crane.boomLength,
          location: crane.location,
          status: crane.status || 'Available',
          operator: crane.operator,
          lastMaintenance: crane.lastMaintenance,
          nextMaintenance: crane.nextMaintenance,
          purchasePrice: crane.purchasePrice || 0,
          dailyRate: crane.dailyRate || 0,
          createdAt: crane.createdAt || new Date(),
          updatedAt: crane.updatedAt || new Date(),
        });
        console.log(`  ✅ Created crane: ${crane.name} (${crane.code})`);
      } else {
        console.log(`  ⏭️  Crane already exists: ${crane.name}`);
      }
    }
    
    // Migrate Customers
    console.log('\n👤 Migrating customers...');
    const customersCollection = db.collection('customers');
    const customers = await customersCollection.find({}).toArray();
    
    for (const customer of customers) {
      const existingCustomer = await Customer.findById(customer._id);
      if (!existingCustomer) {
        await Customer.create({
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          company: customer.company,
          createdAt: customer.createdAt || new Date(),
          updatedAt: customer.updatedAt || new Date(),
        });
        console.log(`  ✅ Created customer: ${customer.name}`);
      } else {
        console.log(`  ⏭️  Customer already exists: ${customer.name}`);
      }
    }
    
    // Migrate Crane Rentals
    console.log('\n📋 Migrating crane rentals...');
    const rentalsCollection = db.collection('crane_rentals');
    const rentals = await rentalsCollection.find({}).toArray();
    
    for (const rental of rentals) {
      const existingRental = await CraneRental.findById(rental._id);
      if (!existingRental) {
        await CraneRental.create({
          _id: rental._id,
          customerId: rental.customerId,
          craneId: rental.craneId,
          startDate: rental.startDate,
          endDate: rental.endDate,
          duration: rental.duration || 1,
          dailyRate: rental.dailyRate || 0,
          totalAmount: rental.totalAmount || 0,
          status: rental.status || 'Pending',
          notes: rental.notes,
          createdAt: rental.createdAt || new Date(),
          updatedAt: rental.updatedAt || new Date(),
        });
        console.log(`  ✅ Created rental: ${rental._id}`);
      } else {
        console.log(`  ⏭️  Rental already exists: ${rental._id}`);
      }
    }
    
    // Migrate Invoices
    console.log('\n🧾 Migrating invoices...');
    const invoicesCollection = db.collection('invoices');
    const invoices = await invoicesCollection.find({}).toArray();
    
    for (const invoice of invoices) {
      const existingInvoice = await Invoice.findById(invoice._id);
      if (!existingInvoice) {
        await Invoice.create({
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          craneRentalId: invoice.craneRentalId,
          items: invoice.items || [],
          subtotal: invoice.subtotal || 0,
          discount: invoice.discount || 0,
          total: invoice.total || 0,
          date: invoice.date || new Date(),
          status: invoice.status || 'Draft',
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          createdAt: invoice.createdAt || new Date(),
          updatedAt: invoice.updatedAt || new Date(),
        });
        console.log(`  ✅ Created invoice: ${invoice.invoiceNumber}`);
      } else {
        console.log(`  ⏭️  Invoice already exists: ${invoice.invoiceNumber}`);
      }
    }
    
    // Migrate Returns
    console.log('\n↩️  Migrating returns...');
    const returnsCollection = db.collection('returns');
    const returns = await returnsCollection.find({}).toArray();
    
    for (const returnItem of returns) {
      const existingReturn = await Return.findById(returnItem._id);
      if (!existingReturn) {
        await Return.create({
          _id: returnItem._id,
          invoiceId: returnItem.invoiceId,
          customerId: returnItem.customerId,
          craneId: returnItem.craneId,
          returnDate: returnItem.returnDate || new Date(),
          reason: returnItem.reason,
          refundAmount: returnItem.refundAmount || 0,
          status: returnItem.status || 'Pending',
          notes: returnItem.notes,
          createdAt: returnItem.createdAt || new Date(),
          updatedAt: returnItem.updatedAt || new Date(),
        });
        console.log(`  ✅ Created return: ${returnItem._id}`);
      } else {
        console.log(`  ⏭️  Return already exists: ${returnItem._id}`);
      }
    }
    
    // Migrate Activities
    console.log('\n📝 Migrating activities...');
    const activitiesCollection = db.collection('activities');
    const activities = await activitiesCollection.find({}).toArray();
    
    for (const activity of activities) {
      const existingActivity = await Activity.findById(activity._id);
      if (!existingActivity) {
        await Activity.create({
          _id: activity._id,
          userId: activity.userId,
          username: activity.username,
          action: activity.action,
          details: activity.details,
          entityType: activity.entityType,
          entityId: activity.entityId,
          createdAt: activity.createdAt || new Date(),
        });
        console.log(`  ✅ Created activity: ${activity.action}`);
      } else {
        console.log(`  ⏭️  Activity already exists: ${activity.action}`);
      }
    }
    
    // Migrate Settings
    console.log('\n⚙️  Migrating settings...');
    const settingsCollection = db.collection('settings');
    const settings = await settingsCollection.find({}).toArray();
    
    if (settings.length > 0) {
      const setting = settings[0];
      const existingSettings = await Settings.findOne();
      if (!existingSettings) {
        await Settings.create({
          currency: setting.currency || '$',
          discountPercentage: setting.discountPercentage || 3,
          shopName: setting.shopName || 'Medical Shop',
          createdAt: setting.createdAt || new Date(),
          updatedAt: setting.updatedAt || new Date(),
        });
        console.log(`  ✅ Created settings`);
      } else {
        console.log(`  ⏭️  Settings already exist`);
      }
    }
    
    // Migrate Inventory Transactions
    console.log('\n📦 Migrating inventory transactions...');
    const inventoryCollection = db.collection('inventory_transactions');
    const inventoryTransactions = await inventoryCollection.find({}).toArray();
    
    for (const transaction of inventoryTransactions) {
      const existingTransaction = await InventoryTransaction.findById(transaction._id);
      if (!existingTransaction) {
        await InventoryTransaction.create({
          _id: transaction._id,
          craneId: transaction.craneId,
          type: transaction.type || 'Rental',
          quantity: transaction.quantity || 1,
          date: transaction.date || new Date(),
          notes: transaction.notes,
          createdAt: transaction.createdAt || new Date(),
          updatedAt: transaction.updatedAt || new Date(),
        });
        console.log(`  ✅ Created inventory transaction: ${transaction._id}`);
      } else {
        console.log(`  ⏭️  Inventory transaction already exists: ${transaction._id}`);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  Users: ${users.length}`);
    console.log(`  Cranes: ${cranes.length}`);
    console.log(`  Customers: ${customers.length}`);
    console.log(`  Crane Rentals: ${rentals.length}`);
    console.log(`  Invoices: ${invoices.length}`);
    console.log(`  Returns: ${returns.length}`);
    console.log(`  Activities: ${activities.length}`);
    console.log(`  Settings: ${settings.length > 0 ? 1 : 0}`);
    console.log(`  Inventory Transactions: ${inventoryTransactions.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToMongoose();
}

module.exports = { migrateToMongoose };
