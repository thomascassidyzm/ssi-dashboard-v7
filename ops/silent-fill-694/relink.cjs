#!/usr/bin/env node
'use strict'
// cs #694·AI — re-link clips that rendered but failed to link with NO_SLOT because the slot was a LEGO (uuid-id lego_debut
// row in script-view). Fill-only link-clip by legoId; appends a {relink} record to the course log. Usage: relink.cjs <course>
const fs = require('fs'); const path = require('path'); const course = process.argv[2]
const f = path.join(__dirname, 'results', `${course}.jsonl`)
const recs = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
;(async () => {
  for (const r of recs.filter(r => r.link && r.link.code === 'NO_SLOT' && r.render && r.render.audioId)) {
    const res = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-694-silent-fill' },
      body: JSON.stringify({ links: [{ legoId: r.lego, role: r.role, audioId: r.render.audioId }] }) })
    const j = await res.json(); const one = (j.results && j.results[0]) || j
    const rec = { at: new Date().toISOString(), relink: r.key, lego: r.lego, role: r.role, audioId: r.render.audioId, ok: !!(j.ok && one.ok !== false), code: one.code, eventId: j.eventId }
    fs.appendFileSync(f, JSON.stringify(rec) + '\n'); console.log(JSON.stringify(rec))
  }
})()
