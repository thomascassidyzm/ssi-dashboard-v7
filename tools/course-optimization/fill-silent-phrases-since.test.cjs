const test = require('node:test'); const assert = require('node:assert');
const { asks } = require('./fill-silent-phrases-since.cjs');
test('asks groups silent slots by (role,text) and skips filled slots', () => {
  const rows = [
    { id: 'a', known_text: 'k1', target_text: 't1', known_audio_id: 'x', target1_audio_id: null, target2_audio_id: null },
    { id: 'b', known_text: 'k2', target_text: 't1', known_audio_id: null, target1_audio_id: null, target2_audio_id: 'y' },
  ];
  const got = asks(rows).map((a) => `${a.role}:${a.text}:${a.ids}`).sort();
  assert.deepStrictEqual(got, ['known:k2:b', 'target1:t1:a,b', 'target2:t1:a']);
});
