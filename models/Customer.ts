import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  emirate?: string;
  businessType?: string;
  vatNumber?: string;
  tradeLicense?: string;
  lpoNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [200, 'Company name cannot exceed 200 characters'],
    index: true,
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person is required'],
    trim: true,
    maxlength: [200, 'Contact person name cannot exceed 200 characters'],
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
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters'],
  },
  emirate: {
    type: String,
    trim: true,
    maxlength: [50, 'Emirate cannot exceed 50 characters'],
  },
  businessType: {
    type: String,
    trim: true,
    maxlength: [100, 'Business type cannot exceed 100 characters'],
  },
  vatNumber: {
    type: String,
    trim: true,
    match: [/^\d{14}$/, 'VAT number must be exactly 14 digits'],
    sparse: true,
  },
  tradeLicense: {
    type: String,
    trim: true,
    maxlength: [100, 'Trade license cannot exceed 100 characters'],
  },
  lpoNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'LPO number cannot exceed 100 characters'],
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
customerSchema.index({ companyName: 1, contactPerson: 1 });
customerSchema.index({ email: 1, phone: 1 });
customerSchema.index({ vatNumber: 1 });
customerSchema.index({ lpoNumber: 1 });

// Text search index for company name and contact person
customerSchema.index({ companyName: 'text', contactPerson: 'text' });

export const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);
