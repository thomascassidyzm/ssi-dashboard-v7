// job #329: the English KNOWN side of the re-chunked afr LEGOs/phrases (known_audio_id null), through the one audio route (the course's English
// voice is resolveVoice's). Texts are rendered verbatim; library first. Seeds = the #322 re-chunk set + S42.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const S = '(10,27,42,51,66,68,69,108,115,122,131,158,199,202,262)'
  const { rows } = await c.query(`select known_text t from course_practice_phrases where course_code='afr_for_eng' and seed_number in ${S} and phrase_role<>'component' and known_audio_id is null
    union select known_text from course_legos where course_code='afr_for_eng' and seed_number in ${S} and known_audio_id is null`)
  if (process.argv.includes('--count')) { console.log(rows.length, rows.reduce((n, r) => n + r.t.length, 0)); process.exit(0) }
  let spent = 0, lib = 0; const fail = []
  for (const { t } of rows) {
    const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job329-afr-known' },
      body: JSON.stringify({ courseCode: 'afr_for_eng', role: 'known', text: t, purpose: 'job329: English known side of the re-chunked afr LEGOs/phrases (Tom 2026-10-13)' }) })
    const o = await r.json().catch(() => ({}))
    if (!o.ok) { fail.push([t, r.status, o.error || o.code]); if (fail.length > 5) { console.log('STOP', fail); process.exit(2) } continue }
    spent += o.charsSpent || 0; if (o.source === 'library') lib++
  }
  console.log({ texts: rows.length, spent, lib, fail }); await c.end()
})()
