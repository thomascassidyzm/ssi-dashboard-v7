/**
 * /api/production/:courseCode/feedback
 * POST - Submit user feedback
 * GET - Get aggregated feedback
 */

import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../../../lib/supabase.js';

let supabase = null;
function getSupabase() {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  }
  return supabase;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
    if (req.method === 'POST') {
      // Submit feedback
      const { audioId, feedbackType, userId, comment, sessionContext } = req.body;

      const validTypes = ['translation', 'audio_quality', 'pronunciation', 'too_fast', 'confusing', 'other'];
      if (!feedbackType || !validTypes.includes(feedbackType)) {
        return res.status(400).json({
          error: 'Invalid feedback type',
          validTypes
        });
      }

      const { data, error } = await db
        .from('content_feedback')
        .insert({
          audio_id: audioId || null,
          course_code: courseCode,
          feedback_type: feedbackType,
          user_id: userId || 'anonymous',
          comment: comment || null,
          session_context: sessionContext || {}
        })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        feedback: data,
        message: 'Feedback submitted successfully'
      });
    }

    if (req.method === 'GET') {
      // Get aggregated feedback
      const threshold = parseInt(req.query.threshold) || 3;
      const limit = parseInt(req.query.limit) || 100;
      const feedbackType = req.query.type;

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

      if (error) throw error;

      return res.json({
        courseCode,
        threshold,
        issues: data || [],
        count: data?.length || 0
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(`[feedback] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Feedback operation failed',
      message: err.message
    });
  }
}
