/**
 * Supabase Client for Frontend
 *
 * Direct database access from Vercel-deployed dashboard.
 * Uses anon key (row-level security enabled).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create client only if credentials are available
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = !!supabase

/**
 * Get course progress directly from Supabase
 * Returns stats for seeds, legos, and practice phrases
 */
export async function getCourseProgress(courseCode) {
  if (!supabase) {
    console.warn('[Supabase] Not configured - missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
    return null
  }

  try {
    // Get seed count
    const { count: seedCount, error: seedError } = await supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    if (seedError) throw seedError

    // Get LEGO counts
    const { data: legoData, error: legoError } = await supabase
      .from('course_legos')
      .select('id, is_new')
      .eq('course_code', courseCode)

    if (legoError) throw legoError

    const legoCount = legoData?.length || 0
    const newLegoCount = legoData?.filter(l => l.is_new).length || 0

    // Get practice phrase count
    const { count: phraseCount, error: phraseError } = await supabase
      .from('course_practice_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)

    if (phraseError) throw phraseError

    // Get distinct seeds with practice phrases (Phase 3 complete)
    const { data: phase3Seeds, error: phase3Error } = await supabase
      .from('course_practice_phrases')
      .select('seed_number')
      .eq('course_code', courseCode)

    if (phase3Error) throw phase3Error

    const phase3SeedNumbers = [...new Set(phase3Seeds?.map(p => p.seed_number) || [])]

    return {
      seeds: seedCount || 0,
      legos: legoCount,
      newLegos: newLegoCount,
      practicePhrases: phraseCount || 0,
      phase3Complete: phase3SeedNumbers.length,
      phase3Seeds: phase3SeedNumbers.sort((a, b) => a - b)
    }
  } catch (error) {
    console.error('[Supabase] getCourseProgress error:', error)
    return null
  }
}

/**
 * Get seeds missing practice phrases (for Phase 3 resume)
 *
 * @param {string} courseCode
 * @param {number} startSeed
 * @param {number} endSeed
 * @returns {Promise<number[]>} Array of seed numbers missing phrases
 */
export async function getMissingSeedsForPhase3(courseCode, startSeed = 1, endSeed = 668) {
  if (!supabase) {
    console.warn('[Supabase] Not configured')
    return null
  }

  try {
    // Get all new LEGOs in range
    const { data: legos, error: legoError } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .eq('is_new', true)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed)

    if (legoError) throw legoError

    if (!legos || legos.length === 0) return []

    // Get LEGOs that have practice phrases
    const { data: phrasedLegos, error: phraseError } = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index')
      .eq('course_code', courseCode)
      .gte('seed_number', startSeed)
      .lte('seed_number', endSeed)

    if (phraseError) throw phraseError

    // Build set of LEGOs with phrases
    const legoWithPhrases = new Set(
      (phrasedLegos || []).map(p => `${p.seed_number}:${p.lego_index}`)
    )

    // Find seeds with missing LEGOs
    const seedsWithMissing = new Set()
    for (const lego of legos) {
      if (!legoWithPhrases.has(`${lego.seed_number}:${lego.lego_index}`)) {
        seedsWithMissing.add(lego.seed_number)
      }
    }

    return [...seedsWithMissing].sort((a, b) => a - b)
  } catch (error) {
    console.error('[Supabase] getMissingSeedsForPhase3 error:', error)
    return null
  }
}
