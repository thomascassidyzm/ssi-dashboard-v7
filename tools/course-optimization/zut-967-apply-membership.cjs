// Ramp #967 stream 2b — gated apply for component-membership triage verdicts (any course).
//
// Input: ops/967-zut-sweep/actions.json — [{ id, course, action: 'delete'|'update', knownBefore,
// targetBefore, fixedTarget?, sibling?, reason }], built only from (c)/(b) verdicts that survived
// my own read against the seed + siblings. Every row is re-proven here before it is touched:
//   - before-state assertion: the live row is still a COMPONENT with exactly knownBefore/targetBefore,
//     else ABORT (DB drifted from what was read);
//   - it still fails membership (its target is not a substring of its seed's target), else SKIP;
//   - delete: the named sibling that keeps the chunk taught still exists, else SKIP;
//   - update: the new target IS a contiguous substring of the seed target (Tom's 2026-07-04
//     component rule — the re-check the July sweep ran through checkEditedPhrase, whose gate never
//     reached main), re-read after the write and reverted if not.
// Floors (>=4 BUILD + >=5 USE per LEGO) cannot move: only phrase_role='component' rows are ever
// touched, and components are not BUILD/USE. Audio: nothing is rendered or deleted; an edited
// row whose clip no longer speaks its text is listed in the log (audio_note) for a later pass.
//
//   DRY_RUN=1 node tools/course-optimization/zut-967-apply-membership.cjs   # plan + log, no writes
//   node tools/course-optimization/zut-967-apply-membership.cjs             # live
require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')
const { normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')

const DIR = path.join(__dirname, '../../ops/967-zut-sweep')
const DRY_RUN = process.env.DRY_RUN === '1'
const SURFACE = 'tools/course-optimization/zut-967-apply-membership.cjs'
const identity = serviceIdentity('zut-967-membership-sweep')

const isMember = (seedTarget, target) => normalizeForContainment(seedTarget).includes(normalizeForContainment(target))

async function seedTarget(course, seed) {
  const { data, error } = await supabase.from('course_seeds').select('target_text').eq('course_code', course).eq('seed_number', seed).maybeSingle()
  if (error) throw error
  return data && data.target_text
}

async function rowExists(course, id) {
  for (const table of ['course_practice_phrases', 'course_legos']) {
    const { data, error } = await supabase.from(table).select('id').eq('course_code', course).eq('id', id).maybeSingle()
    if (error) throw error
    if (data) return true
  }
  return false
}

async function main() {
  const actions = JSON.parse(fs.readFileSync(path.join(DIR, 'actions.json'), 'utf8'))
  const log = []
  const rec = (action, detail) => { log.push({ action, ...detail }); console.log(`[${action}]`, JSON.stringify(detail)) }
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'LIVE APPLY'}: ${actions.length} component actions ===`)

  for (const a of actions) {
    const { data: row, error } = await supabase.from('course_practice_phrases').select('*').eq('course_code', a.course).eq('id', a.id).maybeSingle()
    if (error) throw error
    if (!row) { rec('SKIP_ALREADY_GONE', { id: a.id }); continue }
    if (row.phrase_role !== 'component' || row.known_text !== a.knownBefore || row.target_text !== a.targetBefore) {
      throw new Error(`ASSERTION FAILED ${a.id}: expected component "${a.knownBefore}"->"${a.targetBefore}", got ${row.phrase_role} "${row.known_text}"->"${row.target_text}" — aborting.`)
    }
    const st = await seedTarget(a.course, row.seed_number)
    if (!st) { rec('SKIP_NO_SEED', { id: a.id }); continue }
    if (isMember(st, row.target_text)) { rec('SKIP_NOW_A_MEMBER', { id: a.id }); continue }
    const audio = { known_audio_id: row.known_audio_id, target1_audio_id: row.target1_audio_id, target2_audio_id: row.target2_audio_id, presentation_audio_id: row.presentation_audio_id }
    const hasAudio = Object.values(audio).some(Boolean)

    if (a.action === 'delete') {
      if (!a.sibling || !(await rowExists(a.course, a.sibling))) { rec('SKIP_SIBLING_MISSING', { id: a.id, sibling: a.sibling }); continue }
      const detail = { id: a.id, course: a.course, seed: row.seed_number, lego_index: row.lego_index, known: row.known_text, target: row.target_text, seed_target: st, sibling: a.sibling, reason: a.reason, audio, audio_note: hasAudio ? 'row carried audio links; clips untouched in course_audio' : null }
      if (!DRY_RUN) {
        await recordContentEdit(supabase, { identity, courseCode: a.course, surface: SURFACE, operation: 'delete', scope: { phrase_ids: [a.id], seed_numbers: [row.seed_number] }, detail: { job: '#967 stream 2b', ruling: 'Tom 2026-07-04 component target must be in its seed; cut-it-out', before: row } })
        const { error: e } = await supabase.from('course_practice_phrases').delete().eq('course_code', a.course).eq('id', a.id)
        if (e) throw e
      }
      rec('DELETE_ORPHAN_COMPONENT', detail)
    } else if (a.action === 'update') {
      if (!a.fixedTarget || !isMember(st, a.fixedTarget)) { rec('SKIP_FIX_NOT_A_MEMBER', { id: a.id, fixedTarget: a.fixedTarget, seed_target: st }); continue }
      const detail = { id: a.id, course: a.course, seed: row.seed_number, known: row.known_text, target_before: row.target_text, target_after: a.fixedTarget, seed_target: st, reason: a.reason, audio, audio_note: hasAudio ? 'target changed; linked clip speaks the old text — queue for an audio pass, not rendered here' : null }
      if (!DRY_RUN) {
        const ev = await recordContentEdit(supabase, { identity, courseCode: a.course, surface: SURFACE, operation: 'update', scope: { phrase_ids: [a.id], seed_numbers: [row.seed_number] }, detail: { job: '#967 stream 2b', changes: [{ id: a.id, target_from: row.target_text, target_to: a.fixedTarget }] } })
        const { error: e } = await supabase.from('course_practice_phrases').update({ target_text: a.fixedTarget, last_edit_event_id: ev, updated_at: new Date().toISOString() }).eq('course_code', a.course).eq('id', a.id).eq('target_text', row.target_text)
        if (e) throw e
        const { data: after } = await supabase.from('course_practice_phrases').select('target_text').eq('course_code', a.course).eq('id', a.id).single()
        if (!isMember(st, after.target_text)) {
          await supabase.from('course_practice_phrases').update({ target_text: row.target_text }).eq('course_code', a.course).eq('id', a.id)
          rec('REVERTED_FIX_FAILED_RECHECK', detail); continue
        }
      }
      rec('FIX_COMPONENT_TARGET', detail)
    } else throw new Error(`unknown action ${a.action} for ${a.id}`)
  }
  const out = path.join(DIR, 'logs', DRY_RUN ? 'apply-dryrun-log.json' : 'apply-applied-log.json')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 1))
  console.log(`=== ${log.length} actions ${DRY_RUN ? 'planned' : 'applied'} -> ${out}`)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
