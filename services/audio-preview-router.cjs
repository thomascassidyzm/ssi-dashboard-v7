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
 *   GET /clips        ?filter=recent|gated|all &limit &offset &role
 *                     → { clips, hasMore, total, preGateTotal, gate }
 *                       Each filter is a REAL predicate: `recent` is the last
 *                       RECENT_WINDOW_DAYS, `gated` is the gate-era window,
 *                       `all` is everything. `recent` used to apply no
 *                       predicate at all — identical to `all` — which is how a
 *                       tab labelled "recently rendered" came to serve clips
 *                       rendered months before the gate existed.
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
 * ── The honesty problem this router has to carry ─────────────────────────────
 * There is NO per-clip veracity verdict anywhere in the database. Verified
 * against the live schema on 2026-08-05: course_audio has no verdict/cer/
 * checked_at column, and the gate persists nothing per clip on the pass path —
 * it keeps per-RUN counters, and writes a row to the quarantine ledger only
 * when a clip FAILS and is withheld. Since a failing clip never reaches S3 or
 * course_audio, everything in course_audio rendered since the gate went live is
 * by construction "passed OR was never checked", and those two are not the same
 * thing — the gate carries an explicit `unchecked` state precisely so it can
 * never silently pass what it could not examine.
 *
 * So the `gated` filter here is a TIME WINDOW, not a verdict lookup, and it is
 * named for what it is everywhere it surfaces: "rendered under the gate", never
 * "passed". GATE_LIVE_FROM is the start of the first render batch that ran
 * under the gate (the fra_for_eng pilot, whose 250 clips span
 * 2026-08-04T23:30:26Z … 23:46:05Z); the gate module itself was committed at
 * 23:55:59Z, AFTER that run, so a commit-timestamp cutoff would wrongly exclude
 * the very batch this page was built to audition.
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
const CLIP_COLUMNS = 'id, course_code, text, role, voice_id, origin, s3_key, duration_ms, created_at, lego_id'

// Start of the first render batch that ran under the veracity gate. See the
// header — this is a render-time boundary, NOT evidence of a per-clip verdict.
const GATE_LIVE_FROM = '2026-08-04T23:00:00.000Z'

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
 * The gate state we can HONESTLY assert for a published clip.
 * 'gate-era'  → rendered at/after GATE_LIVE_FROM: the gate was live, so it was
 *               checked-and-passed OR explicitly unchecked. We cannot tell which.
 * 'pre-gate'  → rendered before the gate existed. Never checked.
 * There is deliberately no 'passed' value. If per-clip verdicts are persisted
 * later, this is the single place that becomes a real lookup.
 */
function gateStateFor (createdAt) {
  if (!createdAt) return 'pre-gate'
  return new Date(createdAt) >= new Date(GATE_LIVE_FROM) ? 'gate-era' : 'pre-gate'
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
    gateState: gateStateFor(row.created_at),
    // The page fetches signed URLs lazily (they expire in an hour), so the row
    // carries only the path it would fetch, never a pre-signed URL.
    audioUrlPath: `/api/production/${encodeURIComponent(row.course_code)}/audio/${encodeURIComponent(row.id)}/url`,
  }
}

function parseFilter (raw) {
  return ['recent', 'gated', 'all'].includes(raw) ? raw : 'recent'
}

/**
 * One place that turns a filter name into a PostgREST query, so /clips and
 * /sample can never drift apart on what "the current filter" means.
 */
function applyFilter (query, filter, role, now = Date.now()) {
  if (filter === 'gated') query = query.gte('created_at', GATE_LIVE_FROM)
  if (filter === 'recent') query = query.gte('created_at', recentCutoff(now))
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
    liveFrom: GATE_LIVE_FROM,
    // Said in the payload so a future consumer cannot mistake the filter for a
    // verdict lookup either.
    perClipVerdictsPersisted: false,
    recentWindowDays: RECENT_WINDOW_DAYS,
    note: 'No per-clip veracity verdict is stored. "gate-era" means rendered while the gate was live (checked-and-passed OR unchecked), not proven passed.',
  }

  /**
   * How many clips in the CURRENT filtered set predate the gate. Without this
   * the page can only badge the rows it happens to have fetched, and a listener
   * paging or sampling through a mixed set has no way to know what proportion
   * of it was never machine-checked. Skipped for the gated filter, where the
   * answer is zero by construction.
   */
  async function countPreGate (db, courseCode, filter, role) {
    if (filter === 'gated') return 0
    let q = db.from('course_audio')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .lt('created_at', GATE_LIVE_FROM)
    q = applyFilter(q, filter, role)
    const { count, error } = await q
    if (error) throw new Error(error.message)
    return count || 0
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
        preGateTotal: await countPreGate(db, courseCode, filter, role),
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
        preGateTotal: await countPreGate(db, courseCode, filter, role),
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

module.exports.GATE_LIVE_FROM = GATE_LIVE_FROM
module.exports.RECENT_WINDOW_DAYS = RECENT_WINDOW_DAYS
module.exports.gateStateFor = gateStateFor
module.exports.applyFilter = applyFilter
module.exports.recentCutoff = recentCutoff
module.exports.parseFilter = parseFilter
