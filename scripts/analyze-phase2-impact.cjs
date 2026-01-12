#!/usr/bin/env node
/**
 * Analyze the impact of running proper Phase 2 for zho_for_eng
 */
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function analyze() {
  const courseCode = 'zho_for_eng'

  console.log('=== PHASE 2 IMPACT ANALYSIS ===\n')

  // Load conflict report
  const report = JSON.parse(fs.readFileSync(`public/vfs/courses/${courseCode}/phase2_conflict_report.json`))

  console.log('📋 CONFLICT SUMMARY:')
  console.log(`   Total conflicts: ${report.summary.conflictCount}`)
  console.log(`   Affected LEGOs: ${report.summary.affectedLegos}`)

  // Count LEGOs that will need upchunking
  let upchunkNeeded = 0
  const conflictWords = new Set()
  for (const conflict of report.conflicts) {
    conflictWords.add(conflict.known)
    // Each conflict needs upchunking for all but the first target
    upchunkNeeded += conflict.targets.length - 1
  }

  console.log(`   Unique conflicting words: ${conflictWords.size}`)
  console.log(`   Upchunks needed (new M-types): ~${upchunkNeeded}`)

  // Get current database state
  const { data: currentLegos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, target_text, is_new')
    .eq('course_code', courseCode)

  const { data: currentPhrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', courseCode)

  const currentNewLegos = currentLegos.filter(l => l.is_new).length
  const currentBasketsCount = new Set(currentPhrases.map(p =>
    `S${String(p.seed_number).padStart(4,'0')}L${String(p.lego_index).padStart(2,'0')}`
  )).size

  console.log('\n📊 CURRENT STATE:')
  console.log(`   Total LEGOs in DB: ${currentLegos.length}`)
  console.log(`   NEW LEGOs (is_new=true): ${currentNewLegos}`)
  console.log(`   Baskets with phrases: ${currentBasketsCount}`)
  console.log(`   Total phrases: ${currentPhrases.length}`)

  // Estimate post-Phase 2 state
  // 1. Duplicates will be marked is_new=false (already partially done)
  // 2. Upchunked LEGOs will be NEW M-types
  // 3. Original A-types that got upchunked may become is_new=false

  const uniqueKnownTarget = new Set()
  for (const l of currentLegos) {
    uniqueKnownTarget.add(`${l.known_text?.toLowerCase()}|${l.target_text?.toLowerCase()}`)
  }

  console.log('\n🔮 ESTIMATED POST-PHASE 2:')
  console.log(`   Truly unique LEGOs: ~${uniqueKnownTarget.size}`)
  console.log(`   New upchunked M-types: ~${upchunkNeeded}`)
  console.log(`   Estimated NEW LEGOs: ~${uniqueKnownTarget.size - report.summary.affectedLegos + upchunkNeeded}`)

  // Identify baskets that would be orphaned
  // (LEGOs that are currently is_new=true but would become is_new=false)
  const affectedKnown = new Set(report.conflicts.map(c => c.known.toLowerCase()))

  let potentialOrphans = 0
  for (const l of currentLegos) {
    if (l.is_new && affectedKnown.has(l.known_text?.toLowerCase())) {
      potentialOrphans++
    }
  }

  console.log('\n⚠️  BASKETS IMPACT:')
  console.log(`   LEGOs in conflict zones: ${potentialOrphans}`)
  console.log(`   These may need basket regeneration after upchunking`)

  // Show top conflicts that will create new LEGOs
  console.log('\n🔝 TOP CONFLICTS (will create upchunked M-types):')
  for (const conflict of report.conflicts.slice(0, 10)) {
    console.log(`   "${conflict.known}" → ${conflict.targetCount} targets (${conflict.totalOccurrences} occurrences)`)
    for (const t of conflict.targets) {
      console.log(`      • "${t.target}" (${t.occurrences}x)`)
    }
  }
}

analyze().catch(console.error)
