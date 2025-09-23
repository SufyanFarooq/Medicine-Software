import { getCollection } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { getTenantContext, isHQUser } from '../../../../lib/tenant';
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
  const { branchId } = req.query;

  // Verify authentication
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const tenantContext = await getTenantContext(req);
    
    // Check if user has permission to manage branch memberships
    if (!isHQUser(tenantContext) && tenantContext.branchRole !== 'FranchiseOwner') {
      return res.status(403).json({ message: 'Access denied. Only HQ users and franchise owners can manage memberships.' });
    }

    const membershipsCollection = await getCollection('user_branch_memberships');
    const usersCollection = await getCollection('users');
    const branchesCollection = await getCollection('branches');

    // Validate branchId
    if (!ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: 'Invalid branch ID' });
    }

    const branchObjectId = new ObjectId(branchId);

    // Check if branch exists
    const branch = await branchesCollection.findOne({ 
      _id: branchObjectId,
      isActive: true 
    });

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    switch (method) {
      case 'GET':
        // Get all members of this branch
        const memberships = await membershipsCollection.find({
          branchId: branchObjectId,
          isActive: true
        }).toArray();

        // Get user details for each membership
        const membersWithDetails = await Promise.all(
          memberships.map(async (membership) => {
            const user = await usersCollection.findOne({ _id: membership.userId });
            return {
              _id: membership._id,
              userId: membership.userId,
              branchId: membership.branchId,
              role: membership.role,
              permissions: membership.permissions,
              assignedAt: membership.assignedAt,
              assignedBy: membership.assignedBy,
              notes: membership.notes,
              user: user ? {
                _id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
              } : null
            };
          })
        );

        res.status(200).json({
          success: true,
          data: {
            branch: {
              _id: branch._id,
              name: branch.name,
              code: branch.code
            },
            members: membersWithDetails
          }
        });
        break;

      case 'POST':
        // Add user to branch
        const { userId, role, notes, expiresAt } = req.body;

        if (!userId || !role) {
          return res.status(400).json({ 
            message: 'Missing required fields: userId, role',
            missingFields: ['userId', 'role']
          });
        }

        // Validate role
        const validRoles = ['FranchiseOwner', 'BranchManager', 'Staff', 'Viewer', 'Admin'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ 
            message: 'Invalid role. Must be one of: ' + validRoles.join(', ')
          });
        }

        // Check if user exists
        const userToAdd = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!userToAdd) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is already a member of this branch
        const existingMembership = await membershipsCollection.findOne({
          userId: new ObjectId(userId),
          branchId: branchObjectId,
          isActive: true
        });

        if (existingMembership) {
          return res.status(400).json({ message: 'User is already a member of this branch' });
        }

        // Create new membership
        const newMembership = {
          userId: new ObjectId(userId),
          branchId: branchObjectId,
          role: role,
          permissions: {}, // Will be set by pre-save middleware
          isActive: true,
          assignedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          assignedBy: tenantContext.userId,
          notes: notes?.trim() || '',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await membershipsCollection.insertOne(newMembership);

        // Log activity
        const activitiesCollection = await getCollection('activities');
        await activitiesCollection.insertOne({
          userId: tenantContext.userId,
          username: tenantContext.userRole,
          action: 'add_branch_member',
          details: `Added user ${userToAdd.username} as ${role} to branch ${branch.name}`,
          entityType: 'UserBranchMembership',
          entityId: result.insertedId.toString(),
          createdAt: new Date(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        });

        res.status(201).json({
          success: true,
          message: 'User added to branch successfully',
          data: { _id: result.insertedId, ...newMembership }
        });
        break;

      default:
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Branch members API error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
