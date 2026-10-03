'use strict';
// Proves the Spanish half of job #356. The P26 planner reused from ita #635·I keeps ¿ ¡ in its normaliser, so on
// spa_for_eng it calls seed 61 "could you say that again…? | ¿Podrías…?" a ZUT clash with its own BUILD "podrías…"
// and lists the seed for Kai although its sentence is already played. The Spanish planner strips them: covered.
// The K41 and K32 text rules are pinned as well: "to" on the English, the honorific closing both sides.
const test = require('node:test');
const assert = require('node:assert');
const S = require('./spa-italian-rules-apply-2026-10-02.cjs');
const I = require('./ita-seed-sentences-in-played-baskets-2026-09-28.cjs');

const legos = [{ lego_id: 'S0061L04', seed_number: 61, lego_index: 4, is_new: true, known_text: 'a little more slowly', target_text: 'un poco más despacio' }];
const seeds = [{ seed_number: 61, known_text: 'could you say that again a little more slowly?', target_text: '¿Podrías decir eso otra vez un poco más despacio?' }];
const phrases = [{ id: 'spa_for_eng:S0061L04B07', seed_number: 61, lego_index: 4, position: 7, phrase_role: 'build', known_text: 'could you say that again a little more slowly?', target_text: 'podrías decir eso otra vez un poco más despacio' }];

test('Spanish P26 planner: an opening ¿ is not a different sentence (seed 61 is covered)', () => {
  const spa = S.planP26({ seeds, legos, phrases });
  assert.equal(spa.covered, 1);       // the BUILD already IS the seed sentence under a new LEGO
  assert.equal(spa.listed.length, 0);
  assert.equal(spa.rows.length, 0);
});

test('the Italian planner it replaces lists the same seed as a ZUT clash (the defect)', () => {
  const ph = phrases.map((p) => ({ ...p, is_new: true, lego_id: 'S0061L04' }));
  const ita = I.plan({ seeds, legos, phrases: ph, wordTaught: () => 0 }, { skip: [] });
  assert.equal(ita.rows.length, 0);
  assert.match(ita.listed[0].why, /ZUT/);
});

test('K41: "to" on the English, capital kept, never doubled', () => {
  assert.equal(S.withTo('open the door'), 'to open the door');
  assert.equal(S.withTo('Say that'), 'To say that');
  assert.equal(S.withTo('to sit'), 'to sit');
  assert.ok(S.opensOnInfinitive('abrir la puerta'));
  assert.ok(S.opensOnInfinitive('¿Preguntarle?'));
  assert.ok(!S.opensOnInfinitive('primer lugar'));
});

test('K32: the honorific closes the phrase on both sides, inside the question mark', () => {
  assert.equal(S.withHonorific('can you tell me what you need?', 'sir', 'known'), 'can you tell me what you need sir?');
  assert.equal(S.withHonorific('¿puede decirme qué necesita?', 'sir', 'target'), '¿puede decirme qué necesita, señor?');
  assert.equal(S.withHonorific('lo está haciendo bien', 'madam', 'target'), 'lo está haciendo bien, señora');
  assert.equal(S.withHonorific('you speak it madam', 'madam', 'known'), 'you speak it madam');
});
