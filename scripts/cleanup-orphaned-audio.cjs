#!/usr/bin/env node
/**
 * Cleanup orphaned audio records from course_audio.
 *
 * Orphans accumulate when phrases are deleted (QA, rebuilds, wipes)
 * but their audio records remain. This script finds audio whose text
 * no longer appears in any current phrase or LEGO and deletes it.
 *
 * S3 files are left untouched (cheap storage, no size implications).
 *
 * Usage:
 *   node scripts/cleanup-orphaned-audio.cjs <course_code>              # dry-run
 *   node scripts/cleanup-orphaned-audio.cjs <course_code> --execute    # actually delete
 *   node scripts/cleanup-orphaned-audio.cjs --all                      # dry-run all courses
 *   node scripts/cleanup-orphaned-audio.cjs --all --execute            # delete all courses
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

function normalize(text) {
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

async function fetchAll(table, courseCode, columns = '*') {
  const rows = []
  const PAGE = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('course_code', courseCode)
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return rows
}

async function cleanupCourse(courseCode, execute) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${courseCode}`)
  console.log('='.repeat(60))

  // 1. Build needed text sets from current phrases + LEGOs
  console.log('\nFetching current phrases...')
  const phrases = await fetchAll('course_practice_phrases', courseCode, 'known_text, target_text')
  console.log(`  ${phrases.length} phrases`)

  console.log('Fetching current LEGOs...')
  const legos = await fetchAll('course_legos', courseCode, 'known_text, target_text, presentation_audio_id')
  console.log(`  ${legos.length} LEGOs`)

  // Needed known texts (for 'known' role audio)
  const neededKnown = new Set()
  for (const p of phrases) neededKnown.add(normalize(p.known_text))
  for (const l of legos) neededKnown.add(normalize(l.known_text))

  // Needed target texts (for 'target1' and 'target2' role audio)
  const neededTarget = new Set()
  for (const p of phrases) neededTarget.add(normalize(p.target_text))
  for (const l of legos) neededTarget.add(normalize(l.target_text))

  // Needed presentation audio IDs
  const neededPresentationIds = new Set()
  for (const l of legos) {
    if (l.presentation_audio_id) neededPresentationIds.add(l.presentation_audio_id)
  }

  console.log(`\nNeeded texts: ${neededKnown.size} known, ${neededTarget.size} target`)

  // 2. Page through all course_audio and find orphans
  console.log('Fetching audio records...')
  const allAudio = await fetchAll('course_audio', courseCode, 'id, text_normalized, role')
  console.log(`  ${allAudio.length} total audio records`)

  const orphanIds = []
  for (const a of allAudio) {
    const text = a.text_normalized
    const role = a.role

    if (role === 'known') {
      if (!neededKnown.has(text)) orphanIds.push(a.id)
    } else if (role === 'target1' || role === 'target2') {
      if (!neededTarget.has(text)) orphanIds.push(a.id)
    } else if (role === 'presentation') {
      if (!neededPresentationIds.has(a.id)) orphanIds.push(a.id)
    }
    // encouragement/instruction roles: leave alone
  }

  const kept = allAudio.length - orphanIds.length
  console.log(`\n  KEEP:   ${kept} audio records (text still in course)`)
  console.log(`  DELETE: ${orphanIds.length} orphaned audio records`)

  if (orphanIds.length === 0) {
    console.log('  Nothing to clean up!')
    return { courseCode, total: allAudio.length, orphans: 0, deleted: 0 }
  }

  if (!execute) {
    console.log('\n  DRY RUN — pass --execute to delete')
    return { courseCode, total: allAudio.length, orphans: orphanIds.length, deleted: 0 }
  }

  // 3. Clear ALL audio FK references for the course in one pass
  //    (much faster than per-orphan batching — FKs get re-populated by Phase 8)
  console.log('\n  Clearing all audio FK references for course...')
  await supabase
    .from('course_practice_phrases')
    .update({ known_audio_id: null, target1_audio_id: null, target2_audio_id: null })
    .eq('course_code', courseCode)
    .not('known_audio_id', 'is', null)

  await supabase
    .from('course_practice_phrases')
    .update({ target1_audio_id: null, target2_audio_id: null })
    .eq('course_code', courseCode)
    .not('target1_audio_id', 'is', null)

  await supabase
    .from('course_legos')
    .update({ known_audio_id: null, target1_audio_id: null, target2_audio_id: null, presentation_audio_id: null })
    .eq('course_code', courseCode)
    .not('known_audio_id', 'is', null)

  console.log('  FK references cleared.')

  // 4. Delete orphaned audio records in batches
  console.log('  Deleting orphaned audio...')
  const BATCH = 500
  let deleted = 0
  for (let i = 0; i < orphanIds.length; i += BATCH) {
    const batch = orphanIds.slice(i, i + BATCH)
    const { error } = await supabase
      .from('course_audio')
      .delete()
      .in('id', batch)
    if (error) {
      console.error(`  Error deleting batch at offset ${i}:`, error.message)
    } else {
      deleted += batch.length
    }
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= orphanIds.length) {
      console.log(`    ${Math.min(deleted, orphanIds.length)}/${orphanIds.length}`)
    }
  }

  console.log(`\n  DONE: deleted ${deleted} orphaned audio records`)
  return { courseCode, total: allAudio.length, orphans: orphanIds.length, deleted }
}

async function main() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute')
  const all = args.includes('--all')
  const courseCodes = args.filter(a => !a.startsWith('--'))

  if (!all && courseCodes.length === 0) {
    console.log('Usage:')
    console.log('  node scripts/cleanup-orphaned-audio.cjs <course_code>           # dry-run')
    console.log('  node scripts/cleanup-orphaned-audio.cjs <course_code> --execute  # delete')
    console.log('  node scripts/cleanup-orphaned-audio.cjs --all                    # dry-run all')
    console.log('  node scripts/cleanup-orphaned-audio.cjs --all --execute          # delete all')
    process.exit(1)
  }

  let targets = courseCodes
  if (all) {
    const { data, error } = await supabase
      .from('courses')
      .select('course_code')
      .order('course_code')
    if (error) throw error
    targets = data.map(c => c.course_code)
    console.log(`Found ${targets.length} courses`)
  }

  console.log(execute ? '\n*** EXECUTE MODE ***' : '\n*** DRY RUN ***')

  const results = []
  for (const code of targets) {
    const result = await cleanupCourse(code, execute)
    results.push(result)
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('  SUMMARY')
  console.log('='.repeat(60))
  console.log(`${'Course'.padEnd(20)} ${'Total'.padStart(8)} ${'Orphans'.padStart(8)} ${'Deleted'.padStart(8)}`)
  console.log('-'.repeat(48))
  for (const r of results) {
    console.log(`${r.courseCode.padEnd(20)} ${String(r.total).padStart(8)} ${String(r.orphans).padStart(8)} ${String(r.deleted).padStart(8)}`)
  }

  const totalOrphans = results.reduce((s, r) => s + r.orphans, 0)
  const totalDeleted = results.reduce((s, r) => s + r.deleted, 0)
  if (!execute && totalOrphans > 0) {
    console.log(`\n${totalOrphans} orphans found. Run with --execute to delete.`)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
