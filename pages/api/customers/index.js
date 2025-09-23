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
    const customersCollection = await getCollection('customers');

    switch (method) {
      case 'GET':
        if (!permissions.canGenerateInvoices && !permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const { 
          customerType: customerTypeFilter,
          search,
          activeOnly = 'true',
          creditLimitExceeded,
          page = 1,
          limit = 50,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = {};
        
        if (activeOnly === 'true') filter.isActive = true;
        if (customerTypeFilter) filter.customerType = customerTypeFilter;
        if (creditLimitExceeded === 'true') {
          filter.$expr = { $gt: ['$currentBalance', '$creditLimit'] };
        }
        if (search) {
          filter.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        const customers = await customersCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await customersCollection.countDocuments(filter);

        res.status(200).json({
          customers,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canGenerateInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          customerType,
          firstName,
          lastName,
          companyName,
          email,
          phone,
          address,
          creditLimit,
          paymentTerms
        } = req.body;

        // Validate required fields based on customer type
        if (!customerType) {
          return res.status(400).json({ message: 'Customer type is required' });
        }

        if (customerType === 'individual') {
          if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required for individual customers' });
          }
        } else if (customerType === 'business') {
          if (!companyName) {
            return res.status(400).json({ message: 'Company name is required for business customers' });
          }
        }

        // Check for duplicate email if provided
        if (email) {
          const existingEmail = await customersCollection.findOne({ 
            email: email.toLowerCase(),
            isActive: true 
          });
          if (existingEmail) {
            return res.status(400).json({ message: 'Email already exists' });
          }
        }

        // Check for duplicate phone if provided
        if (phone) {
          const existingPhone = await customersCollection.findOne({ 
            phone: phone.trim(),
            isActive: true 
          });
          if (existingPhone) {
            return res.status(400).json({ message: 'Phone number already exists' });
          }
        }

        const newCustomer = {
          customerType,
          firstName: firstName?.trim() || '',
          lastName: lastName?.trim() || '',
          companyName: companyName?.trim() || '',
          email: email?.toLowerCase().trim() || '',
          phone: phone?.trim() || '',
          address: address || {},
          creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
          currentBalance: 0,
          paymentTerms: paymentTerms || 'cash',
          loyaltyPoints: 0,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.userId
        };

        const result = await customersCollection.insertOne(newCustomer);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: user.userId,
          username: user.username,
          action: 'create_customer',
          details: `Created customer: ${companyName || `${firstName} ${lastName}`}`,
          entityType: 'Customer',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({ _id: result.insertedId, ...newCustomer });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}