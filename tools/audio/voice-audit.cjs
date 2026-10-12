#!/usr/bin/env node
/**
 * VOICE AUDIT — "audit, fix" instead of every agent writing its own repoint script (job #53, Tom 2026-10-12 16:17Z).
 *
 * For a course, every live slot (*_audio_id on course_seeds / course_legos / course_practice_phrases) is compared with
 * resolveVoice (services/shared/resolve-voice.cjs) and counted:
 *   ok         the clip is in the resolved voice
 *   drift      the clip is in another voice — the fix moves these
 *   human      a human recording: never outranked, never moved
 *   refused    resolveVoice refuses the slot (a target language with no cast Tom chose) — nothing can fix it but a cast
 *   no-ruling  outside the coded policy (a non-English known side, …) — reported, never moved
 * plus `dangling` (a pointer naming no course_audio row: broken, phase8's job, not a voice question). NULL pointers are not slots here.
 *
 *   node tools/audio/voice-audit.cjs --course fra_for_eng [--json]           counts + the fix plan (read-only)
 *   node tools/audio/voice-audit.cjs --premium11 [--json]                     the 11 premium X_for_eng courses
 *   node tools/audio/voice-audit.cjs --course C --fix [--dry-run]             do it: reuse first, then (only with --max-chars) render
 *        [--max-chars N]  render budget for this run (default 0 = reuse only; spend is still the TTS guard's to allow)
 *        [--limit N]      at most N distinct texts this run          [--role known|target1|target2]
 *   node tools/audio/voice-audit.cjs --undo <ledger.jsonl> [--dry-run]       put every slot the ledger moved back (before-state asserted)
 *
 * The fix, per drifted (language, text, resolved voice): an existing clip in that voice is reused (any course, any role but a
 * pending/short one); else, with budget, ONE render through Popty's one route (POST /api/audio/render, voice named, voiceBound),
 * verified (voice, S3 key, duration) before any pointer moves. Presentation intros are reuse-only here: a Tom-006 intro is
 * rendered by the intro tooling (break tag, fade), never from an old intro's text. Every move is written ahead to an undo ledger
 * under ~/ssi-evidence (tools/lib/evidence-path.cjs), goes through setSlotPointer (resolveVoice + before-state), and the course's
 * content_version is bumped every 100 moves and at the end. Nothing is ever deleted.
 */
const fs = require('fs'), path = require('path')
for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) { require('dotenv').config({ path: p, quiet: true }); break }
const rv = require('../../services/shared/resolve-voice.cjs')

const SLOT_COLUMNS = Object.freeze({
  course_seeds: ['known_audio_id', 'target1_audio_id', 'target2_audio_id'],
  course_legos: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
  course_practice_phrases: ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'],
})
/** The 11 premium courses taught from English (Tom's "big" X_for_eng set, as tools/audio/tom006-english.cjs X11). */
const PREMIUM_11 = Object.freeze(['fra_for_eng', 'spa_for_eng', 'spa_mx_for_eng', 'deu_for_eng', 'zho_for_eng', 'ara_for_eng', 'por_for_eng', 'por_br_for_eng', 'kor_for_eng', 'jpn_for_eng', 'ita_for_eng'])
/** course_legos.presentation_audio_id is TEXT, every other pointer a uuid: compare as uuid. */
const ptr = (tbl, col) => (tbl === 'course_legos' && col === 'presentation_audio_id' ? `nullif(x.${col}, '')::uuid` : `x.${col}`)
const usable = (alias) => `${alias}.s3_key is not null and ${alias}.s3_key not like 'pending/%' and coalesce(${alias}.duration_ms, 0) > 200`

/**
 * Pure. Classify grouped slot rows ({tbl, col, voice_id, language, origin, slots, texts}) for one course.
 * @returns {{ totals, groups }} groups carry status + resolved voice; totals sum slots per status.
 */
