// tools/course-optimization/ita-zut-groupa-fixes-2026-09-28.test.cjs
//
// Proves the group-A fix: the eight rows, as they stood BEFORE the pass, are
// flagged by the very ZUT check the triage ran (auditRows, pure, no DB), and
// the same rows with the AFTER text are not. Runs with no network:
//   node --test tools/course-optimization/ita-zut-groupa-fixes-2026-09-28.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { PHRASES, LEGOS, contains } = require('./ita-zut-groupa-fixes-2026-09-28.cjs');
const { auditRows } = require('./audit-phrase-zut.cjs');

// The rows each fix is measured against — live on 2026-09-28, untouched by the pass.
const COUNTERPARTS = {
  legos: [
    { id: 'S0403L03', seed_number: 403, known_text: 'remain quiet', target_text: 'rimanere in silenzio' },
    { id: 'S0116L02', seed_number: 116, known_text: 'the best choice', target_text: 'la scelta migliore' },
    { id: 'S0116L01', seed_number: 116, known_text: 'choice', target_text: 'scelta' },
    { id: 'S0642L01', seed_number: 642, known_text: 'madam', target_text: 'signora' },
    { id: 'S0618L02', seed_number: 618, known_text: 'passed', target_text: 'passato' },
    { id: 'S0478L03', seed_number: 478, known_text: 'such a kind heart', target_text: 'un cuore così gentile' },
    { id: 'S0410L02', seed_number: 410, known_text: 'to fight', target_text: 'litigare' },
  ],
  phrases: [
    { id: 'ita_for_eng:S0645L01U01', seed_number: 645, phrase_role: 'use', known_text: 'I can help you madam', target_text: 'posso aiutarla, signora' },
    { id: 'ita_for_eng:S0645L01U03', seed_number: 645, phrase_role: 'use', known_text: "I'm going to help you madam", target_text: 'sto per aiutarla, signora' },
    { id: 'ita_for_eng:S0618L02U03', seed_number: 618, phrase_role: 'use', known_text: 'a lot of time has passed', target_text: 'è passato molto tempo' },
    { id: 'ita_for_eng:S0478L03U01', seed_number: 478, phrase_role: 'use', known_text: 'she has such a kind heart', target_text: 'ha un cuore così gentile' },
    { id: 'ita_for_eng:S0501L03B02', seed_number: 501, phrase_role: 'build', known_text: "I don't want to argue", target_text: 'non voglio litigare' },
    { id: 'ita_for_eng:S0376L01U01', seed_number: 376, phrase_role: 'use', known_text: "I didn't go anywhere", target_text: 'non sono andato da nessuna parte' },
  ],
};

const legoTargetById = Object.fromEntries([...COUNTERPARTS.legos, ...LEGOS.map(l => ({ id: l.id, target_text: l.after.target }))].map(l => [l.id, l.target_text]));

function picture(side) {
  const legos = [
    ...COUNTERPARTS.legos,
    ...LEGOS.map(l => ({ id: l.id, seed_number: Number(l.id.slice(1, 5)), known_text: l[side].known, target_text: l[side].target })),
  ];
  const phrases = [
    ...COUNTERPARTS.phrases,
    ...PHRASES.map(p => ({ id: `ita_for_eng:${p.id}`, seed_number: Number(p.id.slice(1, 5)), phrase_role: p.id.includes('B') ? 'build' : 'use',
      known_text: p[side].known, target_text: p[side].target })),
  ];
  return auditRows({ legos, phrases, seeds: [] });
}

test('before the pass, every one of the eight rows is a ZUT flag', () => {
  const flagged = new Set(picture('before').bidirectional.violationsStrict.map(v => v.known_norm));
  const expected = ['remain quiet', "didn't go anywhere", 'the best choice', 'i can help you madam', "i'm going to help you madam",
    'a lot of time has passed', 'she has such a kind heart', "i don't want to argue"];
  for (const k of expected) assert.ok(flagged.has(k), `expected "${k}" to be flagged before the fix`);
  assert.strictEqual(flagged.size, expected.length);
});

test('after the pass, none of them is, and no new flag appears among the counterparts', () => {
  const after = picture('after').bidirectional.violationsStrict;
  assert.deepStrictEqual(after.map(v => v.known_norm), []);
});

