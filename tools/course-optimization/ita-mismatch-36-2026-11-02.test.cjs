'use strict';
// node --test tools/course-optimization/ita-mismatch-36-2026-11-02.test.cjs
// Job #36 (ita_for_eng #195 fixes): the named stem+clitic exception (L28 / Kai 29 Sept) lets "potrei farlo" hold the LEGO
// "I could make | potrei fare" AFTER farlo is taught (S0092L02) — and only farlo: an untaught bound form still fails P17.
const test = require('node:test');
const assert = require('node:assert');
const { plan, unbindClitics } = require('./ita-mismatch-36-2026-11-02.cjs');
const { holdsInOrder } = require('./spa-close-read-153-200-2026-10-27.cjs');

const L = (seed, idx, known, target) => ({ lego_id: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`, seed_number: seed, lego_index: idx, known_text: known, target_text: target, is_new: true });
const P = (id, role, known, target) => ({ id: `ita_for_eng:${id}`, phrase_role: role, known_text: known, target_text: target, seed_number: Number(id.slice(1, 5)), lego_index: Number(id.slice(6, 8)) });
const decomposer = { decomposeAnchored: (t, _v, parent) => ({ kind: holdsInOrder(t, parent.target_text) ? 'exact' : 'error', blocks: [{ target: t }] }) };
const tw = { taughtWordKeys: () => new Set(), untaughtWords: () => [] };
const course = () => ({
  seeds: [{ seed_number: 116, known_text: 'x', target_text: 'y', approved_at: null }],
  legos: [L(116, 3, 'I could make', 'potrei fare'), L(116, 4, 'to change', 'cambiare')],
  phrases: [
    P('S0116L03B01', 'build', 'I could make', 'potrei fare'),
    P('S0116L03U02', 'use', 'I could make it better', 'potrei fare meglio'),
    P('S0116L04B01', 'build', 'to change', 'cambiare'),
    P('S0116L04U02', 'use', 'we need to change it', 'dobbiamo cambiare'),
  ],
});

test('farlo is unbound to fare; nothing else is', () => {
  assert.strictEqual(unbindClitics('potrei farlo meglio'), 'potrei fare meglio');
  assert.strictEqual(unbindClitics('dobbiamo cambiarlo'), 'dobbiamo cambiarlo');
});

test('"potrei farlo meglio" holds "potrei fare"; "cambiarlo" does not hold "cambiare"', () => {
  const p = plan(course(), { decomposer, tw, data: { FIXES: [
    ['S0116L03U02', 'dropped-object', ['I could make it better', 'potrei fare meglio'], [null, 'potrei farlo meglio'], 'x'],
    ['S0116L04U02', 'dropped-object', ['we need to change it', 'dobbiamo cambiare'], [null, 'dobbiamo cambiarlo'], 'x'],
  ] } });
  assert.deepStrictEqual(p.go.map((g) => g.id), ['S0116L03U02']);
  assert.match(p.skipped.find((s) => s.id === 'S0116L04U02').why, /P17 Italian no longer holds "cambiare"/);
});
