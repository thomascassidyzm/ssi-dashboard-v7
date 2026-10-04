#!/usr/bin/env node
/**
 * ENGLISH -> CHARLOTTE BACKFILL (job #573, Tom 2026-10-03: "redo the English phrases properly with the
 * new Cartesia voices"). A Tom-triggered, incremental backfill — voice change never re-renders on its
 * own (HARD RULE 2026-09-20); this tool is the separate, Tom-triggered pass.
 *
 * What it does, per OLD clip still linked from a course's content rows (English, TTS, xAI or Azure):
 *   1. renders the SAME stored text in Charlotte through Popty's ONE route (POST /api/audio/render, which is
 *      library-first, spend-guarded, one render, no retries) — never touches a provider itself;
 *   2. verifies the new clip is alive (row says Charlotte, has a key, learner proxy serves audio bytes);
 *   3. only then writes the old->new pointer swap to a WRITE-AHEAD ledger and repoints every slot that held
 *      the old id (before-state asserted per row, service identity, content edit event).
 * The old course_audio rows and S3 objects are never deleted. Undo = --undo (reads the ledger backwards).
 * Resumable by construction: work is whatever is still linked to a non-Charlotte English clip.
 *
 *   node tools/audio/charlotte-backfill.cjs --course ita_for_eng --roles known,presentation --budget 25000 [--dry-run]
 *   node tools/audio/charlotte-backfill.cjs --course ita_for_eng --undo [--limit 50]
 *   node tools/audio/charlotte-backfill-daily.cjs           # the daily unit: calls this tool course by course inside today's cap headroom
 *   node tools/audio/charlotte-backfill.cjs --plan            # estate census of what is left, per course
 */
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')

const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const CHARLOTTE_BARE = CHARLOTTE.replace(/^cartesia_/, '')
const JOB = '#573'
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const AUDIO_BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio'
const SLOT_COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id', presentation: 'presentation_audio_id' }
// Female xAI presets (eve, ara; xai_/bare, incl. the eve_q variant). Tom's clones (gfzdpspr5fdp, bedd6226) and leo/sal/rex are male:
// their mapping is Tom's separate decision, so the xai-female pass never touches them.
const FEMALE_XAI = `(ca.voice_id ~ '^(xai_)?(eve|ara)(_q)?$')`
// xAI and Azure voice ids, prefixed or bare. Anything else (Cartesia, ElevenLabs, human) is left alone.
// Built FROM FEMALE_XAI so a bare eve_q/ara_q can never be selected by the daily pass yet hidden from --plan (job #608).
const BAD_VOICE = `(ca.voice_id ~ '^(xai_|azure_)' or ca.voice_id ~ 'Neural$' or ca.voice_id in ('gfzdpspr5fdp','bedd6226','leo','sal','comp:leo') or ${FEMALE_XAI})`

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const has = f => argv.includes(f)

async function slotsFor(pg, course, role) {
  const col = SLOT_COL[role]
  const parts = ['course_seeds', 'course_legos', 'course_practice_phrases'].filter(t => !(t === 'course_seeds' && role === 'presentation')).map(t =>
    `select '${t}' tbl, id::text key, ${col}::text old_id, seed_number pos from ${t} where course_code = $1 and ${col} is not null${t === 'course_practice_phrases' && role === 'presentation' ? " and phrase_role is distinct from 'component'" : ''}`)
  const { rows } = await pg.query(parts.join(' union all '), [course])
  return rows
}

/** Old clips still linked, with their slots: [{oldId, text, role, chars, slots:[{tbl,key,col}], pos}] in course order. */
async function workFor(pg, course, roles, voiceSql = BAD_VOICE) {
  const out = []
  for (const role of roles) {
    const slots = await slotsFor(pg, course, role)
    const ids = [...new Set(slots.map(s => s.old_id))]
    if (!ids.length) continue
    const { rows } = await pg.query(`select ca.id::text, ca.text, ca.voice_id from course_audio ca
       where ca.id = any($1::uuid[]) and ca.course_code = $2 and ca.language in ('eng','en') and ca.origin = 'tts' and ca.role = $3 and ${voiceSql}`, [ids, course, role])
    const bad = new Map(rows.map(r => [r.id, r]))
    const by = new Map()
    for (const s of slots) {
      const c = bad.get(s.old_id); if (!c) continue
      if (!by.has(s.old_id)) by.set(s.old_id, { oldId: s.old_id, text: c.text, oldVoice: c.voice_id, role, chars: c.text.length, slots: [], pos: s.pos })
      const w = by.get(s.old_id); w.slots.push({ tbl: s.tbl, key: s.key, col: SLOT_COL[role] }); w.pos = Math.min(w.pos ?? 1e9, s.pos ?? 1e9)
    }
    out.push(...by.values())
  }
  return out.sort((a, b) => (a.pos ?? 1e9) - (b.pos ?? 1e9) || a.oldId.localeCompare(b.oldId))
}

