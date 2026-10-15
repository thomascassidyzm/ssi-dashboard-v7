'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./deu-could-rule-2026-10-14.cjs');
const { ROWS } = require('./deu-could-rule-2026-10-14.data.cjs');

test('a real presentation render carries no legoId, so the live intro is untouched until edit-batch applies', () => {
  const oldLego = { lego_id: 'S0311L01', is_new: true, known_text: 'he could not', target_text: 'er konnte nicht', components: [] };
  const p = T.plan({ seeds: [], phrases: [], legos: [oldLego] }, ROWS.filter((r) => r[0] === oldLego.lego_id));
  const ask = T.clipAsks(p).find((a) => a.role === 'presentation');
  assert.ok(ask.legoId, 'the ask keeps legoId for clip lookup');
  assert.equal('legoId' in T.renderRequest(ask, false), false);
  assert.equal(T.renderRequest(ask, true).legoId, ask.legoId);
});
