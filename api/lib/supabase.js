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
    .select('code, known_lang, target_lang, display_name, status, course_type, voice_config')
    .order('display_name');

  if (error) {
    console.error('[Supabase] Failed to list courses:', error.message);
    return null; // Allow fallback to S3
  }

  // Transform to match expected format
  return data?.map(c => ({
    code: c.code,
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
    .eq('code', courseCode)
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
    .eq('code', courseCode)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.voice_config || null;
}

// =============================================================================
// COURSE AUDIO
// =============================================================================

/**
 * Get all course audio for a course
 */
export async function getCourseAudioList(courseCode, filters = {}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  let query = supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', courseCode);

  if (filters.role) {
    query = query.eq('role', filters.role);
  }
  if (filters.language) {
    query = query.eq('language', filters.language);
  }

  const { data, error } = await query.order('created_at');

  if (error) throw error;
  return data || [];
}

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
 * Find course audio by text, language, and role
 */
export async function findCourseAudio(courseCode, text, language, role) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const textNormalized = normalizeText(text);

  const { data, error } = await supabase
    .from('course_audio')
    .select('*')
    .eq('course_code', courseCode)
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('role', role)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
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

  const { data, error } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('text_normalized', textNormalized)
    .eq('language', language)
    .eq('audio_type', audioType)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
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
  getCourseAudioList,
  getCourseAudio,
  findCourseAudio,
  getCourseAudioSummary,
  getSharedAudioList,
  findSharedAudio,
  getCourseFlags,
  getCourseContentCounts,
  getCourseStats
};