function classify(course, rows, cast) {
  const totals = { ok: 0, drift: 0, human: 0, refused: 0, 'no-ruling': 0, dangling: 0 }
  const groups = []
  for (const r of rows) {
    const n = Number(r.slots)
    if (!r.voice_id && !r.language) { totals.dangling += n; continue }
    const role = rv.roleOfColumn(r.col)
    let status, resolved = null, reason = null
    if (r.origin === 'human') status = 'human'
    else {
      const res = rv.resolveVoice({ course, role, language: r.language }, cast)
      if (res.status === 'no-ruling') { status = 'no-ruling'; reason = res.message }
      else if (res.status === 'refuse') { status = 'refused'; reason = res.reason }
      else { resolved = res.voiceId; status = rv.sameVoice(r.voice_id, res.voiceId) ? 'ok' : 'drift'; reason = res.rule }
    }
    totals[status] += n
    groups.push({ ...r, role, slots: n, status, resolved, reason })
  }
  return { totals, groups }
}

/** Pure. One plain block of text for a course's audit. */
function render(code, { totals, groups, plan }) {
  const L = [`${code}: ok ${totals.ok} · drift ${totals.drift} · human ${totals.human} · refused ${totals.refused} · no-ruling ${totals['no-ruling']} · dangling ${totals.dangling}`]
  const drift = groups.filter((g) => g.status === 'drift').sort((a, b) => b.slots - a.slots)
  const by = new Map()
  for (const g of drift) { const k = `${g.role}: ${g.voice_id} -> ${g.resolved} (${g.reason})`; by.set(k, (by.get(k) || 0) + g.slots) }
  for (const [k, n] of by) L.push(`  drift ${n} ${k}`)
  const refused = new Map()
  for (const g of groups.filter((x) => x.status === 'refused')) { const k = `${g.role} ${g.reason}`; refused.set(k, (refused.get(k) || 0) + g.slots) }
  for (const [k, n] of refused) L.push(`  refused ${n} ${k}`)
  if (plan) L.push(`  fix plan: ${plan.texts} distinct texts over ${plan.slots} slots — reuse ${plan.reuseTexts} texts (${plan.reuseSlots} slots, free), render ${plan.renderTexts} texts (${plan.renderChars} chars)${plan.presentationRender ? `, ${plan.presentationRender} intro texts left to the intro tooling` : ''}`)
  return L.join('\n')
}

async function connect() {
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  const db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  return { pg, db }
}

async function groupedSlots(pg, code) {
  const parts = []
  for (const [tbl, cols] of Object.entries(SLOT_COLUMNS)) for (const col of cols) parts.push(`
    select '${tbl}' tbl, '${col}' col, ca.voice_id, ca.language, ca.origin, count(*) slots, count(distinct ca.text_normalized) texts
    from ${tbl} x left join course_audio ca on ca.id = ${ptr(tbl, col)} where x.course_code = $1 and x.${col} is not null group by 3, 4, 5`)
  return (await pg.query(parts.join(' union all '), [code])).rows
}

/** The drifted slots of one (column, from-voice, language) group, in seed order. */
async function driftSlots(pg, code, g) {
  const { rows } = await pg.query(`select '${g.tbl}' tbl, '${g.col}' col, x.id::text key, x.seed_number pos, ca.id::text aid, ca.text_normalized t, ca.text tx, ca.language
    from ${g.tbl} x join course_audio ca on ca.id = ${ptr(g.tbl, g.col)}
    where x.course_code = $1 and ca.voice_id = $2 and ca.language = $3 and coalesce(ca.origin, '') <> 'human' order by x.seed_number nulls last`, [code, g.voice_id, g.language])
  return rows
}

/** Group drifted slots into fix items: one per (language, text, resolved voice). */
async function fixItems(pg, code, groups, roleFilter) {
  const items = new Map()
  for (const g of groups.filter((x) => x.status === 'drift' && (!roleFilter || x.role === roleFilter))) {
    for (const s of await driftSlots(pg, code, g)) {
      const k = `${s.language}|${s.t}|${g.resolved}|${g.role === 'presentation'}`
      if (!items.has(k)) items.set(k, { language: s.language, t: s.t, tx: s.tx, voice: g.resolved, role: g.role, pos: s.pos, slots: [] })
      const it = items.get(k); it.slots.push({ tbl: s.tbl, col: s.col, key: s.key, from: s.aid, course: code }); if (s.pos != null && (it.pos == null || s.pos < it.pos)) it.pos = s.pos
    }
  }
  return [...items.values()].sort((a, b) => (a.pos ?? 1e9) - (b.pos ?? 1e9))
}

