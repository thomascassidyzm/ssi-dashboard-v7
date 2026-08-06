/**
 * audio-preview-router.cjs — READ-ONLY listening surface for course audio.
 *
 * The human end of the pre-publish veracity gate (services/audio-veracity.cjs):
 * the machine renders and checks a clip, and this is where a person puts their
 * ears on it before it counts as publish-ready. Audio content appears in every
 * environment the moment it lands, so the listening pass has to be one tap, not
 * a workflow.
 *
 * NOT mounted by this file — production-api.cjs mounts it under the gated
 * prefix so the app-level app.param('courseCode') course-scope auth gate fires
 * for every route (mergeParams; this router must NOT declare :courseCode):
 *
 *   app.use('/api/production/:courseCode/audio-preview',
 *     require('./audio-preview-router.cjs')({ getDb: () => supabaseClient.getClient(), logger }))
 *
 * Endpoints (every one a pure SELECT / file read — no writes, no TTS, no S3
 * mutation; adding a write endpoint here would break the contract the page is
 * built on):
 *   GET /clips        ?filter=recent|checked|unchecked|all &limit &offset &role
 *                     → { clips, hasMore, total, verdictTotals, gate }
 *                       Each filter is a REAL predicate: `recent` is the last
 *                       RECENT_WINDOW_DAYS, `checked` is a stored PASS verdict,
 *                       `unchecked` is the absence of one, `all` is everything.
 *                       `recent` used to apply no predicate at all — identical
 *                       to `all` — which is how a tab labelled "recently
 *                       rendered" came to serve clips rendered months before
 *                       the gate existed.
 *   GET /sample       ?filter=… &n=20
 *                     → { clips } — a UNIFORM random sample of the filter,
 *                       drawn by random offsets over the filtered count rather
 *                       than by shuffling a recent window (which would silently
 *                       sample only the newest rows and call it random)
 *   GET /quarantine   → gate failures for this course, read from the veracity
 *                       quarantine JSONL. These clips are NOT in course_audio
 *                       by construction — they never published — so they can
 *                       only be surfaced from the ledger.
 *   GET /missing      → pod slots whose audio id does not resolve to a live
 *                       course_audio row. The third state the page has to be
 *                       able to show: plays / truncated / MISSING. See
 *                       audio-preview-missing.cjs for why it exists and why the
 *                       column list is the whole point.
 *   GET /missing-clips → every phrase/LEGO in the COURSE with no audio, in one
 *                       list, deduplicated to the row a repair would touch.
 *                       Script Viewer's missing-audio filter only sees the 20
 *                       LEGOs it has loaded; this sees all of them. See
 *                       audio-preview-course-gaps.cjs.
 *
 * ── This page used to infer quality from a date. It now reads a verdict. ─────
 * Until 2026-08-05 there was no per-clip veracity verdict in the database, so
 * the only thing this router could do was compare `created_at` against the
 * moment the gate shipped and label the result. docs/gate-bypass-audit-2026-08-05.md
 * measured what that label was worth: of the 1,413 clips it selected, ZERO had
 * been through `veracity.renderChecked`. The inference was false for 100% of
 * its own rows — and the cutoff had been chosen, in good faith, to make a
 * particular batch auditionable, which inverted the filter's meaning.
 *
 * A date can never fix that, because two different things share one timestamp:
 * a clip the gate checked and passed, and a clip the gate could not check and
 * published anyway. services/audio-veracity.cjs carries an explicit `unchecked`
 * state precisely because those are not the same claim.
 *
 * So the verdict is now stored on the clip, by the code that rendered it
 * (`veracity.verdictColumns`, database/migrations/20260805_course_audio_veracity_verdict.sql),
 * and every filter and badge here is a LOOKUP of that verdict. Three states,
 * never two:
 *
 *   passed     veracity_pass = true            — checked, and it passed
 *   failed     veracity_pass = false           — checked, and it failed, and the
 *                                                row exists anyway. Impossible
 *                                                on the gated path; surfaced
 *                                                loudly rather than hidden.
 *   unchecked  everything else                 — no check ever ran (every clip
 *                                                rendered before 2026-08-05,
 *                                                and every path that still
 *                                                bypasses the gate), or the
 *                                                gate ran and could not check.
 *                                                NEVER folded into passed.
 *
 * Clips the gate checked and WITHHELD are not in course_audio at all — that is
 * what withholding means — so they are served from the quarantine ledger by
 * GET /quarantine, and the page shows both together. A surface that could only
 * show what published would report "no failures" by construction.
 *
 * The old date constant is deliberately gone. If you find yourself reaching for
 * a timestamp to decide whether a clip was checked, the answer is a column.
 */

