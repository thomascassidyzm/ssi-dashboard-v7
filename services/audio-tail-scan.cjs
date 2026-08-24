/**
 * audio-tail-scan.cjs — the tail-truncation scan, as a JOB.
 *
 * WHY A JOB AND NOT A REQUEST. A tail scan is one S3 GET plus one ffmpeg decode
 * per clip, and the courses in scope are ~50,000 clips each (deu_for_eng 47,254,
 * fra_for_eng 51,369). Even at a healthy concurrency that is minutes for a few
 * seeds and hours for a course — nothing a browser will hold open. So the HTTP
 * surface starts a run, polls it, and reads the finished report, and every long
 * wait happens on this side of the wire.
 *
 * The measurement itself is NOT here. It is `repair.queue({ tails: true })` in
 * services/audio-repair-core.cjs, which delegates to the one validated tail
 * detector (services/audio-intelligence/tiers/tier2-edge-shape.cjs). This module
 * adds exactly two things: something to hold a long run, and the seams that let
 * its result be reused rather than read once and thrown away.
 *
 * ── WHAT A FLAG MEANS, AND WHAT IT DOES NOT ─────────────────────────────────
 * Carried on every payload this module emits, because a count that travels
 * without it becomes a number of "damaged clips" by the second time it is
 * quoted:
 *
 *   A flag means THE CLIP WAS TRIMMED. On the 20 clips that have been listened
 *   to, 4 were trimmed harmlessly. It is triage — it orders clips for a human
 *   ear, and nothing here passes, repairs or deletes audio.
 *
 * And the calibration caveat: the 0.70 dB/ms line was read off ONE course
 * (deu_for_eng seeds 1-5, three voices, one provider). That is why every result
 * carries `tailByVoice`. Read the per-voice flag rate FIRST — a voice nobody
 * calibrated whose renders naturally fall steeply lights up wholesale, and that
 * is a calibration finding rather than ten thousand damaged clips.
 *
 * ── THIS MODULE NEVER WRITES ────────────────────────────────────────────────
 * No database write, no S3 write, no TTS, no repair, no delete. It reads clip
 * rows, reads bytes, measures, and holds the answer in memory. `flagRowsFromScan`
 * below produces rows SHAPED for audio_clip_flags and inserts none of them: the
 * insert is a separate, attributable act, and it is not this surface's.
 *
 * ── JOB STATE IS IN-PROCESS, AND THAT IS SAID PLAINLY ───────────────────────
 * Jobs live in a Map in the API process. Restart the API and every job — running
 * or finished — is gone; a poll for a job id it no longer holds gets a 404 with
 * `code: 'unknown_job'` and a message that says restart, so the UI can tell "your
 * scan was lost" from "your scan failed". Nothing is half-written when that
 * happens, because nothing is written at all. Persisting reports is a schema
 * change and a write path; it was not in this commission and the seam notes at
 * the bottom of this file say what it would buy.
 *
 * There is no cancel. `repair.queue` runs to completion once entered and takes no
 * abort signal; a cancel button that only stopped the polling would be a lie
 * about what the box is doing. Scope a scan with maxSeedNumber instead.
 */

const { TAIL_DETECTOR } = require('./audio-repair-core.cjs')

/** The sentence that has to travel with every flag count, in the detector's own terms. */
const FLAG_MEANING = {
  headline: 'A flag means the clip was TRIMMED — not that it is unusable.',
  precision:
    'On the 20 clips a human has listened to, 16 were audibly damaged and 4 were trimmed ' +
    'harmlessly. Read a flag as "this was cut, and 4 times in 5 that was audible".',
  authority:
    'Triage only. Nothing here passes, repairs or deletes audio — a human ear decides, ' +
    'and the repair flow is where they act.',
  calibration:
    'Calibrated on deu_for_eng seeds 1-5, three voices, one provider. Read the per-voice ' +
    'flag rate before trusting a number for a voice that has never been measured: a voice ' +
    'that lights up wholesale is a calibration finding, not a course full of damage.',
}

/**
 * How many flagged clips a report keeps. A whole-course scan can flag more rows
 * than a browser will render, and a queue that quietly stopped would read as
 * "that is all of them" — so the cap is stated in the report as `truncated`,
 * never applied silently. Totals are always the full counts.
 */
const MAX_REPORT_ITEMS = 5000

/** Finished jobs kept for reading. Oldest is dropped first. */
const MAX_JOBS = 20

/**
 * Default measuring concurrency. Lower than the core's own 8 on purpose: this
 * runs inside the shared production API alongside audio sweeps, and a scan that
 * starves the dashboard is a scan nobody runs twice.
 */
