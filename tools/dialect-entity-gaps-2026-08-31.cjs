#!/usr/bin/env node
/**
 * DIALECT ENTITY GAPS — the two courses that are a dialect and never said so,
 * and the nine that are TAUGHT FROM one and had nowhere to say it.
 *
 *   node tools/dialect-entity-gaps-2026-08-31.cjs            # DRY RUN (default)
 *   node tools/dialect-entity-gaps-2026-08-31.cjs --apply    # write
 *
 * Tom's ruling, 2026-08-31: a dialect IS its own language — its own text, its
 * own voices, its own cast. `feat(voice-cast)` (fcfa5fe26) moved the casting
 * axis onto the entity and, in doing so, found the entities that state nothing:
 *
 *   PART 1 — deu_ch_for_eng and ara_lb_for_eng are genuinely Swiss German and
 *   Lebanese Arabic and carry neither `voice_pool_key` nor a non-standard
 *   `dialect`, so a cast on plain `deu`/`ara` still reaches them today. Their
 *   siblings deu_at, ara_eg and ara_sy all carry the column; these two were
 *   simply never filled in. LIVE DEFECT.
 *
 *   PART 2 — the nine *_for_cym courses are taught FROM Welsh and there was no
 *   column in which to say WHICH Welsh. `courses.known_dialect` is that column
 *   (migration 20260831_courses_known_dialect.sql); this backfills it.
 *
 * ⚠️ NO AUDIO. This writes `app_config.pod_voice_pools` and two `courses`
 * columns. It never touches course_audio, listening_pods or S3, renders
 * nothing and deletes nothing. Modelled line for line on
 * tools/t21-variant-pool-keys.cjs — the estate's gated-write shape: before-state
 * assertions, abort on drift, idempotent re-run, exact reconcile after apply.
 *
 * ── WHERE EVERY VALUE COMES FROM ───────────────────────────────────────────
 * NOTHING HERE IS INVENTED. The pool voices are the voices these two courses
 * ALREADY SPEAK IN, counted out of course_audio on 2026-08-31, and the Welsh
 * variant is read off the courses' own seed text against the estate's own
 * labelled north/south corpora. Provenance is stated per entry below and the
 * Welsh determination re-derives itself on every run rather than trusting a
 * constant in this file.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const APPLY = process.argv.includes('--apply')
const OUT = path.resolve(__dirname, '../docs/voicelab')

// ── PART 1a: the pool entries ───────────────────────────────────────────────
// tools/pod-sync.cjs REFUSES a courses.voice_pool_key with no pod_voice_pools
// entry — "refusing to fall back, which would silently miscast" — so the pool
// must exist before the key is written, and both happen in this one run.
//
// Each voice below is the voice that course's own clips are already in, so a
// pod cast reproduces what a learner of that course hears today rather than
// introducing a voice nobody has passed by ear. Locale is omitted exactly as it
// is on every other Azure pool entry (Katja, Conrad, Amany, Laith): the voice
// id already carries the locale for Azure.
const POOL_PLAN = [
  {
    key: 'deu_ch',
    why: "Swiss German. Leni (f) + Jan (m) are the voices deu_ch_for_eng speaks in today — 1,423 target1 clips on azure_de-CH-LeniNeural and 236 target2 clips on azure_de-CH-JanNeural — and docs/deu-ch-mixed-provider-readiness-2026-08-28.md records them as picked by ear.",
    expect: null,                 // must not exist yet
    value: {
      f: [{ provider: 'azure', voice_id: 'de-CH-LeniNeural', name: 'Leni' }],
      m: [{ provider: 'azure', voice_id: 'de-CH-JanNeural', name: 'Jan' }],
    },
  },
  {
    key: 'ara_lb',
    why: "Lebanese Arabic. Layla (f) + Rami (m) are the voices ara_lb_for_eng speaks in today — 5,390 target1 clips on azure_ar-LB-LaylaNeural and 5,390 target2 on azure_ar-LB-RamiNeural, live since May. This records what the course already sounds like; it is NOT a new casting decision and does not claim Tom has passed these by ear.",
    expect: null,
    value: {
      f: [{ provider: 'azure', voice_id: 'ar-LB-LaylaNeural', name: 'Layla' }],
      m: [{ provider: 'azure', voice_id: 'ar-LB-RamiNeural', name: 'Rami' }],
    },
  },
]

// ── PART 1b: the course keys ────────────────────────────────────────────────
// Deliberately absent from tools/t21-variant-pool-keys.cjs, which said so out
// loud: "deu_ch and ara_lb are deliberately absent: they have no pool". They
// have one now.
const COURSE_POOL_KEYS = {
  deu_ch_for_eng: 'deu_ch',
  ara_lb_for_eng: 'ara_lb',
}

// ── PART 2: the known-side Welsh determination ──────────────────────────────
// Diagnostic lexemes, and they are not chosen from linguistic memory — they are
// VALIDATED on this estate's own labelled corpora on every run (see
// determineWelsh below). cym_n_for_eng must score north-only and cym_s_for_eng
// south-only, or the run aborts before it reads a single *_for_cym course.
const WELSH_MARKERS = {
  north: [/\befo\b/, /\br(ŵ|w)an\b/, /\bisio\b/, /\ballan\b/, /\bgen i\b/, /\bgynno\b/, /\bgynnon\b/, /\btaid\b/, /\bnain\b/],
  south: [/\bgyda\b/, /\bnawr\b/, /\bmoyn\b/, /\bmas\b/, /\btad-cu\b/, /\bmam-gu\b/, /\blan\b/, /\bwi'n\b/, /\brwy\b/],
}

// How lopsided the evidence must be before a variant is WRITTEN. A course that
// does not clear this stays NULL and is reported as an honest unknown, which is
// the correct output — Tom, 2026-08-31: "an honest unknown is the correct output
// for those rows."
const MIN_HITS = 20          // absolute floor: enough sentences to be a corpus
const MIN_RATIO = 0.95       // and this one-sided

function scoreWelsh(texts) {
  const hits = { north: 0, south: 0 }
  for (const raw of texts) {
    const t = String(raw || '').toLowerCase()
    for (const side of ['north', 'south']) {
      for (const re of WELSH_MARKERS[side]) if (re.test(t)) { hits[side] += 1; break }
    }
  }
  return hits
}

function verdictFor(hits) {
  const total = hits.north + hits.south
  if (total < MIN_HITS) return { variant: null, why: `only ${total} dialect-marked sentences — below the ${MIN_HITS} floor` }
  if (hits.north / total >= MIN_RATIO) return { variant: 'north', why: `${hits.north} northern vs ${hits.south} southern marked sentences` }
  if (hits.south / total >= MIN_RATIO) return { variant: 'south', why: `${hits.south} southern vs ${hits.north} northern marked sentences` }
  return { variant: null, why: `mixed: ${hits.north} northern vs ${hits.south} southern — neither side clears ${MIN_RATIO}` }
}

// Paged read: course_seeds is large and PostgREST caps a page at 1000.
async function seedTexts(courseCode, column) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('course_seeds').select(column).eq('course_code', courseCode)
      .range(from, from + 999)
    if (error) throw new Error(`read ${courseCode}.${column}: ${error.message}`)
    out.push(...data.map((r) => r[column]))
    if (data.length < 1000) return out
  }
}

/**
 * The control, run FIRST and every time. The diagnostic is only worth anything
 * if it separates the estate's own north and south courses, so it is asked to
 * do that before it is allowed to answer a question nobody knows the answer to.
 */
