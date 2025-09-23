const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

async function addSuperadminToBranches() {
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

    // Get superadmin user
    const superadmin = await usersCollection.findOne({ username: 'superadmin' });
    if (!superadmin) {
      console.log('❌ Superadmin user not found!');
      return;
    }

    console.log(`👤 Found superadmin: ${superadmin.username}`);

    // Get all branches
    const branches = await branchesCollection.find({}).toArray();
    console.log(`📋 Found ${branches.length} branches`);

    // Check existing memberships
    const existingMemberships = await membershipsCollection.find({
      userId: superadmin._id
    }).toArray();

    console.log(`🔍 Superadmin already has ${existingMemberships.length} branch memberships`);

    // Add superadmin to all branches
    for (const branch of branches) {
      // Check if membership already exists
      const existingMembership = existingMemberships.find(m => 
        m.branchId.toString() === branch._id.toString()
      );

      if (existingMembership) {
        console.log(`⚠️  Superadmin already has access to ${branch.name}, skipping...`);
        continue;
      }

      // Create membership
      const membership = {
        userId: superadmin._id,
        branchId: branch._id,
        role: 'Admin',
        permissions: {
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: true,
          canManageUsers: true,
          canManageSettings: true,
          canManageSuppliers: true,
          canManagePurchaseOrders: true,
          canManageWarehouses: true,
          canManageTransfers: true,
          canManageBatches: true,
          canManageHR: true,
          canManageEmployees: true,
          canManageAttendance: true,
          canManageLeaves: true,
          canManagePayroll: true
        },
        isActive: true,
        assignedAt: new Date(),
        assignedBy: superadmin._id,
        notes: `Superadmin access to ${branch.name}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await membershipsCollection.insertOne(membership);
      console.log(`✅ Added superadmin to ${branch.name} as Admin`);
    }

    console.log('\n🎉 Superadmin now has access to all branches!');
    console.log('\n📋 How to test:');
    console.log('1. Login as superadmin');
    console.log('2. You should see branch picker with all branches');
    console.log('3. Select any branch to access that branch');

    client.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addSuperadminToBranches();