const DEFAULT_CONCURRENCY = 4
const MAX_CONCURRENCY = 16

/** Which detector flagged an item. The two are never merged into one score. */
function categoriesOf (item) {
  const out = []
  if (item.tail && item.tail.flagged) out.push(item.tail.category || 'tail-truncation')
  if (item.detector && item.detector.flagged) out.push('duration')
  return out
}

/**
 * The scan's flagged clips as rows for `audio_clip_flags` — the approval gate's
 * own table (ops/sql/20260805-course-qa-gate.sql §1), which already carries
 * `source='detector'`, `detector`, `detector_precision` and `metrics` because a
 * machine flag was always meant to land here.
 *
 * PURE, and it inserts nothing. Raising flags puts work in front of a human and
 * only a human can clear one, so the act wants a name against it; this function
 * makes that insert a one-liner for whoever is authorised to make it, and leaves
 * the authorisation question where it belongs.
 *
 * @param {object} job              a finished job
 * @param {string} [raisedBy]       who would be raising them
 * @returns {object[]}              audio_clip_flags-shaped rows, tail flags only
 */
function flagRowsFromScan (job, raisedBy = 'audio-tail-scan') {
  const result = job && job.result
  if (!result) return []
  return (result.items || [])
    .filter(i => i.tail && i.tail.flagged)
    .map(i => ({
      audio_id: i.audioId,
      course_code: result.courseCode,
      audio_revision: i.revision ?? 1,
      source: 'detector',
      detector: TAIL_DETECTOR.name,
      // 'suspect', never 'bad': 4 of the 20 listened-to flags were harmless.
      severity: 'suspect',
      reason: i.tail.reason,
      metrics: {
        fallRate: i.tail.shape ? i.tail.shape.fallRate : null,
        zeroPadPct: i.tail.shape ? i.tail.shape.zeroPadPct : null,
        fallMs: i.tail.shape ? i.tail.shape.fallMs : null,
        durMs: i.tail.shape ? i.tail.shape.durMs : null,
        speechMs: i.tail.shape ? i.tail.shape.speechMs : null,
        detectorVersion: TAIL_DETECTOR.version,
        scanJobId: job.id,
      },
      detector_precision: TAIL_DETECTOR.precision,
      raised_by: raisedBy,
    }))
}

/**
 * The scan's verdicts keyed by audio id — the shape a listening surface wants
 * when it is showing clips it chose itself (the Audio Preview sampler draws a
 * uniform random sample and has no idea what a detector thought of them).
 *
 * @param {object} job
 * @returns {Object<string, object>}
 */
function verdictsByAudioId (job) {
  const result = job && job.result
  if (!result) return {}
  const out = {}
  for (const i of result.items || []) {
    out[i.audioId] = {
      categories: categoriesOf(i),
      tail: i.tail || null,
      duration: i.detector || null,
      voiceId: i.voiceId,
      revision: i.revision,
    }
  }
  return out
}

/**
 * @param {object} deps
 * @param {object} deps.core        repair core (queue / seedScopedAudioIds); defaults to the live one
 * @param {function} [deps.newId]
 * @param {function} [deps.now]     () -> ISO string
 * @param {object} [deps.logger]
 */
