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
  const { id } = req.query;
  
  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const permissions = getUserPermissions(user.role);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid lead ID' });
  }

  try {
    const leadsCollection = await getCollection('leads');
    const activitiesCollection = await getCollection('activities');

    switch (method) {
      case 'GET':
        if (!permissions.canViewInvoices) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get lead from leads collection
        const lead = await leadsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!lead) {
          return res.status(404).json({ message: 'Lead not found' });
        }

        // Populate user data
        const usersCollection = await getCollection('users');
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

        res.status(200).json(lead);
        break;

      case 'PUT':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get existing lead
        const existingLead = await leadsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!existingLead) {
          return res.status(404).json({ message: 'Lead not found' });
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
          followUpDate,
          leadScore
        } = req.body;

        console.log('=== LEAD UPDATE REQUEST ===');
        console.log('Lead ID:', id);
        console.log('Request body:', JSON.stringify(req.body, null, 2));

        // Check for duplicate email (excluding current lead)
        if (email && email.toLowerCase().trim() !== existingLead.email) {
          const duplicateEmail = await leadsCollection.findOne({ 
            email: email.toLowerCase().trim(),
            _id: { $ne: new ObjectId(id) }
          });
          if (duplicateEmail) {
            return res.status(400).json({ message: 'Lead with this email already exists' });
          }
        }

        const updateData = {
          ...(name !== undefined && { name: name.trim() }),
          ...(email !== undefined && { email: email.toLowerCase().trim() }),
          ...(phone !== undefined && { phone: phone?.trim() || '' }),
          ...(type !== undefined && { type }),
          ...(branch !== undefined && { branch: branch?.trim() || '' }),
          ...(status !== undefined && { status }),
          ...(source !== undefined && { source }),
          ...(country !== undefined && { country: country.trim() }),
          ...(city !== undefined && { city: city?.trim() || '' }),
          ...(address !== undefined && { address: address?.trim() || '' }),
          ...(project !== undefined && { project: project?.trim() || '' }),
          ...(estimatedValue !== undefined && { estimatedValue: parseFloat(estimatedValue) || 0 }),
          ...(priority !== undefined && { priority }),
          ...(company !== undefined && { company: company?.trim() || '' }),
          ...(jobTitle !== undefined && { jobTitle: jobTitle?.trim() || '' }),
          ...(website !== undefined && { website: website?.trim() || '' }),
          ...(notes !== undefined && { notes: notes?.trim() || '' }),
          ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
          ...(preferredContactMethod !== undefined && { preferredContactMethod }),
          ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
          ...(leadScore !== undefined && { leadScore: Math.max(0, Math.min(100, parseInt(leadScore))) }),
          updatedAt: new Date(),
          lastActivityAt: new Date(),
          updatedBy: new ObjectId(user.userId)
        };

        // Handle assignment changes
        if (assignedTo !== undefined) {
          if (assignedTo) {
            updateData.assignedTo = new ObjectId(assignedTo);
            if (!existingLead.assignedTo) {
              updateData.assignedAt = new Date();
            }
          } else {
            updateData.assignedTo = null;
            updateData.assignedAt = null;
          }
        }

        // Auto-update lead score based on status change
        if (status && status !== existingLead.status) {
          const statusScores = {
            'New': 10,
            'Assigned': 20,
            'Contacted': 30,
            'Qualified': 50,
            'Proposal': 70,
            'Negotiation': 80,
            'Closed Won': 100,
            'Closed Lost': 0
          };
          updateData.leadScore = Math.max(existingLead.leadScore || 0, statusScores[status] || 0);
        }

        console.log('Update data:', JSON.stringify(updateData, null, 2));

        // Update lead
        const result = await leadsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          return res.status(400).json({ message: 'No changes made to lead' });
        }

        // Log activity
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'update_lead',
          details: `Updated lead: ${updateData.name || existingLead.name} (${updateData.email || existingLead.email})`,
          entityType: 'Lead',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        // Get updated lead
        const updatedLead = await leadsCollection.findOne({ _id: new ObjectId(id) });
        console.log('Lead updated successfully');
        res.status(200).json(updatedLead);
        break;

      case 'DELETE':
        if (!permissions.canManageProducts) {
          return res.status(403).json({ message: 'Access denied' });
        }

        // Get lead to delete
        const leadToDelete = await leadsCollection.findOne({ 
          _id: new ObjectId(id)
        });

        if (!leadToDelete) {
          return res.status(404).json({ message: 'Lead not found' });
        }

        // Soft delete - set isActive to false
        await leadsCollection.updateOne(
          { _id: new ObjectId(id) },
          { 
            $set: { 
              isActive: false,
              updatedAt: new Date(),
              updatedBy: new ObjectId(user.userId)
            }
          }
        );

        // Log activity
        await activitiesCollection.insertOne({
          userId: new ObjectId(user.userId),
          username: user.username,
          action: 'delete_lead',
          details: `Deleted lead: ${leadToDelete.name} (${leadToDelete.email})`,
          entityType: 'Lead',
          entityId: id,
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        console.log('Lead deleted successfully (soft delete)');
        res.status(200).json({ message: 'Lead deleted successfully' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