'use strict'

const express = require('express')
const fs = require('fs')
const path = require('path')
const {
  POD_ARRAY_AUDIO_COLUMNS,
  POD_SCALAR_AUDIO_COLUMNS,
  collectReferencedAudioIds,
  computeMissingSlots,
} = require('./audio-preview-missing.cjs')
const { computeCourseGaps } = require('./audio-preview-course-gaps.cjs')
const learningScriptGenerator = require('./learning-script-generator.cjs')

// Columns the page actually renders. `text` is the thing being checked against
// the audio, so it leads; the rest is provenance.
const CLIP_COLUMNS = 'id, course_code, text, role, voice_id, origin, s3_key, duration_ms, created_at, lego_id, '
  + 'veracity_checked_at, veracity_pass, veracity_reason, veracity_cer, veracity_attempts, veracity_checker'

// How far back "recently rendered" reaches. It has to be a real window: the
// filter previously applied NO predicate at all, which made it byte-identical
// to "all" — harmless-looking in the newest-first list, and actively misleading
// through /sample, which then drew uniformly over the whole course history
// (97.5% of fra_for_eng audio predates the gate). A week is the honest unit of
// "what did we just render": long enough to hold a multi-day render batch,
// short enough that it can never quietly become the entire course.
const RECENT_WINDOW_DAYS = 7

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const MAX_SAMPLE = 50

// Pod sentence columns the missing-audio scan reads: the address of a slot,
// the dialogue line itself, and every audio-id column on the table.
const SENTENCE_COLUMNS = [
  'id', 'pod_id', 'global_order', 'scene_number', 'sentence_number',
  'speaker', 'target_text', 'known_text',
  ...POD_ARRAY_AUDIO_COLUMNS, ...POD_SCALAR_AUDIO_COLUMNS,
].join(', ')

// PostgREST caps a response at 1000 rows by default, and a silent truncation
// here would under-report the damage — exactly the failure this page exists to
// stop. So page explicitly rather than trusting one request to return the lot.
const PAGE_ROWS = 1000
const ID_LOOKUP_BATCH = 200

// Whole-course journey generation is ~7.5s for fra_for_eng (1,529 rounds,
// 33,368 items, measured on watson-1 2026-08-05), so the missing-clip list is
// cached briefly per course. Short enough that a fresh render shows up on the
// next reload, long enough that opening the page twice does not pay twice.
const COURSE_GAPS_CACHE_TTL = 60_000
const courseGapsCache = new Map()

/**
 * Rows with no audio that the journey never plays — so they cannot appear in
 * the list above, and the list's total must not be mistaken for "every row in
 * the database with a gap".
 *
 * Two causes, both legitimate: a phrase past the per-round BUILD cap is simply
 * never selected (35 build + 1 use in fra_for_eng on 2026-08-05), and a LEGO
 * that never gets its own round (is_new false) contributes no intro or debut
 * (124 in fra_for_eng). Component rows are excluded entirely — the learner
 * never plays them, so a component with no audio is not a gap.
 *
 * Counted, never listed: a person acts on what the learner hears. But the
 * number is printed, because a difference nobody prints is a difference
 * somebody later discovers and stops trusting the page over.
 */
async function countGapsOutsideJourney (db, courseCode, allItems, rounds) {
  const playedPhraseIds = new Set(allItems.map(i => i.phrase_id).filter(Boolean))
  const journeyLegoIds = new Set(rounds.map(r => r.legoId))

  const phraseRows = await fetchAllPages((from, to) => db
    .from('course_practice_phrases')
    .select('id')
    .eq('course_code', courseCode)
    .in('phrase_role', ['build', 'use'])
    .or('known_audio_id.is.null,target1_audio_id.is.null')
    .range(from, to))
  const phrases = phraseRows.filter(r => !playedPhraseIds.has(r.id)).length

  const legoRows = await fetchAllPages((from, to) => db
    .from('course_legos')
    .select('lego_id')
    .eq('course_code', courseCode)
    .or('presentation_audio_id.is.null,known_audio_id.is.null,target1_audio_id.is.null')
    .range(from, to))
  const legos = legoRows.filter(r => !journeyLegoIds.has(r.lego_id)).length

  return {
    phrases,
    legos,
    note: 'Rows with an audio gap that the learner journey never plays: phrases past the per-round BUILD cap, and LEGOs that never get their own round. Counted here so the list total is not mistaken for a database-wide count; not listed, because there is nothing for a learner to hear.',
  }
}

