#!/usr/bin/env node
/**
 * Wipe LEGOs and practice phrases for fra_for_eng, preserving seeds.
 * Also removes course_qa_flags that reference fra_for_eng phrases (FK constraint).
 */

require('dotenv').config({ path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const COURSE = 'fra_for_eng'

async function wipe() {
  console.log(`\nWiping LEGOs + phrases for: ${COURSE} (preserving seeds)`)
  console.log('='.repeat(60))

  // --- Count before deletion ---

  // QA flags that reference fra_for_eng phrases
  const { count: flagCount, error: flagCountErr } = await supabase
    .from('course_qa_flags')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE)
  if (flagCountErr) console.warn('  (could not count qa_flags:', flagCountErr.message, ')')

  const { count: phraseCount } = await supabase
    .from('course_practice_phrases')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE)

  const { count: legoCount } = await supabase
    .from('course_legos')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE)

  const { count: seedCount } = await supabase
    .from('course_seeds')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', COURSE)

  console.log(`Found: ${seedCount} seeds (will keep), ${legoCount} LEGOs, ${phraseCount} phrases, ${flagCount ?? '?'} QA flags`)

  // --- Step 1: Delete QA flags ---
  if (flagCount && flagCount > 0) {
    console.log('\n1. Deleting course_qa_flags...')
    const { error: flagErr } = await supabase
      .from('course_qa_flags')
      .delete()
      .eq('course_code', COURSE)
    if (flagErr) throw new Error(`Failed to delete qa_flags: ${flagErr.message}`)
    console.log(`   Deleted ${flagCount} QA flags`)
  } else {
    console.log('\n1. No QA flags to delete (0 found)')
  }

  // --- Step 2: Delete practice phrases ---
  console.log('2. Deleting course_practice_phrases...')
  const { error: phraseErr } = await supabase
    .from('course_practice_phrases')
    .delete()
    .eq('course_code', COURSE)
  if (phraseErr) throw new Error(`Failed to delete phrases: ${phraseErr.message}`)
  console.log(`   Deleted ${phraseCount} phrases`)

  // --- Step 3: Delete LEGOs ---
  console.log('3. Deleting course_legos...')
  const { error: legoErr } = await supabase
    .from('course_legos')
    .delete()
    .eq('course_code', COURSE)
  if (legoErr) throw new Error(`Failed to delete LEGOs: ${legoErr.message}`)
  console.log(`   Deleted ${legoCount} LEGOs`)

  // --- Step 4: Reset decomposed_at on all seeds ---
  console.log('4. Resetting decomposed_at on course_seeds...')
  const { error: resetErr } = await supabase
    .from('course_seeds')
    .update({ decomposed_at: null })
    .eq('course_code', COURSE)
  if (resetErr) throw new Error(`Failed to reset decomposed_at: ${resetErr.message}`)
  console.log(`   Reset decomposed_at on ${seedCount} seeds`)

  // --- Summary ---
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`  QA flags deleted:  ${flagCount ?? 0}`)
  console.log(`  Phrases deleted:   ${phraseCount}`)
  console.log(`  LEGOs deleted:     ${legoCount}`)
  console.log(`  Seeds preserved:   ${seedCount}`)
  console.log('\nDone. fra_for_eng LEGOs and phrases wiped, seeds intact.')
}

wipe().catch(err => {
  console.error('\nFATAL:', err.message)
  process.exit(1)
})
