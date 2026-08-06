#!/usr/bin/env node
/**
 * audio-link-reconcile.cjs — the standing audio LINK reconciliation tool.
 *
 * WHY THIS EXISTS. A slot reported as "missing audio" is very often not missing
 * at all: the `course_audio` row exists, is alive, and is simply not LINKED to
 * the content row. Re-linking it costs nothing and generates nothing. In
 * `ara_lb_for_eng` that was 1,324 slots. Tom's ruling (2026-08-05): "audio can
 * get unlinked from time to time ... but the audio is still there ... it's
 * probably better to have a system that plays Azure until better voices are
 * available in lieu of nothing".
 *
 * WHOLE COURSE, always. The Script Viewer's missing-audio filter only sees the
 * current batch of 20 rounds; this walks every seed, lego and phrase.
 *
 * COMPLETENESS IS PER-ROLE, NOT PER-CLIP (Tom, 2026-08-06). A LEGO needs ALL
 * THREE of intro + target voice 1 + target voice 2. Short of that the player
 * drops the LEGO, which drops its whole round, and every later LEGO that was
 * contingent on it breaks downstream — so a LEGO gap is COURSE-BREAKING and a
 * practice-phrase gap is cosmetic. The report leads with the LEGO verdict and
 * the re-link pass writes LEGOs before cycles. See `legoVerdict()`.
 *
 * THE FOUR BUCKETS, per slot (a slot = one content row × one audio role):
 *   (a) LINKED             — link set and the course_audio row is alive
 *   (b) UNLINKED-BUT-PRESENT — link NULL but a matching alive row exists.
 *                            FREE to recover. Split into two sub-buckets that
 *                            are deliberately kept distinct (see NORMALISERS):
 *                              strict — matches under the canonical JS key
 *                              loose  — matches only under the punctuation-
 *                                       insensitive key
 *   (c) ABSENT             — nothing matches. This is the only bucket that
 *                            implies TTS spend, and this tool NEVER spends:
 *                            queue it via tools/course-optimization/queue-audio-pass.cjs
 *   (d) DANGLING           — link set but points at a course_audio row that no
 *                            longer exists. `course_legos.presentation_audio_id`
 *                            and `course_practice_phrases.presentation_audio_id`
 *                            have NO FK, so they really do dangle (ara_lb: 305).
 *                            Reported; healed only if a replacement is findable.
 *
 * NORMALISERS — three of them disagree in this estate, so we report on two keys:
 *   DB    normalize_text(t) = rtrim(lower(trim(t)), '.?!¿¡。？！')  → writes text_normalized
 *   JS    normalizeForAudio(t) (services/shared/text-normalize.cjs) — collapses
 *         internal whitespace, KEEPS a trailing '?'
 *   TRIG  link_audio_to_content matches lower(trim(content_text)) against
 *         text_normalized — strips nothing at all
 * Because those disagree, a slot can be unlinked purely as an artefact of which
 * normaliser ran. We therefore compute BOTH keys from the RAW text on both
 * sides (content_text and course_audio.text), never from the stored
 * text_normalized, so the report is independent of which normaliser wrote it:
 *   strict = normalizeForAudio()                      (canonical; keeps '?')
 *   loose  = strict, plus trailing ? ？ ¿ ¡ stripped  (punctuation-insensitive)
 *
 * PRESENTATION is keyed differently: presentation clips carry `lego_id` and
 * their text is English boilerplate ("The Arabic for: 'next', is:"), so they are
 * matched on (course_code, role='presentation', lego_id), never on text.
 *
 * RE-LINK PASS (--apply). Make-before-break, per
 * docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b:
 *   · only ever writes a link where the column IS NULL
 *   · never deletes audio, never unlinks, never overwrites a live link
 *   · DRY RUN by default; --apply is required to write
 *   · per-row before-state assertion in the UPDATE's WHERE clause; a zero-row
 *     update means the row drifted under us and ABORTS the whole pass
 *   · per-row log to docs/audio-relink-{dryrun,applied}-log.json
 *   · re-runs the report afterwards and reconciles it against the log exactly
 *
 * Which course_audio row wins when several match is NOT decided here: that is
 * services/shared/audio-link-preference.cjs `pickPreferredAudioRow` (human >
 * newest > larger id), so repeated passes are deterministic and human
 * recordings always win. The whole choice is isolated in `resolveSlot()` below
 * so it can be swapped for services/shared/audio-fallback-resolver.cjs when
 * that lands — it did not exist when this was written.
 *
 * Usage:
 *   node tools/audio-link-reconcile.cjs <course_code>          # report, whole course
 *   node tools/audio-link-reconcile.cjs --all                  # report, every course
 *   node tools/audio-link-reconcile.cjs <course_code> --json   # machine-readable
 *   node tools/audio-link-reconcile.cjs <course_code> --apply  # heal bucket (b)
 *   node tools/audio-link-reconcile.cjs --all --dry-run        # explicit no-op default
 *
 * Flags:
 *   --json          emit JSON instead of the human summary
 *   --apply         actually write the links (default is DRY RUN)
 *   --include-loose heal loose-key (trailing-?) matches too — OFF by default
 *   --verify-storage  HEAD every candidate object in S3 before promising a free
 *                     link (always on under --apply)
 *   --log <path>    override the log file path
 *
 * Read-only unless --apply. Never generates TTS. Never deletes anything.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { pickPreferredAudioRow } = require('../services/shared/audio-link-preference.cjs')
const { normalizeForAudio } = require('../services/shared/text-normalize.cjs')

const ROOT = path.join(__dirname, '..')
require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true })
const DATABASE_URL = (() => {
  const raw = fs.readFileSync(path.join(ROOT, '.env.psql'), 'utf8')
  const url = (raw.match(/postgresql:\/\/[^\s"']+/) || [])[0]
  if (!url) { console.error('no DATABASE_URL in .env.psql'); process.exit(1) }
  return url
})()

// ── keys ────────────────────────────────────────────────────────────────────
const strictKey = (t) => normalizeForAudio(t)
const looseKey = (t) => normalizeForAudio(t).replace(/[?？¿¡]+$/, '')

// ── storage check (opt-in) ──────────────────────────────────────────────────
// A course_audio row is a CLAIM about audio; only the bucket settles it. Without
// --verify-storage this tool reports on DB rows alone, which can promise a free
// re-link to an object that is gone (the fra_for_eng 08-03 purge left exactly
// that shape: rows deleted, S3 objects orphaned). Mirrors phase8's
// s3ObjectExists: null means "could not ask", never "missing".
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
let s3 = null
async function s3ObjectExists(s3Key) {
  if (!s3Key || s3Key.startsWith('pending/')) return false
  if (!s3) {
    const { S3Client } = require('@aws-sdk/client-s3')
    s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1', maxAttempts: 4 })
  }
  const { HeadObjectCommand } = require('@aws-sdk/client-s3')
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }))
    return true
  } catch (e) {
    const status = e?.$metadata?.httpStatusCode
    if (status === 404 || e?.name === 'NotFound' || e?.name === 'NoSuchKey') return false
    return null
  }
}

// ── slot definitions: which table/column pairs carry audio links ────────────
// `text` names the content column the audio text is matched against; a null
// `text` means the slot is keyed on lego_id (presentation).
const SLOTS = [
  { table: 'course_seeds', role: 'known', col: 'known_audio_id', text: 'known_text', lang: 'known' },
  { table: 'course_seeds', role: 'target1', col: 'target1_audio_id', text: 'target_text', lang: 'target' },
  { table: 'course_seeds', role: 'target2', col: 'target2_audio_id', text: 'target_text', lang: 'target' },
  { table: 'course_legos', role: 'known', col: 'known_audio_id', text: 'known_text', lang: 'known' },
  { table: 'course_legos', role: 'target1', col: 'target1_audio_id', text: 'target_text', lang: 'target', dur: 'target1_duration_ms' },
  { table: 'course_legos', role: 'target2', col: 'target2_audio_id', text: 'target_text', lang: 'target', dur: 'target2_duration_ms' },
  { table: 'course_legos', role: 'presentation', col: 'presentation_audio_id', text: null, lang: 'known' },
  { table: 'course_practice_phrases', role: 'known', col: 'known_audio_id', text: 'known_text', lang: 'known' },
  { table: 'course_practice_phrases', role: 'target1', col: 'target1_audio_id', text: 'target_text', lang: 'target', dur: 'target1_duration_ms' },
  { table: 'course_practice_phrases', role: 'target2', col: 'target2_audio_id', text: 'target_text', lang: 'target', dur: 'target2_duration_ms' },
  // Reported, never healed. A phrase's presentation_audio_id has no established
  // provenance (in ara_lb all 305 of them dangle) and no text key of its own, so
  // this tool will not invent one. HEAL_EXCLUDE below enforces that.
  { table: 'course_practice_phrases', role: 'presentation', col: 'presentation_audio_id', text: null, lang: 'known' },
]
const HEAL_EXCLUDE = new Set(['course_practice_phrases:presentation'])
const slotKey = (s) => `${s.table}:${s.role}`

const CONTENT_COLS = {
  course_seeds: 'id, seed_number, seed_id AS ref, known_text, target_text, NULL::text AS lego_id, known_audio_id, target1_audio_id, target2_audio_id, NULL::uuid AS presentation_audio_id, NULL::int AS target1_duration_ms, NULL::int AS target2_duration_ms',
  course_legos: 'id, seed_number, lego_id AS ref, known_text, target_text, lego_id, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms',
  course_practice_phrases: 'id, seed_number, id::text AS ref, known_text, target_text, lego_id, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, target1_duration_ms, target2_duration_ms',
}

// ── LEGO COMPLETENESS — the ruling that outranks slot counting ──────────────
// Tom, 2026-08-06: "completeness is per-ROLE, not per-clip". A LEGO is only
// playable when ALL THREE of its clips are present:
//
//     INTRO (the presentation of the LEGO) + target VOICE 1 + target VOICE 2
//
// Missing ANY of the three is COURSE-BREAKING, not cosmetic: the player drops
// the LEGO, which drops its whole round, and because the methodology makes
// every later LEGO contingent on the ones already introduced, the break
// propagates downstream. A gap in a cycle/practice phrase is minor by
// comparison — the round still plays.
//
// Corollary, and the reason this is coded as its own function: any verdict
// built on `hasAudio = prompt + voice 1` is WRONG for a LEGO and flatters the
// course. The KNOWN-side clip is not part of the triple; a voice-2-only gap is
// blocking on its own.
const LEGO_TRIPLE = { presentation: 'intro', target1: 'voice1', target2: 'voice2' }
const TRIPLE_PARTS = ['intro', 'voice1', 'voice2']

/**
 * legoVerdict — classify one LEGO from its triple of slot statuses.
 *   complete       all three already linked and alive → plays today
 *   free_strict    every gap has a strict-key clip waiting → free to fix, now
 *   free_loose     ditto but at least one gap needs a loose match (opt-in)
 *   broken         at least one clip does not exist → COURSE-BREAKING, TTS
 * `missing` names which of intro/voice1/voice2 are not yet linked.
 */
