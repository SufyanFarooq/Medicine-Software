const mongoose = require('mongoose');

const hrRulesSchema = new mongoose.Schema({
  // Branch-specific HR rules (no company name needed)
  
  // Duty Hours Configuration
  dutyHours: {
    startTime: {
      type: String,
      required: true,
      default: '09:00'
    },
    endTime: {
      type: String,
      required: true,
      default: '17:00'
    },
    workingDays: {
      type: [String],
      required: true,
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    workingHoursPerDay: {
      type: Number,
      required: true,
      default: 8
    },
    overtimeThreshold: {
      type: Number,
      required: true,
      default: 8
    }
  },

  // Leave Policies
  leavePolicies: {
    annualLeave: {
      totalDays: {
        type: Number,
        required: true,
        default: 21
      },
      carryForward: {
        type: Boolean,
        default: true
      },
      maxCarryForward: {
        type: Number,
        default: 5
      },
      minNoticeDays: {
        type: Number,
        default: 7
      }
    },
    sickLeave: {
      totalDays: {
        type: Number,
        required: true,
        default: 12
      },
      medicalCertificateRequired: {
        type: Boolean,
        default: true
      },
      minNoticeDays: {
        type: Number,
        default: 0
      }
    },
    casualLeave: {
      totalDays: {
        type: Number,
        required: true,
        default: 10
      },
      maxConsecutiveDays: {
        type: Number,
        default: 3
      },
      minNoticeDays: {
        type: Number,
        default: 1
      }
    },
    unpaidLeave: {
      maxDaysPerYear: {
        type: Number,
        required: true,
        default: 30
      },
      approvalRequired: {
        type: Boolean,
        default: true
      }
    }
  },

  // Weekends and Holidays
  weekends: {
    type: [String],
    required: true,
    default: ['Saturday', 'Sunday']
  },

  holidays: [{
    name: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['National', 'Religious', 'Company'],
      default: 'National'
    },
    isRecurring: {
      type: Boolean,
      default: false
    }
  }],

  // Attendance Rules
  attendanceRules: {
    lateArrivalThreshold: {
      type: Number,
      default: 15 // minutes
    },
    earlyDepartureThreshold: {
      type: Number,
      default: 15 // minutes
    },
    halfDayThreshold: {
      type: Number,
      default: 4 // hours
    },
    autoCheckout: {
      enabled: {
        type: Boolean,
        default: false
      },
      time: {
        type: String,
        default: '18:00'
      }
    },
    gracePeriod: {
      type: Number,
      default: 5 // minutes
    }
  },

  // Payroll Configuration
  payrollConfig: {
    payFrequency: {
      type: String,
      enum: ['Monthly', 'Bi-weekly', 'Weekly'],
      default: 'Monthly'
    },
    payDay: {
      type: Number,
      default: 1 // 1st of month
    },
    overtimeRate: {
      type: Number,
      default: 1.5 // 1.5x regular rate
    },
    bonusEligibility: {
      minAttendance: {
        type: Number,
        default: 95 // percentage
      }
    }
  },

  // Branch specific
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
hrRulesSchema.index({ branchId: 1, isActive: 1 });
hrRulesSchema.index({ createdAt: -1 });

module.exports = mongoose.model('HRRules', hrRulesSchema);