async function render(course, w, dryRun) {
  const res = await fetch(`${POPTY}/api/audio/render`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'job-573-charlotte-backfill' },
    body: JSON.stringify({ courseCode: course, role: w.role, text: w.text, language: 'eng', voiceId: CHARLOTTE, job: JOB, dryRun,
      purpose: 'Tom 2026-10-03: English re-render on Charlotte (xAI clicks / Azure replacement), job #573' }),
  })
  const body = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  return { status: res.status, ...body }
}

/** Alive and correct-voiced, or no swap. */
async function verifyNew(pg, audioId) {
  const { rows: [r] } = await pg.query('select voice_id, s3_key, duration_ms, audio_revision from course_audio where id = $1', [audioId])
  if (!r) return 'row missing'
  if (r.voice_id !== CHARLOTTE && r.voice_id !== CHARLOTTE_BARE) return `voice is ${r.voice_id}`
  if (!r.s3_key || r.s3_key.startsWith('pending/')) return 'no object'
  const ref = r.audio_revision > 1 ? `${audioId}.v${r.audio_revision}` : audioId
  const res = await fetch(`${AUDIO_BASE}/${ref}`, { headers: { 'User-Agent': 'job-573' } })
  if (!res.ok) return `proxy HTTP ${res.status}`
  const n = (await res.arrayBuffer()).byteLength
  return n > 2000 ? null : `only ${n} bytes`
}

function supa() {
  for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env']) {
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim())
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
    }
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

async function setPointer(db, s, from, to, eventId) {
  const val = to
  const { data, error } = await db.from(s.tbl).update({ [s.col]: val, last_edit_event_id: eventId }).eq('id', s.key).eq(s.col, from).select('id')
  if (error) throw new Error(`${s.tbl}.${s.col} update failed: ${error.message}`)
  return data && data.length === 1
}

