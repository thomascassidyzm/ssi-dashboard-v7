/**
 * GET /api/courses/:courseCode
 * Get course details with content statistics from database
 *
 * Returns:
 * - Course metadata
 * - Content counts (seeds, LEGOs, practice phrases, audio)
 * - Phase completion status
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code required' });
  }

  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get counts from all relevant tables in parallel
    const [
      courseResult,
      seedsResult,
      legosResult,
      newLegosResult,
      phrasesResult,
      audioResult
    ] = await Promise.all([
      // Course metadata
      supabase
        .from('courses')
        .select('code, known_lang, target_lang, display_name, status, course_type, voice_config')
        .eq('course_code', courseCode)
        .single(),

      // Seeds count
      supabase
        .from('course_seeds')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),

      // All LEGOs count
      supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),

      // New LEGOs count (is_new = true)
      supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('is_new', true),

      // Practice phrases count
      supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),

      // Audio count
      supabase
        .from('course_audio')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
    ]);

    // Build stats object
    const stats = {
      seeds: seedsResult.count || 0,
      legos: legosResult.count || 0,
      newLegos: newLegosResult.count || 0,
      practicePhrases: phrasesResult.count || 0,
      audio: audioResult.count || 0
    };

    // Determine phase completion
    const phasesCompleted = [];
    if (stats.seeds > 0 && stats.legos > 0) phasesCompleted.push('1');  // Phase 1: Translation + LEGOs
    if (stats.newLegos > 0) phasesCompleted.push('2');  // Phase 2: Conflict resolution (new flags set)
    if (stats.practicePhrases > 0) phasesCompleted.push('3');  // Phase 3: Basket generation
    if (stats.audio > 0) phasesCompleted.push('audio');  // Audio generation

    // Course info (may be null if course not in courses table yet)
    const course = courseResult.data;

    return res.json({
      course_code: courseCode,
      display_name: course?.display_name || courseCode,
      known_lang: course?.known_lang,
      target_lang: course?.target_lang,
      status: course?.status || 'unknown',
      course_type: course?.course_type,

      // Content statistics
      stats,

      // Legacy format for backwards compatibility
      seed_count: stats.seeds,
      lego_count: stats.legos,
      new_lego_count: stats.newLegos,
      practice_phrase_count: stats.practicePhrases,
      audio_count: stats.audio,

      // Phase status
      phases_completed: phasesCompleted,
      has_phase1: stats.seeds > 0 && stats.legos > 0,
      has_phase2: stats.newLegos > 0,
      has_phase3: stats.practicePhrases > 0,
      has_audio: stats.audio > 0,

      // Data source indicator
      data_source: 'supabase'
    });

  } catch (err) {
    console.error(`[Course ${courseCode}] Error:`, err.message);
    return res.status(500).json({
      error: 'Failed to get course details',
      message: err.message
    });
  }
}
