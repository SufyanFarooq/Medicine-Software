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
    const companiesCollection = await getCollection('companies');

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid company ID' });
    }

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const company = await companiesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!company) {
          return res.status(404).json({ message: 'Company not found' });
        }

        res.status(200).json(company);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          contact,
          country,
          phone,
          email,
          website
        } = req.body;

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!email) requiredFields.push('email');

        if (requiredFields.length > 0) {
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check if company exists
        const existingCompany = await companiesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!existingCompany) {
          return res.status(404).json({ message: 'Company not found' });
        }

        // Check for duplicate email (excluding current company)
        const duplicateCompany = await companiesCollection.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: new ObjectId(id) },
          isActive: { $ne: false }
        });
        if (duplicateCompany) {
          return res.status(400).json({ message: 'Company with this email already exists' });
        }

        const updateData = {
          name: name.trim(),
          contact: contact?.trim() || '',
          country: country?.trim() || '',
          phone: phone?.trim() || '',
          email: email.trim().toLowerCase(),
          website: website?.trim() || '',
          updatedAt: new Date(),
          updatedBy: user.userId
        };

        const result = await companiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Company not found' });
        }

        // Log activity
        const activitiesCollectionUpdate = await getCollection('activities');
        await activitiesCollectionUpdate.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'update_company',
          details: `Updated company: ${name}`,
          entityType: 'Company',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Company updated successfully' });
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const companyToDelete = await companiesCollection.findOne({ 
          _id: new ObjectId(id),
          isActive: { $ne: false }
        });

        if (!companyToDelete) {
          return res.status(404).json({ message: 'Company not found' });
        }

        // Soft delete - mark as inactive
        const deleteResult = await companiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              deletedAt: new Date(),
              deletedBy: user.userId
            }
          }
        );

        if (deleteResult.matchedCount === 0) {
          return res.status(404).json({ message: 'Company not found' });
        }

        // Log activity
        const activitiesCollectionDelete = await getCollection('activities');
        await activitiesCollectionDelete.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'delete_company',
          details: `Deleted company: ${companyToDelete.name}`,
          entityType: 'Company',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(200).json({ message: 'Company deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Company API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
