// job #329: voice seed 42's new cut ('laas nag') in the afr cast through the one audio route (library first). Run from a Popty checkout with .env.psql.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows } = await c.query(`select target_text t from course_seeds where course_code='afr_for_eng' and seed_number=42 and (target1_audio_id is null or target2_audio_id is null)
    union select target_text from course_practice_phrases where course_code='afr_for_eng' and seed_number=42 and (target1_audio_id is null or target2_audio_id is null)
    union select target_text from course_legos where course_code='afr_for_eng' and seed_number=42 and (target1_audio_id is null or target2_audio_id is null)`)
  let spent = 0, lib = 0; const fail = []
  for (const role of ['target1', 'target2']) for (const { t } of rows) {
    const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job329-afr-seed42' },
      body: JSON.stringify({ courseCode: 'afr_for_eng', role, text: t, purpose: 'job329: voice seed 42 laas nag re-chunk (Tom 2026-10-13)', voiceBound: true }) })
    const o = await r.json().catch(() => ({}))
    if (!o.ok) { fail.push([role, t, r.status, o.error || o.code]); if (fail.length > 5) { console.log('STOP', fail); process.exit(2) } continue }
    spent += o.charsSpent || 0; if (o.source === 'library') lib++
  }
  console.log({ texts: rows.length, spent, lib, fail }); await c.end()
})()