function createTailScanStore (deps = {}) {
  const {
    newId = () => require('crypto').randomUUID(),
    now = () => new Date().toISOString(),
    logger = console,
    maxJobs = MAX_JOBS,
  } = deps

  let _core = deps.core || null
  const core = () => (_core || (_core = require('./audio-repair.cjs').core()))

  /** jobId -> job. Insertion-ordered, so trimming the oldest is a shift. */
  const jobs = new Map()

  class ScanError extends Error {
    constructor (message, code = 'scan_failed', status = 400) {
      super(message)
      this.name = 'ScanError'
      this.code = code
      this.status = status
    }
  }

  function publicJob (job, { items = null } = {}) {
    return {
      jobId: job.id,
      courseCode: job.courseCode,
      status: job.status,
      scope: job.scope,
      actor: job.actor,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      progress: job.progress,
      error: job.error,
      detector: TAIL_DETECTOR,
      flagMeaning: FLAG_MEANING,
      // The counts, and never the items, unless asked: a whole-course report is
      // megabytes and a poll happens every couple of seconds.
      totals: job.result ? job.result.totals : null,
      tailByVoice: job.result ? job.result.tailByVoice : null,
      items,
    }
  }

  /**
   * Start a scan. Returns immediately with the job; the run continues in the
   * background and is polled through `get`.
   */
  function start ({ courseCode, maxSeedNumber = null, role = null, concurrency = DEFAULT_CONCURRENCY, actor = 'unknown' }) {
    if (!courseCode) throw new ScanError('courseCode is required', 'no_course')
    const running = [...jobs.values()].find(j => j.courseCode === courseCode && j.status === 'running')
    if (running) {
      throw new ScanError(
        `a scan of ${courseCode} is already running (job ${running.id})`, 'scan_in_progress', 409)
    }
    const maxSeed = maxSeedNumber == null || maxSeedNumber === '' ? null : Number(maxSeedNumber)
    if (maxSeed !== null && (!Number.isInteger(maxSeed) || maxSeed < 1)) {
      throw new ScanError('maxSeedNumber must be a positive integer', 'bad_max_seed')
    }
    const conc = Math.max(1, Math.min(Number(concurrency) || DEFAULT_CONCURRENCY, MAX_CONCURRENCY))

    const job = {
      id: newId(),
      courseCode,
      actor,
      status: 'running',
      scope: { maxSeedNumber: maxSeed, role: role || null, concurrency: conc },
      startedAt: now(),
      finishedAt: null,
      // `total` is unknown until the clip rows are read — null rather than 0,
      // because a progress bar that starts at 0/0 reads as "nothing to do".
      progress: { phase: 'reading', done: 0, total: null },
      result: null,
      error: null,
    }
    jobs.set(job.id, job)
    while (jobs.size > maxJobs) {
      const oldest = jobs.keys().next().value
      if (oldest === job.id) break
      jobs.delete(oldest)
    }

    job.promise = run(job).catch(err => {
      job.status = 'failed'
      job.error = err.message
      job.finishedAt = now()
      logger.error?.(`[tail-scan] ${job.id} failed: ${err.message}`)
    })
    logger.log?.(`[tail-scan] ${actor} started ${job.id} on ${courseCode}` +
      (maxSeed ? ` (seeds 1-${maxSeed})` : ' (whole course)') + ` at concurrency ${conc}`)
    return job
  }

  async function run (job) {
    const c = core()
    let audioIds = null
    if (job.scope.maxSeedNumber) {
      audioIds = await c.seedScopedAudioIds({
        courseCode: job.courseCode, maxSeedNumber: job.scope.maxSeedNumber,
      })
      if (!audioIds.length) {
        throw new ScanError(
          `seeds 1-${job.scope.maxSeedNumber} of ${job.courseCode} reference no audio at all`,
          'empty_scope', 404)
      }
    }

    job.progress = { phase: 'measuring', done: 0, total: audioIds ? audioIds.length : null }

    const out = await c.queue({
      courseCode: job.courseCode,
      role: job.scope.role,
      audioIds,
      tails: true,
      tailConcurrency: job.scope.concurrency,
      // The queue returns its flagged set sliced to `limit`. Ask for the cap and
      // compare against `total` below, so a truncated report says so.
      limit: MAX_REPORT_ITEMS,
      // The core reports every 250 clips; a scan of a handful never fires it at
      // all, which is why the finished totals are what the UI trusts.
      onProgress: (done, total) => { job.progress = { phase: 'measuring', done, total } },
    })

    const items = (out.items || []).map(i => ({ ...i, categories: categoriesOf(i) }))

    job.result = {
      courseCode: out.courseCode,
      totals: {
        // Everything the queue kept: tail-flagged, duration-flagged, or already
        // carrying a candidate. The two detectors are counted separately and
        // never added together — different units, different meanings.
        flagged: out.total,
        flaggedByTail: out.flaggedByTail,
        flaggedByDuration: out.flaggedByDuration,
        measured: out.measured,
        measureFailures: out.tailMeasureFailures,
        excludedUnrendered: out.excludedUnrendered,
        reported: items.length,
        truncated: Math.max(0, (out.total || 0) - items.length),
      },
      tailByVoice: out.tailByVoice,
      durationDetector: out.detector,
      items,
    }
    job.progress = {
      phase: 'done',
      done: out.measured + out.tailMeasureFailures,
      total: out.measured + out.tailMeasureFailures,
    }
    job.status = 'done'
    job.finishedAt = now()
    logger.log?.(`[tail-scan] ${job.id} done: ${out.flaggedByTail} tail-flagged of ` +
      `${out.measured} measured (${out.tailMeasureFailures} could not be measured)`)
  }

  /** Poll. Never returns items — see `report` for those. */
  function get (jobId) {
    const job = jobs.get(jobId)
    if (!job) {
      throw new ScanError(
        `no scan job ${jobId} — scan state is held in the API process, so a restart loses it. ` +
        'Nothing was written and nothing is half-done; start a new scan.',
        'unknown_job', 404)
    }
    return publicJob(job)
  }

  /**
   * The per-clip report, filtered and paged.
   *
   * @param {string} jobId
   * @param {object} [q]
   * @param {string} [q.category]  'tail-truncation' | 'duration' | 'all'
   * @param {string} [q.voiceId]   one voice, for reading a suspicious flag rate
   * @param {number} [q.limit]
   * @param {number} [q.offset]
   */
  function report (jobId, q = {}) {
    const job = jobs.get(jobId)
    if (!job) {
      throw new ScanError(`no scan job ${jobId} — see GET status for why`, 'unknown_job', 404)
    }
    if (!job.result) {
      throw new ScanError(`scan ${jobId} is ${job.status} — no report yet`, 'not_finished', 409)
    }
    const category = q.category && q.category !== 'all' ? q.category : null
    let items = job.result.items
    if (category) items = items.filter(i => i.categories.includes(category))
    if (q.voiceId) items = items.filter(i => i.voiceId === q.voiceId)

    const offset = Math.max(0, Number(q.offset) || 0)
    const limit = Math.max(1, Math.min(Number(q.limit) || 200, 1000))
    return {
      ...publicJob(job, { items: items.slice(offset, offset + limit) }),
      filter: { category: category || 'all', voiceId: q.voiceId || null },
      matched: items.length,
      offset,
      limit,
    }
  }

  /** Every job this process still holds, newest first. */
  function list (courseCode = null) {
    const all = [...jobs.values()]
      .filter(j => !courseCode || j.courseCode === courseCode)
      .map(j => publicJob(j))
    all.reverse()
    return {
      jobs: all,
      detector: TAIL_DETECTOR,
      flagMeaning: FLAG_MEANING,
      // Said in the payload rather than only in a header comment: the UI has to
      // be able to explain an empty list after a restart.
      stateNote: 'Scan jobs are held in the API process and do not survive a restart. ' +
        'Nothing is written to the database or S3 by a scan, so a lost job costs only the re-run.',
    }
  }

  /** The raw job, for the seam functions. Undefined when unknown. */
  const raw = (jobId) => jobs.get(jobId)

  /** The newest finished scan of a course — what a listening surface would annotate from. */
  function latestFinished (courseCode) {
    const all = [...jobs.values()].filter(j => j.courseCode === courseCode && j.status === 'done')
    return all.length ? all[all.length - 1] : null
  }

  return {
    start, get, report, list, raw, latestFinished,
    flagRowsFromScan, verdictsByAudioId,
    ScanError,
    DETECTOR: TAIL_DETECTOR,
    FLAG_MEANING,
    _internal: { jobs },
  }
}

