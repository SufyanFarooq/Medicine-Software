import { connectToDatabase, getCollection } from '../../../lib/mongodb';
import { getUserPermissions } from '../../../lib/permissions';
import { ObjectId } from 'mongodb';
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
  
  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  try {
    const leadsCollection = await getCollection('leads');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) { // Using existing permission for now
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          page = 1,
          limit = 50,
          search = '',
          status: statusFilter,
          type: typeFilter,
          country: countryFilter,
          assignedTo: assignedToFilter,
          branch: branchFilter,
          source: sourceFilter,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } }; // Show active leads

        // Apply filters
        if (statusFilter) filter.status = statusFilter;
        if (typeFilter) filter.type = typeFilter;
        if (countryFilter) filter.country = countryFilter;
        if (branchFilter) filter.branch = branchFilter;
        if (sourceFilter) filter.source = sourceFilter;
        if (assignedToFilter) filter.assignedTo = new ObjectId(assignedToFilter);

        // Apply search
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { project: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        console.log('=== LEADS GET REQUEST ===');
        console.log('Filter:', JSON.stringify(filter, null, 2));
        console.log('Sort:', { [sortBy]: sortDirection });

        // Get leads with populated references
        const leads = await leadsCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const total = await leadsCollection.countDocuments(filter);

        // Populate user data for assignedTo and createdBy
        const usersCollection = await getCollection('users');
        for (let lead of leads) {
          if (lead.assignedTo) {
            const assignedUser = await usersCollection.findOne(
              { _id: new ObjectId(lead.assignedTo) },
              { projection: { username: 1, firstName: 1, lastName: 1, role: 1 } }
            );
            lead.assignedToUser = assignedUser;
          }
          
          if (lead.createdBy) {
            const createdByUser = await usersCollection.findOne(
              { _id: new ObjectId(lead.createdBy) },
              { projection: { username: 1, firstName: 1, lastName: 1, role: 1 } }
            );
            lead.createdByUser = createdByUser;
          }
        }

        console.log(`Found ${leads.length} leads out of ${total} total`);

        res.status(200).json({
          leads,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            total
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageProducts) { // Using existing permission for now
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          name,
          email,
          phone,
          type,
          branch,
          status,
          source,
          country,
          city,
          address,
          project,
          estimatedValue,
          priority,
          assignedTo,
          company,
          jobTitle,
          website,
          notes,
          tags,
          preferredContactMethod,
          followUpDate
        } = req.body;

        console.log('=== LEAD CREATE REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Validate required fields
        const requiredFields = [];
        if (!name) requiredFields.push('name');
        if (!email) requiredFields.push('email');
        if (!type) requiredFields.push('type');
        if (!country) requiredFields.push('country');

        if (requiredFields.length > 0) {
          console.log('Missing required fields:', requiredFields);
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Check for duplicate email
        const existingLead = await leadsCollection.findOne({ email: email.toLowerCase().trim() });
        if (existingLead) {
          console.log('Duplicate email found:', email);
          return res.status(400).json({ message: 'Lead with this email already exists' });
        }

        const newLead = {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || '',
          type,
          branch: branch?.trim() || '',
          status: status || 'New',
          source: source || '',
          country: country.trim(),
          city: city?.trim() || '',
          address: address?.trim() || '',
          project: project?.trim() || '',
          estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 0,
          priority: priority || 'Medium',
          assignedTo: assignedTo ? new ObjectId(assignedTo) : null,
          assignedAt: assignedTo ? new Date() : null,
          company: company?.trim() || '',
          jobTitle: jobTitle?.trim() || '',
          website: website?.trim() || '',
          notes: notes?.trim() || '',
          tags: Array.isArray(tags) ? tags : [],
          preferredContactMethod: preferredContactMethod || 'Email',
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          leadScore: 10, // Initial score for new leads
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActivityAt: new Date(),
          createdBy: new ObjectId(user.userId)
        };

        console.log('Creating lead:', JSON.stringify(newLead, null, 2));

        const result = await leadsCollection.insertOne(newLead);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'create_lead',
          details: `Created lead: ${name} (${email})`,
          entityType: 'Lead',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        console.log('Lead created successfully:', result.insertedId);
        res.status(201).json({ _id: result.insertedId, ...newLead });
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
