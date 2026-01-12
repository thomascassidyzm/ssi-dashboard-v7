#!/usr/bin/env node
/**
 * Show actual duplicate examples to explain the deduplication
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function showDuplicates() {
  const courseCode = 'zho_for_eng'

  // Get all phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)

  // Get NEW LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text')
    .eq('course_code', courseCode)
    .eq('is_new', true)

  // Find known_text duplicates
  const knownCounts = {}
  for (const p of phrases) {
    const key = p.known_text?.toLowerCase().trim()
    if (!knownCounts[key]) knownCounts[key] = []
    knownCounts[key].push(`S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}`)
  }

  // Find target_text duplicates
  const targetCounts = {}
  for (const p of phrases) {
    const key = p.target_text?.toLowerCase().trim()
    if (!targetCounts[key]) targetCounts[key] = []
    targetCounts[key].push(`S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}`)
  }

  // Find presentation duplicates (same known_text across NEW LEGOs)
  const presCounts = {}
  for (const l of legos) {
    const key = l.known_text?.toLowerCase().trim()
    if (!presCounts[key]) presCounts[key] = []
    presCounts[key].push(l.lego_id)
  }

  console.log('=== KNOWN TEXT DUPLICATES (same English text in multiple phrases) ===')
  const knownDups = Object.entries(knownCounts).filter(([k,v]) => v.length > 1).sort((a,b) => b[1].length - a[1].length)
  console.log(`Found ${knownDups.length} known texts appearing in multiple phrases`)
  console.log('\nTop 10 most repeated:')
  for (const [text, locations] of knownDups.slice(0, 10)) {
    console.log(`  "${text.substring(0,50)}${text.length > 50 ? '...' : ''}" → ${locations.length} phrases`)
    console.log(`    Locations: ${locations.slice(0,5).join(', ')}${locations.length > 5 ? '...' : ''}`)
  }

  console.log('\n=== TARGET TEXT DUPLICATES (same Chinese text in multiple phrases) ===')
  const targetDups = Object.entries(targetCounts).filter(([k,v]) => v.length > 1).sort((a,b) => b[1].length - a[1].length)
  console.log(`Found ${targetDups.length} target texts appearing in multiple phrases`)
  console.log('\nTop 10 most repeated:')
  for (const [text, locations] of targetDups.slice(0, 10)) {
    console.log(`  "${text.substring(0,50)}${text.length > 50 ? '...' : ''}" → ${locations.length} phrases`)
    console.log(`    Locations: ${locations.slice(0,5).join(', ')}${locations.length > 5 ? '...' : ''}`)
  }

  console.log('\n=== PRESENTATION DUPLICATES (same word introduced by multiple NEW LEGOs) ===')
  const presDups = Object.entries(presCounts).filter(([k,v]) => v.length > 1).sort((a,b) => b[1].length - a[1].length)
  console.log(`Found ${presDups.length} words introduced by multiple NEW LEGOs`)
  console.log('\nTop 10 most repeated:')
  for (const [text, legoIds] of presDups.slice(0, 10)) {
    console.log(`  "${text}" → ${legoIds.length} LEGOs: ${legoIds.join(', ')}`)
  }

  // Summary
  console.log('\n=== SUMMARY ===')
  const totalKnownDups = knownDups.reduce((sum, [k,v]) => sum + v.length - 1, 0)
  const totalTargetDups = targetDups.reduce((sum, [k,v]) => sum + v.length - 1, 0)
  const totalPresDups = presDups.reduce((sum, [k,v]) => sum + v.length - 1, 0)

  console.log(`Known: ${phrases.length} phrases - ${totalKnownDups} duplicates = ${phrases.length - totalKnownDups} unique`)
  console.log(`Target: ${phrases.length} phrases - ${totalTargetDups} duplicates = ${phrases.length - totalTargetDups} unique`)
  console.log(`Presentation: ${legos.length} LEGOs - ${totalPresDups} duplicates = ${legos.length - totalPresDups} unique`)
}

showDuplicates().catch(console.error)
