#!/usr/bin/env node
// Every wired clip id through the staging proxy, one at a time, paced: 200 with audio bytes, read with a one-byte range
// so nothing is downloaded whole. Writes clip-audit.json, per course. "Verified" means it answered, never that it played.
const fs = require('fs'), path = require('path');
// Reads Popty's served copy (ops/pod-drill/served/, the same bytes the app serves) and writes ops/pod-drill/clip-audit.json.
const { DATA: dir, SERVED: data } = require('./paths.cjs');
(async () => {
  const courses = {}, seen = new Map();
  for (const f of fs.readdirSync(data).sort()) {
    const c = f.replace('.json', ''), turns = JSON.parse(fs.readFileSync(path.join(data, f), 'utf8')).turns;
    const r = courses[c] = { pieces: 0, clips: 0, answering: 0, reused: 0, dead: [] };
    const ids = new Set();
    for (const ps of Object.values(turns)) for (const p of ps) { r.pieces++; ids.add(p[2]); ids.add(p[3]); }
    for (const id of ids) {
      r.clips++;
      if (!seen.has(id)) {
        let s = 0, ty = '';
        for (let i = 0; i < 3 && !(s >= 200 && s < 300); i++) {
          try { const a = await fetch(`https://staging.saysomethingin.app/api/audio/${id}`, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(20000) }); s = a.status; ty = a.headers.get('content-type') || ''; await a.arrayBuffer(); } catch (e) { s = 0; ty = e.name; }
          await new Promise((r) => setTimeout(r, 150));
        }
        seen.set(id, (s === 200 || s === 206) && /audio|mpeg/.test(ty) ? 'ok' : `${s} ${ty}`);
      }
      if (seen.get(id) === 'ok') r.answering++; else r.dead.push(`${id} ${seen.get(id)}`);
    }
    console.log(c, r.pieces, r.clips, r.answering, r.dead.length);
  }
  const dead = Object.values(courses).flatMap((r) => r.dead);
  fs.writeFileSync(path.join(dir, 'clip-audit.json'), JSON.stringify({ when: new Date().toISOString(), unique: seen.size, dead: dead.length, courses }, null, 1) + '\n');
  console.log('unique', seen.size, 'dead', dead.length);
  process.exit(dead.length ? 1 : 0);
})();
