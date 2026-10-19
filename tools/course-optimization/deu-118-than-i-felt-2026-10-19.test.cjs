'use strict';
// node --test tools/course-optimization/deu-118-than-i-felt-2026-10-19.test.cjs
// The proof for job #168: the rule (P17 + canon K48) FAILS on seed 118's rows as they stood on 19 Oct and PASSES on the plan.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./deu-118-than-i-felt-2026-10-19.cjs');

const ph = (sid, known, target, role = 'use', extra = {}) => ({ id: `deu_for_eng:${sid}`, phrase_role: role, known_text: known, target_text: target, position: 1, metadata: {}, ...extra });
// seed 118 as it stood before #168 (rows copied from Popty on 19 Oct; the vocabulary seed 1 stands in for seeds 1-117)
const TAUGHT_T = 'ich fühle mich besser als ich mich gefühlt habe wir waren in der Kneipe gestern sehr müde bevor geredet haben angefangen will fühlen glücklich dass mit dir denke weiß weil viel gelernt du dich fühlst hast gesagt möchte sagen das letzte Mal überrascht so war Mein Freund sagt gut geschlafen Heute miteinander bin';
const TAUGHT_K = "i feel better than felt we were in the pub yesterday very tired before talked to each other started want happy that you with think know because learnt a lot said tell the last time surprised so was my friend says slept well today am i'm i've much";
const before = () => ({
  seeds: [{ seed_number: 1, known_text: TAUGHT_K, target_text: TAUGHT_T }, { seed_number: 118, known_text: 'I feel better than I felt when we were in the pub', target_text: 'Ich fühle mich besser als ich mich gefühlt habe, als wir in der Kneipe waren' }],
  legos: [{ lego_id: 'S0118L01', seed_number: 118, lego_index: 1, is_new: true, known_text: 'I felt', target_text: 'ich mich gefühlt habe', components: [{ known: 'I', target: 'ich mich' }, { known: 'felt', target: 'gefühlt habe' }] }],
  phrases: [
    ph('S0118L01C01', 'I', 'Ich mich', 'component', { metadata: { buildup: 'component', component_index: 0 } }),
    ph('S0118L01C02', 'Felt', 'Gefühlt habe', 'component', { metadata: { buildup: 'component', component_index: 1 } }),
    ph('S0118L01B02', 'I know how I felt', 'Ich weiß, wie ich mich gefühlt habe', 'build'),
    ph('S0118L01U01', 'I felt very tired yesterday', 'Ich habe mich gestern sehr müde gefühlt'),
    ph('S0118L01U07', 'I felt better when I started to understand more', 'Ich habe mich besser gefühlt, als ich angefangen habe mehr zu verstehen'),
  ],
});

test('BEFORE: the old LEGO has no subordinator and its rows break P17 (and use the main-clause order)', () => {
  assert.strictEqual(T.carriesSubordinator(T.OLD_LEGO), false);
  for (const r of before().phrases.filter((p) => p.phrase_role !== 'component')) assert.strictEqual(T.containsLego(r, T.NEW_LEGO), false, r.target_text);
  assert.strictEqual(T.mainClauseOrder('Ich habe mich gestern sehr müde gefühlt'), true);
});

test('AFTER: the new LEGO starts with its subordinator, its components tile it, and every basket row contains it whole and contiguous', () => {
  assert.strictEqual(T.carriesSubordinator(T.NEW_LEGO), true);
  assert.strictEqual(T.NEW_COMPONENTS.map((c) => c.known).join(' '), T.NEW_LEGO.known);
  assert.strictEqual(T.NEW_COMPONENTS.map((c) => c.target).join(' '), T.NEW_LEGO.target);
  assert.ok(T.BASKET.length >= 12, 'as many different outer sentences as the taught words allow');
  const targets = new Set(T.BASKET.map((b) => b[3]));
  assert.strictEqual(targets.size, T.BASKET.length, 'no two rows are the same sentence');
  for (const [id, , known, target] of T.BASKET) {
    assert.strictEqual(T.containsLego({ known_text: known, target_text: target }, T.NEW_LEGO), true, id);
    assert.strictEqual(T.mainClauseOrder(target), false, id);
  }
  // short to long: builds first, each use at least as long as the longest build
  const builds = T.BASKET.filter((b) => b[1] === 'build'), uses = T.BASKET.filter((b) => b[1] === 'use');
  assert.ok(builds.length >= 3 && uses.length >= 5);
  assert.ok(Math.min(...uses.map((u) => u[3].length)) >= Math.min(...builds.map((b) => b[3].length)));
});

test('the plan rewrites the old rows in place, inserts the missing ones, adds the "than" tile, and leaves a basket that breaks nothing', () => {
  const db = before();
  const p = T.plan(db);
  assert.ok(p.lego && p.lego.after.target === 'als ich mich gefühlt habe');
  assert.deepStrictEqual(p.phraseUpdates.map((u) => u.id).sort(), ['S0118L01B02', 'S0118L01C01', 'S0118L01C02', 'S0118L01U01', 'S0118L01U07']);
  assert.ok(p.inserts.some((i) => i.id === 'S0118L01C03'), 'the new "than | als" tile');
  const post = T.simulate(db, p);
  const rows = post.phrases.filter((r) => r.id.includes('S0118L01') && r.phrase_role !== 'component');
  assert.strictEqual(rows.length, T.BASKET.length);
  for (const r of rows) assert.strictEqual(T.containsLego(r, T.NEW_LEGO), true, r.id);
  // idempotent: planning on the already-applied course changes nothing
  const again = T.plan({ ...post, phrases: post.phrases });
  assert.strictEqual(again.lego, null);
  assert.strictEqual(again.inserts.length, 0);
});

test('the intro mirrors the new LEGO: it quotes it byte for byte and its demonstration sentence contains it', () => {
  assert.ok(T.INTRO.includes(`'${T.NEW_LEGO.known}'`));
  const demo = T.INTRO.match(/as in — '(.+)', is:$/)[1];
  assert.ok(demo.toLowerCase().includes(T.NEW_LEGO.known.toLowerCase()));
});
