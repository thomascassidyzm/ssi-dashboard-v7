#!/usr/bin/env node
/**
 * Tests for rerender-off-role-pod-turns.cjs.
 *
 * The thing under test is `computeOffRole` — the measurement that decides what
 * gets re-rendered and what gets paid for. Every case below is one way that
 * measurement could be wrong in a way that costs money or breaks a live pod.
 *
 *   node tools/pods/rerender-off-role-pod-turns.test.cjs
 */
'use strict'

const assert = require('assert')
const { computeOffRole, bareVoice, similarity } = require('./rerender-off-role-pod-turns.cjs')

let pass = 0, fail = 0
function t (name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`) }
  catch (e) { fail++; console.log(`  FAIL ${name}\n       ${e.message}`) }
}

/** The ita_for_eng pod-1 shape: Learner on voice A, everyone else on voice B. */
const CAST = {
  Learner: { target: { voice_id: 'ara' }, known: { voice_id: 'bedd6226' } },
  Staff: { target: { voice_id: 'x7avnu1k' }, known: { voice_id: 'gfzdpspr5fdp' } },
  Narrator: { target: { voice_id: 'x7avnu1k' }, known: { voice_id: 'gfzdpspr5fdp' } },
}
const row = (o) => ({
  id: 'r1', scene_number: 17, sentence_number: 2, speaker: 'Staff',
  target_text: 'Vuole pagare?', known_text: 'Do you want to pay?',
  target_audio_id: null, known_audio_id: null,
  sentence_audio_ids: [], sentence_known_audio_ids: [], takeg_audio_ids: [], ...o,
})

console.log('computeOffRole')

t('a role reassigned to the other voice is caught on both tracks', () => {
  const r = computeOffRole({
    rows: [row({ target_audio_id: 'T', known_audio_id: 'K' })],
    speakers: CAST,
    clips: { T: { voice_id: 'ara' }, K: { voice_id: 'bedd6226' } },
  })
  assert.strictEqual(r.turns.length, 2)
  assert.deepStrictEqual(r.turns.map(x => x.track).sort(), ['known', 'target'])
  assert.strictEqual(r.turns.find(x => x.track === 'target').want_voice, 'x7avnu1k')
  assert.strictEqual(r.turns.find(x => x.track === 'target').old_voice, 'ara')
})

t('a correctly-voiced turn is not in scope — the money test', () => {
  const r = computeOffRole({
    rows: [row({ target_audio_id: 'T', known_audio_id: 'K' })],
    speakers: CAST,
    clips: { T: { voice_id: 'x7avnu1k' }, K: { voice_id: 'gfzdpspr5fdp' } },
  })
  assert.strictEqual(r.turns.length, 0)
})

t('xai_ / azure_ prefixes are ONE voice, not two — the re-render-the-world bug', () => {
  const r = computeOffRole({
    rows: [row({ target_audio_id: 'T' })],
    speakers: { Staff: { target: { voice_id: 'xai_x7avnu1k' } } },
    clips: { T: { voice_id: 'x7avnu1k' } },
  })
  assert.strictEqual(r.turns.length, 0, 'prefix difference must not read as a voice difference')
})

t('parenthesised speaker markers canonicalise to the cast key', () => {
  const r = computeOffRole({
    rows: [row({ speaker: 'Narrator (8 am)', target_audio_id: 'T' })],
    speakers: CAST,
    clips: { T: { voice_id: 'ara' } },
  })
  assert.strictEqual(r.turns.length, 1)
  assert.strictEqual(r.turns[0].want_voice, 'x7avnu1k')
})

t('a speaker with no cast entry is skipped, never rendered on a guessed voice', () => {
  const r = computeOffRole({
    rows: [row({ speaker: 'Ghost', target_audio_id: 'T' })],
    speakers: CAST,
    clips: { T: { voice_id: 'ara' } },
  })
  assert.strictEqual(r.turns.length, 0)
})

t('_default catches a speaker the cast does not name explicitly', () => {
  const r = computeOffRole({
    rows: [row({ speaker: 'Ghost', target_audio_id: 'T' })],
    speakers: { ...CAST, _default: { target: { voice_id: 'x7avnu1k' } } },
    clips: { T: { voice_id: 'ara' } },
  })
  assert.strictEqual(r.turns.length, 1)
})

t('a dangling id (no course_audio row) is not a re-render candidate', () => {
  const r = computeOffRole({
    rows: [row({ target_audio_id: 'GONE' })], speakers: CAST, clips: {},
  })
  assert.strictEqual(r.turns.length, 0)
})

t('split-array drift is reported but NEVER lands in the render scope', () => {
  const r = computeOffRole({
    rows: [row({ sentence_audio_ids: ['S1', 'S2'], takeg_audio_ids: ['G1'] })],
    speakers: CAST,
    clips: { S1: { voice_id: 'ara' }, S2: { voice_id: 'x7avnu1k' }, G1: { voice_id: 'ara' } },
  })
  assert.strictEqual(r.turns.length, 0, 'split slots must not be rendered by this tool')
  assert.strictEqual(r.splits.length, 2)
  assert.deepStrictEqual(r.splits.map(s => s.col), ['sentence_audio_ids', 'takeg_audio_ids'])
  assert.deepStrictEqual(r.splits.map(s => s.index), [0, 0])
})

t('castVoices reports the two-voice shape the precondition checks', () => {
  const r = computeOffRole({ rows: [], speakers: CAST, clips: {} })
  assert.deepStrictEqual(r.castVoices.target.sort(), ['ara', 'x7avnu1k'])
  assert.deepStrictEqual(r.castVoices.known.sort(), ['bedd6226', 'gfzdpspr5fdp'])
})

console.log('helpers')
t('bareVoice strips every provider prefix', () => {
  assert.strictEqual(bareVoice('xai_ara'), 'ara')
  assert.strictEqual(bareVoice('azure_it-IT-ElsaNeural'), 'it-it-elsaneural')
  assert.strictEqual(bareVoice(null), '')
})
t('similarity is accent- and punctuation-blind but not word-blind', () => {
  assert.strictEqual(similarity('È laggiù a sinistra.', 'e laggiu a sinistra'), 1)
  assert.ok(similarity('a sinistra', 'a destra') < 1)
})

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
