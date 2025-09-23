import { getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const branchesCollection = await getCollection('branches');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          search,
          branchType,
          status,
          city,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } };
        
        if (branchType) filter.branchType = branchType;
        if (status) filter.status = status;
        if (city) filter['address.city'] = { $regex: city, $options: 'i' };
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
            { 'address.city': { $regex: search, $options: 'i' } },
            { 'contactInfo.email': { $regex: search, $options: 'i' } }
          ];
        }

        const sortDirection = sortOrder === 'desc' ? -1 : 1;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const branches = await branchesCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await branchesCollection.countDocuments(filter);

        res.status(200).json({
          branches,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          code,
          description,
          address,
          contactInfo,
          branchType: newBranchType,
          manager,
          businessHours,
          currency,
          timezone
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!address?.street) requiredFields.push('address.street');
        if (!address?.city) requiredFields.push('address.city');
        if (!address?.country) requiredFields.push('address.country');
        if (!newBranchType) requiredFields.push('branchType');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check if branch code already exists
        if (code) {
          const existingBranch = await branchesCollection.findOne({ 
            code: code.toUpperCase(),
            isActive: { $ne: false }
          });
          if (existingBranch) {
            return res.status(400).json({ message: 'Branch code already exists' });
          }
        }

        const newBranch = {
          name: name.trim(),
          code: code?.toUpperCase().trim() || null, // Will be auto-generated if not provided
          description: description?.trim() || '',
          address: {
            street: address.street.trim(),
            city: address.city.trim(),
            state: address.state?.trim() || '',
            postalCode: address.postalCode?.trim() || '',
            country: address.country.trim()
          },
          contactInfo: {
            phone: contactInfo?.phone?.trim() || '',
            email: contactInfo?.email?.trim().toLowerCase() || '',
            fax: contactInfo?.fax?.trim() || ''
          },
          branchType: newBranchType,
          manager: {
            name: manager?.name?.trim() || '',
            email: manager?.email?.trim().toLowerCase() || '',
            phone: manager?.phone?.trim() || ''
          },
          businessHours: businessHours || {
            monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
            tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
            wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
            thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
            friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
            saturday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
            sunday: { isOpen: false, openTime: '09:00', closeTime: '18:00' }
          },
          currency: currency || 'PKR',
          timezone: timezone || 'Asia/Karachi',
          status: 'active',
          isActive: true,
          isHeadOffice: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId,
          updatedBy: user.userId
        };

        const result = await branchesCollection.insertOne(newBranch);

        // Auto-create Branch Manager user for this branch
        const usersCollection = await getCollection('users');
        const membershipsCollection = await getCollection('user_branch_memberships');
        
        // Generate branch manager credentials
        const branchManagerEmail = `${newBranch.code.toLowerCase().replace('-', '')}@company.com`;
        const branchManagerPassword = `${newBranch.code.toLowerCase().replace('-', '')}123!`; // Branch code + 123!
        const branchManagerName = `${newBranch.name} Manager`;
        
        // Hash the password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(branchManagerPassword, 10);
        
        // Create branch manager user
        const branchManager = {
          username: branchManagerName.toLowerCase().replace(/\s+/g, ''),
          email: branchManagerEmail,
          password: hashedPassword,
          firstName: branchManagerName.split(' ')[0],
          lastName: branchManagerName.split(' ').slice(1).join(' ') || 'Manager',
          role: 'manager',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };
        
        const branchManagerResult = await usersCollection.insertOne(branchManager);
        
        // Create branch membership for branch manager
        const membership = {
          userId: branchManagerResult.insertedId,
          branchId: result.insertedId,
          role: 'BranchManager',
          permissions: {
            canManageEmployees: true,
            canManageAttendance: true,
            canManageLeaves: true,
            canManagePayroll: true,
            canManageProducts: true,
            canManageInventory: true,
            canGenerateInvoices: true,
            canViewInvoices: true,
            canManageReturns: true,
            canViewReports: true,
            canManageExpenses: true,
            canManageWarehouses: true,
            canManageTransfers: true,
            canManageBatches: true
          },
          isActive: true,
          assignedAt: new Date(),
          expiresAt: null,
          assignedBy: user.userId,
          notes: 'Auto-created branch manager for new branch',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await membershipsCollection.insertOne(membership);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_branch',
          details: `Created branch: ${name} with branch manager: ${branchManagerEmail}`,
          entityType: 'Branch',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ 
          _id: result.insertedId, 
          ...newBranch,
          branchManager: {
            username: branchManager.username,
            email: branchManagerEmail,
            password: branchManagerPassword,
            name: branchManagerName
          }
        });
        break;

      default:
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Branches API error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
