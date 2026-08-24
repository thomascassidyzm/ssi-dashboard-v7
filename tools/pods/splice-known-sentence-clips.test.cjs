#!/usr/bin/env node
/**
 * Tests for splice-known-sentence-clips.cjs.
 *
 * What is worth testing here is ONLY what this file decides for itself. The
 * cut, the seam gate and the margin gate belong to splice-sentence-clips.cjs
 * and are tested there against synthesised audio; re-testing them here would
 * be testing a require().
 *
 * What IS this file's own is `planRow` — the ten-gate per-row verdict — and
 * every one of its branches is a place where a wrong answer is SILENT:
 *
 *   - a wrong 'work' verdict writes clips derived from the wrong performance,
 *     or in the wrong voice, and every audio gate downstream passes them;
 *   - a wrong 'skip' verdict leaves a learner with a silent translation slot
 *     and reports success;
 *   - the count gate is the difference between a known array the app USES and
 *     one it silently ignores (splitRowUnits pairs only when the lengths match),
 *     which from the outside looks identical to having done the work.
 *
 * So planRow is pure and driven directly with row objects.
 *
 *   node tools/pods/splice-known-sentence-clips.test.cjs
 */
'use strict'
const assert = require('assert')

process.env.PHASE8_NO_LISTEN = '1'
const T = require('./splice-known-sentence-clips.cjs')

