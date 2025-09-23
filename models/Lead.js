const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Lead name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  
  // Lead Classification
  type: {
    type: String,
    required: [true, 'Lead type is required'],
    enum: {
      values: ['People', 'Company', 'Organization'],
      message: 'Type must be People, Company, or Organization'
    }
  },
  branch: {
    type: String,
    trim: true,
    maxlength: [100, 'Branch name cannot exceed 100 characters']
  },
  
  // Lead Status and Source
  status: {
    type: String,
    required: [true, 'Lead status is required'],
    enum: {
      values: ['New', 'Assigned', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      message: 'Invalid status value'
    },
    default: 'New'
  },
  source: {
    type: String,
    enum: {
      values: ['Website', 'Social Media', 'Email Campaign', 'Referral', 'Cold Call', 'Trade Show', 'Advertisement', 'Friend', 'Other'],
      message: 'Invalid source value'
    }
  },
  
  // Location Information
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [50, 'Country name cannot exceed 50 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  
  // Project Information
  project: {
    type: String,
    trim: true,
    maxlength: [500, 'Project description cannot exceed 500 characters']
  },
  
  // Lead Value and Priority
  estimatedValue: {
    type: Number,
    min: [0, 'Estimated value cannot be negative'],
    default: 0
  },
  priority: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High', 'Critical'],
      message: 'Priority must be Low, Medium, High, or Critical'
    },
    default: 'Medium'
  },
  
  // Assignment and Ownership
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  
  // Lead Lifecycle
  convertedToCustomer: {
    type: Boolean,
    default: false
  },
  convertedAt: {
    type: Date
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  
  // Additional Information
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  jobTitle: {
    type: String,
    trim: true,
    maxlength: [50, 'Job title cannot exceed 50 characters']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [100, 'Website URL cannot exceed 100 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Tags and Categories
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  
  // Communication Preferences
  preferredContactMethod: {
    type: String,
    enum: {
      values: ['Email', 'Phone', 'SMS', 'WhatsApp', 'Any'],
      message: 'Invalid contact method'
    },
    default: 'Email'
  },
  
  // Lead Quality Scoring
  leadScore: {
    type: Number,
    min: [0, 'Lead score cannot be negative'],
    max: [100, 'Lead score cannot exceed 100'],
    default: 0
  },
  
  // Activity Tracking
  lastContactedAt: {
    type: Date
  },
  lastActivityAt: {
    type: Date
  },
  followUpDate: {
    type: Date
  },
  
  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ type: 1, status: 1 });
leadSchema.index({ country: 1 });
leadSchema.index({ leadScore: -1 });
leadSchema.index({ followUpDate: 1 });

// Compound indexes
leadSchema.index({ status: 1, assignedTo: 1, createdAt: -1 });
leadSchema.index({ type: 1, country: 1, status: 1 });

// Virtual for full name display
leadSchema.virtual('displayName').get(function() {
  return this.name || this.email;
});

// Virtual for lead age (days since creation)
leadSchema.virtual('leadAge').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days since last contact
leadSchema.virtual('daysSinceLastContact').get(function() {
  if (!this.lastContactedAt) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.lastContactedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update timestamps
leadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update lastActivityAt when lead is modified
  this.lastActivityAt = new Date();
  
  // Auto-assign lead score based on status
  if (this.isModified('status')) {
    const statusScores = {
      'New': 10,
      'Assigned': 20,
      'Contacted': 30,
      'Qualified': 50,
      'Proposal': 70,
      'Negotiation': 80,
      'Closed Won': 100,
      'Closed Lost': 0
    };
    this.leadScore = Math.max(this.leadScore, statusScores[this.status] || 0);
  }
  
  next();
});

// Pre-update middleware
leadSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date(), lastActivityAt: new Date() });
  next();
});

// Instance method to convert lead to customer
leadSchema.methods.convertToCustomer = function() {
  this.convertedToCustomer = true;
  this.convertedAt = new Date();
  this.status = 'Closed Won';
  this.leadScore = 100;
  return this.save();
};

// Instance method to assign lead
leadSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  if (this.status === 'New') {
    this.status = 'Assigned';
  }
  return this.save();
};

// Instance method to update lead score
leadSchema.methods.updateScore = function(score) {
  this.leadScore = Math.max(0, Math.min(100, score));
  return this.save();
};

// Static method to get leads by status
leadSchema.statics.getByStatus = function(status, limit = 50) {
  return this.find({ status, isActive: true })
    .populate('assignedTo', 'username firstName lastName')
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get overdue follow-ups
leadSchema.statics.getOverdueFollowUps = function() {
  const now = new Date();
  return this.find({
    followUpDate: { $lt: now },
    status: { $nin: ['Closed Won', 'Closed Lost'] },
    isActive: true
  })
    .populate('assignedTo', 'username firstName lastName')
    .sort({ followUpDate: 1 });
};

// Static method to get lead statistics
leadSchema.statics.getStatistics = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$estimatedValue' },
        avgScore: { $avg: '$leadScore' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Export model
module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

