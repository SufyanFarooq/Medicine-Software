import { getCollection } from '../../../lib/mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const usersCollection = await getCollection('users');
    const membershipsCollection = await getCollection('user_branch_memberships');
    const branchesCollection = await getCollection('branches');

    const user = await usersCollection.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Get user's branch memberships
    const memberships = await membershipsCollection.find({
      userId: user._id,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }).toArray();

    if (memberships.length === 0) {
      return res.status(403).json({ 
        message: 'No branch access. Please contact your administrator.' 
      });
    }

    // Get branch details
    const branchIds = memberships.map(m => m.branchId);
    const branches = await branchesCollection.find({
      _id: { $in: branchIds },
      isActive: true
    }).toArray();

    const branchesWithMembership = branches.map(branch => {
      // For super_admin users, prefer SuperAdmin role over Admin role
      const membership = user.role === 'super_admin' 
        ? memberships.find(m => m.branchId.toString() === branch._id.toString() && m.role === 'SuperAdmin') 
          || memberships.find(m => m.branchId.toString() === branch._id.toString())
        : memberships.find(m => m.branchId.toString() === branch._id.toString());
      
      return {
        _id: branch._id,
        name: branch.name,
        code: branch.code,
        branchType: branch.branchType,
        address: branch.address,
        role: membership.role,
        permissions: membership.permissions
      };
    });

    // If user has only one branch, auto-select it
    if (branchesWithMembership.length === 1) {
      const branch = branchesWithMembership[0];
      const token = jwt.sign(
        { 
          userId: user._id, 
          username: user.username, 
          role: user.role,
          branchId: branch._id,
          branchRole: branch.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json({
        user: userWithoutPassword,
        token,
        branch: branch,
        redirectTo: '/' // Direct to dashboard
      });
    } else {
      // Multiple branches - for super_admin, use the first branch as default
      if (user.role === 'super_admin') {
        const defaultBranch = branchesWithMembership[0];
        const token = jwt.sign(
          { 
            userId: user._id, 
            username: user.username, 
            role: user.role,
            branchId: defaultBranch._id,
            branchRole: defaultBranch.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
          user: userWithoutPassword,
          token,
          branch: defaultBranch,
          redirectTo: '/' // Direct to dashboard
        });
      } else {
        // Other users with multiple branches - redirect to branch picker
        const token = jwt.sign(
          { 
            userId: user._id, 
            username: user.username, 
            role: user.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
          user: userWithoutPassword,
          token,
          branches: branchesWithMembership,
          redirectTo: '/branch-picker' // Redirect to branch picker
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 