#!/usr/bin/env node
/**
 * Tom-006 ENGLISH, step 1 (job #813, Tom 2026-10-12, r-2026-10-12-tom-006-english-order): every live English KNOWN prompt whose text has NO Cartesia clip in any voice
 * gets ONE Tom-006 take (Cartesia d293d509), RAW (no fade: the 80 ms fade is for intros only). Existing Cartesia clips are never touched. Reuse is by (language, text)
 * across courses, so a rendered text repoints EVERY live (released/beta) course's known slot that holds a non-Cartesia clip of that text. Old rows are never deleted.
 * Queue = the --course's known slots in first-heard seed order; one render per distinct text through Popty's ONE route (voice-bound, no retry on refusal).
 * Ledger (write-ahead): ops/813-tom006-english/ledger.jsonl.   Undo: --undo (appends {kind:undo}, repoints back with before-state asserted, bumps versions).
 *   node tools/audio/tom006-english.cjs --stage 1|2|3|all [--daily-budget 500000] [--global-room 850000] [--concurrency 3] [--plan] [--dry-run]
 * Order (Tom 2026-10-12, r-2026-10-12-tom-006-male-english-order-follows): stage 1 = seeds 1-100 of premium courses (not deu/spa/fra/ita_for_eng, which #818 does); stage 2 = up to the furthest seed a real
 * learner reached, per live course with English; stage 3 = seeds 101-668 of premium courses, X_for_eng big 10 first then eng_for_X. Scope = the MALE English voice: X_for_eng known prompts + eng_for_X target2 lines.
 * REUSE FIRST by text: any existing Tom-006 row is repointed to, never re-rendered. Pacing: daily budget (this job's ledger chars today UTC) and a global room (all-provider chars today), then sleep to next UTC day.
 *   node tools/audio/tom006-english.cjs --undo [--dry-run]
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const dryRun = has('--dry-run')
const dir = path.join(__dirname, '../../ops/813-tom006-english'), ledger = path.join(dir, 'ledger.jsonl')
const lines = () => fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const log = e => { if (!dryRun) fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n') }
function supa() {
  if (!process.env.SUPABASE_URL) for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env'])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const setPointer = async (db, s, from, to, ev) => {
  const col = s.col || 'known_audio_id'
  const { data, error } = await db.from(s.tbl).update({ [col]: to, last_edit_event_id: ev }).eq('id', s.key).eq(col, from).select('id')
  if (error) throw new Error(error.message); return !!data && data.length === 1
}
// ledger state: slots currently moved (renders/swaps minus undos), per text
const TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases']
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0'); const db = supa()
  const identity = serviceIdentity('tom006-english-813'), events = new Map(), touched = new Set()
  const event = async course => { if (!events.has(course)) events.set(course, await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-english', operation: 'update', detail: { why: 'Tom 2026-10-12 job #813: English known prompts with no Cartesia clip -> Tom-006; old ids in ledger', ledger } })); return events.get(course) }
  const bump = async () => { for (const c of touched) console.log('content_version', c, await bumpCourseVersion(db, c, 'patch')); touched.clear() }

  if (has('--undo')) {
    // newest first; a swap row lists {tbl,key,course,from,to}; skip slots already undone (before-state assertion handles it too)
    const rows = lines().filter(e => e.kind === 'swap'); let n = 0
    for (const e of rows.reverse()) for (const s of e.slots) {
      if (dryRun) { console.log('would undo', s.tbl, s.key, e.newId, '->', s.from); n++; continue }
      if (await setPointer(db, s, e.newId, s.from, await event(s.course))) { touched.add(s.course); n++ }
    }
    if (!dryRun) { log({ kind: 'undo', n }); await bump() }
    console.log(dryRun ? 'would undo' : 'undone slots', n); return pg.end()
  }

  const stageArg = opt('--stage', 'all'), stages = stageArg === 'all' ? [1, 2, 3] : [Number(stageArg)]
  const dailyBudget = Number(opt('--daily-budget', 500000)), globalRoom = Number(opt('--global-room', 850000)), conc = Number(opt('--concurrency', 3)), plan = has('--plan')
  let stopFlag = false; process.on('SIGTERM', () => { stopFlag = true; console.log('SIGTERM: finishing in-flight clips, then exit') })
  const BIG10 = ['fra', 'spa', 'deu', 'zho', 'ara', 'por', 'kor', 'jpn', 'ita']
  const { rows: courses } = await pg.query(`select course_code, known_lang, target_lang, pricing_tier from courses where status in ('released','beta') and (known_lang in ('eng','en') or target_lang in ('eng','en'))`)
  const isEngTarget = c => ['eng', 'en'].includes(c.target_lang)
  const colOf = c => isEngTarget(c) ? 'target2_audio_id' : 'known_audio_id'
  const prem = courses.filter(c => c.pricing_tier === 'premium')
  const lang3 = c => (isEngTarget(c) ? c.known_lang : c.target_lang)
  const rankBig = c => { const i = BIG10.indexOf(String(c.course_code).replace(/^eng_for_/, '').split('_')[0]); return i < 0 ? 99 : i }
  const stage3Order = [...prem.filter(c => !isEngTarget(c) && rankBig(c) < 99).sort((a, b) => rankBig(a) - rankBig(b) || a.course_code.localeCompare(b.course_code)),
    ...prem.filter(c => isEngTarget(c)).sort((a, b) => rankBig(a) - rankBig(b) || a.course_code.localeCompare(b.course_code)),
    ...prem.filter(c => !isEngTarget(c) && rankBig(c) === 99).sort((a, b) => a.course_code.localeCompare(b.course_code))]
  const furthest = new Map((await pg.query(`select e.course_id c, max(substring(e.highest_completed_lego_id from 'S(\\d+)')::int) mx from course_enrollments e join learners l on l.id=e.learner_id
      where e.highest_completed_lego_id is not null and e.total_practice_minutes >= 5 and coalesce(l.display_name,'') <> 'Tom' and coalesce(l.display_name,'') not ilike 'colombo%' group by 1`)).rows.map(r => [r.c, r.mx]))
  const HASH818 = ['deu_for_eng', 'spa_for_eng', 'fra_for_eng', 'ita_for_eng']
  const scopeOf = n => n === 1 ? prem.filter(c => !HASH818.includes(c.course_code)).map(c => ({ c, lo: 1, hi: 100 }))
    : n === 2 ? courses.filter(c => (furthest.get(c.course_code) || 0) > 0).sort((a, b) => (furthest.get(b.course_code) || 0) - (furthest.get(a.course_code) || 0)).map(c => ({ c, lo: 1, hi: furthest.get(c.course_code) }))
    : stage3Order.map(c => ({ c, lo: 101, hi: 668 }))
  // texts that already have a Cartesia clip in some voice OTHER than Tom-006 are never touched (loaded once: a per-row NOT EXISTS is minutes per course)
  const otherCartesia = new Set((await pg.query(`select distinct text_normalized t from course_audio where language in ('eng','en') and voice_id like 'cartesia\\_%' and voice_id <> $1`, [T6])).rows.map(r => r.t))
  const itemsFor = async ({ c, lo, hi }) => {
    const col = colOf(c), code = c.course_code
    const { rows } = await pg.query(`
      with s as (
        select seed_number pos, ${col} aid from course_seeds where course_code=$1 and ${col} is not null and seed_number between $2 and $3
        union all select seed_number, ${col} from course_legos where course_code=$1 and ${col} is not null and seed_number between $2 and $3
        union all select seed_number, ${col} from course_practice_phrases where course_code=$1 and ${col} is not null and seed_number between $2 and $3)
      select ca.text_normalized t, min(ca.text) tx, min(s.pos) pos, count(*) lines from s join course_audio ca on ca.id=s.aid
      where ca.language in ('eng','en') and ca.role in ('known','target2') and ca.voice_id not like 'cartesia\\_%'
      group by 1 order by 3, 1`, [code, lo, hi])
    return rows.filter(r => !otherCartesia.has(r.t)).map(r => ({ ...r, course: code, role: isEngTarget(c) ? 'target2' : 'known' }))
  }
  if (plan) {
    const seen = new Set(); let tot = 0, totc = 0
    for (const n of stages) { let t = 0, ch = 0, lines = 0; const per = []
      for (const sc of scopeOf(n)) { const it = (await itemsFor(sc)).filter(x => !seen.has(x.t)); it.forEach(x => seen.add(x.t)); const cc = it.reduce((a, x) => a + x.tx.length, 0); t += it.length; ch += cc; lines += it.reduce((a, x) => a + Number(x.lines), 0); per.push(`${sc.c.course_code}:${it.length}/${cc}`) }
      console.log(`STAGE ${n}: new distinct texts ${t}, chars ${ch}, lines covered ${lines}\n  ${per.join('  ')}`); tot += t; totc += ch }
    console.log('TOTAL distinct texts', tot, 'chars', totc); return pg.end()
  }
  const oneSlotsOf = async t => {
    const { rows: olds } = await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role in ('known','target2') and voice_id not like 'cartesia\\_%'`, [t])
    const ids = olds.map(r => r.id); if (!ids.length) return []
    const out = []
    for (const tbl of TABLES) for (const col of ['known_audio_id', 'target2_audio_id']) {
      const { rows } = await pg.query(`select x.id::text key, x.course_code course, x.${col}::text "from" from ${tbl} x join courses c on c.course_code=x.course_code
        where x.${col}::text = any($1::text[]) and c.status in ('released','beta')`, [ids])
      out.push(...rows.map(r => ({ tbl, col, ...r })))
    }
    return out
  }
  const mine = async () => Number((await pg.query(`select coalesce(sum(chars),0) c from tts_spend_ledger where job like '%813%' and at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'`)).rows[0].c)
  const globalToday = async () => Number((await pg.query(`select coalesce(sum(chars),0) c from tts_spend_ledger where at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc'`)).rows[0].c)
  const sleepToTomorrow = async why => { const now = new Date(), next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 5)); console.log(`DAILY LIMIT (${why}): sleeping until ${next.toISOString()}`); while (Date.now() < next.getTime() && !stopFlag) await new Promise(r => setTimeout(r, 30000)) }
  for (const n of stages) {
    const st = { texts: 0, rendered: 0, reused: 0, chars: 0, lines: 0, slots: 0, started: new Date().toISOString() }
    for (const sc of scopeOf(n)) {
      const queue = await itemsFor(sc); let idx = 0
      console.log(`stage ${n} ${sc.c.course_code} seeds ${sc.lo}-${sc.hi}: ${queue.length} texts`)
      const worker = async () => {
        while (!stopFlag) {
          const q = queue[idx++]; if (!q) return
          const { rows: [ex] } = await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role in ('known','target2') and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 order by created_at limit 1`, [q.t, T6])
          let newId, how
          if (ex) { newId = ex.id; how = 'reuse' }
          else {
            for (;;) {   // daily pacing: wait for tomorrow rather than drain the cap; leave room for other jobs
              if (stopFlag) return
              const [m, g] = [await mine(), await globalToday()]
              if (m + q.tx.length > dailyBudget) { await sleepToTomorrow(`this job ${m}/${dailyBudget}`); continue }
              if (g + q.tx.length > globalRoom) { await sleepToTomorrow(`all jobs ${g}/${globalRoom}`); continue }
              break
            }
            const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-813' },
              body: JSON.stringify({ courseCode: q.course, role: q.role, text: q.tx, language: 'eng', voiceId: T6, voiceBound: true, job: '#813', purpose: `#813 Tom-006 male English, stage ${n} (seed ${q.pos})` }) })
            const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
            if (!res.ok || !r.ok) { log({ kind: 'refused', t: q.t, r }); console.log('REFUSED — stopping, no retry:', JSON.stringify(r)); stopFlag = true; return }
            const { rows: [ca] } = await pg.query('select id::text, voice_id, s3_key, duration_ms from course_audio where id=$1', [r.audioId])
            if (!ca || ca.voice_id !== T6 || !ca.s3_key || ca.s3_key.startsWith('pending/') || !(ca.duration_ms > 200)) { log({ kind: 'verify-failed', t: q.t, r, ca }); console.log('VERIFY FAILED — stopping:', q.tx, JSON.stringify(ca)); stopFlag = true; return }
            newId = r.audioId; how = r.source === 'library' ? 'reuse' : 'render'; st.chars += r.charsSpent || 0
            log({ kind: 'render', t: q.t, newId, source: r.source, charsSpent: r.charsSpent || 0 })
          }
          const slots = await oneSlotsOf(q.t); const moved = []
          for (const s of slots) if (await setPointer(db, s, s.from, newId, await event(s.course))) { moved.push(s); touched.add(s.course) }
          log({ kind: 'swap', t: q.t, newId, slots: moved, wanted: slots.length, reused: how === 'reuse', stage: n })
          st.texts++; st[how === 'reuse' ? 'reused' : 'rendered']++; st.lines += Number(q.lines); st.slots += moved.length
          if (st.texts % 25 === 0) console.log(`stage ${n} ${q.course} seed ${q.pos}: texts ${st.texts} rendered ${st.rendered} reused ${st.reused} chars ${st.chars}`)
          if (st.slots >= 400) { await bump(); st.slots = 0 }   // slots counter reused as bump trigger below
        }
      }
      await Promise.all(Array.from({ length: conc }, worker)); await bump()
      if (stopFlag) break
    }
    const rep = `STAGE ${n} ${stopFlag ? 'STOPPED' : 'DONE'}: texts handled ${st.texts}: rendered ${st.rendered}, reused ${st.reused} (reuse rate ${st.texts ? Math.round(100 * st.reused / st.texts) : 0}% of texts); chars rendered ${st.chars}; started ${st.started}`
    console.log(rep); fs.writeFileSync(path.join(dir, `stage-${n}.report.txt`), rep + '\n')
    if (stopFlag) break
  }
  await bump(); await pg.end()
})().catch(e => { console.error(e); process.exit(1) })
