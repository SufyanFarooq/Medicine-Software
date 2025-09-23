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
    const companiesCollection = await getCollection('companies');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          search,
          country: countryFilter,
          page = 1,
          limit = 20,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } }; // Show active companies
        
        if (countryFilter) filter.country = countryFilter;
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { contact: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { website: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        // Performance optimization - Use projection to limit fields
        const projection = {
          name: 1,
          contact: 1,
          country: 1,
          phone: 1,
          email: 1,
          website: 1,
          isActive: 1,
          createdAt: 1,
          updatedAt: 1
        };

        const companies = await companiesCollection
          .find(filter, { projection })
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await companiesCollection.countDocuments(filter);

        res.status(200).json({
          companies,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
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

        // Check for duplicate email
        const existingCompany = await companiesCollection.findOne({ 
          email: email.toLowerCase(),
          isActive: { $ne: false }
        });
        if (existingCompany) {
          return res.status(400).json({ message: 'Company with this email already exists' });
        }

        const newCompany = {
          name: name.trim(),
          contact: contact?.trim() || '',
          country: country?.trim() || '',
          phone: phone?.trim() || '',
          email: email.trim().toLowerCase(),
          website: website?.trim() || '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await companiesCollection.insertOne(newCompany);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_company',
          details: `Created company: ${name}`,
          entityType: 'Company',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newCompany });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Companies API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
