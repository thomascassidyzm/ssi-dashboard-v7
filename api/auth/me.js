/**
 * GET /api/auth/me
 * Get current user from session
 */

import { validateSession } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.replace('Bearer ', '');

  if (!sessionId) {
    return res.status(401).json({ error: 'No session' });
  }

  const user = await validateSession(sessionId);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  res.json({ user });
}
