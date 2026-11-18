'use strict';
// Job #564. Proves (a) every phrase the re-cut inserts under S0119L02 / S0199L02 / S0220L02 contains the WHOLE new LEGO (P17), with romaji
// built from the same pieces as the Japanese, and (b) the check bites: the rows the re-cut replaced do NOT contain the new LEGO.
// Needs the pre-apply read-only dump (RECUT_DUMP=<dump.json>, the {seeds,legos,phrases} shape the tool reads); skipped without it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const t = require('./jpn-recut-119-199-220-2026-10-29.cjs');
const dumpPath = process.env.RECUT_DUMP;
test('inserted rows contain their whole LEGO; replaced rows do not', { skip: !dumpPath }, () => {
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const { ops } = t.build(dump, { seeds: dump.seeds });
  const target = { 119: '一つ聞いていい', 199: '昔、オフィスで働いてた', 220: 'テレビ少し見た' };
  const inserted = ops.filter((o) => o.op === 'phrase.insert').map((o) => o.row).filter((r) => r.phrase_role !== 'component' && target[r.seed_number] && r.lego_index === 2);
  assert.ok(inserted.length >= 30);
  for (const r of inserted) assert.ok(r.target_text.includes(target[r.seed_number]), `${r.id} lacks its LEGO: ${r.target_text}`);
  for (const r of inserted) assert.ok(!/[^\x00-\x7f]/.test(r.target_text_roman.replace(/[,.?]/g, '')), `${r.id} romaji holds non-ASCII: ${r.target_text_roman}`);
  const replaced = ops.filter((o) => o.op === 'phrase.delete').map((o) => dump.phrases.find((p) => p.id === o.phrase_id)).filter((p) => target[p.seed_number] && p.phrase_role !== 'component');
  assert.ok(replaced.length >= 25);
  for (const p of replaced) assert.ok(!p.target_text.includes(target[p.seed_number]), `${p.id} already held the new LEGO`);
});
test('segment helper keeps Japanese and romaji in step', () => {
  assert.strictEqual(t.jaOf([['今', 'ima'], ['、', ','], ['一つ聞いていい', 'hitotsu kiite ii'], ['？', '?']]), '今、一つ聞いていい？');
  assert.strictEqual(t.roOf([['今', 'ima'], ['、', ','], ['一つ聞いていい', 'hitotsu kiite ii'], ['？', '?']]), 'ima, hitotsu kiite ii?');
});
