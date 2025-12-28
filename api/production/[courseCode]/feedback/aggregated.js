/**
 * GET /api/production/:courseCode/feedback/aggregated
 * Returns aggregated feedback issues above a threshold
 */

import { isSupabaseConfigured, getSupabase } from '../../../lib/supabase.js';

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

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const db = getSupabase();
  if (!db) {
    return res.status(503).json({ error: 'Database connection failed' });
  }

  try {
    const threshold = parseInt(req.query.threshold) || 3;
    const limit = parseInt(req.query.limit) || 100;
    const feedbackType = req.query.type;

    // Query aggregated view
    let query = db
      .from('feedback_aggregated')
      .select('*')
      .eq('course_code', courseCode)
      .gte('flag_count', threshold)
      .order('flag_count', { ascending: false })
      .limit(limit);

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType);
    }

    const { data, error } = await query;

    if (error) {
      // If view doesn't exist, return empty - table may not be set up yet
      if (error.code === '42P01') {
        return res.json({
          courseCode,
          threshold,
          issues: [],
          count: 0,
          _note: 'feedback_aggregated view not configured'
        });
      }
      throw error;
    }

    return res.json({
      courseCode,
      threshold,
      issues: data || [],
      count: data?.length || 0
    });

  } catch (err) {
    console.error(`[feedback/aggregated] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to fetch aggregated feedback',
      message: err.message
    });
  }
}
