#!/usr/bin/env node
/**
 * Verify audio deduplication counts for zho_for_eng
 * This script confirms that the "discrepancy" is actually correct deduplication
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function verify() {
  const courseCode = 'zho_for_eng'

  console.log('Fetching data from Supabase...\n')

  // Get all phrases
  const { data: phrases, error: pErr } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)

  if (pErr) throw pErr

  // Get NEW LEGOs
  const { data: legos, error: lErr } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, is_new')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  if (lErr) throw lErr

  // Count raw
  console.log('=== RAW COUNTS (what DB shows) ===')
  console.log(`Total phrases: ${phrases.length}`)
  console.log(`NEW LEGOs: ${legos.length}`)

  // Deduplicate for audio needs
  const uniqueKnown = new Set()
  const uniqueTarget = new Set()
  const uniquePresentation = new Set()

  for (const p of phrases) {
    if (p.known_text) uniqueKnown.add(p.known_text.toLowerCase().trim())
    if (p.target_text) uniqueTarget.add(p.target_text.toLowerCase().trim())
  }

  for (const l of legos) {
    if (l.known_text) uniquePresentation.add(l.known_text.toLowerCase().trim())
  }

  console.log('\n=== DEDUPLICATED COUNTS (unique audio files needed) ===')
  console.log(`Unique known texts: ${uniqueKnown.size}`)
  console.log(`Unique target texts: ${uniqueTarget.size}`)
  console.log(`Unique presentation texts: ${uniquePresentation.size}`)

  console.log('\n=== EXPECTED AUDIO NEEDS ===')
  console.log(`Known role: ${uniqueKnown.size}`)
  console.log(`Target1 role: ${uniqueTarget.size}`)
  console.log(`Target2 role: ${uniqueTarget.size}`)
  console.log(`Presentation role: ${uniquePresentation.size}`)
  console.log(`TOTAL: ${uniqueKnown.size + uniqueTarget.size * 2 + uniquePresentation.size}`)

  console.log('\n=== DEDUPLICATION SAVINGS ===')
  console.log(`Known: ${phrases.length} phrases → ${uniqueKnown.size} unique (${phrases.length - uniqueKnown.size} duplicates)`)
  console.log(`Target: ${phrases.length} phrases → ${uniqueTarget.size} unique (${phrases.length - uniqueTarget.size} duplicates)`)
  console.log(`Presentation: ${legos.length} LEGOs → ${uniquePresentation.size} unique (${legos.length - uniquePresentation.size} duplicates)`)
}

verify().catch(console.error)