async function fetchAllPages (queryFor) {
  const rows = []
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await queryFor(from, from + PAGE_ROWS - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < PAGE_ROWS) return rows
  }
}

const QUARANTINE_DIR = process.env.AUDIO_VERACITY_QUARANTINE_DIR
  || path.join(__dirname, '..', 'scripts', 'audio-veracity-quarantine')

/**
 * Human wording for a stored verdict reason. The page must never print a bare
 * code like `cer_above_threshold` at a person, and it must never print a
 * confident phrase for an admission — `unchecked_no_whisper` means the machine
 * could not look, which is a different thing from looking and approving.
 */
const REASON_TEXT = {
  ok: 'the words we asked for are in the clip',
  non_speech_decode: 'nothing was transcribed — silence or noise, no speech',
  cer_above_threshold: 'what was heard differs too much from the script',
  cer_above_unvalidated_language_threshold: 'what was heard is essentially unrelated to the script',
  unchecked_no_whisper: 'the checker was not installed on the rendering machine',
  unchecked_disabled: 'the gate was switched off for this render',
  unchecked_decode_error: 'the checker errored on this clip',
  unchecked_no_text: 'there was no expected text to compare against',
}

/**
 * The verdict a clip carries, read from its own row. Three states, and the
 * third is the whole point — see the header.
 *
 * `checkedAt` with `pass === null` is the gate admitting it could not look.
 * That is `unchecked`, not `passed`, and no amount of "but it was rendered
 * recently" changes it.
 */
function verdictFor (row) {
  const checkedAt = row.veracity_checked_at || null
  const pass = row.veracity_pass
  const state = !checkedAt || pass == null ? 'unchecked' : (pass ? 'passed' : 'failed')
  return {
    state,
    checkedAt,
    checker: row.veracity_checker || null,
    reason: row.veracity_reason || null,
    // The prose the page shows. For a clip nothing ever looked at there is no
    // reason code at all, so say the true thing rather than leaving a blank
    // that reads as "fine".
    reasonText: row.veracity_reason
      ? (REASON_TEXT[row.veracity_reason] || row.veracity_reason)
      : (checkedAt ? null : 'no quality check has ever run on this clip'),
    cer: row.veracity_cer ?? null,
    attempts: row.veracity_attempts ?? null,
  }
}

function normaliseClip (row) {
  return {
    id: row.id,
    courseCode: row.course_code,
    text: row.text,
    role: row.role,
    voiceId: row.voice_id || null,
    origin: row.origin || null,
    legoId: row.lego_id || null,
    durationMs: row.duration_ms ?? null,
    createdAt: row.created_at,
    verdict: verdictFor(row),
    // The page fetches signed URLs lazily (they expire in an hour), so the row
    // carries only the path it would fetch, never a pre-signed URL.
    audioUrlPath: `/api/production/${encodeURIComponent(row.course_code)}/audio/${encodeURIComponent(row.id)}/url`,
  }
}

function parseFilter (raw) {
  return FILTERS.includes(raw) ? raw : 'recent'
}

const FILTERS = ['recent', 'checked', 'unchecked', 'all']

/**
 * One place that turns a filter name into a PostgREST query, so /clips and
 * /sample can never drift apart on what "the current filter" means.
 *
 * `unchecked` is everything NOT confirmed passed — `veracity_pass IS DISTINCT
 * FROM TRUE`. It deliberately catches three populations at once: rows nothing
 * ever checked (NULL), the gate's own could-not-check admissions (also NULL,
 * but carrying a checked_at), and the should-be-impossible checked-and-failed
 * rows (FALSE). Defining it as "not a pass" rather than "no verdict" is what
 * makes it impossible for a failure to hide in a tab nobody opens; each clip
 * still carries its own verdict badge saying which of the three it is.
 *
 * It must NOT be written as `not.eq.true`: SQL's three-valued logic would drop
 * every NULL, and a course of entirely unchecked audio would report as having
 * nothing to worry about.
 */
function applyFilter (query, filter, role, now = Date.now()) {
  if (filter === 'recent') query = query.gte('created_at', recentCutoff(now))
  if (filter === 'checked') query = query.is('veracity_pass', true)
  if (filter === 'unchecked') query = query.or('veracity_pass.is.null,veracity_pass.is.false')
  if (role) query = query.eq('role', role)
  return query
}

