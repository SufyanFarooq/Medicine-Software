import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICraneRental extends Document {
  customerId: Types.ObjectId;
  craneId: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  duration: number;
  dailyRate: number;
  totalAmount: number;
  status: 'Pending' | 'Active' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const craneRentalSchema = new Schema<ICraneRental>({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  craneId: {
    type: Schema.Types.ObjectId,
    ref: 'Crane',
    required: [true, 'Crane ID is required'],
    index: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(this: ICraneRental, value: Date) {
        return value >= new Date();
      },
      message: 'Start date must be in the future or today',
    },
    index: true,
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(this: ICraneRental, value: Date) {
        return !this.startDate || value > this.startDate;
      },
      message: 'End date must be after start date',
    },
    index: true,
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 day'],
    default: function(this: ICraneRental) {
      if (this.startDate && this.endDate) {
        const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return 1;
    },
  },
  dailyRate: {
    type: Number,
    required: [true, 'Daily rate is required'],
    min: [0, 'Daily rate cannot be negative'],
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
    default: function(this: ICraneRental) {
      return this.duration * this.dailyRate;
    },
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Pending', 'Active', 'Completed', 'Cancelled'],
      message: 'Status must be one of: Pending, Active, Completed, Cancelled',
    },
    default: 'Pending',
    index: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
craneRentalSchema.index({ customerId: 1, status: 1 });
craneRentalSchema.index({ craneId: 1, status: 1 });
craneRentalSchema.index({ startDate: 1, endDate: 1 });
craneRentalSchema.index({ status: 1, startDate: 1 });
craneRentalSchema.index({ customerId: 1, startDate: 1 });

// Virtual for checking if rental is active
craneRentalSchema.virtual('isActive').get(function(this: ICraneRental) {
  const now = new Date();
  return this.status === 'Active' && now >= this.startDate && now <= this.endDate;
});

// Virtual for checking if rental is overdue
craneRentalSchema.virtual('isOverdue').get(function(this: ICraneRental) {
  const now = new Date();
  return this.status === 'Active' && now > this.endDate;
});

// Ensure virtuals are serialized
craneRentalSchema.set('toJSON', { virtuals: true });
craneRentalSchema.set('toObject', { virtuals: true });

export const CraneRental = mongoose.models.CraneRental || mongoose.model<ICraneRental>('CraneRental', craneRentalSchema);
