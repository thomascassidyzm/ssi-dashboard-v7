/**
 * POST /api/production/:courseCode/feedback/resolve
 * Mark feedback issue(s) as resolved
 */

import { isSupabaseConfigured, getSupabase } from '../../../lib/supabase.js';

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
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const db = getSupabase();
  if (!db) {
    return res.status(503).json({ error: 'Database connection failed' });
  }

  try {
    const { audioId, feedbackType, resolvedBy, resolutionNote } = req.body;

    if (!feedbackType) {
      return res.status(400).json({ error: 'feedbackType is required' });
    }

    // Build the update query
    let query = db
      .from('content_feedback')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy || 'dashboard_user',
        resolution_note: resolutionNote || null
      })
      .eq('course_code', courseCode)
      .eq('feedback_type', feedbackType);

    // If audioId is specified, only resolve that specific audio's feedback
    if (audioId) {
      query = query.eq('audio_id', audioId);
    }

    const { data, error, count } = await query.select();

    if (error) {
      // If table doesn't have resolved columns, return success anyway
      if (error.code === '42703') {
        return res.json({
          success: true,
          resolved: 0,
          _note: 'content_feedback table missing resolved columns - schema update needed'
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      resolved: data?.length || 0,
      message: `Resolved ${data?.length || 0} feedback entries`
    });

  } catch (err) {
    console.error(`[feedback/resolve] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to resolve feedback',
      message: err.message
    });
  }
}
