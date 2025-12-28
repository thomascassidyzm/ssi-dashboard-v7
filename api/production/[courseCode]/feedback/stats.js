/**
 * GET /api/production/:courseCode/feedback/stats
 * Returns feedback statistics for a course
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
    // Get total feedback count
    const { count: total, error: totalError } = await db
      .from('content_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    if (totalError && totalError.code !== '42P01') throw totalError;

    // Get resolved count
    const { count: resolved, error: resolvedError } = await db
      .from('content_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .eq('resolved', true);

    if (resolvedError && resolvedError.code !== '42P01') throw resolvedError;

    // Get counts by type
    const { data: byTypeData, error: byTypeError } = await db
      .from('content_feedback')
      .select('feedback_type')
      .eq('course_code', courseCode);

    if (byTypeError && byTypeError.code !== '42P01') throw byTypeError;

    // Aggregate by type
    const byType = {};
    for (const row of (byTypeData || [])) {
      byType[row.feedback_type] = (byType[row.feedback_type] || 0) + 1;
    }

    return res.json({
      courseCode,
      stats: {
        total: total || 0,
        resolved: resolved || 0,
        unresolved: (total || 0) - (resolved || 0),
        by_type: byType
      }
    });

  } catch (err) {
    console.error(`[feedback/stats] Error for ${courseCode}:`, err.message);

    // Return zeros if table doesn't exist yet
    if (err.code === '42P01') {
      return res.json({
        courseCode,
        stats: {
          total: 0,
          resolved: 0,
          unresolved: 0,
          by_type: {}
        },
        _note: 'content_feedback table not configured'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch feedback stats',
      message: err.message
    });
  }
}
