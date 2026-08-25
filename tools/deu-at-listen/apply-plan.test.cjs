/**
 * What may and may not become a change to the live course.
 *
 * buildPlan is the gate between Kai's ear and the database, so its refusals are
 * the interesting part: every one of these cases is a way a well-meaning tool
 * could put the wrong audio in front of a learner, and each is refused by name
 * rather than by silence.
 *
 * Pure — no database, no S3, no network.
 *
 * Run:  node --test tools/deu-at-listen/apply-plan.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert')
const { buildPlan } = require('./apply.cjs')

const take = (o) => ({
  uuid: o.uuid, cadence: o.cadence ?? 'natural', flow: o.flow ?? 'continuous',
  s3_key: o.s3_key ?? `mastered/${o.uuid}.mp3`, recorded_at: o.recorded_at ?? '2026-08-23T15:00:00Z',
  is_live: o.is_live ?? false, course_audio_id: o.is_live ? (o.audio_id || 'audio-1') : null,
  refused: o.refused ?? false,
})
const group = (o) => ({ prompted_text: o.text || 'i wü lernen', seed: o.seed ?? 1, takes: o.takes, ...o.extra })
const manifest = (groups) => ({ groups })
const good = (...uuids) => Object.fromEntries(uuids.map((u) => [u, { verdict: 'good' }]))

test('a Good take that is not live becomes exactly one swap of the live row', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true }), take({ uuid: 'B' })] })])
  const plan = buildPlan(m, good('B'))
  assert.strictEqual(plan.actions.length, 1)
  assert.strictEqual(plan.actions[0].audio_id, 'audio-1', 'the row that already serves this line is the one that moves')
  assert.strictEqual(plan.actions[0].to_s3_key, 'mastered/B.mp3')
  assert.strictEqual(plan.actions[0].from_uuid, 'A')
})

test('an unjudged take is never touched, and neither is a Bad one', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true }), take({ uuid: 'B' })] })])
  assert.strictEqual(buildPlan(m, {}).actions.length, 0)
  assert.strictEqual(buildPlan(m, { B: { verdict: 'bad' } }).actions.length, 0)
})

test('a Good take that is already live changes nothing', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true })] })])
  const plan = buildPlan(m, good('A'))
  assert.strictEqual(plan.actions.length, 0)
  assert.strictEqual(plan.noop.length, 1)
})

test('a slow read is refused — the pipeline never files those as clips', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true }), take({ uuid: 'S', cadence: 'slow' })] })])
  const plan = buildPlan(m, good('S'))
  assert.strictEqual(plan.actions.length, 0)
  assert.match(plan.skipped[0].why, /slow read/)
})

test('a line with no clip in the course is refused rather than minted', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A' }), take({ uuid: 'B' })] })])
  const plan = buildPlan(m, good('B'))
  assert.strictEqual(plan.actions.length, 0)
  assert.match(plan.skipped[0].why, /nothing to swap/)
})

test('two Good takes and neither is live: refused, not guessed', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true }), take({ uuid: 'B' }), take({ uuid: 'C' })] })])
  const plan = buildPlan(m, good('B', 'C'))
  assert.strictEqual(plan.actions.length, 0)
  assert.strictEqual(plan.skipped.length, 2)
  assert.match(plan.skipped[0].why, /which should it be/)
})

test('two Good takes and one of them IS live: settled, nothing moves', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true }), take({ uuid: 'B' })] })])
  const plan = buildPlan(m, good('A', 'B'))
  assert.strictEqual(plan.actions.length, 0, 'a line whose live clip Kai calls good must never be swapped away from it')
  assert.strictEqual(plan.noop.length, 1)
})

test('a refused take can be judged but never applied — there is no line to point it at', () => {
  const m = manifest([group({ text: null, extra: { refused_group: true }, takes: [take({ uuid: 'R', refused: true, cadence: null })] })])
  const plan = buildPlan(m, good('R'))
  assert.strictEqual(plan.actions.length, 0)
  assert.match(plan.skipped[0].why, /no line to point it at/)
})

test('a spliced take Kai marked Good is applied like any other — the filter is for his ear, not a veto', () => {
  const m = manifest([group({ takes: [take({ uuid: 'A', is_live: true }), take({ uuid: 'B', flow: 'spliced' })] })])
  assert.strictEqual(buildPlan(m, good('B')).actions.length, 1)
})
