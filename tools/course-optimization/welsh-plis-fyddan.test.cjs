'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { plan, replacePlis, FYDDAN_OLD, FYDDAN_NEW } = require('./welsh-plis-fyddan.cjs');

test('plîs becomes os gwelwch yn dda, punctuation and capital kept', () => {
  assert.strictEqual(replacePlis('allen ni gael potel o win coch plîs?'), 'allen ni gael potel o win coch os gwelwch yn dda?');
  assert.strictEqual(replacePlis('Plîs helpu fi'), 'Os gwelwch yn dda helpu fi');
  assert.strictEqual(replacePlis('plîs'), 'os gwelwch yn dda');
  assert.strictEqual(replacePlis('ia, plîs, wir'), 'ia, os gwelwch yn dda, wir');
});
test('plan edits seed, LEGO, phrase + decomposition, and only the exact fyddan line', () => {
  const data = { seeds: [{ seed_number: 1, target_text: 'ga i ddŵr, plîs?', legos: [
    { lego_id: 'S0001L01', target_text: 'plîs', basket_phrases: [
      { id: 'c:S0001L01B01', target_text: 'dŵr plîs', decomposition: [{ target: 'dŵr' }, { target: ' plîs' }] },
      { id: 'c:S0001L01U01', target_text: FYDDAN_OLD },
      { id: 'c:S0001L01U02', target_text: 'byddan nhw’n barod mewn pryd wyt ti’n meddwl?' }] }] }] };
  const { ops } = plan(data);
  assert.deepStrictEqual(ops.map((o) => o.op), ['seed.update', 'lego.update', 'phrase.update', 'phrase.update']);
  assert.strictEqual(ops[0].set.target_text, 'ga i ddŵr, os gwelwch yn dda?');
  assert.strictEqual(ops[2].set.decomposition[1].target, ' os gwelwch yn dda');
  assert.strictEqual(ops[3].set.target_text, FYDDAN_NEW);
  assert.ok(ops.every((o) => o.expect.target_text));
});
