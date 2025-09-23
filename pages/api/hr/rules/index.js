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
    const hrRulesCollection = await getCollection('hr_rules');

    switch (method) {
      case 'GET':
        if (!permissions.canManageHRRules) {
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

        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const rules = await hrRulesCollection
          .find({ isActive: { $ne: false }, ...branchFilter })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await hrRulesCollection.countDocuments({ 
          isActive: { $ne: false }, 
          ...branchFilter 
        });

        res.status(200).json({
          rules,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageHRRules) {
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
          dutyHours,
          leavePolicies,
          weekends,
          holidays,
          attendanceRules,
          payrollConfig
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!dutyHours) requiredFields.push('dutyHours');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        const newRules = {
          dutyHours: {
            startTime: dutyHours.startTime || '09:00',
            endTime: dutyHours.endTime || '17:00',
            workingDays: dutyHours.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHoursPerDay: dutyHours.workingHoursPerDay || 8,
            overtimeThreshold: dutyHours.overtimeThreshold || 8
          },
          leavePolicies: {
            annualLeave: {
              totalDays: leavePolicies?.annualLeave?.totalDays || 21,
              carryForward: leavePolicies?.annualLeave?.carryForward || true,
              maxCarryForward: leavePolicies?.annualLeave?.maxCarryForward || 5,
              minNoticeDays: leavePolicies?.annualLeave?.minNoticeDays || 7
            },
            sickLeave: {
              totalDays: leavePolicies?.sickLeave?.totalDays || 12,
              medicalCertificateRequired: leavePolicies?.sickLeave?.medicalCertificateRequired || true,
              minNoticeDays: leavePolicies?.sickLeave?.minNoticeDays || 0
            },
            casualLeave: {
              totalDays: leavePolicies?.casualLeave?.totalDays || 10,
              maxConsecutiveDays: leavePolicies?.casualLeave?.maxConsecutiveDays || 3,
              minNoticeDays: leavePolicies?.casualLeave?.minNoticeDays || 1
            },
            unpaidLeave: {
              maxDaysPerYear: leavePolicies?.unpaidLeave?.maxDaysPerYear || 30,
              approvalRequired: leavePolicies?.unpaidLeave?.approvalRequired || true
            }
          },
          weekends: weekends || ['Saturday', 'Sunday'],
          holidays: holidays || [],
          attendanceRules: {
            lateArrivalThreshold: attendanceRules?.lateArrivalThreshold || 15,
            earlyDepartureThreshold: attendanceRules?.earlyDepartureThreshold || 15,
            halfDayThreshold: attendanceRules?.halfDayThreshold || 4,
            autoCheckout: {
              enabled: attendanceRules?.autoCheckout?.enabled || false,
              time: attendanceRules?.autoCheckout?.time || '18:00'
            },
            gracePeriod: attendanceRules?.gracePeriod || 5
          },
          payrollConfig: {
            payFrequency: payrollConfig?.payFrequency || 'Monthly',
            payDay: payrollConfig?.payDay || 1,
            overtimeRate: payrollConfig?.overtimeRate || 1.5,
            bonusEligibility: {
              minAttendance: payrollConfig?.bonusEligibility?.minAttendance || 95
            }
          },
          branchId: postTenantContext.branchId,
          isActive: true,
          createdBy: user.userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Use upsert to create or update HR rules for this branch
        const result = await hrRulesCollection.updateOne(
          { branchId: postTenantContext.branchId, isActive: { $ne: false } },
          { 
            $set: {
              ...newRules,
              updatedAt: new Date(),
              updatedBy: user.userId
            }
          },
          { upsert: true }
        );

        // Get the document ID (either existing or newly created)
        const documentId = result.upsertedId || (await hrRulesCollection.findOne({ branchId: postTenantContext.branchId, isActive: { $ne: false } }))?._id;

        // Log activity
        const activitiesCollection = await getCollection('activities');
        const action = result.upsertedId ? 'create_hr_rules' : 'update_hr_rules';
        const details = result.upsertedId ? 'Created HR rules for branch' : 'Updated HR rules for branch';
        
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: action,
          details: details,
          entityType: 'HRRules',
          entityId: documentId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        const responseMessage = result.upsertedId ? 'HR rules created successfully' : 'HR rules updated successfully';
        res.status(201).json({ 
          _id: documentId, 
          ...newRules,
          message: responseMessage,
          isNew: !!result.upsertedId
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('HR Rules API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
