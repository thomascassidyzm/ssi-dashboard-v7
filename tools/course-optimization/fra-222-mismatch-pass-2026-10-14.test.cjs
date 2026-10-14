'use strict';
// node --test tools/course-optimization/fra-222-mismatch-pass-2026-10-14.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const T = require('./fra-222-mismatch-pass-2026-10-14.cjs');

const ph = (sid, known, target, role = 'use') => ({ id: `fra_for_eng:${sid}`, phrase_role: role, known_text: known, target_text: target });
const db = () => ({
  seeds: [],
  legos: [{ lego_id: 'S0412L03', is_new: true, known_text: 'to them them', target_text: 'leur' }],
  intros: [{ lego_id: 'S0412L03', text: 'The French for: \'to them them\', is: <break time="300ms"/> <break time="10ms"/>' }],
  phrases: [ph('S0403L01U04', 'we should leave', 'nous devrions partir là'), ph('S0407L01U05', 'shouldn\'t we try', 'ne devrions-nous pas essayer là'),
    ph('S0018L02U07', 'x', 'y'), ph('S0001L01C01', 'I', 'je', 'component')],
});

test('fix keeps the untouched side, delete takes the row, held and no-op rows write nothing, seed 18 is skipped', () => {
  const p = T.plan(db(), [
    ['S0403L01U04', 'real', 'fix', [null, 'nous devrions partir'], 'K16', 'stray là'],
    ['S0407L01U05', 'real', 'delete', null, 'R0.3', 'dup'],
    ['S0412L03', 'real', 'fix', ['to them', null], 'L11', 'garbled'],
    ['S0018L02U07', 'real', 'fix', ['a', 'b'], 'K26', 'seed 18 is #449\'s'],
    ['S0543L01', 'real', 'held', null, 'L26', 'LEGO call'],
    ['S0055L02U05', 'gone', 'none', null, null, 'gone'],
  ]);
  assert.deepStrictEqual(p.phrases.map((c) => [c.id, c.after]), [['S0403L01U04', ['we should leave', 'nous devrions partir']]]);
  assert.deepStrictEqual(p.deletes.map((c) => c.id), ['S0407L01U05']);
  assert.deepStrictEqual(p.held.map((c) => c.id), ['S0543L01']);
  assert.deepStrictEqual(p.skipped.map((c) => c.id), ['S0018L02U07', 'S0055L02U05']);
  // a re-glossed debut LEGO gets its intro re-said with the new words (O13), SSML dropped
  assert.strictEqual(p.legos[0].intro, "The French for: 'to them', is:");
});

test('a LEGO is never deleted, and components are out of scope', () => {
  assert.throws(() => T.plan(db(), [['S0412L03', 'real', 'delete', null, 'x', 'y']]), /never deleted/);
  assert.throws(() => T.plan(db(), [['S0001L01C01', 'real', 'fix', ['I', 'moi'], 'x', 'y']]), /components/);
});

test('every edit op pins the row to the dump (expect), so drift aborts the batch', () => {
  const p = T.plan(db(), [['S0403L01U04', 'real', 'fix', [null, 'nous devrions partir'], 'K16', 'x'], ['S0407L01U05', 'real', 'delete', null, 'R0.3', 'x']]);
  const ops = T.editOps(p);
  assert.deepStrictEqual(ops[0].expect, { known_text: 'we should leave', target_text: 'nous devrions partir là' });
  assert.strictEqual(ops[1].op, 'phrase.delete');
  assert.ok(ops[1].expect);
});

test('a French change asks the route for BOTH target voices; an English change only the known side', () => {
  const p = T.plan(db(), [['S0403L01U04', 'real', 'fix', [null, 'nous devrions partir'], 'K16', 'x'], ['S0412L03', 'real', 'fix', ['to them', null], 'L11', 'x']]);
  const asks = T.clipAsks(p).map((a) => `${a.role}:${a.text}${a.legoId ? '@' + a.legoId : ''}`).sort();
  assert.deepStrictEqual(asks, ["known:to them", "presentation:The French for: 'to them', is:@S0412L03", 'target1:nous devrions partir', 'target2:nous devrions partir']);
});

test('ZUT gate holds a change whose English opens a NEW strict group, and lets the rest through', () => {
  const d = db();
  d.phrases.push(ph('S0500L01U01', 'we should go', 'nous devrions aller'));
  const p = T.plan(d, [['S0403L01U04', 'real', 'fix', ['we should go', 'nous devrions partir'], 'K2', 'x'], ['S0407L01U05', 'real', 'fix', ['shouldn\'t we try', 'ne devrions-nous pas essayer'], 'K16', 'x']]);
  const nk = (s) => String(s).toLowerCase().trim();
  // fake auditor: one strict group per English that maps to more than one French
  const audit = { nk, auditRows: ({ phrases }) => {
    const m = new Map();
    for (const r of phrases) { const k = nk(r.known_text); if (!m.has(k)) m.set(k, new Set()); m.get(k).add(r.target_text); }
    return { bidirectional: { violationsStrict: [...m].filter(([, s]) => s.size > 1).map(([k, s]) => ({ known_norm: k, distinct_targets: [...s].map((t) => ({ example: { target: t } })) })) } };
  } };
  const z = T.zutGate(d, p, audit);
  assert.deepStrictEqual(p.phrases.map((c) => c.id), ['S0407L01U05']);
  assert.deepStrictEqual(p.held.map((c) => [c.id, c.rule]), [['S0403L01U04', 'K2']]);
  assert.deepStrictEqual(z, { before: 0, after: 0 });
});

test('a re-run skips what an earlier run already applied, so its expect never trips on our own edits', () => {
  const d = db();
  d.phrases = d.phrases.filter((p) => !p.id.endsWith('S0407L01U05'));
  d.phrases[0].target_text = 'nous devrions partir';
  const p = T.plan(d, [['S0403L01U04', 'real', 'fix', [null, 'nous devrions partir'], 'K16', 'x'], ['S0407L01U05', 'real', 'delete', null, 'R0.3', 'x']]);
  assert.strictEqual(p.phrases.length + p.deletes.length, 0);
  assert.strictEqual(p.skipped.length, 2);
});
