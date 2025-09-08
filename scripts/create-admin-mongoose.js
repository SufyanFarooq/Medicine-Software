const mongoose = require('mongoose');

// Define User schema inline to avoid TypeScript import issues
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    index: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    required: true,
    enum: ['Super Admin', 'manager', 'sales_man'],
    index: true,
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  phone: {
    type: String,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  permissions: [{
    type: String,
    trim: true,
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createSuperAdmin() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crane_management_db';
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB via Mongoose');
    
    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'Super Admin' });
    
    if (existingAdmin) {
      console.log('Super Admin user already exists!');
      console.log(`Username: ${existingAdmin.username}`);
      console.log(`Role: ${existingAdmin.role}`);
      return;
    }
    
    // Create super admin user
    const superAdminUser = new User({
      username: 'superadmin',
      email: 'admin@cranemanagement.ae',
      password: 'admin123', // Will be hashed by pre-save hook
      role: 'Super Admin',
      fullName: 'System Administrator',
      phone: '+971-50-123-4567',
      department: 'IT Management',
      permissions: [
        'manage_users',
        'manage_cranes',
        'manage_projects',
        'manage_maintenance',
        'manage_finances',
        'view_reports',
        'system_settings'
      ],
      isActive: true,
    });
    
    await superAdminUser.save();
    console.log('Super Admin user created successfully!');
    console.log('Username: superadmin');
    console.log('Password: admin123');
    console.log('Role: Super Admin');
    
  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSuperAdmin();