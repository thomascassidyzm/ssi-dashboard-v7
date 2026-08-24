/**
 * Supabase Client for Vercel API Routes
 *
 * Provides database access for production API endpoints.
 * Uses service role key for server-side operations.
 *
 * Updated for new schema: course_audio + shared_audio tables.
 * @version 2.0.0 - New schema (Jan 2026)
 */

import { createClient } from '@supabase/supabase-js';
// The identity canonicaliser is shared with the services/ writers on purpose:
// two copies of this rule is how the estate got 137 spellings of 60 languages.
import { canonicalLanguage, canonicalVoiceId } from '../../services/shared/clip-identity.cjs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Lazy initialization - only create client when needed
let _supabase = null;

function getSupabase() {
  if (!_supabase && supabaseUrl && supabaseKey) {
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return _supabase;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseKey);
}

/**
 * Normalize text for consistent matching
 */
export function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// =============================================================================
// COURSE MANAGEMENT
// =============================================================================

/**
 * List all courses from database
 */
export async function listCoursesFromDatabase() {
  const supabase = getSupabase();
  if (!supabase) return null; // Return null if not configured (allow fallback)

  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, display_name, status, course_type, voice_config')
    .order('display_name');

  if (error) {
    console.error('[Supabase] Failed to list courses:', error.message);
    return null; // Allow fallback to S3
  }

  // Transform to match expected format
  return data?.map(c => ({
    code: c.course_code,
    name: c.display_name || `${c.known_lang.toUpperCase()} → ${c.target_lang.toUpperCase()}`,
    known_lang: c.known_lang,
    target_lang: c.target_lang,
    status: c.status,
    course_type: c.course_type,
    voice_config: c.voice_config
  })) || [];
}

/**
 * Get course by code
 */
export async function getCourse(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('course_code', courseCode)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get course voice configuration
 */
export async function getCourseVoices(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('courses')
    .select('voice_config')
    .eq('course_code', courseCode)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.voice_config || null;
}

// =============================================================================
// COURSE AUDIO
// =============================================================================

/**
 * Get course audio by ID
 */
export async function getCourseAudio(id) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('course_audio')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Mirrors services/supabase-client.cjs. Two things are deliberate here and the
 * reasoning lives in that file's comments:
 *
 *  - `voiceId` is part of a clip's identity, so it belongs in the filter;
 *  - `.single()` is gone. PostgREST returns PGRST116 for BOTH "zero rows" and
 *    "more than one row", so the old `if (error.code !== 'PGRST116') throw`
 *    reported a drift-created pair of rows as NO ROW AT ALL. Two rows are now
 *    logged and the first is returned, rather than the clip being called absent.
 */
const MULTIPLICITY_PROBE = 2;

/**
 * Find course audio by text, language, role and voice
 */
export async function findCourseAudio(courseCode, text, language, role, voiceId) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const textNormalized = normalizeText(text);
  const lang = canonicalLanguage(language);

  let query = supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', lang)
    .eq('role', role);
  if (voiceId != null) query = query.eq('voice_id', canonicalVoiceId(voiceId));

  const { data, error } = await query.limit(MULTIPLICITY_PROBE);
  if (error) throw error;

  const rows = data || [];
  if (rows.length >= MULTIPLICITY_PROBE) {
    console.warn(
      `[supabase] findCourseAudio: ${rows.length}+ rows share one identity ` +
      `(${courseCode}, ${textNormalized}, ${lang}, ${role}, ${voiceId ?? 'any voice'}) — ` +
      `ids ${rows.map(r => r.id).join(', ')}. Returning the first; previously this reported ABSENT.`
    );
  }
  return rows[0] || null;
}

/**
 * Get course audio inventory summary
 */
export async function getCourseAudioSummary(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .rpc('get_course_audio_summary', { p_course_code: courseCode });

  if (error) throw error;
  return data || [];
}

// =============================================================================
// SHARED AUDIO
// =============================================================================

/**
 * Get shared audio by language
 */
export async function getSharedAudioList(language, audioType = null) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('shared_audio')
    .select('*')
    .eq('language', language);

  if (audioType) {
    query = query.eq('audio_type', audioType);
  }

  const { data, error } = await query.order('created_at');

  if (error) throw error;
  return data || [];
}

/**
 * Find shared audio by text, language, and type
 */
export async function findSharedAudio(text, language, audioType) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const textNormalized = normalizeText(text);
  const lang = canonicalLanguage(language);

  const { data, error } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('text_normalized', textNormalized)
    .eq('language', lang)
    .eq('audio_type', audioType)
    .limit(MULTIPLICITY_PROBE);

  if (error) throw error;

  const rows = data || [];
  if (rows.length >= MULTIPLICITY_PROBE) {
    console.warn(
      `[supabase] findSharedAudio: ${rows.length}+ rows share (${textNormalized}, ${lang}, ${audioType}) — ` +
      `ids ${rows.map(r => r.id).join(', ')}. Returning the first; previously this reported ABSENT.`
    );
  }
  return rows[0] || null;
}

// =============================================================================
// SAMPLE FLAGS (QA workflow)
// =============================================================================

/**
 * Get all flags for audio in a course
 */
export async function getCourseFlags(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  // First get all audio IDs for this course
  const { data: audioData, error: audioError } = await supabase
    .from('course_audio')
    .select('id')
    .eq('course_code', courseCode);

  if (audioError) throw audioError;

  if (!audioData || audioData.length === 0) {
    return [];
  }

  const audioIds = audioData.map(a => a.id);

  // Get flags for those audio IDs
  const { data: flagsData, error: flagsError } = await supabase
    .from('sample_flags')
    .select('*')
    .in('audio_uuid', audioIds);

  if (flagsError) throw flagsError;

  return flagsData || [];
}

/**
 * Update a sample flag
 * @param {string} audioUuid - Audio UUID
 * @param {string} courseCode - Course code (required for new flags)
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @param {string} flaggedBy - Who flagged it
 */
export async function updateSampleFlag(audioUuid, courseCode, status, notes, flaggedBy) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  // Check if flag exists
  const { data: existing, error: checkError } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('audio_uuid', audioUuid)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  const now = new Date().toISOString();
  const historyEntry = {
    status,
    notes,
    flaggedBy,
    timestamp: now
  };

  if (existing) {
    // Update existing flag
    const newHistory = [...(existing.history || []), historyEntry];
    const { data, error } = await supabase
      .from('sample_flags')
      .update({
        status,
        notes,
        flagged_by: flaggedBy,
        flagged_at: now,
        history: newHistory
      })
      .eq('audio_uuid', audioUuid)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert new flag - course_code is required
    const { data, error } = await supabase
      .from('sample_flags')
      .insert({
        audio_uuid: audioUuid,
        course_code: courseCode,
        status,
        notes,
        flagged_by: flaggedBy,
        flagged_at: now,
        history: [historyEntry]
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Bulk update flags
 * @param {string} courseCode - Course code (unused, for compatibility)
 * @param {Array} updates - Array of { uuid, status, notes }
 * @param {string} flaggedBy - Who flagged them
 */
export async function bulkUpdateFlags(courseCode, updates, flaggedBy) {
  const results = [];
  for (const update of updates) {
    const result = await updateSampleFlag(
      update.uuid,
      courseCode,
      update.status,
      update.notes,
      flaggedBy
    );
    results.push(result);
  }
  return results;
}

// =============================================================================
// CONTENT STATS
// =============================================================================

/**
 * Get course content counts from database
 */
export async function getCourseContentCounts(courseCode) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [seedsResult, legosResult, newLegosResult, phrasesResult, audioResult] = await Promise.all([
    supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode).eq('is_new', true),
    supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_audio').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  ]);

  return {
    seeds: seedsResult.count || 0,
    legos: legosResult.count || 0,
    newLegos: newLegosResult.count || 0,
    practicePhrases: phrasesResult.count || 0,
    audio: audioResult.count || 0
  };
}

/**
 * Get course statistics
 */
export async function getCourseStats(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  // Count audio by role
  const { data: audioData, error: audioError } = await supabase
    .from('course_audio')
    .select('role, origin')
    .eq('course_code', courseCode);

  if (audioError) throw audioError;

  const roleCounts = {};
  const originCounts = { tts: 0, human: 0 };

  for (const audio of audioData || []) {
    roleCounts[audio.role] = (roleCounts[audio.role] || 0) + 1;
    originCounts[audio.origin] = (originCounts[audio.origin] || 0) + 1;
  }

  return {
    courseCode,
    totalAudio: audioData?.length || 0,
    byRole: roleCounts,
    byOrigin: originCounts
  };
}

// Export the getSupabase function for use by other API routes
export { getSupabase };

export default {
  isSupabaseConfigured,
  getSupabase,
  normalizeText,
  listCoursesFromDatabase,
  getCourse,
  getCourseVoices,
  getCourseAudio,
  findCourseAudio,
  getCourseAudioSummary,
  getSharedAudioList,
  findSharedAudio,
  getCourseFlags,
  updateSampleFlag,
  bulkUpdateFlags,
  getCourseContentCounts,
  getCourseStats
};