const swapKey = e => `${e.oldId}|${e.newId}`
/** Swaps still to undo, read in ledger order: each undo line cancels one EARLIER swap with the same key, so a swap re-made after its undo stays pending. */
function pendingSwaps(lines) {
  const open = new Map() // key -> swap entries not yet cancelled
  for (const e of lines) {
    if (e.kind === 'swap') open.set(swapKey(e), [...(open.get(swapKey(e)) || []), e])
    else if (e.kind === 'undo') (open.get(swapKey(e)) || []).pop()
  }
  const pending = new Set([...open.values()].flat())
  return lines.filter(e => pending.has(e))
}
/** Keys with no swap still pending: the ledger shows them fully undone. */
const undoneSet = lines => {
  const pendingKeys = new Set(pendingSwaps(lines).map(swapKey))
  return new Set(lines.filter(e => e.kind === 'swap' && !pendingKeys.has(swapKey(e))).map(swapKey))
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await pg.connect()
  if (has('--plan')) {
    const { rows } = await pg.query(`select course_code from courses order by 1`)
    console.log('course | old clips still linked | distinct chars to render')
    for (const { course_code } of rows) {
      const all = ['known', 'presentation', 'target1', 'target2']
      const w = await workFor(pg, course_code, all)
      const f = await workFor(pg, course_code, all, FEMALE_XAI)
      if (w.length) console.log(`${course_code} | ${w.length} | ${w.reduce((n, x) => n + x.chars, 0)} | female xAI ${f.length}`)
    }
    return pg.end()
  }
  const course = opt('--course'); if (!course) { console.error('--course required'); process.exit(1) }
  const ledger = evidencePath(`573/${course}-ledger.jsonl`)
  const db = supa()
  const identity = serviceIdentity('charlotte-backfill-573')

  if (has('--undo')) {
    const all = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
    // nothing marks a swap line itself undone, so pending swaps are derived from the ledger order (each undo line cancels one earlier swap)
    const lines = pendingSwaps(all).reverse()
    let n = 0; const limit = Number(opt('--limit', 1e9))
    const eventId = await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/charlotte-backfill --undo', operation: 'update', detail: { why: 'undo job #573 pointer swaps', ledger } })
    for (const e of lines) {
      if (n >= limit) break
      let moved = 0
      for (const s of e.slots) if (await setPointer(db, s, e.newId, e.oldId, eventId)) moved++
      fs.appendFileSync(ledger, JSON.stringify({ kind: 'undo', oldId: e.oldId, newId: e.newId, at: new Date().toISOString() }) + '\n')
      if (moved) n++ // a swap whose slots changed nothing is closed in the ledger but not reported as undone
    }
    console.log(`undone ${n} swaps`); return pg.end()
  }

  const roles = opt('--roles', 'known,presentation').split(',')
  const budget = Number(opt('--budget', 0)); const dryRun = has('--dry-run')
  const xaiFemale = opt('--voices') === 'xai-female' // xAI-first pass (Tom 2026-10-04: clicks heard by ear in xAI English)
  const work = await workFor(pg, course, roles, xaiFemale ? FEMALE_XAI : BAD_VOICE)
  const total = work.reduce((n, x) => n + x.chars, 0)
  console.log(`${course} ${roles}: ${work.length} old clips linked, ${total} chars; budget ${budget}${dryRun ? ' (dry run)' : ''}`)
  let spent = 0, done = 0, free = 0, failures = 0, slotsMoved = 0, eventId = null
  for (const w of work) {
    if (spent + w.chars > budget) { if (spent === 0 && budget === 0) break; continue }
    const r = await render(course, w, dryRun)
    if (r.status === 402 || r.code === 'DAILY_TOTAL_CAP' || r.code === 'REPEAT' || r.code === 'NOT_IN_CHAIN') { console.log(`REFUSED (the answer, not retried): ${r.code} ${r.error}`); break }
    if (!r.ok) { console.log('FAIL', w.oldId, r.code, r.error); if (++failures >= 5) { console.log('5 failures — stopping'); break } continue }
    if (dryRun) { spent += r.wouldSpendChars || 0; done++; continue }
    failures = 0; spent += r.charsSpent || 0
    const bad = await verifyNew(pg, r.audioId)
    if (bad) { console.log('VERIFY-FAIL', w.oldId, '->', r.audioId, bad, '— old pointer kept'); continue }
    // write-ahead: the ledger line exists before the first pointer moves
    const entry = { kind: 'swap', course, role: w.role, oldId: w.oldId, newId: r.audioId, oldVoice: w.oldVoice, source: r.source, charsSpent: r.charsSpent || 0, slots: w.slots, text: w.text, at: new Date().toISOString() }
    fs.appendFileSync(ledger, JSON.stringify(entry) + '\n')
    if (!eventId) eventId = await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/charlotte-backfill', operation: 'update',
      detail: { why: 'Tom 2026-10-03 English->Charlotte backfill, job #573; old ids in ledger', ledger } })
    // a slot the DB refuses (e.g. a trigger) is logged and skipped; the old pointer simply stays
    for (const s of w.slots) {
      try { if (await setPointer(db, s, w.oldId, r.audioId, eventId)) slotsMoved++ }
      catch (e) { console.log('SLOT-REFUSED', s.tbl, s.key, e.message.slice(0, 120)); fs.appendFileSync(ledger, JSON.stringify({ kind: 'slot-refused', oldId: w.oldId, slot: s, error: e.message }) + '\n') }
    }
    done++; if (r.source === 'library') free++
  }
  console.log(`done ${done} clips (${free} from library), ${slotsMoved} slots repointed, ${spent} chars spent; ${work.length - done} remain. ledger ${ledger}`)
  await pg.end()
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })

module.exports = { swapKey, undoneSet, pendingSwaps, BAD_VOICE, FEMALE_XAI }
