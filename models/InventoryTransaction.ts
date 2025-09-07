import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInventoryTransaction extends Document {
  craneId: Types.ObjectId;
  type: 'Rental' | 'Return' | 'Maintenance' | 'Purchase';
  quantity: number;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>({
  craneId: {
    type: Schema.Types.ObjectId,
    ref: 'Crane',
    required: [true, 'Crane ID is required'],
    index: true,
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: ['Rental', 'Return', 'Maintenance', 'Purchase'],
      message: 'Transaction type must be one of: Rental, Return, Maintenance, Purchase',
    },
    index: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now,
    index: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
inventoryTransactionSchema.index({ craneId: 1, type: 1 });
inventoryTransactionSchema.index({ craneId: 1, date: -1 });
inventoryTransactionSchema.index({ type: 1, date: -1 });
inventoryTransactionSchema.index({ date: -1 }); // For time-based queries

export const InventoryTransaction = mongoose.models.InventoryTransaction || mongoose.model<IInventoryTransaction>('InventoryTransaction', inventoryTransactionSchema);
