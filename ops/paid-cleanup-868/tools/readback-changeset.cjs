#!/usr/bin/env node
// cs #868 read-back of APPLIED changesets and item-8 take ledgers against the nightly COPY. Offline: reads copy dumps
// made by ops/paid-cleanup-scan-447/copy-read.cjs dump (<dumpDir>/<course>.json). No DB.
//   node readback-changeset.cjs <dumpDir> <out.json> <file.changeset.jsonl | item8 ledger-*.jsonl>...
// changeset ops: phrase.update/seed.update/lego.update -> target_text/known_text as set; phrase.delete -> row absent;
// audio.link -> slot holds audio_id. item-8 ledger rows: each phrase:<id> slot serves the take's audioId in some role.
const fs = require('fs'), path = require('path');
const [dumpDir, out, ...files] = process.argv.slice(2);
const ROLE = { known: 'ka', target1: 't1', target2: 't2' };
const cache = {};
function load(c) {
  if (c in cache) return cache[c];
  const f = path.join(dumpDir, `${c}.json`); if (!fs.existsSync(f)) return (cache[c] = null);
  const d = JSON.parse(fs.readFileSync(f, 'utf8')); const P = new Map(), L = new Map(), S = new Map();
  for (const s of d.seeds) { S.set(s.n, s); for (const l of s.legos) { L.set(l.id, l); for (const p of l.phrases) P.set(p.id, p); } }
  return (cache[c] = { copy: d.copy_db, P, L, S });
}
const textOk = (row, set) => (!('target_text' in set) || row.target === set.target_text) && (!('known_text' in set) || row.known === set.known_text);
const res = { copy: null, files: {}, problems: [] };
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const t = (res.files[path.relative(process.cwd(), f)] = {}); const bump = (k) => { t[k] = (t[k] || 0) + 1; };
  const header = lines.find((x) => x.course || x.courseCode) || {};
  for (const o of lines) {
    const c = o.course || header.course || header.courseCode; const d = c && load(c);
    if (!o.op && !o.kind) continue;
    if (!d) { bump('no_dump'); continue; } res.copy = d.copy;
    let ok, why;
    if (o.kind) { // item-8 ledger row
      if (!(o.ok && o.audioId)) { bump('not_taken'); continue; }
      for (const s of o.slots || []) {
        if (!s.startsWith('phrase:')) { bump('non_phrase_slot'); continue; }
        const p = d.P.get(s.slice(7)); const hit = p && ['ka', 't1', 't2'].some((k) => p[k] === o.audioId);
        bump(hit ? 'serving' : 'NOT_SERVING'); if (!hit) res.problems.push({ c, slot: s, audioId: o.audioId, copy: p ? { ka: p.ka, t1: p.t1, t2: p.t2 } : 'row gone' });
      }
      continue;
    }
    if (o.op === 'phrase.delete') { ok = !d.P.has(o.phrase_id); why = 'row still present'; }
    else if (o.op === 'phrase.update') { const p = d.P.get(o.phrase_id); ok = p && textOk(p, o.set); why = p ? `copy: ${p.known} / ${p.target}` : 'row gone'; }
    else if (o.op === 'lego.update') { const l = d.L.get(o.lego_id); ok = l && textOk(l, o.set); why = l ? `copy: ${l.known} / ${l.target}` : 'lego gone'; }
    else if (o.op === 'seed.update') { const s = d.S.get(o.seed_number); ok = s && textOk(s, o.set); why = s ? `copy: ${s.known} / ${s.target}` : 'seed gone'; }
    else if (o.op === 'audio.link' && o.target === 'phrase') { const p = d.P.get(o.phrase_id); ok = p && p[ROLE[o.slot]] === o.audio_id; why = p ? `copy ${ROLE[o.slot]}=${p[ROLE[o.slot]]}` : 'row gone'; }
    else { bump(`unchecked_${o.op}${o.target ? '_' + o.target : ''}`); continue; }
    bump(ok ? `ok_${o.op}` : `DRIFT_${o.op}`); if (!ok) res.problems.push({ c, op: o.op, id: o.phrase_id || o.lego_id || o.seed_number, why });
  }
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(res.copy); for (const [k, v] of Object.entries(res.files)) console.log(k, JSON.stringify(v)); console.log('problems', res.problems.length);
