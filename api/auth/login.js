/**
 * POST /api/auth/login
 * Login with email + code
 *
 * Body: { "email": "user@example.com", "code": "ABC123" }
 */

import { verifyLoginCode, createSession } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!code) return res.status(400).json({ error: 'Code required' });

  try {
    const result = await verifyLoginCode(email, code);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    const session = await createSession(result.email);

    console.log(`[Auth] Login successful for ${email}`);

    res.json({
      success: true,
      session: session.sessionId,
      user: session.user,
      expires: session.expires
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Login failed', message: err.message });
  }
}