module.exports = {
  createTailScanStore,
  flagRowsFromScan,
  verdictsByAudioId,
  categoriesOf,
  FLAG_MEANING,
  MAX_REPORT_ITEMS,
  DEFAULT_CONCURRENCY,
  MAX_CONCURRENCY,
}

/**
 * ── SEAMS: what this scan is FOR, beyond being read once ────────────────────
 *
 * 1. THE MANUAL APPROVAL GATE (services/course-qa-gate.cjs). Its `audio_clip_flags`
 *    table already has the columns a machine flag needs — source='detector',
 *    detector, detector_precision, metrics — and only a human can clear one.
 *    `flagRowsFromScan(job)` produces exactly those rows. What does NOT exist is
 *    a write path: the gate raises flags only from a human's round sign-off
 *    (`signOffRound` with flaggedAudioIds), and there is no endpoint anywhere
 *    that inserts a detector flag. Adding one is a single insert plus a route,
 *    and it is a WRITE — deliberately left for whoever owns that decision rather
 *    than smuggled into a read-only scan surface.
 *
 * 2. THE AUDIO PREVIEW SAMPLER (services/audio-preview-router.cjs GET /sample).
 *    It draws a uniform random sample of a course's clips for a human to listen
 *    to, and today it can badge them only with the stored veracity verdict.
 *    `verdictsByAudioId(job)` is the annotation it wants, and the route
 *    GET /api/audio/tail-scan/:courseCode/verdicts serves it for a given id list
 *    so the sampler needs no new dependency. The honest limit: these verdicts
 *    live in memory, so the annotation is only as durable as the API process.
 *    Making it durable means persisting the report — a table and a write path,
 *    which is the same decision as (1).
 */
