import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IActivity extends Document {
  userId: Types.ObjectId;
  username: string;
  action: string;
  details: string;
  entityType?: string;
  entityId?: Types.ObjectId;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    maxlength: [100, 'Username cannot exceed 100 characters'],
    index: true,
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters'],
    index: true,
  },
  details: {
    type: String,
    required: [true, 'Details are required'],
    trim: true,
    maxlength: [1000, 'Details cannot exceed 1000 characters'],
  },
  entityType: {
    type: String,
    trim: true,
    maxlength: [50, 'Entity type cannot exceed 50 characters'],
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });
activitySchema.index({ createdAt: -1 }); // For time-based queries

// Text search index for action and details
activitySchema.index({ action: 'text', details: 'text' });

export const Activity = mongoose.models.Activity || mongoose.model<IActivity>('Activity', activitySchema);
