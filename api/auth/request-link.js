/**
 * POST /api/auth/request-link
 * Request a magic link to be sent to email
 */

import { generateMagicLink } from '../lib/auth.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const production = process.env.NODE_ENV === 'production';
  let baseUrl;
  try {
    baseUrl = new URL(process.env.BASE_URL || (production ? '' : 'http://localhost:5173'));
    if (production && (baseUrl.protocol !== 'https:' || baseUrl.hostname === 'localhost' || baseUrl.username || baseUrl.password)) {
      throw new Error('Invalid production URL');
    }
  } catch {
    return res.status(503).json({ error: 'Login email not configured' });
  }
  if (production && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM)) {
    return res.status(503).json({ error: 'Login email not configured' });
  }

  let result;
  try {
    result = await generateMagicLink(email);
  } catch {
    return res.status(503).json({ error: 'Unable to create login link' });
  }

  if (result.error) {
    return res.status(404).json({ error: result.error });
  }

  const magicLink = new URL('/auth/verify', baseUrl);
  magicLink.searchParams.set('token', result.token);
  if (production) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM,
          to: [email],
          subject: 'Check your email for the login link',
          text: `Check your email for the login link\n\n${magicLink}`
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok || !(await response.json()).id) {
        return res.status(502).json({ error: 'Unable to send login link' });
      }
    } catch {
      return res.status(502).json({ error: 'Unable to send login link' });
    }
  }

  res.json({
    success: true,
    message: 'Check your email for the login link',
    // Only include link in development
    ...(!production && { link: magicLink.toString() })
  });
}
