import { getCollection } from '../../../../lib/mongodb';
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

  try {
    const { userId, role: userRole } = user;

    switch (method) {
      case 'POST':
        // Switch to a different branch
        const { branchId } = req.body;

        if (!branchId) {
          return res.status(400).json({ 
            message: 'Missing required field: branchId',
            missingFields: ['branchId']
          });
        }

        // Validate branchId
        if (!ObjectId.isValid(branchId)) {
          return res.status(400).json({ message: 'Invalid branch ID' });
        }

        const branchObjectId = new ObjectId(branchId);

        // Check if user has access to this branch
        const membershipsCollection = await getCollection('user_branch_memberships');
        const membership = await membershipsCollection.findOne({
          userId: new ObjectId(userId),
          branchId: branchObjectId,
          isActive: true
        });

        if (!membership) {
          return res.status(403).json({ 
            message: 'You do not have access to this branch' 
          });
        }

        // Check if membership has expired
        if (membership.expiresAt && new Date() > membership.expiresAt) {
          return res.status(403).json({ 
            message: 'Your access to this branch has expired' 
          });
        }

        // Generate new token with branchId
        const token = jwt.sign(
          { 
            userId: userId, 
            role: userRole,
            branchId: branchId,
            branchRole: membership.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Get branch details
        const branchesCollection = await getCollection('branches');
        const branch = await branchesCollection.findOne({
          _id: branchObjectId,
          isActive: true
        });

        if (!branch) {
          return res.status(404).json({ message: 'Branch not found' });
        }

        res.status(200).json({
          success: true,
          message: 'Branch switched successfully',
          data: {
            token,
            branch: {
              _id: branch._id,
              name: branch.name,
              code: branch.code,
              branchType: branch.branchType,
              address: branch.address,
              role: membership.role,
              permissions: membership.permissions
            }
          }
        });
        break;

      case 'GET':
        // Get user's accessible branches
        const membershipsCollectionGet = await getCollection('user_branch_memberships');
        const branchesCollectionGet = await getCollection('branches');
        
        const userBranches = await membershipsCollectionGet.find({
          userId: new ObjectId(userId),
          isActive: true,
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }).toArray();

        if (userBranches.length === 0) {
          return res.status(200).json({
            success: true,
            data: {
              branches: [],
              currentBranch: null
            }
          });
        }

        // Get branch details
        const branchIds = userBranches.map(m => m.branchId);
        const branches = await branchesCollectionGet.find({
          _id: { $in: branchIds },
          isActive: true
        }).toArray();

        const branchesWithMembership = branches.map(branch => {
          const membership = userBranches.find(m => m.branchId.toString() === branch._id.toString());
          return {
            _id: branch._id,
            name: branch.name,
            code: branch.code,
            branchType: branch.branchType,
            address: branch.address,
            role: membership.role,
            assignedAt: membership.assignedAt,
            expiresAt: membership.expiresAt
          };
        });

        // Get current branch info
        const currentBranchId = user.branchId;
        const currentBranch = branchesWithMembership.find(b => b._id.toString() === currentBranchId);

        res.status(200).json({
          success: true,
          data: {
            branches: branchesWithMembership,
            currentBranch: currentBranch || null
          }
        });
        break;

      default:
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Branch switch API error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}