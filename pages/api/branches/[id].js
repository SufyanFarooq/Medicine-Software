import { getCollection } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
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
  const { id } = req.query;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const branchesCollection = await getCollection('branches');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid branch ID' });
    }

    const branchId = new ObjectId(id);

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const branch = await branchesCollection.findOne({ 
          _id: branchId,
          isActive: { $ne: false }
        });

        if (!branch) {
          return res.status(404).json({ message: 'Branch not found' });
        }

        res.status(200).json(branch);
        break;

      case 'PUT':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          code,
          description,
          address,
          contactInfo,
          branchType,
          manager,
          businessHours,
          currency,
          timezone,
          status
        } = req.body;

        // Check if branch exists
        const existingBranch = await branchesCollection.findOne({ 
          _id: branchId,
          isActive: { $ne: false }
        });

        if (!existingBranch) {
          return res.status(404).json({ message: 'Branch not found' });
        }

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!address?.street) requiredFields.push('address.street');
        if (!address?.city) requiredFields.push('address.city');
        if (!address?.country) requiredFields.push('address.country');
        if (!branchType) requiredFields.push('branchType');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check if branch code already exists (excluding current branch)
        if (code && code !== existingBranch.code) {
          const duplicateBranch = await branchesCollection.findOne({ 
            code: code.toUpperCase(),
            _id: { $ne: branchId },
            isActive: { $ne: false }
          });
          if (duplicateBranch) {
            return res.status(400).json({ message: 'Branch code already exists' });
          }
        }

        const updatedBranch = {
          name: name.trim(),
          code: code?.toUpperCase().trim() || existingBranch.code,
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
          branchType: branchType,
          manager: {
            name: manager?.name?.trim() || '',
            email: manager?.email?.trim().toLowerCase() || '',
            phone: manager?.phone?.trim() || ''
          },
          businessHours: businessHours || existingBranch.businessHours,
          currency: currency || existingBranch.currency,
          timezone: timezone || existingBranch.timezone,
          status: status || existingBranch.status,
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await branchesCollection.updateOne(
          { _id: branchId },
          { $set: updatedBranch }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Branch not found' });
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_branch',
          details: `Updated branch: ${name}`,
          entityType: 'Branch',
          entityId: branchId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Branch updated successfully', ...updatedBranch });
        break;

      case 'DELETE':
        if (!permissions.canManageWarehouses) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Check if branch exists
        const branchToDelete = await branchesCollection.findOne({ 
          _id: branchId,
          isActive: { $ne: false }
        });

        if (!branchToDelete) {
          return res.status(404).json({ message: 'Branch not found' });
        }

        // Check if branch has employees
        const employeesCollection = await getCollection('employees');
        const employeeCount = await employeesCollection.countDocuments({ 
          branchId: branchId,
          isActive: { $ne: false }
        });

        if (employeeCount > 0) {
          return res.status(400).json({ 
            message: `Cannot delete branch. ${employeeCount} employee(s) are assigned to this branch. Please reassign employees first.`
          });
        }

        // Soft delete
        const deleteResult = await branchesCollection.updateOne(
          { _id: branchId },
          { 
            $set: { 
              isActive: false,
              status: 'inactive',
              updatedAt: new Date(),
              updatedBy: user.userId
            }
          }
        );

        if (deleteResult.matchedCount === 0) {
          return res.status(404).json({ message: 'Branch not found' });
        }

        // Log activity
        const activitiesCollectionDelete = await getCollection('activities');
        await activitiesCollectionDelete.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_branch',
          details: `Deleted branch: ${branchToDelete.name}`,
          entityType: 'Branch',
          entityId: branchId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Branch deleted successfully' });
        break;

      default:
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Branch API error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
