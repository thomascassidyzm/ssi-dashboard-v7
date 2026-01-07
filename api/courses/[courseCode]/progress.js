/**
 * GET /api/courses/:courseCode/progress
 * Get course generation progress from database
 *
 * Returns stats in format expected by GenerationMonitor.vue:
 * - stats.seedsComplete
 * - stats.legosGenerated
 * - stats.basketsGenerated (practice phrases)
 * - phases with status
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
    const [seedsResult, legosResult, newLegosResult, phrasesResult, audioResult] = await Promise.all([
      supabase
        .from('course_seeds')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),

      supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),

      supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('is_new', true),

      supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode),

      supabase
        .from('course_audio')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
    ]);

    const seeds = seedsResult.count || 0;
    const legos = legosResult.count || 0;
    const newLegos = newLegosResult.count || 0;
    const practicePhrases = phrasesResult.count || 0;
    const audio = audioResult.count || 0;

    // Determine phase status
    const phase1Status = seeds > 0 && legos > 0 ? 'complete' : (seeds > 0 ? 'running' : 'pending');
    const phase2Status = newLegos > 0 ? 'complete' : (legos > 0 ? 'running' : 'pending');
    const phase3Status = practicePhrases > 0 ? 'complete' : (newLegos > 0 ? 'pending' : 'pending');
    const audioStatus = audio > 0 ? 'complete' : (practicePhrases > 0 ? 'pending' : 'pending');

    // Determine overall status
    let overallStatus = 'idle';
    if (practicePhrases > 0) {
      overallStatus = 'phase3_complete';
    } else if (newLegos > 0) {
      overallStatus = 'phase2_complete';
    } else if (seeds > 0 && legos > 0) {
      overallStatus = 'phase1_complete';
    } else if (seeds > 0) {
      overallStatus = 'running';
    }

    return res.json({
      courseCode,
      overallStatus,
      source: 'supabase',

      // Stats in format expected by GenerationMonitor
      stats: {
        seedsComplete: seeds,
        legosGenerated: legos,
        newLegosGenerated: newLegos,
        basketsGenerated: practicePhrases,  // Named for backwards compat with UI
        audioGenerated: audio
      },

      // Phase details
      phases: {
        phase1: {
          status: phase1Status,
          seedsComplete: seeds,
          legosGenerated: legos
        },
        phase2: {
          status: phase2Status,
          newLegosGenerated: newLegos
        },
        phase3: {
          status: phase3Status,
          basketsGenerated: practicePhrases
        },
        audio: {
          status: audioStatus,
          audioGenerated: audio
        }
      },

      // Raw counts for debugging
      counts: {
        seeds,
        legos,
        newLegos,
        practicePhrases,
        audio
      }
    });

  } catch (err) {
    console.error(`[Progress ${courseCode}] Error:`, err.message);
    return res.status(500).json({
      error: 'Failed to get progress',
      message: err.message
    });
  }
}