function legoVerdict(state) {
  const st = (p) => state[p] || 'absent'
  const missing = TRIPLE_PARTS.filter((p) => st(p) !== 'linked')
  if (!missing.length) return { verdict: 'complete', missing }
  const kinds = missing.map(st)
  if (kinds.every((k) => k === 'strict')) return { verdict: 'free_strict', missing }
  if (kinds.every((k) => k === 'strict' || k === 'loose')) return { verdict: 'free_loose', missing }
  return { verdict: 'broken', missing }
}

// ── the swappable choice function ───────────────────────────────────────────
/**
 * resolveSlot — the ONLY place a link choice is made. Implements the fallback
 * chain: linked-and-alive > preferred strict match > preferred loose match >
 * none. When services/shared/audio-fallback-resolver.cjs exists, delete this
 * body and delegate to it; nothing else in this file makes a choice.
 *
 * @returns {{status:'linked'|'dangling'|'strict'|'loose'|'absent', audio?:object, candidates?:number}}
 */
function resolveSlot({ currentId, aliveIds, strictCands, looseCands }) {
  if (currentId && aliveIds.has(currentId)) return { status: 'linked' }
  const best = (rows) => (rows && rows.length ? rows.reduce((a, b) => pickPreferredAudioRow(a, b)) : null)
  const s = best(strictCands)
  if (s) return { status: currentId ? 'dangling-healable-strict' : 'strict', audio: s, candidates: strictCands.length }
  const l = best(looseCands)
  if (l) return { status: currentId ? 'dangling-healable-loose' : 'loose', audio: l, candidates: looseCands.length }
  return { status: currentId ? 'dangling' : 'absent' }
}

