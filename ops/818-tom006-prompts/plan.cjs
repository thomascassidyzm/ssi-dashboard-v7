// Job #818: plan the Tom-006 re-voicing of every English known prompt, seeds 1-100 of deu/spa/fra/ita_for_eng. Writes plan.json.
const fs = require('fs'), path = require('path'); require('dotenv').config({ path: path.join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const COURSES = ['deu_for_eng', 'spa_for_eng', 'fra_for_eng', 'ita_for_eng'], T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect()
  const { rows } = await pg.query(`select s.tbl,s.key,s.course_code,s.seed_number,s.known_text,s.aid::text aid,a.text atext,a.voice_id from (
    select 'course_seeds' tbl,id::text key,course_code,seed_number,known_text,known_audio_id aid from course_seeds where course_code=any($1) and seed_number<=100
    union all select 'course_legos',id::text,course_code,seed_number,known_text,known_audio_id from course_legos where course_code=any($1) and seed_number<=100
    union all select 'course_practice_phrases',id::text,course_code,seed_number,known_text,known_audio_id from course_practice_phrases where course_code=any($1) and seed_number<=100) s
    left join course_audio a on a.id=s.aid`, [COURSES])
  const groups = new Map(), nullAudio = [], already = []
  for (const r of rows) {
    if (!r.aid) { nullAudio.push(r); continue }
    if (r.voice_id === T6) { already.push(r); continue }
    const k = norm(r.known_text); const g = groups.get(k) || { key: k, texts: new Map(), clips: new Map() }
    for (const t of [r.atext, r.known_text]) g.texts.set(t.trim(), (g.texts.get(t.trim()) || 0) + 1)
    g.clips.set(r.aid, (g.clips.get(r.aid) || 0) + 1); groups.set(k, g)
  }
  const plan = [...groups.values()].map(g => {
    const ts = [...g.texts.entries()]
    const text = (ts.find(([t]) => /\?$/.test(t)) || ts.sort((a, b) => (/[.!?]$/.test(b[0]) - /[.!?]$/.test(a[0])) || b[1] - a[1])[0])[0]
    return { key: g.key, text, oldClips: [...g.clips.keys()] }
  })
  fs.writeFileSync(path.join(__dirname, 'plan.json'), JSON.stringify(plan, null, 1))
  const chars = plan.reduce((n, p) => n + p.text.length, 0)
  console.log({ slots: rows.length, nullAudio: nullAudio.length, alreadyT6: already.length, distinct: plan.length, chars })
  console.log('null by course', nullAudio.reduce((o, r) => (o[r.course_code + ':' + r.tbl] = (o[r.course_code + ':' + r.tbl] || 0) + 1, o), {}))
  await pg.end()
})()
