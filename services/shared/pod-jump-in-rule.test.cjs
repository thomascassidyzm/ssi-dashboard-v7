'use strict'
// The jump-in marker contract (Tom, 2026-09-12): the column has three states,
// the payload has two, and only a literal true ever drops the gap.
const test = require('node:test')
const assert = require('node:assert')
const { normaliseJumpIn, jumpInForPayload, withJumpIn, JUMP_IN_RULE } = require('./pod-jump-in-rule.cjs')
const { renderPrompt } = require('../pod-generation-prompt.cjs')
const { buildSentenceEditPatch } = require('../voice-engine/pods-cast.cjs')

test('normaliseJumpIn: true/false pass, anything else is NULL (never annotated)', () => {
  assert.strictEqual(normaliseJumpIn(true), true)
  assert.strictEqual(normaliseJumpIn(false), false)
  assert.strictEqual(normaliseJumpIn('true'), true)
  assert.strictEqual(normaliseJumpIn('yes'), null)
  assert.strictEqual(normaliseJumpIn(1), null)
  assert.strictEqual(normaliseJumpIn(undefined), null)
})

test('payload: jumpIn is true only for a literal true; NULL and false both play as a turn', () => {
  assert.strictEqual(jumpInForPayload({ jump_in: true }), true)
  assert.strictEqual(jumpInForPayload({ jump_in: false }), false)
  assert.strictEqual(jumpInForPayload({ jump_in: null }), false)
  assert.strictEqual(jumpInForPayload({}), false)
  const row = withJumpIn({ id: 'x', target_text: 't', jump_in: true })
  assert.deepStrictEqual(row, { id: 'x', target_text: 't', jump_in: true, jumpIn: true })
})

test('the generator prompt carries the one rule paragraph and asks for jump_in on every line', () => {
  const p = renderPrompt({ targetLanguage: 'Italian', knownLanguage: 'English', cultureNotes: '-', sceneTitle: 'S', lines: [{ global_order: 1, speaker: 'A', english_text: 'Hi.' }] })
  assert.ok(p.includes(JUMP_IN_RULE), 'rule paragraph present verbatim')
  assert.ok(!p.includes('{{JUMP_IN_RULE}}'), 'placeholder filled')
  assert.ok(p.includes('"jump_in":false'), 'output format names the field')
  // three examples each way, as briefed
  assert.ok(/sì sì/.test(JUMP_IN_RULE) && /davvero\?/.test(JUMP_IN_RULE) && /finishing, completing or capping/.test(JUMP_IN_RULE))
  assert.ok(/Where are you from\?/.test(JUMP_IN_RULE) && /let me get my coat/.test(JUMP_IN_RULE) && /what are you doing tomorrow\?/.test(JUMP_IN_RULE))
})

test('editing the marker is delivery, not words: the patch touches jump_in and nothing else', () => {
  assert.deepStrictEqual(buildSentenceEditPatch({ jump_in: true }), { jump_in: true })
  assert.deepStrictEqual(buildSentenceEditPatch({ jump_in: false }), { jump_in: false })
  assert.deepStrictEqual(buildSentenceEditPatch({ jump_in: 'nonsense' }), { jump_in: null })
  const both = buildSentenceEditPatch({ known_text: 'x', jump_in: true })
  assert.strictEqual(both.jump_in, true)
  assert.strictEqual(both.known_audio_id, null, 'a text edit still unlinks its side')
  assert.ok(!('target_audio_id' in buildSentenceEditPatch({ jump_in: true })))
})
