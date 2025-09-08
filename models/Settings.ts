import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  currency: string;
  discountPercentage: number;
  shopName: string;
  craneTypes: string[];
  locations: string[];
  paymentTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>({
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    trim: true,
    maxlength: [10, 'Currency cannot exceed 10 characters'],
    default: '$',
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%'],
    default: 3,
  },
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    maxlength: [200, 'Shop name cannot exceed 200 characters'],
    default: 'Crane Management System',
  },
  craneTypes: [{
    type: String,
    trim: true,
    maxlength: [100, 'Crane type cannot exceed 100 characters'],
  }],
  locations: [{
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
  }],
  paymentTerms: [{
    type: String,
    trim: true,
    maxlength: [100, 'Payment term cannot exceed 100 characters'],
  }],
}, {
  timestamps: true,
});

// Ensure only one settings document exists
settingsSchema.index({}, { unique: true });

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
