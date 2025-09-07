import mongoose, { Document, Schema } from 'mongoose';

export interface ICrane extends Document {
  name: string;
  code: string;
  type: 'Mobile Crane' | 'All Terrain Crane' | 'Crawler Crane';
  capacity: string;
  boomLength: string;
  location: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Out of Service';
  operator?: string;
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  purchasePrice: number;
  dailyRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const craneSchema = new Schema<ICrane>({
  name: {
    type: String,
    required: [true, 'Crane name is required'],
    trim: true,
    maxlength: [200, 'Crane name cannot exceed 200 characters'],
    index: true,
  },
  code: {
    type: String,
    required: [true, 'Crane code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]+$/, 'Crane code must contain only uppercase letters and numbers'],
    index: true,
  },
  type: {
    type: String,
    required: [true, 'Crane type is required'],
    enum: {
      values: ['Mobile Crane', 'All Terrain Crane', 'Crawler Crane'],
      message: 'Crane type must be one of: Mobile Crane, All Terrain Crane, Crawler Crane',
    },
    index: true,
  },
  capacity: {
    type: String,
    required: [true, 'Crane capacity is required'],
    trim: true,
    match: [/^\d+\s*(tons?|kg|t)$/i, 'Capacity must be in format: 100 tons, 50000 kg, etc.'],
  },
  boomLength: {
    type: String,
    required: [true, 'Boom length is required'],
    trim: true,
    match: [/^\d+\s*m$/, 'Boom length must be in format: 60m, 42m, etc.'],
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
    index: true,
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Available', 'In Use', 'Maintenance', 'Out of Service'],
      message: 'Status must be one of: Available, In Use, Maintenance, Out of Service',
    },
    default: 'Available',
    index: true,
  },
  operator: {
    type: String,
    trim: true,
    maxlength: [100, 'Operator name cannot exceed 100 characters'],
  },
  lastMaintenance: {
    type: Date,
    validate: {
      validator: function(this: ICrane, value: Date) {
        return !value || value <= new Date();
      },
      message: 'Last maintenance date cannot be in the future',
    },
  },
  nextMaintenance: {
    type: Date,
    validate: {
      validator: function(this: ICrane, value: Date) {
        return !value || value > new Date();
      },
      message: 'Next maintenance date must be in the future',
    },
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative'],
    index: true,
  },
  dailyRate: {
    type: Number,
    required: [true, 'Daily rate is required'],
    min: [0, 'Daily rate cannot be negative'],
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
craneSchema.index({ status: 1, location: 1 });
craneSchema.index({ type: 1, status: 1 });
craneSchema.index({ status: 1, nextMaintenance: 1 });
craneSchema.index({ location: 1, type: 1 });

// Text search index for name and code
craneSchema.index({ name: 'text', code: 'text' });

export const Crane = mongoose.models.Crane || mongoose.model<ICrane>('Crane', craneSchema);
