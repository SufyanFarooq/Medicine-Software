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
    const offersCollection = await getCollection('offers');
    const leadsCollection = await getCollection('leads');
    const usersCollection = await getCollection('users');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          page = 1,
          limit = 50,
          search = '',
          status: statusFilter,
          offerType: typeFilter,
          leadId: leadIdFilter,
          sortBy = 'createdAt',
          sortOrder = 'desc'
        } = req.query;

        let filter = { isActive: { $ne: false } }; // Show active offers

        // Apply filters
        if (statusFilter) filter.status = statusFilter;
        if (typeFilter) filter.offerType = typeFilter;
        if (leadIdFilter) filter.leadId = new ObjectId(leadIdFilter);

        // Apply search
        if (search) {
          filter.$or = [
            { number: { $regex: search, $options: 'i' } },
            { title: { $regex: search, $options: 'i' } },
            { leadName: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortDirection = sortOrder === 'desc' ? -1 : 1;

        console.log('=== OFFERS GET REQUEST ===');
        console.log('Filter:', JSON.stringify(filter, null, 2));

        // Get offers
        const offers = await offersCollection
          .find(filter)
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        const totalCount = await offersCollection.countDocuments(filter);

        // Populate user data and lead data
        for (let offer of offers) {
          if (offer.createdBy) {
            const createdByUser = await usersCollection.findOne(
              { _id: new ObjectId(offer.createdBy) },
              { projection: { username: 1, firstName: 1, lastName: 1, role: 1 } }
            );
            offer.createdByUser = createdByUser;
          }
          
          if (offer.leadId) {
            const lead = await leadsCollection.findOne(
              { _id: new ObjectId(offer.leadId) },
              { projection: { name: 1, email: 1, company: 1, phone: 1 } }
            );
            offer.lead = lead;
          }
        }

        console.log(`Found ${offers.length} offers out of ${totalCount} total`);

        res.status(200).json({
          offers,
          pagination: {
            current: parseInt(page),
            pages: Math.ceil(totalCount / parseInt(limit)),
            total: totalCount
          }
        });
        break;

      case 'POST':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        const {
          leadId,
          title,
          offerType,
          description,
          items,
          currency,
          currencySymbol,
          validFrom,
          validUntil,
          minQuantity,
          maxQuantity,
          conditions,
          notes,
          status
        } = req.body;

        console.log('=== OFFER CREATE REQUEST ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Validate required fields
        const requiredFields = [];
        if (!leadId) requiredFields.push('leadId');
        if (!title) requiredFields.push('title');
        if (!offerType) requiredFields.push('offerType');
        if (!description) requiredFields.push('description');
        if (!validUntil) requiredFields.push('validUntil');
        if (!items || !Array.isArray(items) || items.length === 0) requiredFields.push('items');

        if (requiredFields.length > 0) {
          console.log('Missing required fields:', requiredFields);
          return res.status(400).json({ 
            message: `Missing required fields: ${requiredFields.join(', ')}`,
            missingFields: requiredFields
          });
        }

        // Get lead information
        const lead = await leadsCollection.findOne({ _id: new ObjectId(leadId) });
        if (!lead) {
          return res.status(400).json({ message: 'Lead not found' });
        }

        // Generate offer number
        const lastOffer = await offersCollection.findOne({}, { sort: { number: -1 } });
        const nextNumber = lastOffer ? (parseInt(lastOffer.number) + 1).toString() : '1';

        // Validate and process items
        const processedItems = items.map(item => ({
          item: item.item || '',
          description: item.description || '',
          originalPrice: parseFloat(item.originalPrice) || 0,
          offerPrice: parseFloat(item.offerPrice) || 0,
          quantity: parseInt(item.quantity) || 1,
          discountPercent: 0, // Will be calculated in pre-save
          total: 0 // Will be calculated in pre-save
        }));

        const newOffer = {
          number: nextNumber,
          title: title.trim(),
          leadId: new ObjectId(leadId),
          leadName: lead.name,
          leadEmail: lead.email,
          company: lead.company || '',
          offerType,
          description: description.trim(),
          items: processedItems,
          currency: currency || 'USD',
          currencySymbol: currencySymbol || '$',
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validUntil: new Date(validUntil),
          minQuantity: minQuantity ? parseInt(minQuantity) : null,
          maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
          conditions: conditions?.trim() || '',
          notes: notes?.trim() || '',
          status: status || 'Draft',
          originalTotal: 0, // Will be calculated in pre-save
          offerTotal: 0, // Will be calculated in pre-save
          totalDiscount: 0, // Will be calculated in pre-save
          discountPercent: 0, // Will be calculated in pre-save
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: new ObjectId(user.userId)
        };

        console.log('Creating offer:', JSON.stringify(newOffer, null, 2));

        const result = await offersCollection.insertOne(newOffer);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'create_offer',
          details: `Created offer "${title}" for ${lead.name} (${lead.email})`,
          entityType: 'Offer',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        console.log('Offer created successfully:', result.insertedId);
        res.status(201).json({ _id: result.insertedId, ...newOffer });
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

