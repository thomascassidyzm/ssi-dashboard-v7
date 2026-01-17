#!/usr/bin/env node
/**
 * Course Quality Analysis v2 - Deeper investigation
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSES = ['zho_for_eng', 'por_for_eng', 'deu_for_eng', 'fra_for_eng']

async function investigatePhrases(courseCode) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`COURSE: ${courseCode} - PHRASE INVESTIGATION`)
  console.log('='.repeat(80))

  // First, check what columns exist in course_legos
  const { data: sampleLego } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', courseCode)
    .limit(1)
    .single()

  if (sampleLego) {
    console.log('\nLEGO columns:', Object.keys(sampleLego).join(', '))
    console.log('Sample LEGO:', JSON.stringify(sampleLego, null, 2))
  }

  // Check what columns exist in course_practice_phrases
  const { data: samplePhrase } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', courseCode)
    .limit(1)
    .single()

  if (samplePhrase) {
    console.log('\nPHRASE columns:', Object.keys(samplePhrase).join(', '))
    console.log('Sample Phrase:', JSON.stringify(samplePhrase, null, 2))
  }

  // Get some phrases with their linked LEGOs
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', courseCode)
    .limit(20)
    .order('seed_number', { ascending: true })

  console.log(`\n--- First 20 Phrases ---`)
  for (const p of (phrases || [])) {
    console.log(`Seed ${p.seed_number}, Lego ${p.lego_id}: "${p.known_text}" → "${p.target_text}"`)
  }

  // Check if lego_id in phrases matches id in legos
  if (phrases?.length > 0) {
    const legoIds = [...new Set(phrases.map(p => p.lego_id))]
    console.log(`\nUnique lego_ids in first 20 phrases: ${legoIds.slice(0, 5).join(', ')}...`)

    // Try to find these legos
    const { data: matchedLegos } = await supabase
      .from('course_legos')
      .select('id, known_text, target_text, seed_number')
      .in('id', legoIds.slice(0, 5))

    console.log(`\nMatched LEGOs:`)
    for (const l of (matchedLegos || [])) {
      console.log(`  ${l.id}: "${l.known_text}" → "${l.target_text}" (seed ${l.seed_number})`)
    }
  }
}

async function analyzeLegoTypes(courseCode) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`COURSE: ${courseCode} - LEGO TYPE ANALYSIS`)
  console.log('='.repeat(80))

  // Count A-types vs M-types
  const { data: typeStats } = await supabase
    .from('course_legos')
    .select('lego_type')
    .eq('course_code', courseCode)

  const counts = { A: 0, M: 0, other: 0 }
  for (const l of (typeStats || [])) {
    if (l.lego_type === 'A') counts.A++
    else if (l.lego_type === 'M') counts.M++
    else counts.other++
  }
  console.log(`LEGO Types: A=${counts.A}, M=${counts.M}, other=${counts.other}`)

  // Look for single-word LEGOs marked as M-type (potential issue)
  const { data: legos } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', courseCode)
    .eq('lego_type', 'M')
    .limit(50)

  const singleWordMLegos = (legos || []).filter(l => {
    const knownWords = l.known_text.trim().split(/\s+/).length
    return knownWords === 1
  })

  console.log(`\nSingle-word M-type LEGOs (first 10):`)
  for (const l of singleWordMLegos.slice(0, 10)) {
    console.log(`  Seed ${l.seed_number}: "${l.known_text}" → "${l.target_text}"`)
  }

  // Check for unusual known_text patterns
  console.log(`\nUnusual known_text patterns (parenthetical or special):`)
  const unusual = (legos || []).filter(l =>
    l.known_text.includes('(') ||
    l.known_text.includes('[') ||
    l.known_text.length <= 2
  )
  for (const l of unusual.slice(0, 10)) {
    console.log(`  Seed ${l.seed_number}: "${l.known_text}" → "${l.target_text}"`)
  }
}

async function compareDecomposition() {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`DECOMPOSITION COMPARISON ACROSS LANGUAGES`)
  console.log('='.repeat(80))

  const testSeeds = [1, 10, 25, 40]

  for (const seedNum of testSeeds) {
    console.log(`\n--- SEED ${seedNum} ---`)

    for (const course of COURSES) {
      const { data: seed } = await supabase
        .from('course_seeds')
        .select('*')
        .eq('course_code', course)
        .eq('seed_number', seedNum)
        .single()

      const { data: legos } = await supabase
        .from('course_legos')
        .select('*')
        .eq('course_code', course)
        .eq('seed_number', seedNum)
        .order('lego_index')

      const legoCount = legos?.length || 0
      const lang = course.split('_')[0].toUpperCase()

      console.log(`  ${lang}: ${legoCount} LEGOs - "${seed?.target_text || 'NO SEED'}"`)
    }
  }
}

async function samplePhrasesPerCourse() {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`PHRASE QUALITY SAMPLES`)
  console.log('='.repeat(80))

  for (const course of COURSES) {
    console.log(`\n--- ${course} ---`)

    // Get phrases from seed 1-5 range
    const { data: phrases } = await supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', course)
      .gte('seed_number', 1)
      .lte('seed_number', 10)
      .limit(15)
      .order('seed_number', { ascending: true })
      .order('phrase_index', { ascending: true })

    for (const p of (phrases || [])) {
      console.log(`  S${p.seed_number}: "${p.known_text}" → "${p.target_text}"`)
    }

    if (!phrases?.length) {
      console.log(`  NO PHRASES FOUND for seeds 1-10`)
    }
  }
}

async function main() {
  // First investigate the phrase linking issue
  await investigatePhrases('zho_for_eng')

  // Analyze LEGO types across courses
  for (const course of COURSES) {
    await analyzeLegoTypes(course)
  }

  // Compare decomposition patterns
  await compareDecomposition()

  // Sample actual phrase quality
  await samplePhrasesPerCourse()
}

main().catch(console.error)
