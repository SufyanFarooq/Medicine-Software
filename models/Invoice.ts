import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInvoiceItem {
  craneRentalId?: Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  customerId: Types.ObjectId;
  craneRentalId?: Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  date: Date;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  dueDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  craneRentalId: {
    type: Schema.Types.ObjectId,
    ref: 'CraneRental',
  },
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative'],
    default: function(this: IInvoiceItem) {
      return this.quantity * this.unitPrice;
    },
  },
});

const invoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^INV-\d{4}-\d{6}$/, 'Invoice number must be in format: INV-YYYY-XXXXXX'],
    index: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required'],
    index: true,
  },
  craneRentalId: {
    type: Schema.Types.ObjectId,
    ref: 'CraneRental',
    index: true,
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
    default: function(this: IInvoice) {
      return this.items.reduce((sum, item) => sum + item.total, 0);
    },
  },
  discount: {
    type: Number,
    required: [true, 'Discount is required'],
    min: [0, 'Discount cannot be negative'],
    default: 0,
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative'],
    default: function(this: IInvoice) {
      return this.subtotal - this.discount;
    },
  },
  date: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now,
    index: true,
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Draft', 'Sent', 'Paid', 'Overdue'],
      message: 'Status must be one of: Draft, Sent, Paid, Overdue',
    },
    default: 'Draft',
    index: true,
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(this: IInvoice, value: Date) {
        return !value || value >= this.date;
      },
      message: 'Due date must be on or after invoice date',
    },
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
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ customerId: 1, date: 1 });
invoiceSchema.index({ status: 1, date: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ craneRentalId: 1, status: 1 });

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments({
      date: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) }
    });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for checking if invoice is overdue
invoiceSchema.virtual('isOverdue').get(function(this: IInvoice) {
  if (this.status === 'Paid' || !this.dueDate) return false;
  return new Date() > this.dueDate;
});

// Ensure virtuals are serialized
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

export const Invoice = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', invoiceSchema);