// ── per-course reconciliation ───────────────────────────────────────────────
async function reconcileCourse(client, course) {
  const { course_code, known_lang, target_lang } = course
  const langFor = { known: known_lang, target: target_lang }

  const audio = (await client.query(
    `SELECT id, text, language, role, origin, created_at, duration_ms, lego_id, s3_key
       FROM course_audio WHERE course_code = $1`, [course_code])).rows

  const aliveIds = new Set(audio.map((r) => r.id))
  // role → key → rows
  const strictIdx = new Map()
  const looseIdx = new Map()
  const presIdx = new Map() // lego_id → rows
  for (const r of audio) {
    if (r.role === 'presentation') {
      if (r.lego_id) (presIdx.get(r.lego_id) || presIdx.set(r.lego_id, []).get(r.lego_id)).push(r)
      continue
    }
    if (!r.text) continue
    for (const [idx, keyFn] of [[strictIdx, strictKey], [looseIdx, looseKey]]) {
      const k = `${r.role} ${keyFn(r.text)}`
      if (!idx.has(k)) idx.set(k, [])
      idx.get(k).push(r)
    }
  }

  const buckets = {}
  const relinkable = []
  const danglingRows = []
  const linkedIdsSeen = new Set()
  // Per-LEGO state for the completeness triple (see legoVerdict below).
  const legoStates = new Map()

  for (const table of Object.keys(CONTENT_COLS)) {
    const rows = (await client.query(
      `SELECT ${CONTENT_COLS[table]} FROM ${table} WHERE course_code = $1`, [course_code])).rows
    const tableSlots = SLOTS.filter((s) => s.table === table)
    for (const slot of tableSlots) {
      const b = buckets[slotKey(slot)] = { linked: 0, strict: 0, loose: 0, absent: 0, dangling: 0, dangling_healable: 0, skipped: 0 }
      for (const row of rows) {
        const currentId = row[slot.col]
        if (currentId) linkedIdsSeen.add(currentId)

        let strictCands = null, looseCands = null
        if (slot.text === null) {
          const c = row.lego_id ? presIdx.get(row.lego_id) : null
          strictCands = c || null
        } else {
          const t = row[slot.text]
          if (!t || !String(t).trim()) {
            b.skipped++
            if (table === 'course_legos' && LEGO_TRIPLE[slot.role]) {
              let st = legoStates.get(row.id)
              if (!st) legoStates.set(row.id, st = { ref: row.ref, seed_number: row.seed_number })
              st[LEGO_TRIPLE[slot.role]] = 'no-text'
            }
            continue
          }
          // Prefer candidates whose language matches the expected track; fall
          // back to any candidate for the role (the DB trigger ignores
          // language entirely) and let the caller see it in the log.
          const pick = (idx, keyFn) => {
            const all = idx.get(`${slot.role} ${keyFn(t)}`) || []
            const same = all.filter((r) => r.language === langFor[slot.lang])
            return same.length ? same : all
          }
          strictCands = pick(strictIdx, strictKey)
          looseCands = pick(looseIdx, looseKey).filter((r) => !strictCands.includes(r))
        }

        const res = resolveSlot({ currentId, aliveIds, strictCands, looseCands })
        if (table === 'course_legos' && LEGO_TRIPLE[slot.role]) {
          let st = legoStates.get(row.id)
          if (!st) legoStates.set(row.id, st = { ref: row.ref, seed_number: row.seed_number })
          st[LEGO_TRIPLE[slot.role]] = res.status
        }
        if (res.status === 'linked') { b.linked++; continue }
        if (res.status === 'absent') { b.absent++; continue }
        if (res.status === 'dangling') { b.dangling++; danglingRows.push({ course_code, table, row_id: row.id, ref: row.ref, column: slot.col, dangling_id: currentId, healable: false }); continue }
        if (res.status.startsWith('dangling-healable')) {
          b.dangling++; b.dangling_healable++
          danglingRows.push({ course_code, table, row_id: row.id, ref: row.ref, column: slot.col, dangling_id: currentId, healable: true, would_be: res.audio.id })
          continue // never overwrite an existing value in this pass — report only
        }
        b[res.status]++
        if (!HEAL_EXCLUDE.has(slotKey(slot))) {
          relinkable.push({
            course_code, table, row_id: row.id, ref: row.ref, seed_number: row.seed_number,
            column: slot.col, role: slot.role, match: res.status, candidates: res.candidates,
            key: slot.text === null ? `lego:${row.lego_id}` : strictKey(row[slot.text]),
            audio_id: res.audio.id, audio_origin: res.audio.origin, s3_key: res.audio.s3_key,
            audio_language: res.audio.language, expected_language: langFor[slot.lang],
            duration_col: slot.dur || null, duration_ms: res.audio.duration_ms ?? null,
          })
        }
      }
    }
  }

  // Distinguish a truly-dead id from a link that points into another course.
  const unknown = [...linkedIdsSeen].filter((id) => !aliveIds.has(id))
  const crossCourse = new Set()
  for (let i = 0; i < unknown.length; i += 1000) {
    const chunk = unknown.slice(i, i + 1000)
    const r = await client.query('SELECT id FROM course_audio WHERE id = ANY($1::uuid[])', [chunk])
    r.rows.forEach((x) => crossCourse.add(x.id))
  }
  for (const d of danglingRows) d.cross_course = crossCourse.has(d.dangling_id)

  // LEGO rollup — the course-breaking verdict, computed on the triple.
  const legos = { total: legoStates.size, complete: 0, free_strict: 0, free_loose: 0, broken: 0,
                  missing_intro: 0, missing_voice1: 0, missing_voice2: 0,
                  // A LEGO whose voices are both live and which is blocked ONLY
                  // by a missing intro is the cheapest possible round rescue —
                  // one clip (and its authored text) buys back a whole round.
                  broken_intro_only: 0, broken_voices_only: 0, broken_refs: [] }
  for (const st of legoStates.values()) {
    const v = legoVerdict(st)
    legos[v.verdict]++
    if (v.verdict !== 'complete') {
      if (v.missing.includes('intro')) legos.missing_intro++
      if (v.missing.includes('voice1')) legos.missing_voice1++
      if (v.missing.includes('voice2')) legos.missing_voice2++
    }
    if (v.verdict === 'broken') {
      if (v.missing.length === 1 && v.missing[0] === 'intro') legos.broken_intro_only++
      else if (!v.missing.includes('intro')) legos.broken_voices_only++
    }
    if (v.verdict === 'broken' && legos.broken_refs.length < 50) {
      legos.broken_refs.push({ lego: st.ref, seed: st.seed_number, missing: v.missing })
    }
  }

  return { course_code, known_lang, target_lang, audio_rows: audio.length, buckets, legos, relinkable, dangling: danglingRows }
}

