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
const TABLES = ['course_seeds', 'course_legos', 'course_practice_phrases']
const slotId = s => `${s.tbl}:${s.key}:${s.col || 'known_audio_id'}`
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0'); const db = supa()
  const identity = serviceIdentity('tom006-english-813'), events = new Map(), touchedN = new Map()
  const event = async course => { if (!events.has(course)) events.set(course, await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-english', operation: 'update', detail: { why: 'Tom 2026-10-12 job #813: male English (Tom-006) for lines with no other Cartesia clip; old ids in ledger', ledger } })); return events.get(course) }
  // content_version is bumped AS WE GO (every BUMP_EVERY moved slots per course) and in a finally, so a crash never leaves moved pointers on an old version (lane review #829)
  const BUMP_EVERY = 100
  const touch = async (course, n) => { const v = (touchedN.get(course) || 0) + n; touchedN.set(course, v); if (v >= BUMP_EVERY) await bumpOne(course) }
  const bumpOne = async course => { if (dryRun) return; touchedN.set(course, 0); console.log('content_version', course, await bumpCourseVersion(db, course, 'patch')) }
  const bump = async () => { for (const [c, n] of [...touchedN]) if (n > 0) await bumpOne(c) }

  if (has('--undo')) {
    // The undo set is every INTENT row (journalled before any pointer moved), swap and legacy swap row: slot -> its ORIGINAL from-id; the before-check (newId must still be there) keeps it safe
    const rows = lines(), orig = new Map()   // slotId -> { s, cur }
    for (const e of rows) if (['intent', 'swap'].includes(e.kind)) for (const s of e.slots || []) { if (!s.from) continue; const k = slotId(s); if (!orig.has(k)) orig.set(k, { s, cur: e.newId }); else orig.get(k).cur = e.newId }
    for (const e of rows) if (e.kind === 'undone') for (const k of e.keys) orig.delete(k)
    let n = 0; const done = []
    try {
      for (const [k, { s, cur }] of [...orig].reverse()) {
        if (dryRun) { console.log('would undo', k, cur, '->', s.from); n++; continue }
        if (await setPointer(db, s, cur, s.from, await event(s.course))) { await touch(s.course, 1); n++ }
        done.push(k)
      }
    } finally { if (!dryRun) { log({ kind: 'undone', keys: done }); await bump() } }
    console.log(dryRun ? 'would undo' : 'undone slots', n); return pg.end()
  }

  const stageArg = opt('--stage', 'all'), conc = Number(opt('--concurrency', 6)), plan = has('--plan')
  let stopFlag = false; process.on('SIGTERM', () => { stopFlag = true; console.log('SIGTERM: finishing in-flight clips, then exit') })
  const BIG = ['fra', 'spa', 'deu', 'zho', 'ara', 'por', 'kor', 'jpn', 'ita']
  const X11 = ['fra_for_eng', 'spa_for_eng', 'spa_mx_for_eng', 'deu_for_eng', 'zho_for_eng', 'ara_for_eng', 'por_for_eng', 'por_br_for_eng', 'kor_for_eng', 'jpn_for_eng', 'ita_for_eng']
  const HASH818 = ['deu_for_eng', 'spa_for_eng', 'fra_for_eng', 'ita_for_eng']   // seeds 1-100 known prompts belong to #818 (intros to #794)
  const { rows: courses } = await pg.query(`select course_code, known_lang, target_lang, pricing_tier from courses where status in ('released','beta') and (known_lang in ('eng','en') or target_lang in ('eng','en'))`)
  const byCode = new Map(courses.map(c => [c.course_code, c]))
  const isEngTarget = c => ['eng', 'en'].includes(c.target_lang)
  const colOf = c => isEngTarget(c) ? 'target2_audio_id' : 'known_audio_id'
  const prem = courses.filter(c => c.pricing_tier === 'premium')
  const rankBig = c => { const i = BIG.indexOf(String(c.course_code).replace(/^eng_for_/, '').split('_')[0]); return i < 0 ? 99 : i }
  const furthest = new Map((await pg.query(`select e.course_id c, max(substring(e.highest_completed_lego_id from 'S(\\d+)')::int) mx from course_enrollments e join learners l on l.id=e.learner_id
      where e.highest_completed_lego_id is not null and e.total_practice_minutes >= 5 and coalesce(l.display_name,'') <> 'Tom' and coalesce(l.display_name,'') not ilike 'colombo%' group by 1`)).rows.map(r => [r.c, r.mx]))
  const fu = c => furthest.get(c.course_code) || 0
  const x11 = X11.map(k => byCode.get(k)).filter(Boolean)
  const nonX11Prem = prem.filter(c => !X11.includes(c.course_code))
  const engFor = nonX11Prem.filter(isEngTarget).sort((a, b) => rankBig(a) - rankBig(b) || a.course_code.localeCompare(b.course_code))
  const otherPrem = nonX11Prem.filter(c => !isEngTarget(c))
  // Tom 2026-10-12 (goal by the 23 Oct reset): the 11 premium X_for_eng courses, seeds 1-668, come before any eng_for_X work; earlier stages stay where they fall inside the 11.
  const STAGES = {
    1: () => x11.filter(c => !HASH818.includes(c.course_code)).map(c => ({ c, lo: 1, hi: 100 })),             // seeds 1-100 of the 11 (not #818's four)
    2: () => x11.filter(c => fu(c) > 100).map(c => ({ c, lo: 101, hi: fu(c) })),                              // up to the furthest real learner, the 11
    3: () => x11.map(c => ({ c, lo: 101, hi: 668 })),                                                         // the rest of 101-668, the 11
    4: () => [...engFor, ...otherPrem].map(c => ({ c, lo: 1, hi: 100 })),                                     // seeds 1-100 of every other premium course
    5: () => [...engFor, ...otherPrem, ...courses.filter(c => c.pricing_tier !== 'premium')].filter(c => fu(c) > 0).map(c => ({ c, lo: 1, hi: fu(c) })),   // up to the furthest learner, everything else with English
    6: () => [...engFor, ...otherPrem].map(c => ({ c, lo: 101, hi: 668 })),                                   // 101-668, eng_for_X then the rest
  }
  const stages = stageArg === 'all' ? [1, 2, 3, 4, 5, 6] : stageArg.split(',').map(Number)
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
  const t6Row = async t => (await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role in ('known','target2') and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 order by created_at limit 1`, [t, T6])).rows[0]
  if (plan) {   // count: distinct texts left to render vs texts that only need repointing (a Tom-006 row exists), chars, slots
    const seen = new Set(); let T = { render: 0, repoint: 0, chars: 0, lines: 0 }
    for (const n of stages) { const a = { render: 0, repoint: 0, chars: 0, lines: 0 }
      for (const sc of STAGES[n]()) for (const x of (await itemsFor(sc))) { if (seen.has(x.t)) continue; seen.add(x.t); a.lines += Number(x.lines); if (await t6Row(x.t)) a.repoint++; else { a.render++; a.chars += x.tx.length } }
      console.log(`STAGE ${n}: to render ${a.render} texts / ${a.chars} chars; repoint-only ${a.repoint} texts; lines covered ${a.lines}`); for (const k in T) T[k] += a[k] }
    console.log('TOTAL', JSON.stringify(T)); return pg.end()
  }
  const oneSlotsOf = async t => {
    const { rows: olds } = await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and role in ('known','target2') and voice_id not like 'cartesia\\_%'`, [t])
    const ids = olds.map(r => r.id); if (!ids.length) return []
    const out = []
    for (const tbl of TABLES) for (const col of ['known_audio_id', 'target2_audio_id']) {
      const { rows } = await pg.query(`select x.id::text key, x.course_code course, x.${col}::text "from" from ${tbl} x join courses c on c.course_code=x.course_code
        where x.${col} = any($1::uuid[]) and c.status in ('released','beta')`, [ids])
      out.push(...rows.map(r => ({ tbl, col, ...r })))
    }
    return out
  }
  // Tom 2026-10-12: the TTS guards are for runaway agents, not for a job he directs; this job holds a job-scoped approval (tools/tts-cap.cjs approve "#813"). No self-imposed pacing.
  const finished = []
  try {
    for (const n of stages) {
      const st = { texts: 0, rendered: 0, reused: 0, chars: 0, slots: 0, started: new Date().toISOString() }
      for (const sc of STAGES[n]()) {
        if (stopFlag) break
        const queue = await itemsFor(sc); let idx = 0
        console.log(`stage ${n} ${sc.c.course_code} seeds ${sc.lo}-${sc.hi}: ${queue.length} texts`)
        if (dryRun) { st.texts += queue.length; continue }   // a dry run renders nothing, moves nothing, bumps nothing
        const worker = async () => {
          while (!stopFlag) {
            const q = queue[idx++]; if (!q) return
            const ex = await t6Row(q.t); let newId, how
            if (ex) { newId = ex.id; how = 'reuse' }
            else {
              const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-813' },
                body: JSON.stringify({ courseCode: q.course, role: q.role, text: q.tx, language: 'eng', voiceId: T6, voiceBound: true, job: '#813', purpose: `#813 Tom-006 male English, stage ${n} (seed ${q.pos})` }) })
              const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
              if (!res.ok || !r.ok) { log({ kind: 'refused', t: q.t, r }); console.log('REFUSED — stopping, no retry:', JSON.stringify(r).slice(0, 400)); stopFlag = true; return }
              const { rows: [ca] } = await pg.query('select id::text, voice_id, s3_key, duration_ms from course_audio where id=$1', [r.audioId])
              if (!ca || ca.voice_id !== T6 || !ca.s3_key || ca.s3_key.startsWith('pending/') || !(ca.duration_ms > 200)) { log({ kind: 'verify-failed', t: q.t, r, ca }); console.log('VERIFY FAILED — stopping:', q.tx, JSON.stringify(ca)); stopFlag = true; return }
              newId = r.audioId; how = r.source === 'library' ? 'reuse' : 'render'; st.chars += r.charsSpent || 0
              log({ kind: 'render', t: q.t, newId, source: r.source, charsSpent: r.charsSpent || 0 })
            }
            const slots = await oneSlotsOf(q.t)
            log({ kind: 'intent', t: q.t, newId, slots, how })   // journalled BEFORE any pointer moves, reuse included: undo reads this
            const moved = []
            for (const s of slots) if (await setPointer(db, s, s.from, newId, await event(s.course))) { moved.push(s); await touch(s.course, 1) }
            log({ kind: 'swap', t: q.t, newId, slots: moved, wanted: slots.length, reused: how === 'reuse', stage: n })
            st.texts++; st[how === 'reuse' ? 'reused' : 'rendered']++; st.slots += moved.length
            if (st.texts % 50 === 0) console.log(`stage ${n} ${q.course} seed ${q.pos}: texts ${st.texts} rendered ${st.rendered} reused ${st.reused} chars ${st.chars}`)
          }
        }
        try { await Promise.all(Array.from({ length: conc }, worker)) } finally { await bump() }
      }
      const rep = `STAGE ${n} ${stopFlag ? 'STOPPED' : dryRun ? 'DRY' : 'DONE'}: texts ${st.texts}: rendered ${st.rendered}, reused ${st.reused} (${st.texts ? Math.round(100 * st.reused / st.texts) : 0}% reuse); slots repointed ${st.slots}; chars rendered ${st.chars}; started ${st.started}`
      console.log(rep); if (!dryRun) fs.writeFileSync(path.join(dir, `stage-${n}.report.txt`), rep + '\n')
      if (stopFlag) break
    }
  } finally { await bump(); await pg.end() }
})().catch(e => { console.error(e); process.exit(1) })
