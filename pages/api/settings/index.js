import dbConnect from '../../../lib/db';
import mongoose from 'mongoose';

// Force fresh model import
const SettingsSchema = new mongoose.Schema({
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
}, {
  timestamps: true,
});

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    if (req.method === 'GET') {
      // Get current settings
      let settings = await Settings.findOne().lean();
      
      if (!settings) {
        // Create default settings if none exist
        settings = await Settings.create({
          currency: '$',
          discountPercentage: 3,
          shopName: 'Crane Management System',
          craneTypes: ['Mobile Crane', 'Tower Crane', 'Crawler Crane', 'All Terrain Crane', 'Truck Mounted Crane'],
          locations: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'],
          paymentTerms: ['Net 30', 'Net 15', 'Net 7', 'Cash on Delivery', 'Advance Payment', '50% Advance, 50% on Completion'],
        });
      } else {
        // Add missing fields to existing settings
        if (!settings.craneTypes) {
          settings.craneTypes = ['Mobile Crane', 'Tower Crane', 'Crawler Crane', 'All Terrain Crane', 'Truck Mounted Crane'];
        }
        if (!settings.locations) {
          settings.locations = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'];
        }
        if (!settings.paymentTerms) {
          settings.paymentTerms = ['Net 30', 'Net 15', 'Net 7', 'Cash on Delivery', 'Advance Payment', '50% Advance, 50% on Completion'];
        }
        // Update the document with missing fields
        await Settings.findByIdAndUpdate(settings._id, {
          craneTypes: settings.craneTypes,
          locations: settings.locations,
          paymentTerms: settings.paymentTerms
        });
      }
      
      res.status(200).json(settings);
    } else if (req.method === 'PUT') {
      const { currency, discountPercentage, shopName, craneTypes, locations, paymentTerms } = req.body;
      
      // Validate input
      if (discountPercentage !== undefined && (discountPercentage < 0 || discountPercentage > 100)) {
        return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
      }
      
      // Update or create settings
      const updateData = {
        ...(currency !== undefined && { currency }),
        ...(discountPercentage !== undefined && { discountPercentage }),
        ...(shopName !== undefined && { shopName }),
        ...(craneTypes !== undefined && { craneTypes }),
        ...(locations !== undefined && { locations }),
        ...(paymentTerms !== undefined && { paymentTerms }),
      };
      
      // Use native MongoDB driver to ensure fields are updated
      const db = mongoose.connection.db;
      await db.collection('settings').findOneAndUpdate(
        {},
        { $set: updateData },
        { 
          returnDocument: 'after',
          upsert: true 
        }
      );
      
      // Get the updated settings
      const settings = await db.collection('settings').findOne({});
      
      if (!settings) {
        return res.status(500).json({ message: 'Failed to update settings' });
      }
      
      res.status(200).json(settings);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 