/** Batch reuse lookup: one round trip per 2,000 items — (language, text, voice) → an existing usable clip id. */
async function attachReuse(pg, items) {
  for (let i = 0; i < items.length; i += 2000) {
    const chunk = items.slice(i, i + 2000)
    const { rows } = await pg.query(`with want as (select * from unnest($1::text[], $2::text[], $3::text[], $4::text[]) as w(i, t, lang, voice))
      select distinct on (w.i) w.i, ca.id::text id from want w join course_audio ca on ca.text_normalized = w.t and ca.language = w.lang
        and (ca.voice_id = w.voice or ca.voice_id = replace(w.voice, 'cartesia_', '')) and ${usable('ca')}
      order by w.i, ca.created_at`, [chunk.map((_, j) => String(i + j)), chunk.map((x) => x.t), chunk.map((x) => x.language), chunk.map((x) => rv.canonVoice(x.voice))])
    for (const r of rows) items[Number(r.i)].reuse = r.id
  }
}

async function planFor(pg, items) {
  const plan = { texts: items.length, slots: 0, reuseTexts: 0, reuseSlots: 0, renderTexts: 0, renderChars: 0, presentationRender: 0 }
  await attachReuse(pg, items)
  for (const it of items) {
    plan.slots += it.slots.length
    if (it.reuse) { plan.reuseTexts++; plan.reuseSlots += it.slots.length } else if (it.role === 'presentation') plan.presentationRender++
    else { plan.renderTexts++; plan.renderChars += String(it.tx || '').length }
  }
  return plan
}

async function audit(pg, db, code, cast, { withPlan = true, role = null } = {}) {
  const course = await rv.loadCourse(db, code)
  const out = classify(course, await groupedSlots(pg, code), cast)
  if (withPlan) { const items = await fixItems(pg, code, out.groups, role); out.plan = await planFor(pg, items); out.items = items }
  return out
}

/** Pure. Who to tell and how: the ledger file for one fix run. */
const ledgerFile = (code) => require('../lib/evidence-path.cjs').evidencePath(`tools/audio/voice-audit/${code}-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`)

async function fix(pg, db, code, cast, { dryRun, maxChars, limit, role }) {
  const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
  const a = await audit(pg, db, code, cast, { role })
  console.log(render(code, a))
  const file = ledgerFile(code); if (!dryRun) fs.mkdirSync(path.dirname(file), { recursive: true })
  const log = (e) => { if (!dryRun) fs.appendFileSync(file, JSON.stringify({ ...e, course: code, at: new Date().toISOString() }) + '\n') }
  let ev = null
  const event = async () => ev || (ev = await recordContentEdit(db, { identity: serviceIdentity('voice-audit-53'), courseCode: code, surface: 'tools:audio/voice-audit', operation: 'update', detail: { why: 'job #53: slots moved to the resolveVoice voice', ledger: file } }))
  let moved = 0, unbumped = 0, spent = 0, rendered = 0, reused = 0, refused = 0, skipped = 0
  const bump = async () => { if (dryRun || !unbumped) return; const v = await bumpCourseVersion(db, code, 'patch'); if (!v) throw new Error(`content_version bump failed for ${code}`); log({ kind: 'bumped', v }); unbumped = 0 }
  const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
  try {
    for (const it of a.items.slice(0, limit)) {
      let to = it.reuse, how = 'reuse'
      if (!to) {
        if (it.role === 'presentation' || spent + String(it.tx).length > maxChars) { skipped++; continue }
        if (dryRun) { rendered++; spent += String(it.tx).length; continue }
        const res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'voice-audit-53' },
          body: JSON.stringify({ courseCode: code, role: it.role, text: it.tx, language: it.language, voiceId: it.voice, voiceBound: true, purpose: `voice-audit: ${it.role} slot to its resolveVoice voice` }) })
        const r = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
        if (!res.ok || !r.ok) { log({ kind: 'refused', t: it.t, r }); console.log('RENDER REFUSED — stopping (a refusal is the answer, never retried):', JSON.stringify(r).slice(0, 300)); break }
        const { rows: [ca] } = await pg.query(`select id::text, voice_id, s3_key, duration_ms from course_audio ca where id = $1 and ${usable('ca')}`, [r.audioId])
        if (!ca || !rv.sameVoice(ca.voice_id, it.voice)) { log({ kind: 'verify-failed', t: it.t, r, ca }); console.log('VERIFY FAILED — stopping:', it.tx); break }
        to = ca.id; how = r.source === 'library' ? 'reuse' : 'render'; spent += r.charsSpent || 0
      }
      if (dryRun) { moved += it.slots.length; how === 'reuse' ? reused++ : rendered++; continue }
      log({ kind: 'intent', to, how, t: it.t, slots: it.slots })   // write-ahead: undo reads this
      const done = []
      for (const s of it.slots) {
        try { if (await rv.setSlotPointer(db, { tbl: s.tbl, key: s.key, col: s.col, from: s.from, to, courseCode: code, editEventId: await event() })) { done.push(s); moved++; unbumped++ } }
        catch (e) { if (e.code !== 'VOICE_POLICY') throw e; refused++; console.log('REFUSED by resolveVoice:', e.message) }
      }
      log({ kind: 'swap', to, slots: done }); how === 'reuse' ? reused++ : rendered++
      if (unbumped >= 100) await bump()
    }
  } finally { await bump() }
  const line = `${code} fix${dryRun ? ' (dry run)' : ''}: ${moved} slots ${dryRun ? 'would move' : 'moved'} — ${reused} texts reused, ${rendered} rendered (${spent} chars), ${skipped} left (no budget / intro tooling), ${refused} refused${dryRun ? '' : `; undo: node tools/audio/voice-audit.cjs --undo ${file}`}`
  console.log(line)
  return { moved, reused, rendered, spent, skipped, refused, ledger: dryRun ? null : file }
}

