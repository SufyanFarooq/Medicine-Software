const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'business_management';

async function createSampleMemberships() {
  let client;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);
    
    console.log('👥 Creating sample user branch memberships...');
    
    const membershipsCollection = db.collection('user_branch_memberships');
    const usersCollection = db.collection('users');
    const branchesCollection = db.collection('branches');
    
    // Clear existing memberships
    await membershipsCollection.deleteMany({});
    console.log('🧹 Cleared existing memberships');
    
    // Get all users and branches
    const users = await usersCollection.find({}).toArray();
    const branches = await branchesCollection.find({}).toArray();
    
    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }
    
    if (branches.length === 0) {
      console.log('❌ No branches found. Please create branches first.');
      return;
    }
    
    console.log(`📊 Found ${users.length} users and ${branches.length} branches`);
    
    // Create memberships
    const memberships = [];
    
    // Assign first user (usually admin) to all branches as Admin
    if (users.length > 0) {
      const adminUser = users[0];
      for (const branch of branches) {
        memberships.push({
          userId: adminUser._id,
          branchId: branch._id,
          role: 'Admin',
          permissions: {
            canManageEmployees: true,
            canManageAttendance: true,
            canManageLeaves: true,
            canManagePayroll: true,
            canManageProducts: true,
            canManageInventory: true,
            canGenerateInvoices: true,
            canViewInvoices: true,
            canManageReturns: true,
            canViewReports: true,
            canManageExpenses: true,
            canManageWarehouses: true,
            canManageTransfers: true,
            canManageBatches: true
          },
          isActive: true,
          assignedAt: new Date(),
          expiresAt: null,
          assignedBy: adminUser._id,
          notes: 'System admin - full access to all branches',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Assign second user (if exists) as FranchiseOwner of first branch
    if (users.length > 1) {
      const franchiseUser = users[1];
      const firstBranch = branches[0];
      
      memberships.push({
        userId: franchiseUser._id,
        branchId: firstBranch._id,
        role: 'FranchiseOwner',
        permissions: {
          canManageEmployees: true,
          canManageAttendance: true,
          canManageLeaves: true,
          canManagePayroll: true,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: true,
          canManageExpenses: true,
          canManageWarehouses: true,
          canManageTransfers: true,
          canManageBatches: true
        },
        isActive: true,
        assignedAt: new Date(),
        expiresAt: null,
        assignedBy: users[0]._id,
        notes: 'Franchise owner of main branch',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Assign third user (if exists) as BranchManager of second branch
    if (users.length > 2 && branches.length > 1) {
      const managerUser = users[2];
      const secondBranch = branches[1];
      
      memberships.push({
        userId: managerUser._id,
        branchId: secondBranch._id,
        role: 'BranchManager',
        permissions: {
          canManageEmployees: true,
          canManageAttendance: true,
          canManageLeaves: true,
          canManagePayroll: false,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: true,
          canManageExpenses: true,
          canManageWarehouses: true,
          canManageTransfers: true,
          canManageBatches: true
        },
        isActive: true,
        assignedAt: new Date(),
        expiresAt: null,
        assignedBy: users[0]._id,
        notes: 'Branch manager of second branch',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Assign remaining users as Staff to random branches
    for (let i = 3; i < users.length; i++) {
      const user = users[i];
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      
      memberships.push({
        userId: user._id,
        branchId: randomBranch._id,
        role: 'Staff',
        permissions: {
          canManageEmployees: false,
          canManageAttendance: true,
          canManageLeaves: false,
          canManagePayroll: false,
          canManageProducts: true,
          canManageInventory: true,
          canGenerateInvoices: true,
          canViewInvoices: true,
          canManageReturns: true,
          canViewReports: false,
          canManageExpenses: true,
          canManageWarehouses: false,
          canManageTransfers: false,
          canManageBatches: false
        },
        isActive: true,
        assignedAt: new Date(),
        expiresAt: null,
        assignedBy: users[0]._id,
        notes: 'Staff member assigned to branch',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (memberships.length > 0) {
      const result = await membershipsCollection.insertMany(memberships);
      console.log(`✅ Created ${result.insertedCount} user branch memberships`);
      
      // Display created memberships
      console.log('\n📋 Created Memberships:');
      for (const membership of memberships) {
        const user = users.find(u => u._id.toString() === membership.userId.toString());
        const branch = branches.find(b => b._id.toString() === membership.branchId.toString());
        
        console.log(`👤 ${user?.username || 'Unknown'} → 🏢 ${branch?.name || 'Unknown'} (${membership.role})`);
      }
      
      console.log('\n🎉 Sample memberships created successfully!');
      console.log('\n💡 You can now:');
      console.log('1. Login with different users to see branch-specific data');
      console.log('2. Test branch switching functionality');
      console.log('3. Verify tenant scoping in all modules');
    } else {
      console.log('⚠️ No memberships created. Need at least one user.');
    }

  } catch (error) {
    console.error('❌ Error creating sample memberships:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
createSampleMemberships();
