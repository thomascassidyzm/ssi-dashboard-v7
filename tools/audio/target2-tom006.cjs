#!/usr/bin/env node
/**
 * Job #195 (Tom 2026-10-14, r-2026-10-12-in-the-premium-x-for-eng): in eng_for_*, target2 (second voice) is Tom-006 (male), target1 Charlotte.
 * Every eng_for_* target2 slot whose clip is Charlotte is repointed to the Tom-006 clip of the SAME English text; where none exists, ONE Tom-006 take is rendered
 * through Popty's one route (voiceBound, no retry on refusal) and linked. Deliberate re-voicing (Tom 2026-10-14). Old clips are never deleted. Write-ahead ledger; --undo restores.
 *   node target2-tom006.cjs --census | --run [--concurrency 3] [--limit N] | --undo
 */
const fs = require('fs'), path = require('path')
const ROOT = process.env.POPTY_ROOT || '/home/tomcassidy/SSi/ssi-dashboard-v7-clean'
const req = p => require(path.join(ROOT, p))
req('node_modules/dotenv').config({ path: path.join(ROOT, '.env.psql'), quiet: true })
for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
const { Client } = req('node_modules/pg'), { createClient } = req('node_modules/@supabase/supabase-js')
const { bumpCourseVersion } = req('services/shared/course-version.cjs'), { serviceIdentity } = req('services/shared/editor-identity.cjs'), { recordContentEdit } = req('services/shared/content-edit-log.cjs')
const { mayPoint } = req('services/shared/resolve-voice.cjs')
const CH = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', POPTY = 'http://localhost:3470'
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const dir = process.env.OUT_DIR || __dirname, ledger = path.join(dir, 'ledger.jsonl')
const log = e => fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n')
const lines = () => fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const TBL = { seeds: 'course_seeds', legos: 'course_legos', phr: 'course_practice_phrases' }
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY), identity = serviceIdentity('target2-tom006-195'), events = new Map(), touched = new Map()
  const event = async c => { if (!events.has(c)) events.set(c, await recordContentEdit(db, { identity, courseCode: c, surface: 'tools:audio/target2-tom006', operation: 'update', detail: { why: 'Tom 2026-10-14 job #195: eng_for_* target2 = Tom-006 (male), not Charlotte', ledger } })); return events.get(c) }
  const point = async (s, from, to, restore) => {
    if (!await mayPoint(db, { courseCode: s.course, col: 'target2_audio_id', to, tbl: TBL[s.tbl], key: s.id, from, restore })) return false
    const { data, error } = await db.from(TBL[s.tbl]).update({ target2_audio_id: to, last_edit_event_id: await event(s.course) }).eq('id', s.id).eq('target2_audio_id', from).select('id')
    if (error) throw new Error(error.message); return data && data.length === 1
  }
  const bump = async () => { for (const c of touched.keys()) { const v = await bumpCourseVersion(db, c, 'patch'); if (!v) console.log('BUMP FAILED', c); else { console.log('content_version', c, v); log({ kind: 'bumped', course: c, v }) } } touched.clear() }
  if (has('--undo')) {
    const first = new Map(); for (const e of lines()) if (e.kind === 'intent') for (const s of e.slots) if (!first.has(`${s.tbl}${s.id}`)) first.set(`${s.tbl}${s.id}`, { s, news: new Set([e.newId]) })
    let n = 0; for (const { s, news } of first.values()) { const { rows } = await pg.query(`select target2_audio_id::text a from ${TBL[s.tbl]} where id=$1`, [s.id]); if (news.has(rows[0]?.a) && await point(s, rows[0].a, s.from, true)) { n++; touched.set(s.course, 1) } }
    await bump(); console.log('undone', n); return pg.end()
  }
  // the slots: every eng_for_* target2 pointer on a Charlotte clip, grouped by the clip's normalised text
  const { rows } = await pg.query(`
    with s as (select 'seeds' tbl,id::text id,course_code,target2_audio_id a from course_seeds where course_code like 'eng_for_%' and target2_audio_id is not null
      union all select 'legos',id::text,course_code,target2_audio_id from course_legos where course_code like 'eng_for_%' and target2_audio_id is not null
      union all select 'phr',id::text,course_code,target2_audio_id from course_practice_phrases where course_code like 'eng_for_%' and target2_audio_id is not null)
    select s.tbl, s.id, s.course_code course, s.a::text "from", ca.text_normalized t, ca.text tx from s join course_audio ca on ca.id=s.a where ca.voice_id=$1`, [CH])
  const byText = new Map(); for (const r of rows) (byText.get(r.t) || byText.set(r.t, { t: r.t, tx: r.tx, slots: [] }).get(r.t)).slots.push({ tbl: r.tbl, id: r.id, course: r.course, from: r.from })
  const clipRow = async t => (await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role in ('known','target2') and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 order by created_at limit 1`, [t, T6])).rows[0]
  if (has('--census')) {
    const per = {}; let reuse = 0, miss = 0, chars = 0, tr = 0, tm = 0
    for (const g of byText.values()) { const ex = await clipRow(g.t); if (ex) { reuse += g.slots.length; tr++ } else { miss += g.slots.length; tm++; chars += g.tx.length }
      for (const s of g.slots) { const p = per[s.course] ??= { slots: 0, reuse: 0, miss: 0 }; p.slots++; p[ex ? 'reuse' : 'miss']++ } }
    console.table(per); console.log({ slots: rows.length, texts: byText.size, reusableSlots: reuse, reusableTexts: tr, missingSlots: miss, missingTexts: tm, missingChars: chars }); return pg.end()
  }
  const queue = [...byText.values()].slice(0, Number(opt('--limit', 1e9))); let idx = 0, stop = false, st = { reused: 0, rendered: 0, chars: 0, moved: 0, skipped: 0 }; const perC = {}
  const worker = async () => { while (!stop) {
    const g = queue[idx++]; if (!g) return
    let ex = await clipRow(g.t), how = 'reuse', newId = ex?.id
    if (!newId) {
      let r; for (let a = 0; a < 3 && !r; a++) {
        try { const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-195' }, body: JSON.stringify({ courseCode: g.slots[0].course, role: 'target2', text: g.tx, language: 'eng', voiceId: T6, voiceBound: true, job: '#195', purpose: '#195 eng_for_* target2 -> Tom-006 male English (Tom 2026-10-14)' }) })
          const j = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` })); if (j.code === 'RENDER_FAILED' || /ECONNRESET|socket hang up/i.test(j.error || '')) { await new Promise(z => setTimeout(z, 20000)); const l = await clipRow(g.t); if (l) j.ok = true, j.audioId = l.id, j.source = 'library'; else continue }
          if (j.code === 'NOT_SPEAKABLE') { log({ kind: 'unspeakable', t: g.t, text: g.tx }); r = { skip: true }; break }
          if (!j.ok) { log({ kind: 'refused', t: g.t, r: j }); console.log('REFUSED — stopping:', JSON.stringify(j).slice(0, 300)); stop = true; return }
          r = j } catch (e) { await new Promise(z => setTimeout(z, 20000)); const l = await clipRow(g.t); if (l) r = { ok: true, audioId: l.id, source: 'library', charsSpent: 0 } }
      }
      if (!r) { console.log('persistent connection failure — stopping'); stop = true; return } if (r.skip) { st.skipped++; continue }
      const { rows: [ca] } = await pg.query('select voice_id, s3_key, duration_ms from course_audio where id=$1', [r.audioId])
      if (!ca || ca.voice_id !== T6 || !ca.s3_key || ca.s3_key.startsWith('pending/') || !(ca.duration_ms > 200)) { log({ kind: 'verify-failed', t: g.t, r, ca }); console.log('VERIFY FAILED — stopping', g.tx); stop = true; return }
      newId = r.audioId; how = r.source === 'library' ? 'reuse' : 'render'; st.chars += r.charsSpent || 0; log({ kind: 'render', t: g.t, newId, chars: r.charsSpent || 0, source: r.source })
    }
    log({ kind: 'intent', t: g.t, newId, how, slots: g.slots })
    for (const s of g.slots) if (await point(s, s.from, newId, false)) { st.moved++; touched.set(s.course, 1); (perC[s.course] ??= { reuse: 0, render: 0 })[how === 'reuse' && !g.rendered ? 'reuse' : 'render']++ }
    st[how === 'reuse' ? 'reused' : 'rendered']++; log({ kind: 'swap', t: g.t, newId })
    if ((st.reused + st.rendered) % 100 === 0) console.log(JSON.stringify(st))
  } }
  try { await Promise.all(Array.from({ length: Number(opt('--concurrency', 3)) }, worker)) } finally { await bump(); await pg.end() }
  console.log('DONE', JSON.stringify(st), stop ? 'STOPPED' : '')
})().catch(e => { console.error(e); process.exit(1) })
