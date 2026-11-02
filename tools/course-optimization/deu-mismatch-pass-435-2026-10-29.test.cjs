'use strict';
// node --test tools/course-optimization/deu-mismatch-pass-435-2026-10-29.test.cjs
// The gates of the job #435 apply tool on a hand-built course: drift, LEGO containment, untaught German, a new
// English→two-German clash (refused) vs a German→two-English pair (allowed), the basket floor, P26 seed copies, O5.
const test = require('node:test');
const assert = require('node:assert');
const { plan, editBatches } = require('./deu-mismatch-pass-435-2026-10-29.cjs');
const { holdsInOrder } = require('./spa-close-read-153-200-2026-10-27.cjs');

const L = (seed, idx, known, target) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, known_text: known, target_text: target, is_new: true });
const P = (id, role, known, target) => ({ id: `deu_for_eng:${id}`, phrase_role: role, known_text: known, target_text: target, seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)) });
const decomposer = { decomposeAnchored: (t, _v, parent) => ({ kind: holdsInOrder(t, parent.target_text) ? 'exact' : 'error', blocks: [{ target: t }] }) };
const TAUGHT = new Set(['ich', 'denke', 'wir', 'waren', 'glücklich', 'damals', 'mein', 'freund', 'sagt', 'froh']);
const tw = { taughtWordKeys: () => new Set(), untaughtWords: (t) => t.toLowerCase().replace(/[^\p{L} ]/gu, '').split(/\s+/).filter((w) => w && !TAUGHT.has(w)) };

const course = () => ({
  seeds: [{ seed_number: 118, known_text: 'We were happy then', target_text: 'Wir waren damals glücklich', approved_at: '2026-07-01T00:00:00Z' }],
  legos: [L(118, 2, 'we were', 'wir waren')],
  phrases: [
    P('S0118L02B01', 'build', 'We were', 'Wir waren'),
    P('S0118L02U03', 'use', 'I think we were happy then', 'Ich denke wir waren glücklich'),
    P('S0118L02U04', 'use', 'My friend says we were happy', 'Mein Freund sagt wir waren glücklich'),
    P('S0118L02U05', 'use', 'We were happy then', 'Wir waren damals glücklich'),
    P('S0118L02U06', 'use', 'I think we were glad', 'Ich denke wir waren froh'),
    P('S0118L02U07', 'use', 'We were glad', 'Wir waren froh'),
  ],
});
const run = (data) => plan(course(), { data, decomposer, tw });

test('an English-side fix goes, and its seed is unapproved (O5)', () => {
  const p = run({ FIXES: [['S0118L02U03', 'en-extra', ['I think we were happy then', 'Ich denke wir waren glücklich'], ['I think we were happy', null], 'x']] });
  assert.deepStrictEqual(p.go.map((g) => g.id), ['S0118L02U03']);
  assert.deepStrictEqual(p.go[0].set, { known_text: 'I think we were happy' });
  assert.deepStrictEqual(p.unapprove, [118]);
  assert.ok(editBatches(p).some((b) => b.ops.some((o) => o.op === 'seed.update' && o.set.approved_at === null)));
});

test('drift, lost LEGO, untaught German and a new EN→2DE clash are each refused', () => {
  const p = run({ FIXES: [
    ['S0118L02U04', 'mismatch', ['My friend says we were sad', 'Mein Freund sagt wir waren glücklich'], ['x', null], 'drift'],
    ['S0118L02U03', 'en-extra', ['I think we were happy then', 'Ich denke wir waren glücklich'], ['I think they were happy', null], 'loses LEGO'],
    ['S0118L02U04', 'de-dropped', ['My friend says we were happy', 'Mein Freund sagt wir waren glücklich'], [null, 'Mein Freund sagt wir waren sehr glücklich'], 'untaught'],
  ] });
  assert.strictEqual(p.go.length, 0);
  const why = p.skipped.map((s) => s.why).join('\n');
  assert.match(why, /drift/); assert.match(why, /P17 English/); assert.match(why, /P1 untaught: sehr/);
  const z = run({ FIXES: [['S0118L02U06', 'mismatch', ['I think we were glad', 'Ich denke wir waren froh'], ['We were happy then', null], 'clash']] });
  assert.match(z.skipped[0].why, /ZUT new clash: EN→2DE/);
});

test('two Englishes over one German is allowed (noted, not refused)', () => {
  const p = run({ FIXES: [['S0118L02U07', 'mismatch', ['We were glad', 'Wir waren froh'], [null, 'Wir waren glücklich'], 'x']] });
  assert.strictEqual(p.go.length, 1);
});

test('a seed fix takes its P26 copy along; deletes keep the USE floor', () => {
  const p = run({ SEED_FIXES: [[118, 'en-dropped', ['We were happy then', 'Wir waren damals glücklich'], ['Back then we were happy', null], 'x']],
    FIXES: [['S0118L02U04', 'delete', ['My friend says we were happy', 'Mein Freund sagt wir waren glücklich'], null, 'x'],
      ['S0118L02U06', 'delete', ['I think we were glad', 'Ich denke wir waren froh'], null, 'x']] });
  assert.strictEqual(p.seedGo.length, 1);
  assert.ok(p.go.some((g) => g.id === 'S0118L02U05' && g.set.known_text === 'Back then we were happy'));
  assert.match(p.skipped.find((s) => s.id === 'S0118L02U04').why, /floor/);
});

test('a BUILD row fixed to read exactly its LEGO is not a "duplicate" of the LEGO row', () => {
  const c = course();
  c.phrases = c.phrases.filter((q) => q.id !== 'deu_for_eng:S0118L02B01');
  c.phrases.push(P('S0118L02B02', 'build', 'we were', 'wir'));
  const p = plan(c, { data: { FIXES: [['S0118L02B02', 'de-dropped', ['we were', 'wir'], [null, 'wir waren'], 'x']] }, decomposer, tw });
  assert.deepStrictEqual(p.go.map((g) => g.id), ['S0118L02B02']);
});

test('a LEGO re-gloss is refused only for rows that held the old LEGO and lose it (regression), not rows that never held it', () => {
  const c = course();
  c.legos[0] = { ...c.legos[0], known_text: 'we were then', target_text: 'wir waren' };
  c.phrases.push(P('S0118L02U08', 'use', 'We are glad', 'Wir sind froh')); // never held the LEGO, before or after
  const p = plan(c, { data: { LEGO_FIXES: [['S0118L02', 'en-calque', ['we were then', 'wir waren'], ['we were', null], 'x']] }, decomposer, tw });
  assert.strictEqual(p.legoGo.length, 1, JSON.stringify(p.skipped));
});
