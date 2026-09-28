// tools/course-optimization/ita-seed-519-recut-2026-09-28.test.cjs
//
// Proves the seed-519 re-cut against Kai's rules with no network: the OLD picture (live before
// the pass) breaks them — L04 "non ho ancora visto" swallows ancora so L01 "yet" has nothing to
// point at, B03 carries ancora twice, U03 says ancora under an English with no "yet" — and the
// NEW picture holds every one of them.
//   node --test tools/course-optimization/ita-seed-519-recut-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./ita-seed-519-recut-2026-09-28.cjs');

const oldIdx = (id) => Number(id.slice(6, 8));
const oldRole = (id) => ({ B: 'build', U: 'use', C: 'component' }[id[8]]);
const OLD_PHRASES = T.OLD.phrases.map(p => ({ ...p, idx: oldIdx(p.id), role: oldRole(p.id) }));

test('BEFORE: the old cut breaks the rules the new one is measured by', () => {
  // L01 "yet → ancora" has no phrase at all, and L04's Italian carries the seed's only ancora.
  assert.equal(OLD_PHRASES.filter(p => p.idx === 1).length, 0);
  assert.match(T.OLD.legos[3].target, /\bancora\b/);
  // B03 says ancora twice.
  assert.equal(T.noDoubledAncora(OLD_PHRASES), false);
  // U03 puts ancora under an English with no "yet" (measured with the new slot rule on the old L04).
  const u03 = OLD_PHRASES.find(p => p.id === 'S0519L04U03');
  assert.match(u03.target, /\bancora\b/);
  assert.doesNotMatch(u03.known, /\byet$/);
});

test('AFTER: LEGOs tile the seed, every phrase contains its LEGO on both sides', () => {
  const { problems, phrases } = T.checkOffline();
  assert.deepEqual(problems, []);
  assert.ok(T.legosTileSeed(T.NEW_LEGOS, T.SEED_TEXT));
  for (const p of phrases) assert.ok(T.phraseContainsLego(T.NEW_LEGOS.find(l => l.idx === p.idx), p), p.id);
});

test('AFTER: no ancora under "non ho visto"; under "yet" ancora sits between auxiliary and participle with English "…yet"', () => {
  const phrases = T.resolvedPhrases();
  assert.deepEqual(T.ancoraRules(phrases), []);
  for (const p of phrases.filter(x => x.idx === 3)) assert.doesNotMatch(p.target, /\bancora\b/, p.id);
  for (const p of phrases.filter(x => x.idx === 4)) { assert.match(p.target, /\bnon (l')?ho ancora visto\b/, p.id); assert.match(p.known, /\byet$/, p.id); }
  assert.ok(T.buildsUpToSeed(phrases));
  assert.ok(T.noDoubledAncora(phrases));
});

test('AFTER: "yet → ancora" stays not-new and follows "I haven\'t seen"; no LEGO is lost; the two named rows are fixed', () => {
  const yet = T.NEW_LEGOS.find(l => l.known === 'yet');
  const seen = T.NEW_LEGOS.find(l => l.known === "I haven't seen");
  assert.equal(yet.is_new, false);
  assert.equal(seen.target, 'non ho visto');
  assert.ok(yet.idx > seen.idx);
  const oldPairs = T.OLD.legos.map(l => l.known).sort();
  assert.deepEqual(T.NEW_LEGOS.map(l => l.known).sort(), oldPairs);
  const phrases = T.resolvedPhrases();
  assert.equal(phrases.find(p => p.id === 'S0519L02U03').target, 'il loro nuovo bambino è bellissimo');
  assert.ok(!phrases.some(p => /per niente/.test(p.target)));
  assert.ok(!phrases.some(p => /molto bellissimo/.test(p.target)));
});
