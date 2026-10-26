#!/usr/bin/env node
'use strict';
// Reads the committed edit-batch "applied" files (local JSON only, no DB) and lists every clip a text edit unlinked:
// an *_audio_id that was set before and is null after. Output: clips.json = [{course, job, kind, key, slot, audio_id}]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'src');
const out = [];
for (const f of fs.readdirSync(dir).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const course = f.includes('sv2') ? 'cym_sv2_for_eng' : 'cym_nv2_for_eng';
  for (const r of d.results || []) {
    if (!r.before || !r.after) continue;
    for (const slot of ['known', 'target1', 'target2', 'presentation']) {
      const k = `${slot}_audio_id`;
      if (r.before[k] && !r.after[k]) out.push({ course, job: f.replace(/_?cym_[ns]v2_for_eng.*$/, '').replace(/^ops_/, ''), op: r.op, key: JSON.stringify(r.key), slot, audio_id: r.before[k] });
    }
  }
}
fs.writeFileSync(path.join(__dirname, 'clips.json'), JSON.stringify(out, null, 1));
const by = {};
for (const c of out) { const k = c.job + ' ' + c.course; (by[k] ||= new Set()).add(c.audio_id); }
for (const [k, v] of Object.entries(by)) console.log(k, v.size);
console.log('total distinct', new Set(out.map((c) => c.audio_id)).size);
