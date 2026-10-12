#!/usr/bin/env node
/**
 * Job #24 (Tom 2026-10-12: "Female voices are needed for the English for X premium courses!!!!"; "we want to keep the gender variance"):
 * #813's runner (and #995's recovery) repointed every non-Cartesia English line to Tom-006, female-origin ones included. This puts those slots back on CHARLOTTE.
 * Set = every slot in #813's ledgers (ledger-recovered.jsonl + ledger.jsonl) whose ORIGINAL clip (`from`) was a female voice and whose live clip is still Tom-006.
 * Per text: reuse an existing Charlotte clip (any course), else render ONE through Popty's one route (voice-bound, no retry on refusal). Write-ahead ledger in ops/24-female-charlotte/.
 *   node tools/audio/tom006-restore-female.cjs [--ledger-dir <813 ops dir>] [--plan] [--dry-run] [--undo] [--concurrency 4]
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { voiceGender } = require('./charlotte-backfill.cjs')
const { TOM_006, CHARLOTTE } = require('./english-gender-voice.cjs')
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = f => argv.includes(f)
const dryRun = has('--dry-run'), plan = has('--plan'), conc = Number(opt('--concurrency', 4))
const srcDir = opt('--ledger-dir', '/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/813-tom006-english/ops/813-tom006-english')
const outDir = path.join(__dirname, '../../ops/24-female-charlotte'), ledger = path.join(outDir, 'ledger.jsonl')
fs.mkdirSync(outDir, { recursive: true })
const readJ = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
const log = e => { if (!dryRun && !plan) fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n') }
const colFor = s => s.col || (String(s.course || String(s.key).split(':')[0]).startsWith('eng_for_') ? 'target2_audio_id' : 'known_audio_id')
const supa = () => {
  if (!process.env.SUPABASE_URL) for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o }
;(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0'); const db = supa()
  const identity = serviceIdentity('tom006-restore-female-24'), events = new Map(), moved = new Map()
  const event = async course => { if (!events.has(course)) events.set(course, await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/tom006-restore-female', operation: 'update', detail: { why: 'Tom 2026-10-12 job #24: female English lines back on Charlotte (gender variance)', ledger } })); return events.get(course) }
  const setPointer = async (s, from, to, ev) => {
    const col = colFor(s), { data, error } = await db.from(s.tbl).update({ [col]: to, last_edit_event_id: ev }).eq('id', s.key).eq(col, from).select('id'); if (error) throw new Error(error.message); return !!data && data.length === 1
  }
  const bump = async () => { for (const c of moved.keys()) { if (dryRun) continue; try { const v = await bumpCourseVersion(db, c, 'patch'); if (!v) throw new Error('null'); log({ kind: 'bumped', course: c }); console.log('content_version', c, v) } catch (e) { console.log('BUMP FAILED', c, e.message); process.exitCode = 3 } } moved.clear() }

  if (has('--undo')) {   // every swap row: slot back to its Tom-006 id, only where the live value is still the Charlotte id this job wrote
    const rows = readJ(ledger).filter(e => e.kind === 'swap'); let n = 0, skipped = 0
    try { for (const e of rows.reverse()) for (const s of e.slots) { if (dryRun) { n++; continue } if (await setPointer(s, e.newId, s.from, await event(s.course))) { n++; moved.set(s.course, 1) } else skipped++ } } finally { await bump(); await pg.end() }
    console.log('undone', n, 'skipped', skipped); return
  }

  // 1. every slot #813 wrote, with its ORIGINAL (earliest) from-id
  const all = [...readJ(path.join(srcDir, 'ledger-recovered.jsonl')), ...readJ(path.join(srcDir, 'ledger.jsonl'))]
  const orig = new Map()
  for (const e of all) if (['intent', 'swap'].includes(e.kind)) for (const s of e.slots || []) { if (!s.from) continue; const k = `${s.tbl}:${s.key}:${colFor(s)}`; if (!orig.has(k)) orig.set(k, { ...s, col: colFor(s) }) }
  console.log('ledger slots', orig.size)
  // 2. voice + text of each original clip; keep female ones
  const fromIds = [...new Set([...orig.values()].map(s => s.from))], info = new Map()
  for (const ch of chunks(fromIds, 5000)) for (const r of (await pg.query(`select id::text, voice_id, text_normalized t, text from course_audio where id = any($1::uuid[])`, [ch])).rows) info.set(r.id, r)
  const fem = [...orig.values()].filter(s => info.get(s.from) && voiceGender(info.get(s.from).voice_id) === 'f')
  console.log('female-origin ledger slots', fem.length)
  // 3. live value: still Tom-006?
  const live = new Map()
  for (const tbl of ['course_seeds', 'course_legos', 'course_practice_phrases']) for (const col of ['known_audio_id', 'target2_audio_id']) {
    const ids = fem.filter(s => s.tbl === tbl && s.col === col).map(s => s.key)
    for (const ch of chunks(ids, 3000)) for (const r of (await pg.query(`select x.id::text k, x.${col}::text cur, ca.voice_id v from ${tbl} x left join course_audio ca on ca.id=x.${col} where x.id::text = any($1)`, [ch])).rows) live.set(`${tbl}:${r.k}:${col}`, r)
  }
  const todo = fem.filter(s => { const l = live.get(`${s.tbl}:${s.key}:${s.col}`); if (!l || l.v !== TOM_006) return false; s.cur = l.cur; return true })
  const byCourse = {}; for (const s of todo) byCourse[s.course] = (byCourse[s.course] || 0) + 1
  const texts = new Map(); for (const s of todo) { const i = info.get(s.from); if (!texts.has(i.t)) texts.set(i.t, { t: i.t, tx: i.text, slots: [] }); texts.get(i.t).slots.push(s) }
  const have = new Map(); for (const ch of chunks([...texts.keys()], 3000)) for (const r of (await pg.query(`select distinct on (text_normalized) text_normalized t, id::text from course_audio where text_normalized = any($1) and language in ('eng','en') and role in ('known','target2') and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 order by text_normalized, created_at`, [ch, CHARLOTTE])).rows) have.set(r.t, r.id)
  const toRender = [...texts.values()].filter(x => !have.has(x.t))
  console.log('slots still on Tom-006 (female-origin):', todo.length, 'texts', texts.size, 'reuse Charlotte', texts.size - toRender.length, 'to render', toRender.length, 'chars', toRender.reduce((a, x) => a + x.tx.length, 0))
  console.log('PER COURSE', JSON.stringify(Object.fromEntries(Object.entries(byCourse).sort((a, b) => b[1] - a[1]))))
  if (plan) return pg.end()

  let stop = false, rendered = 0, chars = 0, restored = 0; const queue = [...texts.values()]; let idx = 0; const perCourse = {}
  const worker = async () => {
    while (!stop) {
      const q = queue[idx++]; if (!q) return
      let newId = have.get(q.t), how = 'reuse'
      if (!newId) {
        const s0 = q.slots[0]; if (dryRun) continue
        let res, r
        for (let attempt = 0; attempt < 6; attempt++) {   // a rate limit or a spend-ledger timeout means "ask again later"; any other refusal is the answer
          res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-24' },
            body: JSON.stringify({ courseCode: s0.course, role: s0.col === 'target2_audio_id' ? 'target2' : 'known', text: q.tx, language: 'eng', voiceId: CHARLOTTE, voiceBound: true, job: '#813', purpose: '#24 Charlotte female English (gender-variance correction of #813 Tom-006 output)' }) }).catch(() => ({ ok: false, status: 0, json: async () => ({ ok: false, code: 'CONN' }) }))
          r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
          if (r && (r.code === 'RENDER_FAILED' || /statement timeout|socket hang up|ECONNRESET/i.test(String(r.error || '')))) {   // the paid render may have landed with its row after all: look before asking again (never double-pay)
            await new Promise(z => setTimeout(z, 30000))
            const landed = (await pg.query(`select id::text from course_audio where text_normalized=$1 and language in ('eng','en') and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 limit 1`, [q.t, CHARLOTTE])).rows[0]
            if (landed) { r = { ok: true, audioId: landed.id, source: 'library', charsSpent: 0 }; res = { ok: true }; break }
            console.log('transient render failure, retrying:', String(r.error || '').slice(0, 100)); continue
          }
          if (!(r && (r.code === 'LEDGER' || r.code === 'CONN' || res.status === 429 || /rate/i.test(String(r.code || ''))))) break
          console.log('transient, waiting 30s:', r.code || res.status); await new Promise(z => setTimeout(z, 30000))
        }
        if (r.code === 'NOT_SPEAKABLE') { log({ kind: 'unspeakable', t: q.t, text: q.tx }); continue }
        if (!res.ok || !r.ok) { log({ kind: 'refused', t: q.t, r }); console.log('REFUSED — stopping, no retry:', JSON.stringify(r).slice(0, 300)); stop = true; return }
        const { rows: [ca] } = await pg.query('select voice_id, s3_key, duration_ms from course_audio where id=$1', [r.audioId])
        if (!ca || ca.voice_id !== CHARLOTTE || !ca.s3_key || ca.s3_key.startsWith('pending/') || !(ca.duration_ms > 200)) { log({ kind: 'verify-failed', t: q.t, r, ca }); console.log('VERIFY FAILED — stopping:', q.tx); stop = true; return }
        newId = r.audioId; how = r.source === 'library' ? 'reuse' : 'render'; if (how === 'render') { rendered++; chars += r.charsSpent || 0 }
      }
      if (dryRun) continue
      const slots = q.slots.map(s => ({ tbl: s.tbl, col: s.col, key: s.key, course: s.course, from: s.cur }))   // `from` here = the Tom-006 id being replaced (undo target)
      log({ kind: 'intent', t: q.t, newId, slots, how })
      const done = []
      for (const s of slots) if (await setPointer(s, s.from, newId, await event(s.course))) { done.push(s); moved.set(s.course, 1); perCourse[s.course] = (perCourse[s.course] || 0) + 1; restored++ }
      log({ kind: 'swap', t: q.t, newId, slots: done, wanted: slots.length, how })
    }
  }
  try { await Promise.all(Array.from({ length: conc }, worker)) } finally { await bump(); await pg.end() }
  console.log('RESTORED', restored, 'rendered', rendered, 'chars', chars, 'PER COURSE restored', JSON.stringify(perCourse))
})().catch(e => { console.error(e); process.exit(1) })
