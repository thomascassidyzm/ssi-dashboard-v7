/**
 * GET /api/production/health
 * Health check for Production API
 */

import { isSupabaseConfigured } from '../lib/supabase.js';
import { isS3Configured } from '../lib/s3-course.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      supabase: isSupabaseConfigured(),
      s3: isS3Configured()
    }
  };

  // Set overall status based on required services
  if (!health.services.s3) {
    health.status = 'degraded';
    health.message = 'S3 not configured - manifest access unavailable';
  }

  res.json(health);
}
