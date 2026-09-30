'use strict';
// node --test tools/course-optimization/ita-k40-k41-plan-2026-09-30.test.cjs
// The rules the pass applies, as functions: they fail on the live BEFORE texts and pass on the plan's AFTER texts.
const test = require('node:test');
const assert = require('node:assert');
const P = require('./ita-k40-k41-plan-2026-09-30.cjs');

// K40: a subjunctive in a LEGO needs its governing word INSIDE the unit; bare "che" is not one.
const SUBJ = /\b(sia|siano|stia|voglia|possa|debba|potesse|sapesse|chieda|aiuti|fosse|stessi)\b/;
const TRIGGER = /\b(penso|pensavo|pensi|volevo|vuoi|vogliono|felice|come se|se|dirmi)\b/;
const k40Ok = (target) => !SUBJ.test(target) || TRIGGER.test(target.slice(0, target.search(SUBJ)));
// K41: a LEGO whose Italian starts with an infinitive is glossed with "to".
const k41Ok = (known, target) => !/^[a-zà-ù]+(are|ere|ire|rsi|rmi|rti|rlo|rci|rvi|rla|rle)\b/.test(target.split(' ')[0]) || /^to /.test(known);

const BEFORE_K40 = {
  S0070L03: 'dove fosse', S0171L02: 'che ti aiuti', S0303L01: 'che voglia', S0304L01: 'che non voglia', S0315L02: 'che non potesse',
  S0325L01: 'che debba', S0326L01: 'che lei debba', S0335L01: 'che possa', S0336L01: 'che lei possa', S0346L01: 'che lei sapesse',
  S0432L02: 'che tu chieda', S0636L02: 'che quella sia', S0655L01: 'che stia andando',
};
const BEFORE_K41 = { S0062L01: ['help you', 'aiutarti'], S0070L01: ['tell me', 'dirmi'], S0171L03: ['look for it', 'cercarlo'], S0293L02: ['meet me', 'incontrarmi'], S0660L01: ['help you all', 'aiutarvi'] };

test('K40: every re-cut LEGO failed before and carries its trigger after', () => {
  for (const [id, before] of Object.entries(BEFORE_K40)) {
    assert.equal(k40Ok(before), false, `${id} before "${before}" should fail`);
    assert.equal(k40Ok(P.K40_LEGOS[id].target), true, `${id} after "${P.K40_LEGOS[id].target}" should pass`);
  }
});
test('K41: infinitive LEGOs failed before and carry "to" after', () => {
  for (const [id, [k, t]] of Object.entries(BEFORE_K41)) {
    assert.equal(k41Ok(k, t), false, `${id} before "${k}" should fail`);
    assert.equal(k41Ok(P.K41_LEGOS[id].known, t), true, `${id} after "${P.K41_LEGOS[id].known}" should pass`);
  }
});
test('every K40 BUILD/USE edit holds its trigger; no held seed is written', () => {
  for (const [id, [, t]] of Object.entries(P.K40_PHRASES)) assert.ok(k40Ok(t) || /^S0(139|070L03U02)/.test(id), `${id} "${t}"`);
  const heldSeeds = ['47', '185', '204', '339', '375', '419', '427', '438', '444', '479', '482', '486', '497', '501', '526', '587', '597', '668'];
  const written = [...Object.keys(P.K40_LEGOS), ...Object.keys(P.K40_PHRASES), ...Object.keys(P.K40_DELETES), ...P.K41_BUILD_IDS].map((id) => String(Number(id.slice(1, 5))));
  for (const s of heldSeeds.filter((s) => !['204', '501'].includes(s))) assert.ok(!written.includes(s), `held seed ${s} is written`);
  // 204 and 501: only their K41 rows under OTHER LEGOs (204 L03 B03, 501 L04 B02) — never the held K40 LEGO
  assert.ok(!Object.keys(P.K40_LEGOS).some((id) => /^S0(204|501)/.test(id)));
});
test('Kai\'s K41 holds are not in the plan', () => {
  for (const id of ['S0061L02', 'S0644L02', 'S0067L01', 'S0251L01', 'S0255L01', 'S0066L02', 'S0074L01', 'S0300L01', 'S0314L01', 'S0382L04']) assert.ok(!P.K41_LEGOS[id], id);
  for (const id of ['S0066L02B02', 'S0067L01B03', 'S0251L01B01', 'S0300L01B01', 'S0314L01B01']) assert.ok(!P.K41_BUILD_IDS.includes(id), id);
});
module.exports = { k40Ok, k41Ok };