async function validateDiagnostic() {
  const controls = [
    { course: 'cym_n_for_eng', column: 'target_text', expect: 'north' },
    { course: 'cym_s_for_eng', column: 'target_text', expect: 'south' },
  ]
  const results = []
  for (const c of controls) {
    const hits = scoreWelsh(await seedTexts(c.course, c.column))
    const v = verdictFor(hits)
    if (v.variant !== c.expect) {
      throw new Error(`CONTROL FAILED: ${c.course} is labelled ${c.expect} in courses.dialect but the marker set reads "${v.variant}" (${v.why}). The diagnostic is not trustworthy; nothing written.`)
    }
    results.push({ ...c, hits, verdict: v })
  }
  return results
}

async function main() {
  const log = { at: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', pools: [], poolKeys: [], control: [], welsh: [] }

  // ---- PART 1: pools ------------------------------------------------------
  const { data: cfg, error: cfgErr } = await supabase
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (cfgErr) throw new Error(`load pod_voice_pools: ${cfgErr.message}`)
  const pools = cfg.value
  const next = JSON.parse(JSON.stringify(pools))

  for (const p of POOL_PLAN) {
    const live = pools[p.key]
    if (live && canon(live) === canon(p.value)) {
      next[p.key] = p.value
      log.pools.push({ key: p.key, why: p.why, skipped: 'already applied', after: p.value })
      continue
    }
    if (p.expect === null && live) {
      throw new Error(`DRIFT: pool "${p.key}" already exists with a different value — this plan assumed it did not. Nothing written.`)
    }
    next[p.key] = p.value
    log.pools.push({ key: p.key, why: p.why, before: live || null, after: p.value })
  }

  const poolCodes = Object.keys(COURSE_POOL_KEYS)
  const { data: poolCourses, error: pcErr } = await supabase
    .from('courses').select('course_code, target_lang, known_lang, voice_pool_key, dialect').in('course_code', poolCodes)
  if (pcErr) throw new Error(`load courses: ${pcErr.message}`)
  const byCode = new Map((poolCourses || []).map((c) => [c.course_code, c]))

  for (const code of poolCodes) {
    const row = byCode.get(code)
    if (!row) throw new Error(`DRIFT: course ${code} does not exist. Nothing written.`)
    const want = COURSE_POOL_KEYS[code]
    if (!next[want]) throw new Error(`DRIFT: ${code} wants pool "${want}", absent even after the pool plan. Nothing written.`)
    if (row.voice_pool_key === want) { log.poolKeys.push({ course_code: code, skipped: 'already set', voice_pool_key: want }); continue }
    if (row.voice_pool_key != null) throw new Error(`DRIFT: ${code} already carries voice_pool_key "${row.voice_pool_key}", plan wanted "${want}". Nothing written.`)
    log.poolKeys.push({ course_code: code, target_lang: row.target_lang, before: null, after: want })
  }

  // ---- PART 2: the Welsh known side ---------------------------------------
  log.control = (await validateDiagnostic()).map((c) => ({ course: c.course, expected: c.expect, hits: c.hits, read: c.verdict }))

  const { data: cymCourses, error: cymErr } = await supabase
    .from('courses').select('course_code, known_lang, known_dialect').eq('known_lang', 'cym')
  if (cymErr) throw new Error(`load *_for_cym courses: ${cymErr.message}. Has migration 20260831_courses_known_dialect.sql been applied?`)

  for (const c of (cymCourses || []).sort((a, b) => a.course_code.localeCompare(b.course_code))) {
    const hits = scoreWelsh(await seedTexts(c.course_code, 'known_text'))
    const v = verdictFor(hits)
    const entry = { course_code: c.course_code, hits, evidence: v.why, before: c.known_dialect ?? null, after: v.variant }
    if (c.known_dialect != null && c.known_dialect !== v.variant) {
      throw new Error(`DRIFT: ${c.course_code}.known_dialect is already "${c.known_dialect}", the text reads "${v.variant}". A human ruling beats a text read — resolve by hand. Nothing written.`)
    }
    if (c.known_dialect != null) entry.skipped = 'already set'
    if (v.variant === null) entry.skipped = 'UNKNOWN — left null deliberately'
    log.welsh.push(entry)
  }

  // ---- write --------------------------------------------------------------
  if (APPLY) {
    const { error: upErr } = await supabase
      .from('app_config').update({ value: next }).eq('key', 'pod_voice_pools')
    if (upErr) throw new Error(`write pod_voice_pools: ${upErr.message}`)

    for (const c of log.poolKeys) {
      if (c.skipped) continue
      const { error } = await supabase.from('courses').update({ voice_pool_key: c.after }).eq('course_code', c.course_code)
      if (error) throw new Error(`write ${c.course_code}: ${error.message}`)
    }
    for (const w of log.welsh) {
      if (w.skipped || w.after == null) continue
      const { error } = await supabase.from('courses').update({ known_dialect: w.after }).eq('course_code', w.course_code)
      if (error) throw new Error(`write ${w.course_code}.known_dialect: ${error.message}`)
    }

    // ---- re-read and reconcile, exactly -----------------------------------
    const { data: after } = await supabase.from('app_config').select('value').eq('key', 'pod_voice_pools').single()
    for (const p of log.pools) {
      if (canon(after.value[p.key]) !== canon(p.after)) {
        throw new Error(`RECONCILE FAILED: pool "${p.key}" is not what was logged`)
      }
    }
    const { data: afterCourses } = await supabase
      .from('courses').select('course_code, voice_pool_key, known_dialect')
      .in('course_code', [...poolCodes, ...log.welsh.map((w) => w.course_code)])
    const got = new Map((afterCourses || []).map((c) => [c.course_code, c]))
    for (const c of log.poolKeys) {
      const want = c.after || c.voice_pool_key
      if (got.get(c.course_code).voice_pool_key !== want) throw new Error(`RECONCILE FAILED: ${c.course_code}.voice_pool_key`)
    }
    for (const w of log.welsh) {
      const want = w.skipped === 'UNKNOWN — left null deliberately' ? null : (w.after ?? w.before)
      if ((got.get(w.course_code).known_dialect ?? null) !== want) throw new Error(`RECONCILE FAILED: ${w.course_code}.known_dialect`)
    }
    log.reconciled = true
  }

  fs.mkdirSync(OUT, { recursive: true })
  const file = path.join(OUT, `dialect-entity-gaps-2026-08-31-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(file, JSON.stringify(log, null, 2))

  console.log(`${log.mode.toUpperCase()}`)
  for (const p of log.pools) console.log(`  pool  ${p.key.padEnd(8)} ${p.skipped || `${p.after.f[0].name} (f) + ${p.after.m[0].name} (m)`}`)
  for (const c of log.poolKeys) console.log(`  key   ${c.course_code.padEnd(16)} ${c.skipped || `→ ${c.after}`}`)
  for (const w of log.welsh) console.log(`  welsh ${w.course_code.padEnd(16)} ${w.after || 'NULL'}  (${w.evidence})${w.skipped ? '  [' + w.skipped + ']' : ''}`)
  console.log(`\nlog: ${file}`)
}

// Canonical, key-order-independent serialisation. JSONB does not preserve key
// order, so a raw JSON.stringify of a value that round-tripped through Postgres
// fails on a write that was perfectly correct — the lesson t21 learned the hard
// way on its first apply.
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  }
  return JSON.stringify(v)
}

main().catch((e) => { console.error(`\n❌ ${e.message}\n`); process.exit(1) })
