/**
 * GET /api/production/:courseCode/flags
 * Returns sample flags for QA workflow
 */

import { getCourseFlags, isSupabaseConfigured } from '../../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code is required' });
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    // Return empty flags if Supabase not configured
    return res.json({
      courseCode,
      samples: {},
      message: 'Supabase not configured - flags unavailable'
    });
  }

  try {
    const flags = await getCourseFlags(courseCode);

    // Transform array to object keyed by audio_uuid for frontend compatibility
    const samples = {};
    for (const flag of flags) {
      samples[flag.audio_uuid] = {
        status: flag.status,
        notes: flag.notes,
        flaggedBy: flag.flagged_by,
        flaggedAt: flag.flagged_at,
        history: flag.history || []
      };
    }

    res.json({
      courseCode,
      samples,
      totalFlags: flags.length
    });

  } catch (err) {
    console.error(`[Production] Flags fetch failed for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to fetch flags',
      message: err.message
    });
  }
}
