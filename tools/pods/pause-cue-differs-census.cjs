require('dotenv').config({ path: require('path').join(__dirname,'../../.env.psql') })
const { Client } = require('pg')
const OLD = t => String(t||'').split(/(?<=[.!?…])\s+/).map(s=>s.trim()).filter(Boolean)
const NEW = t => String(t||'').split(/(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/).map(s=>s.trim()).filter(Boolean)
const cue = (t,f) => { const s=f(t); return s.length>1 ? s.join(' … ') : t }
const FIX = new Date('2026-08-24T14:06:42Z')

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} })
  await c.connect()
  // every pod turn in the 16 affected courses, live or held
  const COURSES = ['jpn_for_eng','zho_for_eng','zho_for_jpn','ita_for_jpn','fra_for_jpn','deu_for_jpn','spa_for_jpn','eng_for_jpn','eng_for_zho','ara_for_eng','ara_eg_for_eng','ara_sy_for_eng','fas_for_eng','eng_for_ara','eng_for_urd']
  const q = await c.query(`
    select s.id, p.course_code, p.slug, p.visibility, s.scene_number, s.sentence_number,
           s.target_text, s.known_text, s.target_audio_id, s.known_audio_id
    from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
    where p.course_code = any($1)`, [COURSES])

  const recs = []
  for (const r of q.rows) for (const track of ['target','known']) {
    const text = track==='target' ? r.target_text : r.known_text
    const aid  = track==='target' ? r.target_audio_id : r.known_audio_id
    if (!text) continue
    recs.push({ id:r.id, course:r.course_code, slug:r.slug, vis:r.visibility, sc:r.scene_number, sn:r.sentence_number,
      track, aid, text, differs: cue(text,OLD) !== cue(text,NEW), oldN: OLD(text).length, newN: NEW(text).length })
  }
  const ids = [...new Set(recs.map(r=>r.aid).filter(Boolean))]
  const a = await c.query(`select id, s3_key, voice_id, language, text, duration_ms, origin, created_at from course_audio where id = any($1)`,[ids])
  const am = new Map(a.rows.map(x=>[x.id,x]))
  for (const r of recs) { r.audio = r.aid ? am.get(r.aid) : null; r.preFix = r.audio ? new Date(r.audio.created_at) < FIX : null }

  const withAudio = recs.filter(r=>r.audio)
  const preFix = withAudio.filter(r=>r.preFix)
  const line = (label, n) => console.log(label.padEnd(52), String(Array.isArray(n)?n.length:n).padStart(6))
  console.log('=== ALL POD TURN-TRACKS IN THE 15 AFFECTED COURSES ===')
  line('turn-tracks with text', recs.length)
  line('  ...with a linked clip', withAudio.length)
  line('  ...clip predates the 2026-08-24 fix', preFix.length)
  line('  ...AND text splits differently under new rule', preFix.filter(r=>r.differs).length)
  line('  ...pre-fix clip whose text splits IDENTICALLY', preFix.filter(r=>!r.differs).length)
  console.log()
  const live = preFix.filter(r=>r.vis==='live')
  line('pre-fix + LIVE', live.length)
  line('  ...of which text differs', live.filter(r=>r.differs).length)
  console.log()
  console.log('=== per course/track: differs / pre-fix clips / all turn-tracks ===')
  const keys = [...new Set(recs.map(r=>r.course+' '+r.track))].sort()
  for (const k of keys) {
    const all = recs.filter(r=>r.course+' '+r.track===k)
    const pf = all.filter(r=>r.preFix), d = pf.filter(r=>r.differs)
    if (!pf.length) continue
    console.log(k.padEnd(24), String(d.length).padStart(4), '/', String(pf.length).padStart(4), '/', String(all.length).padStart(4),
      '  = ' + (100*d.length/pf.length).toFixed(0) + '% of pre-fix clips actually differ')
  }
  console.log()
  console.log('=== DISTINCT TEXTS among the differing set ===')
  const diff = preFix.filter(r=>r.differs)
  const norm = t => String(t).normalize('NFKC').trim()
  console.log('differing turn-tracks:', diff.length, ' distinct texts:', new Set(diff.map(r=>norm(r.text))).size)
  const jk = diff.filter(r=>r.course.endsWith('_for_jpn') && r.track==='known')
  console.log('  of which the *_for_jpn KNOWN track (same Japanese pod, 6 courses):', jk.length, ' distinct texts:', new Set(jk.map(r=>norm(r.text))).size)
  const rest = diff.filter(r=>!(r.course.endsWith('_for_jpn') && r.track==='known'))
  console.log('  everything else:', rest.length, ' distinct texts:', new Set(rest.map(r=>norm(r.text))).size)
  require('fs').writeFileSync(__dirname+'/all-pod-rows.json', JSON.stringify(recs,null,1))
  await c.end()
})().catch(e=>{console.error(e);process.exit(1)})
