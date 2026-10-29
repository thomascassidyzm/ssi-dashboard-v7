'use strict';
const test = require('node:test');
const assert = require('node:assert');
const t = require('./jpn-miru-lines-704-2026-10-29.cjs');

test('no rewritten row uses 見る (seed 220 teaches 見た); ids stay put', () => {
  for (const [id, , , known, segs] of t.ROWS) {
    const ja = segs.map((s) => s[0]).join('');
    assert.ok(ja.includes('見た') && !ja.includes('見る'), id);
    assert.ok(/watched/.test(known), id);
  }
  assert.ok(!t.ROWS.some((r) => r[0] === 'S0287L01U10'), 'S0287L01U10 is the seed sentence: Kai\'s call');
});

test('resolve fills every $ask and reports the missing', () => {
  const ops = [{ op: 'audio.link', audio_id: { $ask: 'a\0b' } }, { op: 'audio.link', audio_id: { $ask: 'c\0d' } }];
  const r = t.resolve(ops, [{ k: 'a\0b', body: { audioId: 'X' } }]);
  assert.equal(r.ops[0].audio_id, 'X');
  assert.deepEqual(r.missing, ['c\0d']);
});
