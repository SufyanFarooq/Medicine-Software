const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['annual', 'casual', 'sick', 'unpaid']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalNotes: {
    type: String,
    trim: true
  },
  approvedAt: {
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
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Pre-save middleware
leaveSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
leaveSchema.index({ employeeId: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ type: 1 });
leaveSchema.index({ isActive: 1 });
leaveSchema.index({ createdAt: -1 });

// Virtual for duration
leaveSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    return diffDays;
  }
  return null;
});

// Virtual for is current leave
leaveSchema.virtual('isCurrent').get(function() {
  const today = new Date();
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  return today >= start && today <= end;
});

// Virtual for is upcoming leave
leaveSchema.virtual('isUpcoming').get(function() {
  const today = new Date();
  const start = new Date(this.startDate);
  return today < start;
});

module.exports = mongoose.model('Leave', leaveSchema);
