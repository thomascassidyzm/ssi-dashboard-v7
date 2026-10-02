'use strict';
// por_for_eng P26 (job #357): a seed sentence in no played basket gets a USE row under a NEW LEGO it contains, with the
// seed's own clips; once the row exists the plan is empty; a held seed and a seed with off-cast clips are listed, not written.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./por-seed-sentences-in-played-baskets-2026-10-02.cjs');

const clipsById = { k: { id: 'k', voice_id: 'x' }, r: { id: 'r', voice_id: 'azure_pt-PT-RaquelNeural', s3_key: 'mastered/r.mp3' }, d: { id: 'd', voice_id: 'azure_pt-PT-DuarteNeural', s3_key: 'mastered/d.mp3' }, e: { id: 'e', voice_id: 'azure_pt-PT-DuarteNeural', s3_key: 'mastered/e.mp3' } };
const legos = [{ lego_id: 'S0005L03', seed_number: 5, lego_index: 3, is_new: true, known_text: 'with someone else', target_text: 'com outra pessoa' },
  { lego_id: 'S0043L01', seed_number: 43, lego_index: 1, is_new: false, known_text: 'how to answer', target_text: 'como responder' },
  { lego_id: 'S0074L02', seed_number: 74, lego_index: 2, is_new: true, known_text: 'to', target_text: 'a' }];
const seeds = [{ seed_number: 5, known_text: 'I speak with someone else', target_text: 'eu falo com outra pessoa', known_audio_id: 'k', target1_audio_id: 'r', target2_audio_id: 'd' },
  { seed_number: 43, known_text: 'I was thinking how to answer', target_text: 'eu estava a pensar como responder', known_audio_id: 'k', target1_audio_id: 'r', target2_audio_id: 'd' }];
const db = (phrases, s = seeds) => ({ seeds: s, legos, phrases, wordTaught: () => 1, clipsById });

test('pre-fix: seed 5 gets a USE row under its own new LEGO with its own clips; seed 43 (HOLD) is listed', () => {
  const p = T.planPor(db([]));
  assert.deepStrictEqual(p.rows.map((r) => [r.seed, r.id, r.audio.target1]), [[5, 'S0005L03U01', 'r']]);
  assert.ok(p.listed.some((l) => l.seed === 43));
});
test('post-fix: the row exists under a new LEGO, nothing to add', () => {
  const row = { id: 'por_for_eng:S0005L03U01', seed_number: 5, lego_index: 3, position: 1, phrase_role: 'use', known_text: 'I speak with someone else', target_text: 'eu falo com outra pessoa', is_new: true, lego_id: 'S0005L03' };
  assert.strictEqual(T.planPor(db([row])).rows.length, 0);
});
test('a seed whose target2 clip is on the wrong voice is held for a render, never written', () => {
  const s = [{ ...seeds[0], target2_audio_id: 'r' }];
  const p = T.planPor(db([], s));
  assert.strictEqual(p.rows.length, 0);
  assert.match(p.audioHeld[0].why, /target2 clip on azure_pt-PT-RaquelNeural/);
});
