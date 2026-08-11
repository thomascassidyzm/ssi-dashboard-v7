#!/usr/bin/env node
/**
 * Live round-trip harness for redo snapshots — against the REAL database, but
 * only ever against a disposable course it creates and then destroys.
 *
 * It never touches real course content: everything happens under the course
 * code below, which exists for the length of this run.
 *
 * Sequence mirrors POST /api/build/redo exactly:
 *   seed a fake decomposition → snapshotSeeds() → the endpoint's delete order →
 *   latestSnapshots()/formatSnapshotForBrief() (what the agent would see) →
 *   restoreSnapshot() → assert byte-for-byte round trip → tear down.
 *
 * Run: node tools/redo-snapshot-live-harness.cjs
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const {
  snapshotSeeds, latestSnapshots, restoreSnapshot, formatSnapshotForBrief,
} = require('../services/course-builder/lib/redo-snapshot.cjs')

const COURSE = 'zzz_redosnap_for_tst'
const SEED = 1
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

let failures = 0
function check(label, cond, detail = '') {
  if (cond) console.log(`  ✓ ${label}`)
  else { failures++; console.log(`  ✗ ${label} ${detail}`) }
}

async function teardown() {
  await sb.from('course_practice_phrases').delete().eq('course_code', COURSE)
  await sb.from('course_legos').delete().eq('course_code', COURSE)
  await sb.from('course_seeds').delete().eq('course_code', COURSE)
  await sb.from('seed_redo_snapshots').delete().eq('course_code', COURSE)
  await sb.from('courses').delete().eq('course_code', COURSE)
}

async function main() {
  await teardown() // in case a previous run died mid-way

  console.log(`\nSetting up disposable course ${COURSE}…`)
  let { error } = await sb.from('courses').insert({
    course_code: COURSE, display_name: 'REDO SNAPSHOT TEST (disposable)',
    known_lang: 'eng', target_lang: 'fra', status: 'draft', visibility: 'hidden',
  })
  if (error) throw new Error(`course insert: ${error.message}`)

  ;({ error } = await sb.from('course_seeds').insert({
    course_code: COURSE, seed_number: SEED,    known_text: 'i want to speak', target_text: 'je veux parler',
    decomposed_at: '2026-08-01T10:00:00+00', flagged_at: '2026-08-10T09:00:00+00',
  }))
  if (error) throw new Error(`seed insert: ${error.message}`)

  ;({ error } = await sb.from('course_legos').insert([
    { course_code: COURSE, seed_number: SEED, lego_index: 1, type: 'M', is_new: true,
      known_text: 'i want', target_text: 'je veux', components: [{ known: 'i', target: 'je' }] },
    { course_code: COURSE, seed_number: SEED, lego_index: 2, type: 'A', is_new: true,
      known_text: 'to speak', target_text: 'parler' },
  ]))
  if (error) throw new Error(`lego insert: ${error.message}`)

  ;({ error } = await sb.from('course_practice_phrases').insert([
    { id: `${COURSE}:S0001L01B01`, course_code: COURSE, seed_number: SEED, lego_index: 1, position: 1,
      known_text: 'i want to speak', target_text: 'je veux parler', word_count: 3, lego_count: 2, phrase_role: 'build' },
    { id: `${COURSE}:S0001L01U01`, course_code: COURSE, seed_number: SEED, lego_index: 1, position: 2,
      known_text: 'i want to speak french', target_text: 'je veux parler français', word_count: 4, lego_count: 2, phrase_role: 'use' },
    { id: `${COURSE}:S0001L02U01`, course_code: COURSE, seed_number: SEED, lego_index: 2, position: 1,
      known_text: 'i want to speak now', target_text: 'je veux parler maintenant', word_count: 4, lego_count: 2, phrase_role: 'use' },
  ]))
  if (error) throw new Error(`phrase insert: ${error.message}`)

  const { data: originalLegos } = await sb.from('course_legos').select('*')
    .eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index')
  const { data: originalPhrases } = await sb.from('course_practice_phrases').select('*')
    .eq('course_code', COURSE).eq('seed_number', SEED).order('id')

  console.log('\n1. Snapshot before delete')
  const { batchId, snapshots } = await snapshotSeeds(sb, COURSE, [SEED], { reason: 'redo', notes: 'make this less formal' })
  check('snapshot row written', snapshots.length === 1)
  check('2 LEGOs / 3 phrases captured', snapshots[0].lego_count === 2 && snapshots[0].phrase_count === 3,
    JSON.stringify(snapshots[0]))

  console.log('\n2. The redo endpoint\'s destructive step')
  await sb.from('course_practice_phrases').delete().eq('course_code', COURSE).eq('seed_number', SEED)
  await sb.from('course_legos').delete().eq('course_code', COURSE).eq('seed_number', SEED)
  await sb.from('course_seeds').update({ decomposed_at: null, approved_at: null, flagged_at: null })
    .eq('course_code', COURSE).eq('seed_number', SEED)
  const { count: goneLegos } = await sb.from('course_legos').select('id', { count: 'exact', head: true })
    .eq('course_code', COURSE).eq('seed_number', SEED)
  check('live rows are gone', goneLegos === 0)

  console.log('\n3. What the rebuild agent now sees in its brief')
  const snaps = await latestSnapshots(sb, COURSE, [SEED])
  const md = formatSnapshotForBrief(snaps.get(SEED))
  check('brief section renders after the delete', !!md && md.includes('**L1 (M)**: "i want" → "je veux"'))
  check('brief carries BUILD and USE', md.includes('BUILD (1):') && md.includes('USE (1):'))
  console.log('\n--- brief section ---\n' + md + '\n---------------------')

  console.log('\n3b. The real brief the redo endpoint would hand the agent')
  const generateRedoBrief = require('../services/briefs/redo.cjs')
  const brief = await generateRedoBrief(COURSE, { seeds: String(SEED), notes: 'make this less formal' })
  check('brief contains the "Decomposition You Are Replacing" section',
    brief.includes('## The Decomposition You Are Replacing'))
  check('brief shows the old LEGO split', brief.includes('"i want" → "je veux"'))
  check('brief still carries the human notes', brief.includes('make this less formal'))

  console.log('\n4. The rebuild agent writes a different (worse) version')
  await sb.from('course_legos').insert([{ course_code: COURSE, seed_number: SEED, lego_index: 1,
    type: 'A', is_new: true, known_text: 'i want', target_text: 'je souhaite' }])
  await sb.from('course_practice_phrases').insert([{ id: `${COURSE}:S0001L01U01`, course_code: COURSE,
    seed_number: SEED, lego_index: 1, position: 1, known_text: 'i want to speak',
    target_text: 'je souhaite parler', word_count: 3, lego_count: 2, phrase_role: 'use' }])
  await sb.from('course_seeds').update({ decomposed_at: new Date().toISOString() })
    .eq('course_code', COURSE).eq('seed_number', SEED)

  console.log('\n5. Undo (dry run first)')
  const dry = await restoreSnapshot(sb, { courseCode: COURSE, seedNumber: SEED, dryRun: true })
  check('dry run reports 1/1 out, 2/3 in',
    dry.would_delete.legos === 1 && dry.would_delete.phrases === 1 &&
    dry.would_restore.legos === 2 && dry.would_restore.phrases === 3, JSON.stringify(dry))
  const { count: stillNew } = await sb.from('course_legos').select('id', { count: 'exact', head: true })
    .eq('course_code', COURSE).eq('seed_number', SEED)
  check('dry run changed nothing', stillNew === 1)

  console.log('\n6. Undo (for real)')
  const res = await restoreSnapshot(sb, { courseCode: COURSE, seedNumber: SEED, restoredBy: 'harness' })
  check('restore reports 2 LEGOs / 3 phrases', res.restored.legos === 2 && res.restored.phrases === 3)

  const { data: afterLegos } = await sb.from('course_legos').select('*')
    .eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index')
  const { data: afterPhrases } = await sb.from('course_practice_phrases').select('*')
    .eq('course_code', COURSE).eq('seed_number', SEED).order('id')
  const { data: afterSeed } = await sb.from('course_seeds').select('decomposed_at, flagged_at')
    .eq('course_code', COURSE).eq('seed_number', SEED).single()

  // updated_at/version move on re-insert; everything that identifies content must not.
  const strip = r => { const { updated_at, version, created_at, ...rest } = r; return rest }
  check('LEGOs round-trip identically (ids, targets, components, audio pointers)',
    JSON.stringify(originalLegos.map(strip)) === JSON.stringify(afterLegos.map(strip)),
    `\n    before: ${JSON.stringify(originalLegos.map(strip))}\n    after:  ${JSON.stringify(afterLegos.map(strip))}`)
  check('phrases round-trip identically',
    JSON.stringify(originalPhrases.map(strip)) === JSON.stringify(afterPhrases.map(strip)),
    `\n    before: ${JSON.stringify(originalPhrases.map(strip))}\n    after:  ${JSON.stringify(afterPhrases.map(strip))}`)
  check('generated lego_id regenerated correctly', afterLegos[0].lego_id === 'S0001L01')
  check('seed stamps restored (decomposed_at + the flag that prompted the redo)',
    !!afterSeed.decomposed_at && afterSeed.decomposed_at.startsWith('2026-08-01') && !!afterSeed.flagged_at,
    JSON.stringify(afterSeed))

  const { data: snapRow } = await sb.from('seed_redo_snapshots').select('restored_at, restored_by, batch_id')
    .eq('course_code', COURSE).limit(1).single()
  check('snapshot marked restored', !!snapRow.restored_at && snapRow.restored_by === 'harness')
  check('batch id matches', snapRow.batch_id === batchId)

  console.log('\n7. Undo with no snapshot fails loudly rather than silently')
  try {
    await restoreSnapshot(sb, { courseCode: COURSE, seedNumber: 999 })
    check('missing-snapshot undo throws', false)
  } catch (e) {
    check('missing-snapshot undo throws', /No redo snapshot found/.test(e.message), e.message)
  }
}

main()
  .then(async () => {
    await teardown()
    const { count } = await sb.from('courses').select('course_code', { count: 'exact', head: true }).eq('course_code', COURSE)
    console.log(`\nTeardown: disposable course removed (rows remaining: ${count}).`)
    console.log(failures === 0 ? '\nALL CHECKS PASSED\n' : `\n${failures} CHECK(S) FAILED\n`)
    process.exit(failures === 0 ? 0 : 1)
  })
  .catch(async (err) => {
    console.error('\nHARNESS ERROR:', err.message)
    await teardown()
    process.exit(1)
  })
