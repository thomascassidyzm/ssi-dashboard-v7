/**
 * POST /api/auth/request-link
 * Request a magic link to be sent to email
 */

import { generateMagicLink, getUser } from '../lib/auth.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const result = await generateMagicLink(email);

  if (result.error) {
    return res.status(404).json({ error: result.error });
  }

  // TODO: Actually send email in production
  // For now, just log and return the link (for development)
  const magicLink = `${process.env.BASE_URL || 'http://localhost:5173'}/auth/verify?token=${result.token}`;
  console.log(`[Auth] Magic link for ${email}: ${magicLink}`);

  res.json({
    success: true,
    message: 'Check your email for the login link',
    // Only include link in development
    ...(process.env.NODE_ENV !== 'production' && { link: magicLink })
  });
}
