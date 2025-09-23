import { getCollection } from '../../../../../lib/mongodb';
import { getUserPermissions } from '../../../../../lib/permissions';
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

// Calculate net salary
const calculateNetSalary = (base, allowances, deductions, overtime = 0, overtimeRate = 1.25) => {
  const totalAllowances = allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  const overtimeAmount = (overtime / 60) * (base / 8) * overtimeRate; // Convert overtime minutes to hours, then to amount
  
  const gross = base + totalAllowances + overtimeAmount;
  const net = gross - totalDeductions;
  
  return {
    base,
    totalAllowances,
    totalDeductions,
    overtimeAmount,
    gross,
    net
  };
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
    const payrollRunsCollection = await getCollection('payrollruns');
    const payrollProfilesCollection = await getCollection('payrollprofiles');
    const attendanceCollection = await getCollection('attendance');

    switch (method) {
      case 'GET':
        if (!permissions.canManagePayroll) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          period,
          employeeId,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } };
        
        if (period) filter.period = period;
        if (employeeId) filter.employeeId = employeeId;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const runs = await payrollRunsCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await payrollRunsCollection.countDocuments(filter);

        res.status(200).json({
          runs,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManagePayroll) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          period: payrollPeriod,
          employeeIds,
          overtimeRate = 1.25
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!payrollPeriod) requiredFields.push('period');
        if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
          requiredFields.push('employeeIds');
        }

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        const results = [];
        const errors = [];

        for (const employeeId of employeeIds) {
          try {
            // Get payroll profile
            const profile = await payrollProfilesCollection.findOne({
              employeeId: employeeId,
              isActive: { $ne: false }
            });

            if (!profile) {
              errors.push(`No payroll profile found for employee ${employeeId}`);
              continue;
            }

            // Get overtime for the period
            const startOfMonth = new Date(payrollPeriod + '-01');
            const endOfMonth = new Date(startOfMonth);
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            endOfMonth.setDate(0);

            const attendanceRecords = await attendanceCollection.find({
              employeeId: employeeId,
              date: { $gte: startOfMonth, $lte: endOfMonth },
              isActive: { $ne: false }
            }).toArray();

            const totalOvertime = attendanceRecords.reduce((sum, record) => sum + (record.overtimeMins || 0), 0);

            // Calculate net salary
            const calculation = calculateNetSalary(
              profile.base,
              profile.allowances,
              profile.deductions,
              totalOvertime,
              overtimeRate
            );

            // Create payroll run entry
            const payrollRun = {
              period: payrollPeriod,
              employeeId: employeeId,
              earnings: calculation.gross,
              deductions: calculation.totalDeductions,
              net: calculation.net,
              generatedAt: new Date(),
              breakdown: {
                base: profile.base,
                allowances: profile.allowances,
                deductions: profile.deductions,
                overtime: totalOvertime
              },
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: user.userId
            };

            // Use upsert to handle duplicate entries
            const result = await payrollRunsCollection.updateOne(
              { period: payrollPeriod, employeeId: employeeId },
              { $set: payrollRun },
              { upsert: true }
            );

            results.push({
              employeeId: employeeId,
              net: calculation.net,
              success: true
            });

          } catch (error) {
            errors.push(`Error processing employee ${employeeId}: ${error.message}`);
          }
        }

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'run_payroll',
          details: `Generated payroll for period ${payrollPeriod} (${employeeIds.length} employees)`,
          entityType: 'PayrollRun',
          entityId: 'batch',
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ 
          message: 'Payroll run completed',
          results: results,
          errors: errors,
          totalProcessed: results.length,
          totalErrors: errors.length
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Payroll Run API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
