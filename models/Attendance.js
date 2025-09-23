const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  notes: {
    type: String,
    trim: true
  },
  overtimeMins: {
    type: Number,
    default: 0
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
attendanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate overtime if both checkIn and checkOut exist
  if (this.checkIn && this.checkOut) {
    const checkInTime = new Date(this.checkIn);
    const checkOutTime = new Date(this.checkOut);
    const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // Convert to hours
    
    // Standard work day is 8 hours
    const standardHours = 8;
    if (workHours > standardHours) {
      this.overtimeMins = Math.round((workHours - standardHours) * 60);
    } else {
      this.overtimeMins = 0;
    }
  }
  
  next();
});

// Indexes for performance
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ employeeId: 1 });
attendanceSchema.index({ isActive: 1 });
attendanceSchema.index({ createdAt: -1 });

// Virtual for work duration
attendanceSchema.virtual('workDuration').get(function() {
  if (this.checkIn && this.checkOut) {
    const duration = this.checkOut - this.checkIn;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  return null;
});

// Virtual for status
attendanceSchema.virtual('status').get(function() {
  if (!this.checkIn && !this.checkOut) {
    return 'absent';
  } else if (this.checkIn && !this.checkOut) {
    return 'checked-in';
  } else if (this.checkIn && this.checkOut) {
    return 'completed';
  }
  return 'unknown';
});

module.exports = mongoose.model('Attendance', attendanceSchema);
