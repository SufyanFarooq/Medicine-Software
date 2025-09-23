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

// Calculate overtime minutes
const calculateOvertime = (checkIn, checkOut, thresholdHours = 8) => {
  if (!checkIn || !checkOut) return 0;
  
  const checkInTime = new Date(checkIn);
  const checkOutTime = new Date(checkOut);
  const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
  
  if (workHours > thresholdHours) {
    return Math.round((workHours - thresholdHours) * 60);
  }
  return 0;
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
    const attendanceCollection = await getCollection('attendance');

    switch (method) {
      case 'GET':
        if (!permissions.canManageAttendance) {
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
          date,
          startDate,
          endDate,
          page = 1,
          limit = 20,
          sortBy = 'date',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false }, ...branchFilter };
        
        if (queryEmployeeId) filter.employeeId = queryEmployeeId;
        if (date) {
          const targetDate = new Date(date);
          const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
          filter.date = { $gte: startOfDay, $lte: endOfDay };
        }
        if (startDate && endDate) {
          filter.date = { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
          };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const attendance = await attendanceCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await attendanceCollection.countDocuments(filter);

        res.status(200).json({
          attendance,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageAttendance) {
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
          employeeId: attendanceEmployeeId,
          date: attendanceDate,
          checkIn,
          checkOut,
          projectId,
          notes
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!attendanceEmployeeId) requiredFields.push('employeeId');
        if (!attendanceDate) requiredFields.push('date');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Calculate overtime
        const overtimeMins = calculateOvertime(checkIn, checkOut);

        const attendanceData = {
          employeeId: attendanceEmployeeId,
          date: new Date(attendanceDate),
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
          projectId: projectId || null,
          notes: notes?.trim() || '',
          overtimeMins: overtimeMins,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        // Use upsert to handle duplicate entries
        const result = await attendanceCollection.updateOne(
          { 
            employeeId: attendanceEmployeeId,
            date: new Date(attendanceDate)
          },
          { $set: attendanceData },
          { upsert: true }
        );

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_attendance',
          details: `Updated attendance for employee ${attendanceEmployeeId} on ${attendanceDate}`,
          entityType: 'Attendance',
          entityId: result.upsertedId?.toString() || 'existing',
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ 
          message: 'Attendance updated successfully',
          overtimeMins: overtimeMins
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Attendance API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
