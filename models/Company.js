import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  contact: {
    type: String,
    trim: true,
    maxlength: 100
  },
  country: {
    type: String,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    unique: true
  },
  website: {
    type: String,
    trim: true,
    maxlength: 200
  },
  
  // Status and Activity
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'companies'
});

// Indexes for performance
CompanySchema.index({ name: 1 });
CompanySchema.index({ email: 1 });
CompanySchema.index({ country: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ createdAt: -1 });

// Compound indexes
CompanySchema.index({ isActive: 1, country: 1 });
CompanySchema.index({ name: 1, isActive: 1 });

// Text index for search
CompanySchema.index({ 
  name: 'text', 
  contact: 'text', 
  email: 'text', 
  country: 'text' 
});

// Virtual for full name
CompanySchema.virtual('fullName').get(function() {
  return this.name;
});

// Pre-save middleware
CompanySchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Instance methods
CompanySchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static methods
CompanySchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

CompanySchema.statics.findByCountry = function(country) {
  return this.find({ country, isActive: true });
};

CompanySchema.statics.searchCompanies = function(searchTerm) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { contact: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { country: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  });
};

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
