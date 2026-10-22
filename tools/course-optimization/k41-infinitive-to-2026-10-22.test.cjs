'use strict';
// node --test tools/course-optimization/k41-infinitive-to-2026-10-22.test.cjs
// Proof of canon K41 as the tool applies it (job #530): a bare English verb over a target infinitive gets "to"; its tile and its
// BUILD fragments follow; a "to X" already standing over a different target is HELD (ZUT); an exact both-sides match of an earlier
// LEGO goes not-new; a USE row opening with the unit (a real imperative) is listed, never changed.
const test = require('node:test');
const assert = require('node:assert');
const T = require('./k41-infinitive-to-2026-10-22.cjs');

const L = (id, seed, idx, known, target, extra = {}) => ({ lego_id: id, seed_number: seed, lego_index: idx, known_text: known, target_text: target, is_new: true, components: null, ...extra });
const P = (id, seed, idx, role, known, target) => ({ id: `x:${id}`, seed_number: seed, lego_index: idx, phrase_role: role, known_text: known, target_text: target });
const db = {
  seeds: [1, 2, 3].map((n) => ({ seed_number: n, known_text: 's', target_text: 't', approved_at: '2026-01-01T00:00:00.000Z' })),
  legos: [L('S0001L01', 1, 1, 'to stop', 'parar'), L('S0001L02', 1, 2, 'I want', 'quero'),
    L('S0002L01', 2, 1, 'think', 'penser'), L('S0002L02', 2, 2, 'to think', 'réfléchir'),
    L('S0003L01', 3, 1, 'stop', 'parar'), L('S0003L02', 3, 2, 'put your hands up', 'levantar as mãos', { components: [{ known: 'put up', target: 'levantar' }, { known: 'your hands', target: 'as mãos' }] })],
  phrases: [P('S0003L02C01', 3, 2, 'component', 'put up', 'levantar'), P('S0003L02B01', 3, 2, 'build', 'put your hands up', 'levantar as mãos'),
    P('S0003L02B02', 3, 2, 'build', 'yes, put your hands up', 'sim, levantar as mãos'), P('S0003L02B03', 3, 2, 'build', 'we should put your hands up', 'devíamos levantar as mãos'),
    P('S0003L02U01', 3, 2, 'use', 'put your hands up please', 'levantar as mãos por favor')],
};
const decisions = { isInfinitiveTile: (t) => /^levantar/.test(t), change: { S0002L01: {}, S0003L01: {}, S0003L02: {} } };

test('K41: to + tile + BUILD fragments; ZUT hold; not-new; USE rows untouched', () => {
  const p = T.plan(db, 'x', decisions);
  const lego = Object.fromEntries(p.changes.map((c) => [c.id, c]));
  assert.equal(lego.S0003L02.after.known, 'to put your hands up');
  assert.deepEqual(lego.S0003L02.after.components[0], { known: 'to put up', target: 'levantar' });
  assert.deepEqual(p.phrases.map((x) => x.after).sort(), ['to put up', 'to put your hands up', 'yes, to put your hands up']);   // governed B03 and USE U01 stay
  assert.ok(p.useLead.some((u) => /please/.test(u.text)));
  assert.ok(p.held.some((h) => h.id === 'S0002L01' && /ZUT/.test(h.why)));                                                    // to think already = réfléchir
  assert.equal(lego.S0003L01.after.is_new, false);                                                                            // to stop | parar already stands at S0001L01
  assert.equal(lego.S0003L01.notNew, 'S0001L01');
});
