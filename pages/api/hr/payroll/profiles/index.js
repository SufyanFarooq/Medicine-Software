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

export default async function handler(req, res) {
  const { method } = req;

  // Verify authentication for all methods
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const payrollProfilesCollection = await getCollection('payrollprofiles');

    switch (method) {
      case 'GET':
        if (!permissions.canManagePayroll) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          employeeId,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } };
        
        if (employeeId) filter.employeeId = employeeId;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const profiles = await payrollProfilesCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await payrollProfilesCollection.countDocuments(filter);

        res.status(200).json({
          profiles,
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
          employeeId,
          base,
          allowances,
          deductions,
          bank
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!employeeId) requiredFields.push('employeeId');
        if (!base) requiredFields.push('base');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Validate base amount
        const baseAmount = parseFloat(base);
        if (isNaN(baseAmount) || baseAmount < 0) {
          return res.status(400).json({ message: 'Base amount must be a positive number' });
        }

        const newProfile = {
          employeeId: employeeId,
          base: baseAmount,
          allowances: allowances || [],
          deductions: deductions || [],
          bank: bank || {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await payrollProfilesCollection.insertOne(newProfile);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_payroll_profile',
          details: `Created payroll profile for employee ${employeeId}`,
          entityType: 'PayrollProfile',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newProfile });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Payroll Profiles API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
