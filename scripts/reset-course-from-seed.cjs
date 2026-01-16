#!/usr/bin/env node
/**
 * Reset course from a specific seed onwards
 * Keeps known_text but clears target_text, LEGOs, and phrases
 *
 * Usage: node scripts/reset-course-from-seed.cjs <course_code> <from_seed>
 * Example: node scripts/reset-course-from-seed.cjs zho_for_eng 51
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetCourseFromSeed(courseCode, fromSeed) {
  console.log(`\nResetting ${courseCode} from seed ${fromSeed} onwards...`)
  console.log('=' .repeat(50))

  // 1. Get current stats before reset
  const { count: seedsBefore } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', fromSeed)
    .neq('target_text', '')

  const { count: legosBefore } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', fromSeed)

  const { count: phrasesBefore } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', fromSeed)

  console.log(`\nBefore reset (seed >= ${fromSeed}):`)
  console.log(`  Seeds with target_text: ${seedsBefore}`)
  console.log(`  LEGOs: ${legosBefore}`)
  console.log(`  Phrases: ${phrasesBefore}`)

  // 2. Delete phrases for seeds >= fromSeed
  console.log(`\nDeleting phrases for seeds >= ${fromSeed}...`)
  const { error: phrasesError, count: phrasesDeleted } = await supabase
    .from('course_practice_phrases')
    .delete({ count: 'exact' })
    .eq('course_code', courseCode)
    .gte('seed_number', fromSeed)

  if (phrasesError) {
    console.error('Error deleting phrases:', phrasesError)
    process.exit(1)
  }
  console.log(`  Deleted ${phrasesDeleted} phrases`)

  // 3. Delete LEGOs for seeds >= fromSeed
  console.log(`\nDeleting LEGOs for seeds >= ${fromSeed}...`)
  const { error: legosError, count: legosDeleted } = await supabase
    .from('course_legos')
    .delete({ count: 'exact' })
    .eq('course_code', courseCode)
    .gte('seed_number', fromSeed)

  if (legosError) {
    console.error('Error deleting LEGOs:', legosError)
    process.exit(1)
  }
  console.log(`  Deleted ${legosDeleted} LEGOs`)

  // 4. Clear target_text for seeds >= fromSeed (keep known_text)
  console.log(`\nClearing target_text for seeds >= ${fromSeed}...`)
  const { error: seedsError, count: seedsCleared } = await supabase
    .from('course_seeds')
    .update({ target_text: '' }, { count: 'exact' })
    .eq('course_code', courseCode)
    .gte('seed_number', fromSeed)

  if (seedsError) {
    console.error('Error clearing seeds:', seedsError)
    process.exit(1)
  }
  console.log(`  Cleared target_text for ${seedsCleared} seeds`)

  // 5. Final stats
  const { count: seedsAfter } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .neq('target_text', '')

  const { count: legosAfter } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)

  const { count: phrasesAfter } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)

  console.log(`\n${'='.repeat(50)}`)
  console.log(`After reset:`)
  console.log(`  Seeds with target_text: ${seedsAfter}`)
  console.log(`  LEGOs: ${legosAfter}`)
  console.log(`  Phrases: ${phrasesAfter}`)
  console.log(`\nCourse ${courseCode} reset from seed ${fromSeed}. Ready for rebuild.`)
}

// Main
const courseCode = process.argv[2]
const fromSeed = parseInt(process.argv[3])

if (!courseCode || isNaN(fromSeed)) {
  console.error('Usage: node scripts/reset-course-from-seed.cjs <course_code> <from_seed>')
  console.error('Example: node scripts/reset-course-from-seed.cjs zho_for_eng 51')
  process.exit(1)
}

resetCourseFromSeed(courseCode, fromSeed)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
