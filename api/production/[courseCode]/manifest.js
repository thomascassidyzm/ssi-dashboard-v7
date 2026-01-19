/**
 * GET /api/production/:courseCode/manifest
 * Returns the course manifest for Production Suite
 *
 * Uses DATABASE-FIRST approach with S3 fallback
 */

import { readCourseFile, courseFileExists } from '../../lib/s3-course.js';
import { isSupabaseConfigured, getSupabase } from '../../lib/supabase.js';

/**
 * Generate a basic manifest from database
 */
async function generateManifestFromDB(courseCode) {
  const db = getSupabase();
  if (!db) return null;

  // Get course metadata (courses.course_code is primary key)
  const { data: course, error: courseError } = await db
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();

  if (courseError || !course) return null;

  // Get seeds count
  const { count: seedCount } = await db
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('status', 'released');

  // Get LEGOs count
  const { count: legoCount } = await db
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('status', 'released');

  // Get practice phrases count
  const { count: phraseCount } = await db
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .eq('status', 'released');

  // Return a stub manifest with database stats
  return {
    courseCode,
    course_id: courseCode,
    title: course.display_name || `${course.known_lang} → ${course.target_lang}`,
    known_language: course.known_lang,
    target_language: course.target_lang,
    status: course.status || 'draft',
    _source: 'database',
    _stub: true,
    _message: 'Course content loaded from database. Full manifest can be generated locally.',
    stats: {
      seeds: seedCount || 0,
      legos: legoCount || 0,
      phrases: phraseCount || 0
    },
    voices: {
      known: course.known_voice,
      target1: course.target1_voice,
      target2: course.target2_voice,
      presentation: course.presentation_voice
    },
    // Empty slices array for UI compatibility
    slices: [{
      seeds: [],
      samples: {}
    }]
  };
}

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

  try {
    // TIER 1: Try database-generated manifest first
    if (isSupabaseConfigured()) {
      try {
        const dbManifest = await generateManifestFromDB(courseCode);
        if (dbManifest && dbManifest.stats?.seeds > 0) {
          console.log(`[Manifest] Generated from database for ${courseCode}`);
          return res.json(dbManifest);
        }
      } catch (dbErr) {
        console.log(`[Manifest] Database generation failed for ${courseCode}: ${dbErr.message}`);
      }
    }

    // TIER 2: Try S3 manifest file
    const manifestExists = await courseFileExists(courseCode, 'course_manifest.json');
    if (manifestExists) {
      const { content: manifest, etag } = await readCourseFile(courseCode, 'course_manifest.json');
      res.setHeader('ETag', etag || '');
      console.log(`[Manifest] Loaded from S3 for ${courseCode}`);
      return res.json({ ...manifest, _source: 's3' });
    }

    // TIER 3: Try lego_baskets.json as fallback
    const basketsExists = await courseFileExists(courseCode, 'lego_baskets.json');
    if (basketsExists) {
      const { content: baskets } = await readCourseFile(courseCode, 'lego_baskets.json');
      console.log(`[Manifest] Loaded baskets stub for ${courseCode}`);
      return res.json({
        courseCode,
        status: 'pre_audio',
        _source: 'baskets',
        _stub: true,
        message: 'Course exists but audio has not been generated yet',
        hasManifest: false,
        hasBaskets: true,
        seedCount: Array.isArray(baskets) ? baskets.length : Object.keys(baskets).length,
        baskets,
        slices: [{ seeds: [], samples: {} }]
      });
    }

    // Not found anywhere
    return res.status(404).json({
      error: 'Course not found',
      message: `Course ${courseCode} not found in database or S3`
    });

  } catch (err) {
    console.error(`[Production] Manifest fetch failed for ${courseCode}:`, err.message);

    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Course not found',
        message: err.message
      });
    }

    res.status(500).json({
      error: 'Failed to fetch manifest',
      message: err.message
    });
  }
}
