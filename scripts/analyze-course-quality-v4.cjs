#!/usr/bin/env node
/**
 * Course Quality Analysis v4 - Sample seeds 100-260
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSES = ['zho_for_eng', 'por_for_eng', 'deu_for_eng']
const SAMPLE_SEEDS = [100, 120, 140, 160, 180, 200, 220, 240, 250, 260]

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

  console.log(`\nFound ${seeds?.length || 0} seeds (sampling ${SAMPLE_SEEDS.join(', ')})`)

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
      const isNewLabel = lego.is_new ? '(NEW)' : '(repeat)'
      console.log(`  [${lego.lego_index}] ${typeLabel} ${isNewLabel}: "${lego.known_text}" → "${lego.target_text}"`)

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

  // Stats for range 100-260
  const { count: totalSeeds } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', courseCode)
    .gte('seed_number', 100)
    .lte('seed_number', 260)
    .neq('target_text', '')

  const { data: legoData } = await supabase
    .from('course_legos')
    .select('seed_number, is_new')
    .eq('course_code', courseCode)
    .gte('seed_number', 100)
    .lte('seed_number', 260)

  const newLegos = legoData?.filter(l => l.is_new).length || 0
  const repeatLegos = legoData?.filter(l => !l.is_new).length || 0

  console.log(`\n📊 STATS (seeds 100-260): ${totalSeeds} seeds`)
  console.log(`   New LEGOs: ${newLegos}, Repeat LEGOs: ${repeatLegos}`)
}

async function main() {
  for (const course of COURSES) {
    await analyzeCourse(course)
  }
}

main().catch(console.error)
