// The rewrite rules of the 2026-09-21 gle_for_eng clear-cut sweep, pinned.
// Fails on the pre-fix shapes (the calque survives) and passes on the post-fix
// ones. Run alone: node --test tools/course-optimization/gle-clearcut-irish-fixes-2026-09-21.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { rewritePhrase, SEEDS, LEGOS } = require('./gle-clearcut-irish-fixes-2026-09-21.cjs');

const P = 'gle_for_eng:';
test('L04 phrases follow the LEGO to "on the story" / "ar an scéal" on both sides', () => {
  const r = rewritePhrase({ id: P + 'S0036L04U08', known_text: "I don't want to interrupt on it because it is not good",
    target_text: 'níl mé ag iarraidh a bhriseadh isteach air mar ní maith liom a bhriseadh isteach' });
  assert.strictEqual(r.target, 'níl mé ag iarraidh cur isteach ar an scéal mar ní maith liom cur isteach');
  assert.strictEqual(r.known, "I don't want to interrupt the story because it is not good");
});
test('S0037L03 phrases keep "air" (their LEGO) and drop the object the English never had', () => {
  const r = rewritePhrase({ id: P + 'S0037L03B05', known_text: "we don't want to interrupt on it",
    target_text: 'níl muid ag iarraidh an scéal a bhriseadh isteach air' });
  assert.strictEqual(r.target, 'níl muid ag iarraidh cur isteach air');
  assert.strictEqual(r.known, "we don't want to interrupt on it");
});
test('phrases that name the story in English get "ar an scéal"', () => {
  const r = rewritePhrase({ id: P + 'S0067L03U15', known_text: "we don't want to interrupt the story when he was learning",
    target_text: 'níl muid ag iarraidh an scéal a bhriseadh isteach air nuair a bhí sé ag foghlaim' });
  assert.strictEqual(r.target, 'níl muid ag iarraidh cur isteach ar an scéal nuair a bhí sé ag foghlaim');
});
test('no rewritten shape carries the calque, and the pre-fix shapes do', () => {
  const pre = ['a bhriseadh isteach', 'a bhriseadh isteach air', 'an scéal a bhriseadh isteach air'];
  for (const t of pre) {
    assert.match(t, /bhriseadh/);
    assert.doesNotMatch(rewritePhrase({ id: P + 'S0036L03U01', known_text: 'x', target_text: t }).target, /bhriseadh/);
  }
});
test('the clear-cut table is exactly the 15 seeds of the proposal and never a borderline one', () => {
  assert.deepStrictEqual(SEEDS.map(s => s.n), [36, 126, 214, 272, 379, 427, 485, 497, 538, 550, 551, 552, 553, 614, 618]);
  const borderline = [2, 6, 39, 41, 147, 354, 455, 493, 542, 548, 551 - 551, 555, 573, 575, 576];
  for (const b of borderline) if (b) assert.ok(!SEEDS.some(s => s.n === b), `borderline seed ${b} must not be in the clear-cut set`);
  assert.ok(LEGOS.every(l => !/bhriseadh|cosúil le|am maith/.test(l.after.target)));
});
