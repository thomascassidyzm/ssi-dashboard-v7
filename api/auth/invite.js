/**
 * POST /api/auth/invite
 * Admin endpoint to invite a new user with specific course permissions
 *
 * Body: {
 *   email: "volunteer@example.com",
 *   name: "Maria",
 *   courses: ["mkd_for_cat", "wel_for_eng"],
 *   role: "recorder" | "editor" (default: "recorder")
 * }
 */

import AWS from 'aws-sdk';
import { verifySupabaseJWT } from '../lib/auth.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify admin session — frontend sends a Supabase JWT.
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const adminUser = await verifySupabaseJWT(token);

  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { email, name, courses, role = 'editor' } = req.body;

  // Validate input
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: 'At least one course must be assigned' });
  }
  // 'recorder' accepted for backward compat with pre-2026-04-21 invites;
  // new invites default to 'editor'. Gating is per-course going forward.
  if (!['recorder', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be: editor or admin' });
  }

  try {
    // Read existing users
    let usersData = { users: {} };
    try {
      const { Body } = await s3.getObject({
        Bucket: S3_BUCKET,
        Key: `${AUTH_PREFIX}users.json`
      }).promise();
      usersData = JSON.parse(Body.toString());
    } catch (err) {
      if (err.code !== 'NoSuchKey') throw err;
      // File doesn't exist yet, start fresh
    }

    // Check if user already exists
    if (usersData.users[email]) {
      return res.status(409).json({
        error: 'User already exists',
        existing: usersData.users[email]
      });
    }

    // Generate voice_id for non-admin users (editors record for their courses)
    const sanitizedEmail = email.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const primaryLanguage = courses[0]?.split('_')[0] || 'unknown';
    const voiceId = role !== 'admin' ? `human_${sanitizedEmail}_${primaryLanguage}` : null;

    // Add new user
    usersData.users[email] = {
      name: name || email.split('@')[0],
      role,
      courses,
      ...(voiceId && { voice_id: voiceId }),
      invited_by: adminUser.email || adminUser.name,
      invited_at: new Date().toISOString()
    };

    // Save updated users
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}users.json`,
      Body: JSON.stringify(usersData, null, 2),
      ContentType: 'application/json'
    }).promise();

    console.log(`[Auth] User invited: ${email} with courses: ${courses.join(', ')}`);

    // Generate the invite link (just the login page - they use magic link from there)
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
    const inviteLink = `${baseUrl}/login?email=${encodeURIComponent(email)}`;

    res.json({
      success: true,
      message: `Invited ${email} with access to ${courses.length} course(s)`,
      user: usersData.users[email],
      inviteLink
    });

  } catch (err) {
    console.error('[Auth] Invite error:', err);
    res.status(500).json({ error: 'Failed to invite user', message: err.message });
  }
}
