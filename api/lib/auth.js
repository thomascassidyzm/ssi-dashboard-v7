/**
 * Auth Service
 * Handles magic link authentication and session management
 * Storage: S3 bucket ssi-audio-stage/auth/
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { getSupabase } from './supabase.js';

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const AUTH_PREFIX = 'auth/';
const MAGIC_LINK_TTL = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Helper to convert stream to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Get user from users.json
 */
export async function getUser(email) {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}users.json`
    });
    const result = await s3.send(command);
    const bodyString = await streamToString(result.Body);
    const users = JSON.parse(bodyString);
    return users.users?.[email] || null;
  } catch (err) {
    if (err.name === 'NoSuchKey') return null;
    throw err;
  }
}

/**
 * Generate a magic link token
 */
export async function generateMagicLink(email) {
  const user = await getUser(email);
  if (!user) return { error: 'User not found' };

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + MAGIC_LINK_TTL;

  // Store token in S3
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `${AUTH_PREFIX}magic-links/${token}.json`,
    Body: JSON.stringify({ email, expires }),
    ContentType: 'application/json'
  });
  await s3.send(command);

  return { token, expires };
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLink(token) {
  try {
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}magic-links/${token}.json`
    });
    const result = await s3.send(getCommand);
    const bodyString = await streamToString(result.Body);
    const data = JSON.parse(bodyString);

    if (Date.now() > data.expires) {
      return { error: 'Token expired' };
    }

    // Delete the used token
    const deleteCommand = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}magic-links/${token}.json`
    });
    await s3.send(deleteCommand);

    return { email: data.email };
  } catch (err) {
    if (err.name === 'NoSuchKey') return { error: 'Invalid token' };
    throw err;
  }
}

/**
 * Create a session for a user
 */
export async function createSession(email) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + SESSION_TTL;
  const user = await getUser(email);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: `${AUTH_PREFIX}sessions/${sessionId}.json`,
    Body: JSON.stringify({ email, expires, user }),
    ContentType: 'application/json'
  });
  await s3.send(command);

  return { sessionId, expires, user };
}

/**
 * Validate a session
 */
export async function validateSession(sessionId) {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}sessions/${sessionId}.json`
    });
    const result = await s3.send(command);
    const bodyString = await streamToString(result.Body);
    const data = JSON.parse(bodyString);

    if (Date.now() > data.expires) {
      return null;
    }

    return data.user;
  } catch (err) {
    if (err.name === 'NoSuchKey') return null;
    throw err;
  }
}

/**
 * Verify a Supabase JWT and return a dashboard user record.
 * Returns null if the token is invalid or the user lacks dashboard access.
 *
 * Mirrors verifySupabaseJWT in services/production-api.cjs — keep them in sync.
 */
export async function verifySupabaseJWT(token) {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const { data: lr } = await supabase
      .from('learners')
      .select('id, user_id, display_name, platform_role, educational_role, dashboard_courses')
      .eq('user_id', user.id)
      .single();

    if (!lr) return null;

    const pr = lr.platform_role;
    const er = lr.educational_role;
    if (pr !== 'ssi_admin' && pr !== 'popty_user' && er !== 'god') return null;

    const isAdminUser = pr === 'ssi_admin' || er === 'god';
    const dc = lr.dashboard_courses || [];
    const coursesAccess = isAdminUser ? '*' : (dc.includes('*') ? '*' : dc);

    return {
      name: lr.display_name,
      email: user.email,
      role: isAdminUser ? 'admin' : 'user',
      courses: coursesAccess,
      learner_id: lr.id,
    };
  } catch (err) {
    console.error('[Auth] Supabase JWT verification error:', err);
    return null;
  }
}

/**
 * Look up a dashboard user by email (Supabase-backed).
 * Replaces the legacy S3 users.json lookup in getUser().
 */
export async function getDashboardUserByEmail(email) {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('dashboard_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    if (!data) return null;

    return {
      name: data.name,
      email: data.email,
      role: data.role,
      courses: data.courses,
      voice_id: data.voice_id,
    };
  } catch (err) {
    console.error('[Auth] getDashboardUserByEmail error:', err);
    return null;
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionId) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: `${AUTH_PREFIX}sessions/${sessionId}.json`
  });
  await s3.send(command);
}