function recentCutoff (now = Date.now()) {
  return new Date(now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * @param {object} deps
 * @param {() => object} deps.getDb  supabase client factory
 * @param {object} deps.logger
 */
module.exports = function createAudioPreviewRouter ({ getDb, logger = console }) {
  const router = express.Router({ mergeParams: true })

  const gateMeta = {
    // The claim the page is now entitled to make: every badge is a stored
    // verdict, written by the code that rendered the clip, not an inference
    // from created_at. Do not flip this back without removing the columns.
    perClipVerdictsPersisted: true,
    recentWindowDays: RECENT_WINDOW_DAYS,
    note: 'Every clip carries the verdict the renderer recorded on it. "unchecked" covers both clips no check ever ran on (everything rendered before 2026-08-05, and any path still bypassing the gate) and clips the gate ran on but could not examine — never a pass. Clips the gate checked and withheld are not in course_audio at all; they are in /quarantine.',
  }

  /**
   * The verdict split of the WHOLE filtered set, not just the page of rows that
   * happened to be fetched.
   *
   * Without it the page can only badge what it is showing, and a listener
   * paging or sampling through a mixed set has no way to know what proportion
   * of the course carries a verdict at all. With 2.5M clips in the estate and
   * the gate live from 2026-08-05, the honest headline for most courses today
   * is "nearly all of this is unchecked" — a page that could not say so would
   * be back to implying quality it has not measured.
   *
   * Only the two verdict-bearing populations are COUNTED, and `unchecked` is
   * the remainder. That is not a shortcut, it is the difference between the
   * page working and the page 500-ing: `veracity_pass IS NULL` matches nearly
   * every one of the 2.5M rows in this table, and an exact count of it is a
   * sequential scan that hits the statement timeout — measured live on
   * fra_for_eng, 2026-08-05, which is how this shape was arrived at. Passed and
   * failed ride a partial index over the few thousand rows that carry a
   * verdict, so this costs two small probes on top of the count the caller
   * already has.
   *
   * @param {number|null} total  the size of the same filtered set, which the
   *   caller has already counted. Null means we cannot state a remainder, and
   *   the page must not invent one.
   */
  async function verdictTotals (db, courseCode, filter, role, total) {
    const count = async (apply) => {
      let q = db.from('course_audio')
        .select('id', { count: 'exact', head: true })
        .eq('course_code', courseCode)
      q = applyFilter(q, filter, role)
      const { count: n, error } = await apply(q)
      if (error) throw new Error(error.message)
      return n || 0
    }
    const [passed, failed] = await Promise.all([
      count(q => q.is('veracity_pass', true)),
      count(q => q.is('veracity_pass', false)),
    ])
    return {
      passed,
      failed,
      unchecked: total == null ? null : Math.max(0, total - passed - failed),
    }
  }

  // ── GET /clips ────────────────────────────────────────────────────────────
  router.get('/clips', async (req, res) => {
    try {
      const db = getDb()
      if (!db) return res.status(503).json({ error: 'Supabase not initialized' })

      const { courseCode } = req.params
      const filter = parseFilter(req.query.filter)
      const role = req.query.role || null
      const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT)
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)

      let query = db.from('course_audio')
        .select(CLIP_COLUMNS, { count: 'exact' })
        .eq('course_code', courseCode)
      query = applyFilter(query, filter, role)

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw new Error(error.message)

      const clips = (data || []).map(normaliseClip)
      res.json({
        clips,
        total: count ?? null,
        verdictTotals: await verdictTotals(db, courseCode, filter, role, count ?? null),
        hasMore: count != null ? offset + clips.length < count : clips.length === limit,
        filter,
        gate: gateMeta,
      })
    } catch (err) {
      logger.error(`[AudioPreview] clips: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  // ── GET /sample ───────────────────────────────────────────────────────────
  // Uniform random sample of the filter. Random offsets over the exact filtered
  // count, not a shuffle of the newest N — a spot-check that only ever draws
  // from the last page is not a spot-check of the batch.
  router.get('/sample', async (req, res) => {
    try {
      const db = getDb()
      if (!db) return res.status(503).json({ error: 'Supabase not initialized' })

      const { courseCode } = req.params
      const filter = parseFilter(req.query.filter)
      const role = req.query.role || null
      const n = Math.min(Math.max(parseInt(req.query.n, 10) || 20, 1), MAX_SAMPLE)

      let countQuery = db.from('course_audio')
        .select('id', { count: 'exact', head: true })
        .eq('course_code', courseCode)
      countQuery = applyFilter(countQuery, filter, role)
      const { count, error: countError } = await countQuery
      if (countError) throw new Error(countError.message)

      const total = count || 0
      if (total === 0) return res.json({ clips: [], total: 0, filter, gate: gateMeta })

      // Distinct offsets, so a sample of N never plays the same clip twice.
      const wanted = Math.min(n, total)
      const offsets = new Set()
      while (offsets.size < wanted) offsets.add(Math.floor(Math.random() * total))

      const rows = await Promise.all([...offsets].map(async (offset) => {
        let q = db.from('course_audio')
          .select(CLIP_COLUMNS)
          .eq('course_code', courseCode)
        q = applyFilter(q, filter, role)
        const { data, error } = await q
          .order('created_at', { ascending: false })
          .range(offset, offset)
        if (error) throw new Error(error.message)
        return (data || [])[0] || null
      }))

      res.json({
        clips: rows.filter(Boolean).map(normaliseClip),
        total,
        verdictTotals: await verdictTotals(db, courseCode, filter, role, total),
        filter,
        gate: gateMeta,
      })
    } catch (err) {
      logger.error(`[AudioPreview] sample: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  // ── GET /quarantine ───────────────────────────────────────────────────────
  // Gate failures for this course, from the veracity ledger. These never
  // reached course_audio, so the clip list structurally cannot show them —
  // without this, "0 problems" on the page would be a claim the data can't back.
  // Ledger lines are appended by a live process; a malformed tail line must not
  // take the whole page down, so parse per line and count what we skipped.
  router.get('/quarantine', async (req, res) => {
    try {
      const { courseCode } = req.params
      const ledger = path.join(QUARANTINE_DIR, 'quarantine.jsonl')
      if (!fs.existsSync(ledger)) {
        return res.json({ entries: [], ledgerPresent: false, unparsedLines: 0 })
      }

      let unparsedLines = 0
      const entries = []
      for (const line of fs.readFileSync(ledger, 'utf8').split('\n')) {
        if (!line.trim()) continue
        let entry
        try { entry = JSON.parse(line) } catch { unparsedLines++; continue }
        if (entry.courseCode !== courseCode) continue
        const last = Array.isArray(entry.verdicts) ? entry.verdicts[entry.verdicts.length - 1] : null
        entries.push({
          quarantinedAt: entry.quarantined_at || null,
          text: entry.text || null,
          role: entry.role || null,
          voiceId: entry.voiceId || null,
          attempts: entry.attempts ?? null,
          cer: last?.cer ?? null,
          decode: last?.decode ?? null,
          reason: last?.reason || entry.reason || null,
        })
      }
      entries.sort((a, b) => String(b.quarantinedAt).localeCompare(String(a.quarantinedAt)))
      res.json({ entries, ledgerPresent: true, unparsedLines })
    } catch (err) {
      logger.error(`[AudioPreview] quarantine: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  // ── GET /missing ──────────────────────────────────────────────────────────
  // Pod slots pointing at audio that no longer exists. Read-only like the rest
  // of this router: three SELECTs and a set difference, no writes of any kind.
  //
  // Approach: fetch this course's pod rows, then resolve the ids they reference
  // against course_audio in batched `.in()` lookups, and do the unnest/diff in
  // JavaScript. PostgREST cannot express `unnest(...) WITH ORDINALITY LEFT JOIN`,
  // and the array INDEX is exactly what a repair needs, so a raw-SQL RPC would
  // be the only alternative — a new database object for a read this small. Pod
  // tables are hundreds of rows per course, not millions; clarity wins.
  router.get('/missing', async (req, res) => {
    try {
      const db = getDb()
      if (!db) return res.status(503).json({ error: 'Supabase not initialized' })

      const { courseCode } = req.params

      const { data: podRows, error: podError } = await db
        .from('listening_pods')
        .select('id, course_code, title, pod_order')
        .eq('course_code', courseCode)
      if (podError) throw new Error(podError.message)

      const podsById = new Map((podRows || []).map(p => [p.id, p]))
      if (podsById.size === 0) {
        const empty = computeMissingSlots({ sentences: [], podsById, liveAudioIds: new Set() })
        return res.json({ courseCode, podsScanned: 0, ...empty })
      }

      const sentences = await fetchAllPages((from, to) => db
        .from('listening_pod_sentences')
        .select(SENTENCE_COLUMNS)
        .in('pod_id', [...podsById.keys()])
        .order('pod_id', { ascending: true })
        .order('global_order', { ascending: true })
        .range(from, to))

      // Which referenced ids are actually live. Batched because a course's pods
      // can reference more ids than one `.in()` filter should carry in a URL.
      const referenced = collectReferencedAudioIds(sentences)
      const liveAudioIds = new Set()
      for (let i = 0; i < referenced.length; i += ID_LOOKUP_BATCH) {
        const batch = referenced.slice(i, i + ID_LOOKUP_BATCH)
        const { data, error } = await db.from('course_audio').select('id').in('id', batch)
        if (error) throw new Error(error.message)
        for (const row of data || []) liveAudioIds.add(row.id)
      }

      const result = computeMissingSlots({ sentences, podsById, liveAudioIds })
      res.json({
        courseCode,
        podsScanned: podsById.size,
        columnsScanned: [...POD_ARRAY_AUDIO_COLUMNS, ...POD_SCALAR_AUDIO_COLUMNS],
        ...result,
      })
    } catch (err) {
      logger.error(`[AudioPreview] missing: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  // ── GET /missing-clips ────────────────────────────────────────────────────
  // Every phrase/LEGO in the course with no audio, in ONE list.
  //
  // The Script Viewer's "Missing audio only" toggle can only filter the rounds
  // currently loaded in its window (20 LEGOs per page), so finding every gap in
  // a 1,529-round course means paging through it a block at a time. This runs
  // the SAME test — learning-script-generator's `hasAudio` — over the whole
  // journey at once, and returns rows deduplicated to the thing a repair would
  // touch. Read-only like the rest of this router: it generates the journey in
  // memory from SELECTs and writes nothing.
  //
  // No cap: a silently truncated list reads as "there are only N gaps" when
  // there are more, which is the exact failure this endpoint exists to end.
  // fra_for_eng returns ~1,600 rows / ~500KB — big for a payload, small for a
  // number a person is trying to trust.
  router.get('/missing-clips', async (req, res) => {
    try {
      const db = getDb()
      if (!db) return res.status(503).json({ error: 'Supabase not initialized' })

      const { courseCode } = req.params
      const cached = courseGapsCache.get(courseCode)
      if (cached && Date.now() < cached.expiry) return res.json(cached.payload)

      const startedAt = Date.now()
      // 9999 = the whole course, the same "load all" the journey search
      // endpoint uses (production-api.cjs learning-journey/search).
      const { rounds, allItems } = await learningScriptGenerator.generateLearningScript(
        db, courseCode, 9999, 0
      )
      const { totals, groups } = computeCourseGaps({
        allItems,
        roundCount: rounds.length,
        // Rounds carry the player-delivery verdict: which of them the live
        // player drops outright because their LEGO is short a voice.
        rounds,
      })
      const outsideJourney = await countGapsOutsideJourney(db, courseCode, allItems, rounds)

      const payload = {
        courseCode,
        totals,
        groups,
        outsideJourney,
        computedInMs: Date.now() - startedAt,
        capped: false,
        note: 'Same gap test as Script Viewer\'s "Missing audio only" (learning-script-generator hasAudio: presentation+target1 for intros, known+target1 otherwise), run over the whole course instead of one 20-LEGO page. Rows are deduplicated to what a repair would touch; occurrences counts the playback slots each row blocks, review replays included.',
      }
      courseGapsCache.set(courseCode, { payload, expiry: Date.now() + COURSE_GAPS_CACHE_TTL })

      logger.info(`[AudioPreview] missing-clips ${courseCode}: ${totals.rows} rows (${totals.blocking} blocking) across ${totals.roundsAffected}/${totals.roundsTotal} rounds in ${payload.computedInMs}ms`)
      res.json(payload)
    } catch (err) {
      logger.error(`[AudioPreview] missing-clips: ${err.message}`)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

module.exports.RECENT_WINDOW_DAYS = RECENT_WINDOW_DAYS
module.exports.FILTERS = FILTERS
module.exports.REASON_TEXT = REASON_TEXT
module.exports.verdictFor = verdictFor
module.exports.normaliseClip = normaliseClip
module.exports.applyFilter = applyFilter
module.exports.recentCutoff = recentCutoff
module.exports.parseFilter = parseFilter
