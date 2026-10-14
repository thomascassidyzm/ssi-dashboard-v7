// node --test tools/welsh-review-rulings-142.test.cjs
const test = require('node:test');
const assert = require('node:assert');
const { planUnmutate, planUnrhyw, sqlFor } = require('./welsh-review-rulings-142.cjs');

const seg = (target, legoId) => ({ known: 'x', legoId, target, isGhost: false });

test('a LEGO alone is unmutated; a phrase changes only when it opens with the bare mutated LEGO', () => {
  const legos = [{ id: 'u1', lego_id: 'S1405L04', seed_number: 1405, lego_index: 4, target_text: 'fwcio', components: null }];
  const phrases = [
    { id: 'c:S1405L04B01', seed_number: 1405, lego_index: 4, target_text: 'fwcio yn rhywle am fwyd', decomposition: [seg('fwcio', 'S1405L04'), seg(' yn rhywle am fwyd', 'S0001L01')] },
    { id: 'c:S1405L04B02', seed_number: 1405, lego_index: 4, target_text: 'dylen ni fwcio heno', decomposition: null },
  ];
  const { edits } = planUnmutate(legos, phrases);
  assert.deepStrictEqual(edits.map((e) => [e.label, e.set.target_text]), [['S1405L04', 'bwcio'], ['S1405L04B01', 'bwcio yn rhywle am fwyd']]);
  assert.strictEqual(edits[1].set.decomposition[0].target, 'bwcio');
});

test('adverbial mutation is the grammar, not a copy: gymaint â phosib keeps it', () => {
  const legos = [{ id: 'u2', lego_id: 'S0132L01', seed_number: 132, lego_index: 1, target_text: 'gymaint â', components: [{ known: 'as much as', target: 'gymaint â' }] }];
  const phrases = [{ id: 'c:S0132L01U05', seed_number: 132, lego_index: 1, target_text: 'gymaint â phosib', decomposition: null }];
  const { edits, kept } = planUnmutate(legos, phrases);
  assert.deepStrictEqual(edits.map((e) => e.set.target_text), ['cymaint â']);
  assert.deepStrictEqual(edits[0].set.components, [{ known: 'as much as', target: 'cymaint â' }]);
  assert.strictEqual(kept.length, 1);
});

test('unrhyw beth sounds the same, so the text goes in with links cleared and the links come back from the backup', () => {
  const { edits } = planUnrhyw({ course_practice_phrases: [{ id: 'c:S1035L01B02', target_text: 'dyw hi ddim yn moyn unrhywbeth', decomposition: [seg('dyw hi ddim yn moyn'), seg(' unrhywbeth')] }] });
  assert.strictEqual(edits[0].set.target_text, 'dyw hi ddim yn moyn unrhyw beth');
  assert.strictEqual(edits[0].set.decomposition[1].target, ' unrhyw beth');
  const sql = sqlFor('cym_sv2_for_eng', edits, 'backup_wrr142_t', null);
  assert.match(sql, /target1_audio_id=NULL/);
  assert.match(sql, /set known_audio_id=b\.known_audio_id, target1_audio_id=b\.target1_audio_id/);
});