let pass = 0
const it = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`); pass++ } catch (e) {
    console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1
  }
}

// ── fixture ────────────────────────────────────────────────────────────────
const CAST = new Set(['gfzdpspr5fdp', 'bedd6226'])
const KNOWN_TEXT = 'Good morning. How are you today?'

const clips = (over = {}) => ({
  T1: { id: 'T1', text: 'Buongiorno.', voice_id: 'ara' },
  T2: { id: 'T2', text: 'Come stai oggi?', voice_id: 'ara' },
  K: { id: 'K', text: 'Good morning … How are you today?', voice_id: 'xai_gfzdpspr5fdp' },
  ...over,
})

const row = (over = {}) => ({
  id: 'r1',
  scene_number: 1,
  sentence_number: 1,
  speaker: 'Anna',
  known_text: KNOWN_TEXT,
  known_audio_id: 'K',
  sentence_audio_ids: ['T1', 'T2'],
  sentence_known_audio_ids: null,
  ...over,
})

const plan = (r, c = clips(), cast = CAST, variant = false) => T.planRow(r, c, cast, variant)

// ── the happy path ─────────────────────────────────────────────────────────
console.log('planRow — the row that should be restored')

it('passes every gate on a clean two-sentence turn', () => {
  const p = plan(row())
  assert.strictEqual(p.verdict, 'work')
  assert.strictEqual(p.reason, null)
  assert.strictEqual(p.n, 2)
  assert.deepStrictEqual(p.kSents, ['Good morning.', 'How are you today?'])
})

it('tolerates the " … " pause cue the stored clip text carries', () => {
  // The clip's text is the SYNTHESISED text (with the cue); the row's is not.
  // If this comparison were byte-equality, the fidelity gate would refuse every
  // multi-sentence turn on the estate — i.e. the whole population.
  assert.strictEqual(plan(row()).verdict, 'work')
})

// ── scope: rows this pass must not touch ───────────────────────────────────
console.log('planRow — out of scope, reported as a gap')

it('skips a row whose known array is already the right length', () => {
  const p = plan(row({ sentence_known_audio_ids: ['K1', 'K2'] }))
  assert.strictEqual(p.verdict, 'skip')
  assert.strictEqual(p.reason, 'already_split')
})

it('is a GAP, not a refusal, when the target side never split', () => {
  // No target split → splitRowUnits returns one whole-turn unit and never reads
  // the known array. Writing one would be clips no learner can reach.
  for (const tgt of [null, [], ['T1']]) {
    const p = plan(row({ sentence_audio_ids: tgt }))
    assert.strictEqual(p.verdict, 'gap', JSON.stringify(tgt))
    assert.strictEqual(p.reason, 'no_target_split')
  }
})

it('is a GAP when a target split id no longer resolves', () => {
  // The app's stale-slice guard is all-or-nothing across BOTH arrays.
  const p = plan(row(), clips({ T2: undefined }))
  assert.strictEqual(p.verdict, 'gap')
  assert.strictEqual(p.reason, 'target_split_dangling')
})

it('excludes an unsplittable known script BEFORE judging its count', () => {
  // Japanese, Chinese, Korean and Thai: the boundary regex needs whitespace
  // after the mark and there is none. The count would "match" by accident on a
  // one-part split of a one-clip turn and mislead; on 2 clips it would look
  // like an ordinary count mismatch and hide the real reason.
  for (const t of ['おはよう。元気ですか？', '早上好。你好吗？', '좋은 아침입니다. 어떠세요?', 'สวัสดีตอนเช้า สบายดีไหม']) {
    const p = plan(row({ known_text: t }))
    assert.strictEqual(p.verdict, 'gap', t)
    assert.strictEqual(p.reason, 'known_script_unsplittable', t)
  }
})

it('does not mistake ordinary English for an unsplittable script', () => {
  assert.strictEqual(T.UNSPLITTABLE_SCRIPT.test(KNOWN_TEXT), false)
  assert.strictEqual(T.UNSPLITTABLE_SCRIPT.test('Voilà — ça va, señor? Ναι!'), false)
})

// ── refusals: leave it on the whole-turn fallback ──────────────────────────
console.log('planRow — refusals, left on whole-turn fallback')

it('refuses when the known text does not split into exactly N parts', () => {
  // Fewer parts than clips is the app's ignore condition; MORE parts is just as
  // useless, and both must refuse rather than truncate or pad.
  const fewer = plan(row({ known_text: 'Good morning, how are you today?' }))
  assert.strictEqual(fewer.reason, 'known_count_mismatch')
  assert.strictEqual(fewer.verdict, 'refuse')
  const more = plan(row({ known_text: 'One. Two. Three.' }))
  assert.strictEqual(more.reason, 'known_count_mismatch')
})

it('refuses a row with no whole-turn known clip to cut', () => {
  assert.strictEqual(plan(row({ known_audio_id: null })).reason, 'no_whole_turn_known_clip')
})

it('refuses when the whole-turn known clip row cannot be resolved', () => {
  assert.strictEqual(plan(row(), clips({ K: undefined })).reason, 'whole_turn_known_clip_missing')
})

it('refuses when the whole-turn clip says something other than this row', () => {
  // The defect the split-array repair swept: the slot holds ANOTHER
  // conversation's performance. Cutting it yields N wrong clips that pass every
  // audio gate, because the audio is perfectly good — it is just not this line.
  const p = plan(row(), clips({ K: { text: 'Two coffees please … And a water.', voice_id: 'xai_gfzdpspr5fdp' } }))
  assert.strictEqual(p.verdict, 'refuse')
  assert.strictEqual(p.reason, 'whole_turn_text_mismatch')
})

it('refuses an off-cast whole-turn clip rather than multiplying it by N', () => {
  const p = plan(row(), clips({ K: { text: KNOWN_TEXT, voice_id: 'azure_en-GB-SoniaNeural' } }))
  assert.strictEqual(p.verdict, 'refuse')
  assert.strictEqual(p.reason, 'whole_turn_off_cast')
})

it('accepts a cast voice stored bare or provider-prefixed', () => {
  // Same voice, two spellings, routinely both present in one course.
  for (const v of ['gfzdpspr5fdp', 'xai_gfzdpspr5fdp', 'azure_gfzdpspr5fdp']) {
    assert.strictEqual(plan(row(), clips({ K: { text: KNOWN_TEXT, voice_id: v } })).verdict, 'work', v)
  }
})

it('refuses a row inside a variant run that is split across two known voices', () => {
  // Tom's variant-drill ruling, 2026-08-24. The run is mid-repair; splitting it
  // into per-sentence clips makes the character contradict itself on every card
  // and makes the repair N times bigger.
  const p = plan(row(), clips(), CAST, true)
  assert.strictEqual(p.verdict, 'refuse')
  assert.strictEqual(p.reason, 'variant_run_split_voices')
})

it('does not refuse a variant run that is wholly on one voice', () => {
  // A single-voiced run is the CORRECT state, never a fault — splitVariantRuns
  // reports only runs with 2+ voices, so this row arrives unflagged.
  assert.strictEqual(plan(row(), clips(), CAST, false).verdict, 'work')
})

// ── gate ORDER is itself load-bearing ──────────────────────────────────────
console.log('planRow — gate order')

it('reports the scope gap before the content refusal on a row with both', () => {
  // A row with no target split AND a text mismatch is not "a broken row we
  // refused" — it is a row this pass was never going to touch. Reporting it as
  // a refusal would inflate the fallback count with work that belongs to the
  // target pass and hide the real gap.
  const p = plan(row({ sentence_audio_ids: null }),
    clips({ K: { text: 'something else entirely', voice_id: 'nope' } }))
  assert.strictEqual(p.reason, 'no_target_split')
})

it('never returns work for a row it has not fully measured', () => {
  // Belt and braces on the whole table: any row missing any precondition must
  // come back as something other than 'work'.
  const broken = [
    row({ sentence_audio_ids: ['T1'] }),
    row({ known_audio_id: null }),
    row({ known_text: 'One sentence only.' }),
    row({ known_text: '早上好。你好吗？' }),
  ]
  for (const r of broken) assert.notStrictEqual(plan(r).verdict, 'work', JSON.stringify(r.known_text))
})

console.log(`\n${pass} passed`)
if (process.exitCode) console.log('SOME TESTS FAILED')
