/**
 * GET /api/auth/users
 * Admin endpoint to list all users
 *
 * DELETE /api/auth/users?email=xxx
 * Admin endpoint to remove a user
 */

import AWS from 'aws-sdk';
import { validateSession } from '../lib/auth.js';

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AUTH_PREFIX = 'auth/';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verify admin session
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adminUser = await validateSession(sessionId);

  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // GET - List all users
  if (req.method === 'GET') {
    try {
      const { Body } = await s3.getObject({
        Bucket: S3_BUCKET,
        Key: `${AUTH_PREFIX}users.json`
      }).promise();

      const usersData = JSON.parse(Body.toString());

      // Convert to array format for easier display
      const users = Object.entries(usersData.users || {}).map(([email, data]) => ({
        email,
        ...data
      }));

      res.json({
        users,
        total: users.length
      });

    } catch (err) {
      if (err.code === 'NoSuchKey') {
        return res.json({ users: [], total: 0 });
      }
      console.error('[Auth] List users error:', err);
      res.status(500).json({ error: 'Failed to list users' });
    }
    return;
  }

  // DELETE - Remove a user
  if (req.method === 'DELETE') {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email query param required' });
    }

    try {
      // Read existing users
      const { Body } = await s3.getObject({
        Bucket: S3_BUCKET,
        Key: `${AUTH_PREFIX}users.json`
      }).promise();

      const usersData = JSON.parse(Body.toString());

      if (!usersData.users[email]) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deleting yourself
      if (email === adminUser.email) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      // Remove user
      delete usersData.users[email];

      // Save updated users
      await s3.putObject({
        Bucket: S3_BUCKET,
        Key: `${AUTH_PREFIX}users.json`,
        Body: JSON.stringify(usersData, null, 2),
        ContentType: 'application/json'
      }).promise();

      console.log(`[Auth] User deleted: ${email} by ${adminUser.email}`);

      res.json({
        success: true,
        message: `User ${email} removed`
      });

    } catch (err) {
      console.error('[Auth] Delete user error:', err);
      res.status(500).json({ error: 'Failed to delete user' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
