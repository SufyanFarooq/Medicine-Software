import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReturn extends Document {
  invoiceId: Types.ObjectId;
  customerId: Types.ObjectId;
  craneId: Types.ObjectId;
  returnDate: Date;
  reason: string;
  refundAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const returnSchema = new Schema<IReturn>({
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice ID is required'],
    index: true,
  },
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
  returnDate: {
    type: Date,
    required: [true, 'Return date is required'],
    default: Date.now,
    index: true,
  },
  reason: {
    type: String,
    required: [true, 'Return reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters'],
  },
  refundAmount: {
    type: Number,
    required: [true, 'Refund amount is required'],
    min: [0, 'Refund amount cannot be negative'],
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Pending', 'Approved', 'Rejected'],
      message: 'Status must be one of: Pending, Approved, Rejected',
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
returnSchema.index({ customerId: 1, status: 1 });
returnSchema.index({ customerId: 1, returnDate: 1 });
returnSchema.index({ status: 1, returnDate: 1 });
returnSchema.index({ invoiceId: 1, status: 1 });
returnSchema.index({ craneId: 1, status: 1 });

export const Return = mongoose.models.Return || mongoose.model<IReturn>('Return', returnSchema);
