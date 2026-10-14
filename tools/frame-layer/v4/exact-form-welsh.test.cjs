// Aran's Welsh rule (methodology lead, 2026-10-13) in the v4 generator's exact-form check:
// any Welsh taught earlier counts, even a word met only inside a bigger chunk; a soft-mutated
// form is the same word; nasal/aspirate and other forms are still new until taught as such.
// Run: node --test tools/frame-layer/v4/exact-form-welsh.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { exactFormCheck } = require('./exact-form.cjs');

const C = 'cym_sv2_for_eng';
const TAUGHT = ['dw i’n trio', 'cael', 'gyda ti', 'mae', 'cath', 'ydyn nhw'];

test('"trio" is accepted after "dw i’n trio" (met only inside the chunk)', () => {
  const r = exactFormCheck('mae trio', TAUGHT, { courseCode: C });
  assert.strictEqual(r.ok, true);
});

// Since 2026-10-13 (Aran, confirmed by Tom, job #587) every language reads words; with no
// courseCode the language is unknown, so only whole-chunk tiling runs.
test('a non-Welsh course reads words too, but folds no mutation; no courseCode = whole chunks only', () => {
  assert.strictEqual(exactFormCheck('mae trio', TAUGHT, { courseCode: 'spa_for_eng' }).ok, true);
  assert.strictEqual(exactFormCheck('dw i’n trio gael', TAUGHT, { courseCode: 'spa_for_eng' }).ok, false);
  assert.strictEqual(exactFormCheck('mae trio', TAUGHT).ok, false);
});

test('a never-taught Welsh word is rejected and named', () => {
  const r = exactFormCheck('mae ci gyda ti', TAUGHT, { courseCode: C });
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.offending, ['ci']);
});

test('a soft-mutated form of a taught word is accepted (cael → gael)', () => {
  assert.strictEqual(exactFormCheck('dw i’n trio gael', TAUGHT, { courseCode: C }).ok, true);
});

test('nasal and aspirate forms are NOT folded: still new until that form is taught', () => {
  const nasal = exactFormCheck('mae nghath', TAUGHT, { courseCode: C });
  assert.strictEqual(nasal.ok, false);
  assert.deepStrictEqual(nasal.offending, ['nghath']);
  const asp = exactFormCheck('mae chath', TAUGHT, { courseCode: C });
  assert.strictEqual(asp.ok, false);
  assert.deepStrictEqual(asp.offending, ['chath']);
  assert.strictEqual(exactFormCheck('mae chath', [...TAUGHT, 'ei chath hi'], { courseCode: C }).ok, true);
});

// The prompts say the same rule the check grades (taught-words.cjs vocabRulePrompt): every
// space-separated course, with the soft-mutation note for Welsh only; no-space scripts keep chunks.
test('generator prompts give every course the word rule, Welsh the mutation note, Chinese whole chunks', () => {
  const { buildEscalationPrompt } = require('../../../services/course-builder/lib/build-escalation.cjs');
  const { buildGapPrompt } = require('./generate-v4.cjs');
  const esc = (courseCode) => buildEscalationPrompt({ courseCode, lego: { known: 'I try', target: 'dw i’n trio' }, usePhrases: [], priorPairs: [], need: 3 });
  assert.match(esc('cym_sv2_for_eng'), /ANY Welsh word taught earlier/);
  assert.doesNotMatch(esc('cym_sv2_for_eng'), /ONLY whole chunks/);
  assert.match(esc('spa_for_eng'), /ANY Spanish word taught earlier/);
  assert.doesNotMatch(esc('spa_for_eng'), /Welsh|mutat/);
  assert.match(esc('zho_for_eng'), /ONLY whole chunks/);
  const gap = (course) => buildGapPrompt({ course, region: [1, 2], seeds: [], newLegos: [], allChunks: [], missing: [], carriers: {} });
  assert.match(gap('cym_sv2_for_eng'), /ANY Welsh word taught earlier/);
  assert.match(gap('fra_for_eng'), /ANY French word taught earlier/);
  assert.match(gap('zho_for_eng'), /whole taught chunks in VOCABULARY/);
});
