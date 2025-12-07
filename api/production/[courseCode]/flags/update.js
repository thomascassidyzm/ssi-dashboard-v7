/**
 * POST /api/production/:courseCode/flags/update
 * Update sample flags (single or bulk)
 */

import { updateSampleFlag, bulkUpdateFlags, isSupabaseConfigured } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code is required' });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: 'Supabase not configured',
      message: 'Flag updates require Supabase to be configured'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Check if this is a bulk update
    if (body.updates && Array.isArray(body.updates)) {
      const results = await bulkUpdateFlags(courseCode, body.updates, body.flaggedBy);
      return res.json({
        success: true,
        updated: results.length,
        results
      });
    }

    // Single update
    const { uuid, status, notes, flaggedBy } = body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await updateSampleFlag(uuid, courseCode, status, notes, flaggedBy);

    res.json({
      success: true,
      flag: result
    });

  } catch (err) {
    console.error(`[Production] Flag update failed for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to update flag',
      message: err.message
    });
  }
}
