/**
 * Supabase Client for Vercel API Routes
 *
 * Provides database access for production API endpoints.
 * Uses service role key for server-side operations.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
 * Generate deterministic UUID from audio parameters
 * UUID = SHA256(voice_id|text|lang|role|cadence) truncated to 32 chars
 */
export function generateAudioUUID(voiceId, text, lang, role, cadence) {
  const hashInput = `${voiceId}|${text}|${lang}|${role}|${cadence}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  return hash.substring(0, 32);
}

/**
 * Normalize text for consistent matching
 */
export function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Get all audio samples for a course
 */
export async function getCourseAudioSamples(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  // Get audio UUIDs used by this course
  const { data: usage, error: usageError } = await supabase
    .from('course_audio_usage')
    .select('audio_uuid, used_in, seed_id, lego_id')
    .eq('course_code', courseCode);

  if (usageError) throw usageError;
  if (!usage || usage.length === 0) return [];

  // Get audio sample details for these UUIDs
  const uuids = usage.map(u => u.audio_uuid);
  const { data: samples, error: samplesError } = await supabase
    .from('audio_samples')
    .select('*')
    .in('uuid', uuids);

  if (samplesError) throw samplesError;

  // Merge usage info with sample data
  const sampleMap = new Map(samples?.map(s => [s.uuid, s]) || []);
  return usage.map(u => ({
    ...sampleMap.get(u.audio_uuid),
    usedIn: u.used_in,
    seedId: u.seed_id,
    legoId: u.lego_id
  })).filter(s => s.uuid);
}

/**
 * Get sample flags for a course
 */
export async function getCourseFlags(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('sample_flags')
    .select('*')
    .eq('course_code', courseCode);

  if (error) throw error;
  return data || [];
}

/**
 * Update a sample flag
 */
export async function updateSampleFlag(audioUuid, courseCode, status, notes = null, flaggedBy = null) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  // Get existing flag to preserve history
  const { data: existing } = await supabase
    .from('sample_flags')
    .select('id, history')
    .eq('audio_uuid', audioUuid)
    .eq('course_code', courseCode)
    .single();

  const historyEntry = {
    status,
    timestamp: new Date().toISOString(),
    by: flaggedBy
  };

  const history = existing?.history || [];
  history.push(historyEntry);

  const { data, error } = await supabase
    .from('sample_flags')
    .upsert({
      id: existing?.id,
      audio_uuid: audioUuid,
      course_code: courseCode,
      status,
      notes,
      flagged_by: flaggedBy,
      flagged_at: new Date().toISOString(),
      history
    }, {
      onConflict: 'audio_uuid,course_code'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Bulk update sample flags
 */
export async function bulkUpdateFlags(courseCode, updates, flaggedBy = null) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

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

/**
 * Get audio sample by UUID
 */
export async function getAudioSample(uuid) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('audio_samples')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * List all courses from database
 */
export async function listCoursesFromDatabase() {
  const supabase = getSupabase();
  if (!supabase) return null; // Return null if not configured (allow fallback)

  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, display_name, status')
    .order('course_code');

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
    source: 'database'
  })) || [];
}

/**
 * Get course content counts from database
 */
export async function getCourseContentCounts(courseCode) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [seedsResult, legosResult, phrasesResult] = await Promise.all([
    supabase.from('course_seeds').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_legos').select('*', { count: 'exact', head: true }).eq('course_code', courseCode),
    supabase.from('course_practice_phrases').select('*', { count: 'exact', head: true }).eq('course_code', courseCode)
  ]);

  return {
    seeds: seedsResult.count || 0,
    legos: legosResult.count || 0,
    phrases: phrasesResult.count || 0
  };
}

/**
 * Get course statistics
 */
export async function getCourseStats(courseCode) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  // Get total audio usage count
  const { count: totalSamples, error: usageError } = await supabase
    .from('course_audio_usage')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode);

  if (usageError) throw usageError;

  // Get flag status counts
  const { data: flagData, error: flagError } = await supabase
    .from('sample_flags')
    .select('status')
    .eq('course_code', courseCode);

  if (flagError) throw flagError;

  const statusCounts = {};
  for (const flag of flagData || []) {
    statusCounts[flag.status] = (statusCounts[flag.status] || 0) + 1;
  }

  return {
    courseCode,
    totalSamples: totalSamples || 0,
    flagged: flagData?.length || 0,
    statusCounts,
    approved: statusCounts['approved'] || 0,
    pending: statusCounts['pending'] || 0,
    complete: statusCounts['complete'] || 0
  };
}

// Export the getSupabase function for use by other API routes
export { getSupabase };

export default {
  isSupabaseConfigured,
  getSupabase,
  generateAudioUUID,
  normalizeText,
  getCourseAudioSamples,
  getCourseFlags,
  updateSampleFlag,
  bulkUpdateFlags,
  getAudioSample,
  getCourseStats,
  listCoursesFromDatabase,
  getCourseContentCounts
};
