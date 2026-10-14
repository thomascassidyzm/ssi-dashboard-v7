'use strict';
// Job #458: staleSlots names exactly the slots whose clip does not say the row's words, or is empty.
const test = require('node:test');
const assert = require('node:assert');
const { staleSlots } = require('./cat-render-after-cast-2026-10-14.cjs');

test('stale, silent and fresh slots are told apart; components only need known', () => {
  const clips = new Map([['a', { text: 'Hello.' }], ['b', { text: 'old words' }]]);
  const rows = [
    { lego_id: 'S1L01', known_text: 'hello', target_text: 'hola', known_audio_id: 'a', target1_audio_id: 'b', target2_audio_id: null },
    { lego_id: 'p', phrase_role: 'component', known_text: 'hello', target_text: 'hola', known_audio_id: 'b', target1_audio_id: null, target2_audio_id: null },
  ];
  const got = staleSlots(rows, clips, 'lego').map((s) => `${s.ref}.${s.role}:${s.current}`);
  assert.deepStrictEqual(got, ['S1L01.target1:b', 'S1L01.target2:null', 'p.known:b']);
});
