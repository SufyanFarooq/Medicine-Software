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
    const employeesCollection = await getCollection('employees');

    switch (method) {
      case 'GET':
        if (!permissions.canManageEmployees) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get tenant context for branch scoping
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
          search,
          department,
          status,
          branchId,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { 
          isActive: { $ne: false },
          ...branchFilter // Apply branch scoping
        };
        
        if (department) filter.department = department;
        if (status) filter.status = status;
        if (branchId) filter.branchId = branchId;
        if (search) {
          filter.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { designation: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        // Performance optimization - Use projection to limit fields
        const projection = {
          code: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          department: 1,
          designation: 1,
          branchId: 1,
          status: 1,
          joinedAt: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        };

        const employees = await employeesCollection
          .find(filter, { projection })
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await employeesCollection.countDocuments(filter);

        res.status(200).json({
          employees,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageEmployees) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get tenant context for branch scoping
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
          code,
          firstName,
          lastName,
          cnicOrPassport,
          dob,
          address,
          email,
          phone,
          department: employeeDepartment,
          designation,
          branchId: employeeBranchId,
          supervisorId,
          emergencyContact,
          documents,
          status: employeeStatus,
          joinedAt
        } = req.body;

        // Use tenant's branchId if not provided
        const finalBranchId = employeeBranchId || postTenantContext.branchId;

        // Validate required fields
        const requiredFields = [];
        if (!code) requiredFields.push('code');
        if (!firstName) requiredFields.push('firstName');
        if (!lastName) requiredFields.push('lastName');
        if (!cnicOrPassport) requiredFields.push('cnicOrPassport');
        if (!dob) requiredFields.push('dob');
        if (!address) requiredFields.push('address');
        if (!employeeDepartment) requiredFields.push('department');
        if (!designation) requiredFields.push('designation');
        if (!finalBranchId) requiredFields.push('branchId');
        if (!joinedAt) requiredFields.push('joinedAt');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check if employee code already exists
        const existingEmployee = await employeesCollection.findOne({ 
          code: code.toUpperCase(),
          isActive: { $ne: false }
        });
        if (existingEmployee) {
          return res.status(400).json({ message: 'Employee code already exists' });
        }

        const newEmployee = {
          code: code.toUpperCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          cnicOrPassport: cnicOrPassport.trim(),
          dob: new Date(dob),
          address: address.trim(),
          email: email?.trim().toLowerCase() || '',
          phone: phone?.trim() || '',
          department: employeeDepartment.trim(),
          designation: designation.trim(),
          branchId: finalBranchId,
          supervisorId: supervisorId || null,
          emergencyContact: emergencyContact || null,
          documents: documents || [],
          status: employeeStatus || 'active',
          joinedAt: new Date(joinedAt),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await employeesCollection.insertOne(newEmployee);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_employee',
          details: `Created employee: ${firstName} ${lastName} (${code})`,
          entityType: 'Employee',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newEmployee });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Employees API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
