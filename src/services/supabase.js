/**
 * Frontend Supabase Client
 *
 * Direct database access for read-only queries.
 * Uses anon key which is safe for browser exposure.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client only if configured
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isConfigured = () => !!supabase

/**
 * Get course stats directly from database
 * @param {string} courseCode
 * @returns {Promise<{seeds: number, legos: number, practicePhrases: number, audio: number}>}
 */
export async function getCourseStats(courseCode) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Run all count queries in parallel
  const [seedsResult, legosResult, phrasesResult, audioResult] = await Promise.all([
    supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    supabase
      .from('course_legos')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode),
    supabase
      .from('course_audio')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
  ])

  return {
    seeds: seedsResult.count || 0,
    legos: legosResult.count || 0,
    practicePhrases: phrasesResult.count || 0,
    audio: audioResult.count || 0
  }
}

/**
 * Get course info from database
 * @param {string} courseCode
 * @returns {Promise<Object>}
 */
export async function getCourseInfo(courseCode) {
  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, display_name, status, course_type, voice_config')
    .eq('course_code', courseCode)
    .single()

  if (error) {
    console.error('Failed to get course info:', error)
    return null
  }

  return data
}
