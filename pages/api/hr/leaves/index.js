import { getCollection } from '../../../../lib/mongodb';
import { getUserPermissions } from '../../../../lib/permissions';
import { getTenantContext, getQueryFilter } from '../../../../lib/tenant';
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
    const leavesCollection = await getCollection('leaves');

    switch (method) {
      case 'GET':
        if (!permissions.canManageLeaves) {
          return res.status(403).json({ message: 'Access denied' });
        }

        let tenantContext;
        let branchFilter;
        try {
          tenantContext = await getTenantContext(req);
          branchFilter = getQueryFilter(tenantContext);
        } catch (error) {
          if (error.message.includes('No branch selected')) {
            return res.status(400).json({ 
              message: 'No branch selected. Please select a branch first.',
              code: 'NO_BRANCH_SELECTED'
            });
          }
          if (error.message.includes('User does not have access to this branch')) {
            return res.status(403).json({ 
              message: 'You do not have access to this branch. Please select a different branch.',
              code: 'BRANCH_ACCESS_DENIED'
            });
          }
          throw error;
        }

        const { 
          employeeId: queryEmployeeId,
          status,
          type,
          startDate,
          endDate,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false }, ...branchFilter };
        
        if (queryEmployeeId) filter.employeeId = queryEmployeeId;
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (startDate && endDate) {
          filter.$or = [
            {
              startDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
            },
            {
              endDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
            },
            {
              startDate: { $lte: new Date(startDate) },
              endDate: { $gte: new Date(endDate) }
            }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const leaves = await leavesCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await leavesCollection.countDocuments(filter);

        res.status(200).json({
          leaves,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageLeaves) {
          return res.status(403).json({ message: 'Access denied' });
        }

        let postTenantContext;
        try {
          postTenantContext = await getTenantContext(req);
        } catch (error) {
          if (error.message.includes('No branch selected')) {
            return res.status(400).json({ 
              message: 'No branch selected. Please select a branch first.',
              code: 'NO_BRANCH_SELECTED'
            });
          }
          if (error.message.includes('User does not have access to this branch')) {
            return res.status(403).json({ 
              message: 'You do not have access to this branch. Please select a different branch.',
              code: 'BRANCH_ACCESS_DENIED'
            });
          }
          throw error;
        }

        const {
          employeeId: leaveEmployeeId,
          type: leaveType,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!leaveEmployeeId) requiredFields.push('employeeId');
        if (!leaveType) requiredFields.push('type');
        if (!leaveStartDate) requiredFields.push('startDate');
        if (!leaveEndDate) requiredFields.push('endDate');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Validate date range
        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate);
        if (start >= end) {
          return res.status(400).json({ message: 'End date must be after start date' });
        }

        const newLeave = {
          employeeId: leaveEmployeeId,
          type: leaveType,
          startDate: new Date(leaveStartDate),
          endDate: new Date(leaveEndDate),
          reason: reason?.trim() || '',
          status: 'pending',
          approverId: null,
          approvalNotes: '',
          approvedAt: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await leavesCollection.insertOne(newLeave);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_leave',
          details: `Created leave request for employee ${leaveEmployeeId} (${leaveType})`,
          entityType: 'Leave',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newLeave });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Leaves API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
