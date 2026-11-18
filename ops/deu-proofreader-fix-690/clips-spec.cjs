#!/usr/bin/env node
'use strict';
// cs #690·AI: fetch every clip this job made (out/audio.json) via Popty's signed-url route → $CS_SCRATCH, and write the
// clip-page spec (listening page, UNHEARD). Usage: node clips-spec.cjs <outdir> > spec.json
const fs = require('fs'); const path = require('path');
const A = JSON.parse(fs.readFileSync(path.join(__dirname, 'out/audio.json'), 'utf8'));
const dir = process.argv[2]; fs.mkdirSync(dir, { recursive: true });
(async () => {
  const clips = [];
  for (const [k, v] of Object.entries(A)) {
    if (!v.ok || !v.audioId) continue;
    const u = await (await fetch(`http://localhost:3470/api/production/deu_for_eng/audio/${v.audioId}/url`, { headers: { 'x-agent-id': 'cs #690·AI clip page' } })).json();
    const f = path.join(dir, `${v.audioId}.mp3`);
    fs.writeFileSync(f, Buffer.from(await (await fetch(u.url)).arrayBuffer()));
    const [kind, role, ...t] = k.split('|');
    const text = kind === 're' ? v.meta.text : t.join('|');
    clips.push({ label: `${kind === 're' ? 'S0657L02 INTRO re-record (British "all")' : role} · ${v.source} · ${text.replace(/<break[^>]*>/g, '').trim()} · ${v.audioId.slice(0, 8)}`, file: f });
  }
  process.stdout.write(JSON.stringify({ title: 'deu_for_eng last 3 proofreader items: new clips (#690·AI) — UNHEARD',
    intro: 'Every clip cs #690·AI made or re-recorded on 18 Nov, now linked live. None has been heard by a person yet. Library = an existing clip reused (no cost). 1,291 characters spent.', clips }, null, 1));
})();