// ── the re-link pass ────────────────────────────────────────────────────────
async function applyRelink(client, items) {
  const applied = []
  for (const it of items) {
    const sets = [`${it.column} = $1`]
    const params = [it.audio_id, it.row_id]
    if (it.duration_col && it.duration_ms != null) { sets.push(`${it.duration_col} = $3`); params.push(it.duration_ms) }
    // BEFORE-STATE ASSERTION: the column must still be NULL. If it is not, the
    // row drifted under us — abort the whole pass rather than write over it.
    const r = await client.query(
      `UPDATE ${it.table} SET ${sets.join(', ')} WHERE id = $2 AND ${it.column} IS NULL`, params)
    if (r.rowCount !== 1) {
      const err = new Error(`DRIFT: ${it.table}.${it.column} row ${it.row_id} was not NULL at write time (rowCount=${r.rowCount}). Aborting after ${applied.length} writes.`)
      err.applied = applied
      throw err
    }
    applied.push(it)
  }
  return applied
}

// ── reporting ───────────────────────────────────────────────────────────────
function totals(result) {
  const t = { linked: 0, strict: 0, loose: 0, absent: 0, dangling: 0, dangling_healable: 0, skipped: 0 }
  for (const b of Object.values(result.buckets)) for (const k of Object.keys(t)) t[k] += b[k]
  return t
}

