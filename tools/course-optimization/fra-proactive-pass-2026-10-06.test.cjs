'use strict';
// node --test tools/course-optimization/fra-proactive-pass-2026-10-06.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./fra-proactive-pass-2026-10-06.cjs');

test('a French-only LEGO change (K32) carries its existing intro in the same UPDATE, so the debut never goes silent', () => {
  const k32 = { id: 'S0646L01', presentation: '5fb40a70-f339-4750-a52d-cef0578391ca', before: { known: 'you are doing sir', target: 'vous faites' }, after: { known: 'you are doing sir', target: 'vous faites monsieur' }, clips: { target1: 't1', target2: 't2' } };
  assert.deepStrictEqual(T.legoLinks(k32), { target1_audio_id: 't1', target2_audio_id: 't2', presentation_audio_id: '5fb40a70-f339-4750-a52d-cef0578391ca' });
});

test('an English change (K41) does not re-link the old intro — it quotes the old words; a new one is rendered', () => {
  const k41 = { id: 'S0276L01', presentation: 'old', intro: { after: "The French for: 'to stay', is:" }, clips: { known: 'k' } };
  assert.deepStrictEqual(T.legoLinks(k41), { known_audio_id: 'k' });
});

test('the K32 plan records each LEGO\'s current intro', () => {
  const db = { legos: [{ id: 'u', lego_id: 'S0646L01', seed_number: 646, known_text: 'you are doing sir', target_text: 'vous faites', presentation_audio_id: 'P' }], phrases: [], seeds: [] };
  const c = T.planLego(db).legoChanges.find((x) => x.id === 'S0646L01');
  assert.strictEqual(c.presentation, 'P');
});

test('intro keeps its demo only when the demo contains the new gloss as whole words, else a basket sentence, else none', () => {
  assert.strictEqual(T.introFor('to explain', "The French for: 'explain', as in — 'they didn't want to explain', is:"), "The French for: 'to explain', as in — 'they didn't want to explain', is:");
  assert.strictEqual(T.introFor('to change it', "The French for: 'change it', as in — 'we can't change it', is:", ['we need to change it', 'I want to change it now']), "The French for: 'to change it', as in — 'we need to change it', is:");
  assert.strictEqual(T.introFor('to stay standing', "The French for: 'stay standing', is:"), "The French for: 'to stay standing', is:");
});

test('S114 / S134 forum rows: the mismatched pair goes, the tense is fixed on the English side', () => {
  assert.ok(T.SWEEP_PHRASES.S0114L03U04.delete);
  assert.strictEqual(T.SWEEP_PHRASES.S0134L03B04.to[0], "I'm working at something difficult");
  assert.strictEqual(T.SWEEP_PHRASES.S0134L03B04.to[1], T.SWEEP_PHRASES.S0134L03B04.from[1]);
});
