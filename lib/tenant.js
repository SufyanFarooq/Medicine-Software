import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Get tenant context from request headers
 * @param {Object} req - Request object
 * @returns {Object} - { userId, branchId, userRole, branchRole }
 */
export async function getTenantContext(req) {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new Error('No authorization token provided');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { userId, branchId, userRole } = decoded;

    if (!userId) {
      throw new Error('Invalid token: missing userId');
    }

    if (!branchId) {
      throw new Error('No branch selected. Please select a branch first.');
    }

    // Get user's role in the selected branch
    const membershipsCollection = await getCollection('user_branch_memberships');
    const membership = await membershipsCollection.findOne({
      userId: new ObjectId(userId),
      branchId: new ObjectId(branchId),
      isActive: true
    });

    if (!membership) {
      throw new Error('User does not have access to this branch');
    }

    return {
      userId,
      branchId,
      userRole,
      branchRole: membership.role,
      permissions: membership.permissions,
      membership
    };
  } catch (error) {
    console.error('Tenant context error:', error);
    throw new Error(`Tenant context error: ${error.message}`);
  }
}

/**
 * Get user's accessible branches
 * @param {string} userId - User ID
 * @returns {Array} - Array of accessible branches
 */
export async function getUserBranches(userId) {
  try {
    const membershipsCollection = await getCollection('user_branch_memberships');
    const branchesCollection = await getCollection('branches');

    const memberships = await membershipsCollection.find({
      userId: userId,
      isActive: true
    }).toArray();

    if (memberships.length === 0) {
      return [];
    }

    const branchIds = memberships.map(m => m.branchId);
    const branches = await branchesCollection.find({
      _id: { $in: branchIds },
      isActive: true
    }).toArray();

    return branches.map(branch => ({
      _id: branch._id,
      name: branch.name,
      code: branch.code,
      branchType: branch.branchType,
      address: branch.address,
      role: memberships.find(m => m.branchId.toString() === branch._id.toString())?.role
    }));
  } catch (error) {
    console.error('Error getting user branches:', error);
    return [];
  }
}

/**
 * Check if user has permission for specific action in current branch
 * @param {Object} tenantContext - Tenant context from getTenantContext
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether user has permission
 */
export function hasBranchPermission(tenantContext, permission) {
  if (!tenantContext || !tenantContext.permissions) {
    return false;
  }

  // Super admin always has all permissions
  if (tenantContext.userRole === 'super_admin') {
    return true;
  }

  // Check branch-specific permissions
  return tenantContext.permissions[permission] === true;
}

/**
 * Get branch filter for database queries
 * @param {Object} tenantContext - Tenant context from getTenantContext
 * @returns {Object} - MongoDB filter object
 */
export function getBranchFilter(tenantContext) {
  if (!tenantContext || !tenantContext.branchId) {
    throw new Error('No branch context available');
  }

  return { branchId: tenantContext.branchId };
}

/**
 * Switch user's active branch
 * @param {string} userId - User ID
 * @param {string} branchId - Branch ID to switch to
 * @returns {Object} - New JWT token with branchId
 */
export function switchBranch(userId, branchId, userRole) {
  try {
    const token = jwt.sign(
      { 
        userId, 
        branchId, 
        userRole,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      JWT_SECRET
    );
    
    return { token, branchId };
  } catch (error) {
    console.error('Error switching branch:', error);
    throw new Error('Failed to switch branch');
  }
}

/**
 * Get user's current branch info
 * @param {Object} req - Request object
 * @returns {Object} - Current branch information
 */
export async function getCurrentBranch(req) {
  try {
    const tenantContext = await getTenantContext(req);
    const branchesCollection = await getCollection('branches');
    
    const branch = await branchesCollection.findOne({
      _id: tenantContext.branchId,
      isActive: true
    });

    if (!branch) {
      throw new Error('Current branch not found');
    }

    return {
      _id: branch._id,
      name: branch.name,
      code: branch.code,
      branchType: branch.branchType,
      address: branch.address,
      contactInfo: branch.contactInfo,
      manager: branch.manager,
      role: tenantContext.branchRole
    };
  } catch (error) {
    console.error('Error getting current branch:', error);
    throw new Error('Failed to get current branch');
  }
}

/**
 * Check if user is HQ/Admin (can see all branches)
 * @param {Object} tenantContext - Tenant context
 * @returns {boolean} - Whether user is HQ/Admin
 */
export function isHQUser(tenantContext) {
  return tenantContext.userRole === 'super_admin' || 
         tenantContext.userRole === 'admin' ||
         tenantContext.branchRole === 'Admin';
}

/**
 * Get appropriate filter for queries based on user role
 * @param {Object} tenantContext - Tenant context
 * @returns {Object} - MongoDB filter object
 */
export function getQueryFilter(tenantContext) {
  if (isHQUser(tenantContext)) {
    // HQ users can see all branches (no filter)
    return {};
  } else {
    // Branch users can only see their branch data
    return getBranchFilter(tenantContext);
  }
}
