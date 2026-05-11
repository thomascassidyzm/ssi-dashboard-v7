/**
 * POST /api/auth/generate-code
 * Admin endpoint to generate a login code for a user
 *
 * Body: { "email": "user@example.com" }
 * Returns: { code: "ABC123", expires: "2026-04-03T..." }
 */

import { verifySupabaseJWT, generateLoginCode } from '../lib/auth.js';

export default async function handler(req, res) {
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

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await generateLoginCode(email);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    console.log(`[Auth] Login code generated for ${email} by ${adminUser.email}`);

    res.json({
      success: true,
      code: result.code,
      expires: new Date(result.expires).toISOString()
    });
  } catch (err) {
    console.error('[Auth] Generate code error:', err);
    res.status(500).json({ error: 'Failed to generate code', message: err.message });
  }
}
