#!/usr/bin/env node
// THE ONLY WRITER of the phrase-quality lane. Applies one course's gated decisions
// (staged/<course>.jsonl, written by the lane's Opus review from gate-change.cjs output) to the live
// course_practice_phrases rows. DRY RUN unless --apply. Every write is preceded by an undo-ledger line
// holding the FULL row as it was (undo.cjs puts it back). At apply time, for each row:
//   - before-state asserted against the live row; any drift → skipped, never forced
//   - a REPLACE is re-judged by the course-builder gate on live data; failing now → treated as a delete
//   - a DELETE re-checks the floor live: never below 4 USE phrases per LEGO (Tom 2026-10-11 20:57)
//   - only BUILD/USE practice phrases; seeds and LEGOs are never written
//   - a line carrying "hold" (ramp 967: replacement awaiting audio) is left staged, never applied
//   - --release-held lifts the audio hold: held replacements are applied like any other, then the course's
//     audio is QUEUED (audio_pass_requests, fulfilled by phase8 /generate through Popty's one render route)
//   - a replaced side loses its audio ids, so the normal render voices the new text (no audio here)
//   - --delete-kept (job #184, Tom: "I'd rather just have fewer phrases than bad ones"): the rows the floor kept
//     (decision 'keep') are deleted too, down to a floor of 1 USE per LEGO. The learner app's script
//     generator degrades safely at any USE count (tested), but a LEGO with 0 USE drops out of spaced review for good.
// Usage: node ops/lanes/phrase-quality/apply-staged.cjs <course> [--apply] [--release-held] [--delete-kept]
'use strict'
const fs = require('fs'), path = require('path')
const { client, USE_FLOOR } = require('./lib.cjs')
const { readLedger, doneRowIds, stagedTodo } = require('./ledger.cjs')
const { judgeReplacement, loadSets } = require('./gate-change.cjs')

async function main() {
  const course = process.argv[2]; const APPLY = process.argv.includes('--apply'), RELEASE = process.argv.includes('--release-held'), DELETE_KEPT = process.argv.includes('--delete-kept')
  const floor = process.argv.includes('--floor0') ? 0 : DELETE_KEPT ? 1 : USE_FLOOR   // --floor0 (job #184, Tom: never a good reason to keep a bad phrase): a LEGO may end with 0 USE; the DB guard still refuses a LEGO with no practice phrase at all
  if (!course) { console.error('usage: apply-staged.cjs <course> [--apply]'); process.exit(2) }
  const stagedPath = path.join(__dirname, 'staged', `${course}.jsonl`)
  const ledgerPath = path.join(__dirname, 'undo', `${course}.jsonl`)
  let staged = fs.existsSync(stagedPath) ? fs.readFileSync(stagedPath, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []
  if (DELETE_KEPT) staged = staged.filter((d) => d.decision === 'keep').map((d) => ({ ...d, decision: 'delete', why: 'kept-bad deleted (job #184)' }))
  const done = doneRowIds(readLedger(ledgerPath))   // a row whose last ledger line is 'undone' is open again
  const todo = stagedTodo(staged, done, { releaseHeld: RELEASE })   // held lines (hold: 'audio') are left staged
  const { makeCourseCtx, checkPhraseSet } = require('../../../tools/phrase-gate/gate-check.cjs')
  const ctx = makeCourseCtx(client(), course)
  const sets = await loadSets(course, todo)
  const log = []
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true })
  for (const d of todo) {
    const key = `${d.seed_number}:${d.lego_index}`, set = sets.get(key)
    const { data: row } = await client().from('course_practice_phrases').select('*').eq('id', d.row_id).maybeSingle()
    const say = (outcome, why) => { log.push({ row_id: d.row_id, outcome, why }); console.error(`${d.row_id}: ${outcome}${why ? ' — ' + why : ''}`) }
    if (!set) { say('skip', 'LEGO no longer exists'); continue }
    if (!row) { say('skip', 'row no longer exists'); continue }
    if (!['build', 'use'].includes(row.phrase_role)) { say('skip', `role ${row.phrase_role}`); continue }
    if (d.before && (row.known_text !== d.before.known || row.target_text !== d.before.target)) { say('skip', 'drift: the live row differs from what was judged'); continue }
    let action = d.decision
    if (action === 'replace') {
      const g = await judgeReplacement(set.entryBase, set.phrases, row.id, d.after, checkPhraseSet, ctx)
      if (!g.pass) action = 'delete'
    }
    if (action === 'delete' && row.phrase_role === 'use') {
      const left = set.phrases.filter((p) => p.role === 'use').length
      if (left - 1 < floor) { say('keep', `floor: ${left - 1} USE would remain`); continue }
    }
    if (!APPLY) { if (action === 'delete') set.phrases = set.phrases.filter((p) => p.id !== row.id); say(`would ${action}`); continue }   // dry run keeps the per-LEGO count honest
    fs.appendFileSync(ledgerPath, JSON.stringify({ row_id: row.id, action, at: new Date().toISOString(), before: row, after: action === 'replace' ? d.after : null }) + '\n')
    if (action === 'delete') {
      const { error } = await client().from('course_practice_phrases').delete().eq('id', row.id)
      if (error) { say('ERROR', error.message); continue }
      set.phrases = set.phrases.filter((p) => p.id !== row.id)
    } else {
      const patch = { version: (row.version || 1) + 1, updated_at: new Date().toISOString() }
      if (d.after.target && d.after.target !== row.target_text) Object.assign(patch, { target_text: d.after.target, target1_audio_id: null, target2_audio_id: null, target1_duration_ms: null, target2_duration_ms: null, target_text_roman: null })
      if (d.after.known && d.after.known !== row.known_text) Object.assign(patch, { known_text: d.after.known, known_audio_id: null, presentation_audio_id: null })
      const { error } = await client().from('course_practice_phrases').update(patch).eq('id', row.id).eq('version', row.version)
      if (error) { say('ERROR', error.message); continue }
      set.phrases = set.phrases.map((p) => (p.id === row.id ? { ...p, known: patch.known_text ?? p.known, target: patch.target_text ?? p.target } : p))
    }
    say(action)
  }
  const replaced = log.filter((l) => l.outcome === 'replace').length
  if (APPLY && RELEASE && replaced) {
    const { queueAudioPass } = require('../../../services/shared/audio-pass-queue.cjs')
    const q = await queueAudioPass(client(), { courseCode: course, reason: `ramp 967 phrase-quality: ${replaced} released replacement phrase(s) need audio`, requestedBy: '@pq-release-held', append: true, metadataKey: 'pq_release_held', metadata: { rows: log.filter((l) => l.outcome === 'replace').map((l) => l.row_id) } })
    console.error(`${course}: audio pass ${q.queued ? 'queued' : q.touched ? 'joined existing request' : 'NOT queued: ' + (q.error || q.reason)} (${q.id || '-'})`)
  }
  const n = (k) => log.filter((l) => l.outcome === k).length
  console.error(`${course}: ${APPLY ? '' : 'DRY RUN — '}${n('replace') + n('would replace')} replace, ${n('delete') + n('would delete')} delete, ${n('keep')} kept, ${n('skip')} skipped, ${n('ERROR')} errors`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1) })
