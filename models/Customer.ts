import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters'],
    index: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    sparse: true, // Allow multiple customers without email
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    sparse: true, // Allow multiple customers without phone
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters'],
  },
  company: {
    type: String,
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters'],
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
customerSchema.index({ name: 1, company: 1 });
customerSchema.index({ email: 1, phone: 1 });

// Text search index for name and company
customerSchema.index({ name: 'text', company: 'text' });

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);