test('every fixed phrase still contains its LEGO (Italian side)', () => {
  for (const p of PHRASES) assert.ok(contains(p.after.target, legoTargetById[p.lego]), `${p.id}: "${p.after.target}" lacks "${legoTargetById[p.lego]}"`);
});

test('seed 642 never says aiutarla — it is first taught at seed 645', () => {
  for (const p of PHRASES.filter(p => p.id.startsWith('S0642'))) {
    assert.ok(!/aiutarla/.test(p.after.target), `${p.id} uses aiutarla before it is taught`);
    assert.ok(!/\byou\b/.test(p.after.known), `${p.id} English still promises a "you" the Italian does not carry`);
  }
});

// ── Kai's same-day follow-up: seed 208 "come dirlo" and "dirlo" alone ─────────
const FU = require('./ita-zut-groupa-followup-2026-09-28.cjs');
const FU_COUNTERPARTS = {
  legos: [
    { id: 'S0056L02', seed_number: 56, known_text: 'how to say', target_text: 'come dire' },
    { id: 'S0208L02', seed_number: 208, known_text: 'how to say it', target_text: 'come dirlo' },
    { id: 'S0061L02', seed_number: 61, known_text: 'say that', target_text: 'dirlo' },
  ],
  phrases: [
    { id: 'ita_for_eng:S0208L02B01', seed_number: 208, phrase_role: 'build', known_text: 'how to say it', target_text: 'come dirlo' },
  ],
};
function fuPicture(side) {
  const legos = [...FU_COUNTERPARTS.legos, ...FU.LEGOS.map(l => ({ id: l.id, seed_number: Number(l.id.slice(1, 5)), known_text: l[side].known, target_text: l[side].target }))];
  const phrases = [...FU_COUNTERPARTS.phrases, ...FU.PHRASES.map(p => ({ id: `ita_for_eng:${p.id}`, seed_number: Number(p.id.slice(1, 5)),
    phrase_role: p.id.includes('C') ? 'component' : 'build', known_text: p[side].known, target_text: p[side].target }))];
  return auditRows({ legos, phrases, seeds: [] }).bidirectional.violationsStrict.map(v => v.known_norm).sort();
}
test('208: "how to say" and "say it" were ZUT flags before, and are gone after', () => {
  assert.deepStrictEqual(fuPicture('before'), ['how to say', 'say it']);
  assert.deepStrictEqual(fuPicture('after'), []);
});
test('208: every build under S0208L02 reads the LEGO pair, and only B01 is the debut', () => {
  for (const p of FU.PHRASES.filter(p => p.id.startsWith('S0208L02'))) assert.deepStrictEqual(p.after, { known: 'how to say it', target: 'come dirlo' });
  assert.deepStrictEqual(FU.INTRODUCE_FALSE.sort(), ['S0208L02B02', 'S0208L02B03', 'S0208L02B04']);
  assert.ok(!FU.INTRODUCE_FALSE.includes('S0208L02B01'));
});
test('dirlo alone is glossed "say that" everywhere it stands alone (61, 644, 659)', () => {
  const alone = [...FU.LEGOS, ...FU.PHRASES].filter(x => x.after.target === 'dirlo');
  assert.strictEqual(alone.length, 2);
  for (const x of alone) assert.strictEqual(x.after.known, 'say that');
});

// ── Kai's sharpened rule: the old gloss is gone from EVERY phrase in the course ──
const GS = require('./ita-zut-groupa-gloss-sweep-2026-09-28.cjs');
test('gloss sweep: every bare-dirlo phrase that said "say it" now says "say that", and the formal one avoids the seed-61 clash', () => {
  for (const p of GS.PHRASES) {
    assert.match(p.before.known, /say it/);
    assert.match(p.after.known, /say that/);
    assert.doesNotMatch(p.after.known, /say it/);
    assert.match(p.after.target, /\bdirlo\b/);
  }
  const formal = GS.PHRASES.find(p => p.id === 'S0644L01U04');
  assert.notStrictEqual(formal.after.known.toLowerCase(), 'could you say that again?', 'would collide with S0061L03U01 potresti dirlo di nuovo?');
  assert.match(formal.after.known, /sir\?$/); assert.match(formal.after.target, /, signore\?$/);
});