function printCourse(result) {
  const t = totals(result)
  const free = t.strict + t.loose
  console.log(`\n━━ ${result.course_code}  (${result.known_lang} → ${result.target_lang}, ${result.audio_rows} audio rows)`)
  const pad = (s, n) => String(s).padStart(n)
  // LEGOs lead. A broken LEGO drops its whole round and everything downstream
  // that depends on it; a phrase gap is cosmetic by comparison.
  const L = result.legos
  console.log(`  LEGOs (intro + voice1 + voice2 — all three or the round dies)`)
  console.log(`    complete ${L.complete}/${L.total}`
    + `   free to fix ${L.free_strict}${L.free_loose ? ` (+${L.free_loose} loose)` : ''}`
    + `   COURSE-BREAKING ${L.broken}`)
  if (L.broken) {
    console.log(`    missing by part — intro ${L.missing_intro}  voice1 ${L.missing_voice1}  voice2 ${L.missing_voice2}`)
    console.log(`    blocked ONLY on the intro: ${L.broken_intro_only}   (cheapest round rescue in the course)`)
  }
  console.log('  slot                                  linked   strict    loose   absent  dangling')
  for (const s of SLOTS) {
    const b = result.buckets[slotKey(s)]
    if (!b) continue
    const heal = HEAL_EXCLUDE.has(slotKey(s)) ? '  (report only)' : ''
    console.log(`  ${slotKey(s).padEnd(36)}${pad(b.linked, 7)}${pad(b.strict, 9)}${pad(b.loose, 9)}${pad(b.absent, 9)}${pad(b.dangling, 10)}${heal}`)
  }
  console.log(`  ${'TOTAL'.padEnd(36)}${pad(t.linked, 7)}${pad(t.strict, 9)}${pad(t.loose, 9)}${pad(t.absent, 9)}${pad(t.dangling, 10)}`)
  console.log(`  (b) UNLINKED-BUT-PRESENT = ${free} slots recoverable for free  (${t.strict} strict + ${t.loose} loose)`)
  console.log(`  (c) TRULY ABSENT         = ${t.absent} slots — needs TTS; queue, never spend here`)
  console.log(`  (d) DANGLING             = ${t.dangling} links to a dead course_audio row (${t.dangling_healable} have a findable replacement)`)
  if (t.skipped) console.log(`      ${t.skipped} slots skipped (content text empty)`)
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2)
  const flag = (f) => argv.includes(f)
  const ALL = flag('--all')
  const JSON_OUT = flag('--json')
  const APPLY = flag('--apply')
  // Loose matches are OPT-IN, and deliberately so. A loose match is a slot whose
  // text differs from the clip's only in trailing ? — e.g. the chunk "what"
  // against the clip "what?". The estate keeps those apart on purpose (a '?'
  // changes TTS intonation), and a link, once written, is permanent in practice:
  // every relink path only ever fills a NULL, so a correct clip rendered later
  // would never displace it. Free recovery must not quietly become a downgrade.
  const INCLUDE_LOOSE = flag('--include-loose')
  const VERIFY_STORAGE = flag('--verify-storage')
  const logOverride = argv.includes('--log') ? argv[argv.indexOf('--log') + 1] : null
  const courseArg = argv.find((a) => !a.startsWith('--') && a !== logOverride)

  if (!ALL && !courseArg) {
    console.error('usage: node tools/audio-link-reconcile.cjs <course_code> [--json] [--apply] [--include-loose] [--verify-storage] [--log <path>]')
    console.error('       node tools/audio-link-reconcile.cjs --all [--json]')
    process.exit(1)
  }
  if (ALL && APPLY) {
    console.error('refusing: --all --apply is a mass write. Run per course, report, and let the lead decide.')
    process.exit(1)
  }

  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const courses = (await client.query(
      ALL ? 'SELECT course_code, known_lang, target_lang FROM courses ORDER BY course_code'
          : 'SELECT course_code, known_lang, target_lang FROM courses WHERE course_code = $1',
      ALL ? [] : [courseArg])).rows
    if (!courses.length) { console.error(`no such course: ${courseArg}`); process.exit(1) }

    const results = []
    for (const c of courses) {
      const r = await reconcileCourse(client, c)
      results.push(r)
      if (!JSON_OUT) printCourse(r)
    }

    // LEGOs before cycles, always (Tom 2026-08-06). If a pass ever aborts on
    // drift part-way, the writes that already landed are the ones that unblock
    // rounds, not the ones that polish practice phrases.
    const PRIORITY = { course_legos: 0, course_seeds: 1, course_practice_phrases: 2 }
    let items = results.flatMap((r) => r.relinkable)
      .sort((a, b) => (PRIORITY[a.table] - PRIORITY[b.table]) || (a.seed_number - b.seed_number))
    const looseCount = items.filter((i) => i.match === 'loose').length
    if (!INCLUDE_LOOSE) items = items.filter((i) => i.match === 'strict')

    // Storage gate: never promise (or write) a free re-link to an object the
    // bucket does not have. HEAD once per distinct key, not once per slot.
    let storageBroken = 0
    if (VERIFY_STORAGE || APPLY) {
      const verdicts = new Map()
      const keys = [...new Set(items.map((i) => i.s3_key).filter(Boolean))]
      for (let i = 0; i < keys.length; i += 20) {
        const chunk = keys.slice(i, i + 20)
        const res = await Promise.all(chunk.map((k) => s3ObjectExists(k)))
        chunk.forEach((k, j) => verdicts.set(k, res[j]))
      }
      const before = items.length
      items = items.filter((i) => verdicts.get(i.s3_key) !== false)
      storageBroken = before - items.length
      if (!JSON_OUT && keys.length) {
        console.log(`\n  storage check: ${keys.length} distinct objects HEADed — ${storageBroken} slot(s) dropped (object gone; that is real missing audio, not a free link)`)
      }
    }

    const mode = APPLY ? 'applied' : 'dryrun'
    const logPath = logOverride || path.join(ROOT, 'docs', `audio-relink-${mode}-log.json`)

    let appliedItems = []
    let abortError = null
    if (APPLY) {
      try { appliedItems = await applyRelink(client, items) }
      catch (e) { abortError = e; appliedItems = e.applied || [] }
    }

    const logged = APPLY ? appliedItems : items
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.writeFileSync(logPath, JSON.stringify({
      mode, courses: courses.map((c) => c.course_code), include_loose: INCLUDE_LOOSE,
      loose_held_back: INCLUDE_LOOSE ? 0 : looseCount,
      count: logged.length, storage_broken_dropped: storageBroken,
      aborted: abortError ? abortError.message : null, rows: logged,
    }, null, 1))

    // EXACT RECONCILE — re-run the report and prove the residue equals the log.
    let reconcile = null
    if (APPLY) {
      const after = []
      for (const c of courses) after.push(await reconcileCourse(client, c))
      const sum = (rs) => rs.map(totals).reduce((a, b) => { for (const k of Object.keys(a)) a[k] += b[k]; return a }, { linked: 0, strict: 0, loose: 0, absent: 0, dangling: 0, dangling_healable: 0, skipped: 0 })
      const b4 = sum(results), af = sum(after)
      reconcile = {
        linked_before: b4.linked, linked_after: af.linked, linked_delta: af.linked - b4.linked,
        recoverable_before: b4.strict + b4.loose, recoverable_after: af.strict + af.loose,
        recoverable_delta: (b4.strict + b4.loose) - (af.strict + af.loose),
        logged: appliedItems.length,
        absent_before: b4.absent, absent_after: af.absent,
        dangling_before: b4.dangling, dangling_after: af.dangling,
        exact: (af.linked - b4.linked) === appliedItems.length
          && ((b4.strict + b4.loose) - (af.strict + af.loose)) === appliedItems.length
          && af.absent === b4.absent,
      }
      if (!JSON_OUT) {
        console.log('\n━━ RECONCILE')
        console.log(`  linked      ${reconcile.linked_before} → ${reconcile.linked_after}  (+${reconcile.linked_delta})`)
        console.log(`  recoverable ${reconcile.recoverable_before} → ${reconcile.recoverable_after}  (-${reconcile.recoverable_delta})`)
        console.log(`  logged writes: ${reconcile.logged}`)
        console.log(`  absent unchanged: ${reconcile.absent_before} → ${reconcile.absent_after}`)
        console.log(`  EXACT: ${reconcile.exact ? 'YES — residue equals the log, nothing new' : 'NO — investigate before trusting this run'}`)
      }
    }

    if (JSON_OUT) {
      console.log(JSON.stringify({ mode, results: results.map((r) => ({ ...r, relinkable: undefined, dangling: r.dangling.length })), recoverable: items.length, log: logPath, reconcile }, null, 1))
    } else {
      const g = results.map(totals).reduce((a, b) => { for (const k of Object.keys(a)) a[k] += b[k]; return a }, { linked: 0, strict: 0, loose: 0, absent: 0, dangling: 0, dangling_healable: 0, skipped: 0 })
      const GL = results.reduce((a, r) => { for (const k of Object.keys(a)) a[k] += r.legos[k]; return a },
        { total: 0, complete: 0, free_strict: 0, free_loose: 0, broken: 0, missing_intro: 0, missing_voice1: 0, missing_voice2: 0, broken_intro_only: 0, broken_voices_only: 0 })
      console.log(`\n━━ ESTATE TOTAL over ${results.length} course(s)`)
      console.log(`  LEGO COMPLETENESS (intro + voice1 + voice2) — course-breaking when short`)
      console.log(`    complete ${GL.complete}/${GL.total}   free to fix ${GL.free_strict} (+${GL.free_loose} loose)   BROKEN ${GL.broken}`)
      console.log(`    of the incomplete: missing intro ${GL.missing_intro}  voice1 ${GL.missing_voice1}  voice2 ${GL.missing_voice2}`)
      console.log(`    blocked ONLY on the intro: ${GL.broken_intro_only}   |   blocked only on voices: ${GL.broken_voices_only}`)
      console.log(`  ── slot counts below; phrase/cycle gaps are cosmetic beside the line above ──`)
      console.log(`  (a) LINKED               ${g.linked}`)
      console.log(`  (b) UNLINKED-BUT-PRESENT ${g.strict + g.loose}   (${g.strict} strict + ${g.loose} loose)  ← free`)
      // The gap between (b) and what this pass will actually write is entirely
      // the report-only slots (phrase presentation) plus loose matches held
      // back. Say so, rather than letting a big (b) imply a big free win.
      const reportOnly = (g.strict + g.loose) - items.length - (INCLUDE_LOOSE ? 0 : looseCount)
      console.log(`      of which this pass would write ${items.length}`
        + (reportOnly > 0 ? `; ${reportOnly} are report-only (${[...HEAL_EXCLUDE].join(', ')})` : '')
        + (!INCLUDE_LOOSE && looseCount ? `; ${looseCount} loose held back (pass --include-loose)` : ''))
      console.log(`  (c) TRULY ABSENT         ${g.absent}   ← TTS spend; queue-audio-pass, never render here`)
      console.log(`  (d) DANGLING             ${g.dangling}   (${g.dangling_healable} healable)`)
      console.log(`\n  mode: ${APPLY ? 'APPLIED' : 'DRY RUN (default) — pass --apply to write'}`)
      console.log(`  log:  ${logPath}  (${logged.length} rows)`)
    }
    if (abortError) { console.error(`\n${abortError.message}`); process.exit(2) }
  } finally {
    await client.end()
  }
}

// Exported for the unit tests; the DB work only runs when this is the entry
// point, so requiring the module never touches the estate.
module.exports = { strictKey, looseKey, resolveSlot, legoVerdict, LEGO_TRIPLE, TRIPLE_PARTS, SLOTS, HEAL_EXCLUDE }

if (require.main === module) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
}
