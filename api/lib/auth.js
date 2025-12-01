/**
 * Auth Service
 * Handles magic link authentication and session management
 * Storage: S3 bucket popty-bach-lfs/auth/
 */

import AWS from 'aws-sdk';
import crypto from 'crypto';

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const AUTH_PREFIX = 'auth/';
const MAGIC_LINK_TTL = 15 * 60 * 1000; // 15 minutes
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

/**
 * Get user from users.json
 */
export async function getUser(email) {
  try {
    const { Body } = await s3.getObject({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}users.json`
    }).promise();

    const users = JSON.parse(Body.toString());
    return users.users?.[email] || null;
  } catch (err) {
    if (err.code === 'NoSuchKey') return null;
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
  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: `${AUTH_PREFIX}magic-links/${token}.json`,
    Body: JSON.stringify({ email, expires }),
    ContentType: 'application/json'
  }).promise();

  return { token, expires };
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLink(token) {
  try {
    const { Body } = await s3.getObject({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}magic-links/${token}.json`
    }).promise();

    const data = JSON.parse(Body.toString());

    if (Date.now() > data.expires) {
      return { error: 'Token expired' };
    }

    // Delete the used token
    await s3.deleteObject({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}magic-links/${token}.json`
    }).promise();

    return { email: data.email };
  } catch (err) {
    if (err.code === 'NoSuchKey') return { error: 'Invalid token' };
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

  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: `${AUTH_PREFIX}sessions/${sessionId}.json`,
    Body: JSON.stringify({ email, expires, user }),
    ContentType: 'application/json'
  }).promise();

  return { sessionId, expires, user };
}

/**
 * Validate a session
 */
export async function validateSession(sessionId) {
  try {
    const { Body } = await s3.getObject({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}sessions/${sessionId}.json`
    }).promise();

    const data = JSON.parse(Body.toString());

    if (Date.now() > data.expires) {
      return null;
    }

    return data.user;
  } catch (err) {
    if (err.code === 'NoSuchKey') return null;
    throw err;
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionId) {
  await s3.deleteObject({
    Bucket: S3_BUCKET,
    Key: `${AUTH_PREFIX}sessions/${sessionId}.json`
  }).promise();
}
