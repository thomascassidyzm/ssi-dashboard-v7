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
 *                     → { clips, hasMore, total, gate }
 *   GET /sample       ?filter=… &n=20
 *                     → { clips } — a UNIFORM random sample of the filter,
 *                       drawn by random offsets over the filtered count rather
 *                       than by shuffling a recent window (which would silently
 *                       sample only the newest rows and call it random)
 *   GET /quarantine   → gate failures for this course, read from the veracity
 *                       quarantine JSONL. These clips are NOT in course_audio
 *                       by construction — they never published — so they can
 *                       only be surfaced from the ledger.
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

// Columns the page actually renders. `text` is the thing being checked against
// the audio, so it leads; the rest is provenance.
const CLIP_COLUMNS = 'id, course_code, text, role, voice_id, origin, s3_key, duration_ms, created_at, lego_id'

// Start of the first render batch that ran under the veracity gate. See the
// header — this is a render-time boundary, NOT evidence of a per-clip verdict.
const GATE_LIVE_FROM = '2026-08-04T23:00:00.000Z'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const MAX_SAMPLE = 50

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
function applyFilter (query, filter, role) {
  if (filter === 'gated') query = query.gte('created_at', GATE_LIVE_FROM)
  if (role) query = query.eq('role', role)
  return query
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
    note: 'No per-clip veracity verdict is stored. "gate-era" means rendered while the gate was live (checked-and-passed OR unchecked), not proven passed.',
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

  return router
}

module.exports.GATE_LIVE_FROM = GATE_LIVE_FROM
module.exports.gateStateFor = gateStateFor
