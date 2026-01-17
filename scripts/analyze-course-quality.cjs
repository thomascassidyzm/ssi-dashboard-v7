#!/usr/bin/env node
/**
 * Course Quality Analysis - Sample SEEDs from multiple courses
 * Compares zho_for_eng, por_for_eng, deu_for_eng, fra_for_eng
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSES = ['zho_for_eng', 'por_for_eng', 'deu_for_eng', 'fra_for_eng']
const SAMPLE_SEEDS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60] // 10 samples from first 60

async function analyzeCourse(courseCode) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`COURSE: ${courseCode}`)
  console.log('='.repeat(80))

  // Get seeds
  const { data: seeds, error: seedError } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', courseCode)
    .in('seed_number', SAMPLE_SEEDS)
    .order('seed_number')

  if (seedError) {
    console.error(`Error fetching seeds: ${seedError.message}`)
    return
  }

  console.log(`\nFound ${seeds?.length || 0} seeds (sampling from ${SAMPLE_SEEDS.join(', ')})`)

  for (const seed of (seeds || [])) {
    console.log(`\n--- SEED ${seed.seed_number} ---`)
    console.log(`Known: "${seed.known_text}"`)
    console.log(`Target: "${seed.target_text}"`)

    // Get LEGOs for this seed
    const { data: legos, error: legoError } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seed.seed_number)
      .order('lego_index')

    if (legoError) {
      console.error(`Error fetching LEGOs: ${legoError.message}`)
      continue
    }

    console.log(`LEGOs (${legos?.length || 0}):`)
    for (const lego of (legos || [])) {
      const typeLabel = lego.lego_type === 'A' ? 'A-type' : 'M-type'
      console.log(`  [${lego.lego_index}] ${typeLabel}: "${lego.known_text}" → "${lego.target_text}"`)

      // Get practice phrases for this LEGO
      const { data: phrases, error: phraseError } = await supabase
        .from('course_practice_phrases')
        .select('*')
        .eq('course_code', courseCode)
        .eq('lego_id', lego.id)
        .order('phrase_index')

      if (!phraseError && phrases?.length > 0) {
        console.log(`    Phrases (${phrases.length}):`)
        for (const phrase of phrases.slice(0, 5)) { // Show first 5
          console.log(`      "${phrase.known_text}" → "${phrase.target_text}"`)
        }
        if (phrases.length > 5) {
          console.log(`      ... and ${phrases.length - 5} more`)
        }
      } else {
        console.log(`    Phrases: NONE`)
      }
    }
  }

  // Get overall stats
  const { count: totalSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .neq('target_text', '')

  const { count: totalLegos } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)

  const { count: totalPhrases } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)

  console.log(`\n📊 STATS: ${totalSeeds} seeds, ${totalLegos} LEGOs, ${totalPhrases} phrases`)
}

async function main() {
  console.log('Course Quality Analysis')
  console.log('Sampling SEEDs:', SAMPLE_SEEDS.join(', '))

  for (const course of COURSES) {
    await analyzeCourse(course)
  }
}

main().catch(console.error)
