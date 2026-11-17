#!/usr/bin/env node
'use strict';
// cs #440·AI: text-<B>.ops.json + audio-plan.json → batch-<B>.ops.json: the block's text ops, then one audio.link per slot,
// so text and sound change in ONE transaction (make-before-break: every clip already exists and was checked first).
//   node build-batches.cjs <outdir>
const fs = require('fs');
const path = require('path');
const [outDir] = process.argv.slice(2);
const need = JSON.parse(fs.readFileSync(path.join(outDir, 'audio-need.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(outDir, 'audio-plan.json'), 'utf8'));
const intro = (k) => `The German for: '${k}', is: <break time="300ms"/> <break time="10ms"/>`;
const missing = [];
for (const b of Object.keys(need)) {
  const { ops } = JSON.parse(fs.readFileSync(path.join(outDir, `text-${b}.ops.json`), 'utf8'));
  const links = [];
  for (const r of need[b]) {
    const tgt = r.kind === 'seed' ? { target: 'seed', seed_number: r.id } : r.kind === 'lego' ? { target: 'lego', lego_id: r.id } : { target: 'phrase', phrase_id: r.id };
    for (const slot of r.slots) {
      const text = slot === 'presentation' ? intro(r.known) : slot === 'known' ? r.known : r.target;
      const p = plan[`${slot}|${text}`];
      if (!p || !p.audioId) { missing.push({ block: b, id: r.id, slot, text, why: p ? p.source + ' ' + (p.code || '') : 'not resolved' }); continue; }
      links.push({ op: 'audio.link', ...tgt, slot, audio_id: p.audioId });
    }
    // unchanged sides are left alone: the text trigger keeps them (dry run 17 Nov), and re-linking them trips old mismatches
  }
  fs.writeFileSync(path.join(outDir, `batch-${b}.ops.json`), JSON.stringify({ ops: [...ops, ...links] }, null, 1));
  console.log(`${b}: ${ops.length} text ops + ${links.length} links`);
}
fs.writeFileSync(path.join(outDir, 'links-missing.json'), JSON.stringify(missing, null, 1));
console.log('slots without a clip:', missing.length);
