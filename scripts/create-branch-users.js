const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

async function createBranchUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    const client = await MongoClient.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    const membershipsCollection = db.collection('user_branch_memberships');
    const branchesCollection = db.collection('branches');

    // Get all branches
    const branches = await branchesCollection.find({}).toArray();
    console.log('📋 Available Branches:');
    branches.forEach((branch, index) => {
      console.log(`${index + 1}. ${branch.name} (${branch.code}) - ${branch.branchType}`);
    });

    // Create users for each branch
    const branchUsers = [
      {
        username: 'lahore_manager',
        password: 'lahore123',
        firstName: 'Lahore',
        lastName: 'Manager',
        email: 'lahore.manager@company.com',
        role: 'manager',
        branchCode: 'BO-001'
      },
      {
        username: 'islamabad_manager',
        password: 'islamabad123',
        firstName: 'Islamabad',
        lastName: 'Manager',
        email: 'islamabad.manager@company.com',
        role: 'manager',
        branchCode: 'BO-002'
      },
      {
        username: 'karachi_warehouse',
        password: 'karachi123',
        firstName: 'Karachi',
        lastName: 'Warehouse',
        email: 'karachi.warehouse@company.com',
        role: 'manager',
        branchCode: 'WH-001'
      },
      {
        username: 'rawalpindi_staff',
        password: 'rawalpindi123',
        firstName: 'Rawalpindi',
        lastName: 'Staff',
        email: 'rawalpindi.staff@company.com',
        role: 'staff',
        branchCode: 'RS-001'
      }
    ];

    console.log('\n👥 Creating branch-specific users...');

    for (const userData of branchUsers) {
      // Check if user already exists
      const existingUser = await usersCollection.findOne({ username: userData.username });
      if (existingUser) {
        console.log(`⚠️  User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const newUser = {
        username: userData.username,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userResult = await usersCollection.insertOne(newUser);
      console.log(`✅ Created user: ${userData.username} (${userData.role})`);

      // Find the branch
      const branch = await branchesCollection.findOne({ code: userData.branchCode });
      if (!branch) {
        console.log(`❌ Branch ${userData.branchCode} not found, skipping membership...`);
        continue;
      }

      // Create branch membership
      const membership = {
        userId: userResult.insertedId,
        branchId: branch._id,
        role: userData.role === 'manager' ? 'BranchManager' : 'Staff',
        permissions: {
          canManageProducts: userData.role === 'manager',
          canManageInventory: userData.role === 'manager',
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: userData.role === 'manager',
          canViewReports: true,
          canManageExpenses: userData.role === 'manager',
          canManageWarehouses: userData.role === 'manager',
          canManageTransfers: userData.role === 'manager',
          canManageBatches: userData.role === 'manager',
          canManageHR: userData.role === 'manager',
          canManageEmployees: userData.role === 'manager',
          canManageAttendance: userData.role === 'manager',
          canManageLeaves: userData.role === 'manager',
          canManagePayroll: userData.role === 'manager'
        },
        isActive: true,
        assignedAt: new Date(),
        assignedBy: new ObjectId('68becbc813520de619a38dfe'), // superadmin
        notes: `Auto-created ${userData.role} for ${branch.name}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await membershipsCollection.insertOne(membership);
      console.log(`🔗 Added ${userData.username} to ${branch.name} as ${membership.role}`);
    }

    console.log('\n🎉 Branch users created successfully!');
    console.log('\n📋 Login Credentials:');
    branchUsers.forEach(user => {
      console.log(`👤 ${user.username} / ${user.password} → ${user.branchCode}`);
    });

    client.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createBranchUsers();
