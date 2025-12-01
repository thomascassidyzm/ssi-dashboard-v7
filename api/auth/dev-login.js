/**
 * POST /api/auth/dev-login
 * Dev bypass - directly login without magic link
 * Only works when NODE_ENV !== 'production'
 */

import { getUser, createSession } from '../lib/auth.js';

// Allowed dev accounts (add more as needed)
const DEV_ACCOUNTS = [
  'tom@ssi.com',
  'kai@ssi.org',
  'test@test.com'
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Dev login not available in production' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Only allow specific dev accounts
  if (!DEV_ACCOUNTS.includes(email)) {
    return res.status(403).json({ error: 'Email not in dev accounts list' });
  }

  try {
    // Try to get user from S3, or create a mock admin user
    let user = await getUser(email);

    if (!user) {
      // Create mock admin user for dev
      user = {
        name: email.split('@')[0],
        email: email,
        role: 'admin',
        courses: '*'
      };
    }

    // Create session directly (skip magic link)
    const sessionData = await createSession(email);

    console.log(`[Auth] Dev login for ${email}`);

    res.json({
      success: true,
      session: sessionData.sessionId,
      user: sessionData.user || user,
      expires: sessionData.expires
    });

  } catch (err) {
    console.error('[Auth] Dev login error:', err);
    res.status(500).json({ error: 'Dev login failed', message: err.message });
  }
}
