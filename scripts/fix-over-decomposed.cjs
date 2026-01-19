#!/usr/bin/env node
/**
 * Fix over-decomposed seeds (>5 LEGOs)
 * Deletes LEGOs and phrases for those seeds, clears target_text for reprocessing
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const courseCode = process.argv[2]
const dryRun = process.argv[3] !== '--execute'

if (!courseCode) {
  console.error('Usage: node fix-over-decomposed.cjs <course_code> [--execute]')
  console.error('Example: node fix-over-decomposed.cjs deu_for_eng --execute')
  console.error('\nWithout --execute, shows what would be done (dry run)')
  process.exit(1)
}

async function fixOverDecomposed(code) {
  console.log(`\n${dryRun ? '🔍 DRY RUN' : '🔧 EXECUTING'} - Fix over-decomposed seeds for: ${code}`)
  console.log('='.repeat(60))

  // Find seeds with >5 LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', code)

  const seedCounts = {}
  for (const l of (legos || [])) {
    seedCounts[l.seed_number] = (seedCounts[l.seed_number] || 0) + 1
  }

  const overDecomposed = Object.entries(seedCounts)
    .filter(([s, c]) => c > 5)
    .map(([s, c]) => ({ seed: parseInt(s), count: c }))
    .sort((a, b) => a.seed - b.seed)

  if (overDecomposed.length === 0) {
    console.log('✅ No over-decomposed seeds found!')
    return
  }

  console.log(`Found ${overDecomposed.length} seeds with >5 LEGOs:\n`)

  // Show what we'll fix
  for (const { seed, count } of overDecomposed) {
    const { data: seedData } = await supabase
      .from('course_seeds')
      .select('known_text')
      .eq('course_code', code)
      .eq('seed_number', seed)
      .single()

    console.log(`  Seed ${seed}: ${count} LEGOs - "${seedData?.known_text?.substring(0, 50)}..."`)
  }

  const seedNumbers = overDecomposed.map(o => o.seed)

  // Count what we'll delete
  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', code)
    .in('seed_number', seedNumbers)

  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', code)
    .in('seed_number', seedNumbers)

  console.log(`\nWill delete: ${legoCount} LEGOs, ${phraseCount} phrases`)
  console.log(`(Keeping target_text - translation stays, just re-decompose)`)

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - no changes made. Use --execute to apply.')
    return
  }

  // Execute the fix
  console.log('\nDeleting phrases...')
  const { error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('course_code', code)
    .in('seed_number', seedNumbers)
  if (phraseErr) throw phraseErr
  console.log(`  ✓ Deleted ${phraseCount} phrases`)

  console.log('Deleting LEGOs...')
  const { error: legoErr } = await supabase
    .from('course_legos')
    .delete()
    .eq('course_code', code)
    .in('seed_number', seedNumbers)
  if (legoErr) throw legoErr
  console.log(`  ✓ Deleted ${legoCount} LEGOs`)

  console.log('\n✅ Done! These seeds will be reprocessed on next build run.')
  console.log('Seeds to redo:', seedNumbers.join(', '))
}

fixOverDecomposed(courseCode).catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
