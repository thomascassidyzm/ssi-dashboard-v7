#!/usr/bin/env node
/**
 * Course Quality Analysis v3 - Fixed phrase linking
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSES = ['zho_for_eng', 'por_for_eng', 'deu_for_eng', 'fra_for_eng']
const SAMPLE_SEEDS = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60]

async function analyzeCourse(courseCode) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`COURSE: ${courseCode}`)
  console.log('='.repeat(80))

  // Get seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('*')
    .eq('course_code', courseCode)
    .in('seed_number', SAMPLE_SEEDS)
    .order('seed_number')

  console.log(`\nFound ${seeds?.length || 0} seeds`)

  for (const seed of (seeds || [])) {
    console.log(`\n--- SEED ${seed.seed_number} ---`)
    console.log(`Known: "${seed.known_text}"`)
    console.log(`Target: "${seed.target_text}"`)

    // Get LEGOs for this seed
    const { data: legos } = await supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', courseCode)
      .eq('seed_number', seed.seed_number)
      .order('lego_index')

    console.log(`LEGOs (${legos?.length || 0}):`)
    for (const lego of (legos || [])) {
      const typeLabel = lego.type === 'A' ? 'A-type' : 'M-type'
      console.log(`  [${lego.lego_index}] ${typeLabel}: "${lego.known_text}" → "${lego.target_text}"`)

      // Get practice phrases using seed_number + lego_index
      const { data: phrases } = await supabase
        .from('course_practice_phrases')
        .select('*')
        .eq('course_code', courseCode)
        .eq('seed_number', seed.seed_number)
        .eq('lego_index', lego.lego_index)
        .order('position')

      if (phrases?.length > 0) {
        console.log(`    Phrases (${phrases.length}):`)
        for (const phrase of phrases.slice(0, 5)) {
          const meta = phrase.metadata?.buildup || ''
          console.log(`      [${meta}] "${phrase.known_text}" → "${phrase.target_text}"`)
        }
        if (phrases.length > 5) {
          console.log(`      ... and ${phrases.length - 5} more`)
        }
      } else {
        console.log(`    Phrases: NONE`)
      }
    }
  }

  // Stats
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
  console.log(`   Avg LEGOs/seed: ${(totalLegos/totalSeeds).toFixed(1)}`)
  console.log(`   Avg phrases/LEGO: ${(totalPhrases/totalLegos).toFixed(1)}`)
}

async function main() {
  for (const course of COURSES) {
    await analyzeCourse(course)
  }
}

main().catch(console.error)
