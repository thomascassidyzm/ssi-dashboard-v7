/**
 * GET /api/auth/me
 * Get current user from Supabase JWT (Authorization header)
 * or by email lookup (?email=…) when direct Supabase access is blocked.
 *
 * Mirrors GET /api/auth/me in services/production-api.cjs.
 */

import { verifySupabaseJWT, getDashboardUserByEmail } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Path 1: Bearer Supabase JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const user = await verifySupabaseJWT(token);
    if (user) return res.json(user);
  }

  // Path 2: email query param (used when direct Supabase RLS blocks the read)
  const email = req.query?.email;
  if (email) {
    const user = await getDashboardUserByEmail(email);
    if (user) return res.json(user);
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(401).json({ error: 'No session or email provided' });
}