async function undo(pg, db, file, { dryRun }) {
  const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)
  const courses = new Set(); let back = 0, left = 0
  // Write-ahead: an `intent` is logged before its slots move, a `swap` after. A crash between them leaves
  // moved slots with no swap entry, so undo reads intents too; the col === to before-check below makes a
  // slot that never moved (or moved on since) a no-op. Where a swap exists it repeats its intent: skip it.
  const swapped = new Set(rows.filter((r) => r.kind === 'swap').map((r) => `${r.to}|${JSON.stringify(r.slots.map((s) => s.key))}`))
  const entries = rows.filter((r) => r.kind === 'swap' || (r.kind === 'intent' && !swapped.has(`${r.to}|${JSON.stringify(r.slots.map((s) => s.key))}`)))
  for (const e of entries.reverse()) for (const s of e.slots) {
    if (dryRun) { back++; continue }
    // a RESTORE of the ledgered before-state: the before-check (still on `to`) keeps someone else's later edit safe
    const { data, error } = await db.from(s.tbl).update({ [s.col]: s.from }).eq('id', s.key).eq(s.col, e.to).select('id')
    if (error) throw new Error(error.message)
    if (data && data.length === 1) { back++; courses.add(s.course) } else left++
  }
  if (!dryRun) { for (const c of courses) await bumpCourseVersion(db, c, 'patch'); fs.appendFileSync(file, JSON.stringify({ kind: 'undone', back, left, at: new Date().toISOString() }) + '\n') }
  console.log(`undo${dryRun ? ' (dry run)' : ''}: ${back} slots ${dryRun ? 'would go' : 'went'} back, ${left} left (changed since by someone else)`)
}

async function main(argv = process.argv.slice(2)) {
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }, has = (f) => argv.includes(f)
  const { pg, db } = await connect()
  try {
    if (has('--undo')) return await undo(pg, db, opt('--undo'), { dryRun: has('--dry-run') })
    const cast = await rv.loadCast(db)
    const codes = has('--premium11') ? PREMIUM_11 : String(opt('--course', '')).split(',').filter(Boolean)
    if (!codes.length) throw new Error('name --course <code>[,<code>] or --premium11')
    if (has('--fix')) {
      if (codes.length !== 1) throw new Error('--fix runs one course at a time')
      return await fix(pg, db, codes[0], cast, { dryRun: has('--dry-run'), maxChars: Number(opt('--max-chars', 0)), limit: Number(opt('--limit', 1e9)), role: opt('--role', null) })
    }
    const all = {}
    for (const code of codes) {
      const a = await audit(pg, db, code, cast, { role: opt('--role', null) })
      delete a.items
      all[code] = a
      if (!has('--json')) console.log(render(code, a))
    }
    if (has('--json')) console.log(JSON.stringify(all, null, 1))
    return all
  } finally { await pg.end() }
}

if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(1) })
module.exports = { classify, render, audit, undo, connect, main, PREMIUM_11, SLOT_COLUMNS }
