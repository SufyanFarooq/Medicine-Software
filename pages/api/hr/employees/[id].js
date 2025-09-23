import { getCollection } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserPermissions } from '../../../../lib/permissions';
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
    const employeesCollection = await getCollection('employees');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid employee ID' });
    }

    switch (method) {
      case 'GET':
        if (!permissions.canManageEmployees) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const employee = await employeesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!employee) {
          return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json(employee);
        break;

      case 'PUT':
        if (!permissions.canManageEmployees) {
          return res.status(403).json({ message: 'Access denied' });
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
          department,
          designation,
          branchId,
          supervisorId,
          emergencyContact,
          documents,
          status,
          joinedAt,
          leftAt
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!code) requiredFields.push('code');
        if (!firstName) requiredFields.push('firstName');
        if (!lastName) requiredFields.push('lastName');
        if (!cnicOrPassport) requiredFields.push('cnicOrPassport');
        if (!dob) requiredFields.push('dob');
        if (!address) requiredFields.push('address');
        if (!department) requiredFields.push('department');
        if (!designation) requiredFields.push('designation');
        if (!branchId) requiredFields.push('branchId');
        if (!joinedAt) requiredFields.push('joinedAt');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check if employee exists
        const existingEmployee = await employeesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!existingEmployee) {
          return res.status(404).json({ message: 'Employee not found' });
        }

        // Check for duplicate code (excluding current employee)
        const duplicateEmployee = await employeesCollection.findOne({ 
          code: code.toUpperCase(),
          _id: { $ne: new ObjectId(id) },
          isActive: { $ne: false }
        });
        if (duplicateEmployee) {
          return res.status(400).json({ message: 'Employee code already exists' });
        }

        const updateData = {
          code: code.toUpperCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          cnicOrPassport: cnicOrPassport.trim(),
          dob: new Date(dob),
          address: address.trim(),
          email: email?.trim().toLowerCase() || '',
          phone: phone?.trim() || '',
          department: department.trim(),
          designation: designation.trim(),
          branchId: branchId,
          supervisorId: supervisorId || null,
          emergencyContact: emergencyContact || null,
          documents: documents || [],
          status: status || 'active',
          joinedAt: new Date(joinedAt),
          leftAt: leftAt ? new Date(leftAt) : null,
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await employeesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Employee not found' });
        }

        // Log activity
        const activitiesCollectionUpdate = await getCollection('activities');
        await activitiesCollectionUpdate.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_employee',
          details: `Updated employee: ${firstName} ${lastName} (${code})`,
          entityType: 'Employee',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Employee updated successfully' });
        break;

      case 'DELETE':
        if (!permissions.canManageEmployees) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const employeeToDelete = await employeesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!employeeToDelete) {
          return res.status(404).json({ message: 'Employee not found' });
        }

        // Soft delete - mark as inactive
        const deleteResult = await employeesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              status: 'inactive',
              leftAt: new Date(),
              deletedAt: new Date(),
              deletedBy: user.userId
            }
          }
        );

        if (deleteResult.matchedCount === 0) {
          return res.status(404).json({ message: 'Employee not found' });
        }

        // Log activity
        const activitiesCollectionDelete = await getCollection('activities');
        await activitiesCollectionDelete.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_employee',
          details: `Deleted employee: ${employeeToDelete.firstName} ${employeeToDelete.lastName} (${employeeToDelete.code})`,
          entityType: 'Employee',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Employee deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Employee API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
