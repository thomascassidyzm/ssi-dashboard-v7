/**
 * GET /api/auth/verify?token=xxx
 * Verify magic link and create session
 */

import { verifyMagicLink, createSession } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const result = await verifyMagicLink(token);

  if (result.error) {
    return res.status(401).json({ error: result.error });
  }

  const session = await createSession(result.email);

  res.json({
    success: true,
    session: session.sessionId,
    user: session.user,
    expires: session.expires
  });
}
