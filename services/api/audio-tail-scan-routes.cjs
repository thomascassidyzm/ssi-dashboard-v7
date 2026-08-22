/**
 * audio-tail-scan-routes.cjs — HTTP surface for the tail-truncation scan
 * (services/audio-tail-scan.cjs).
 *
 * Mounted from production-api.cjs in one line, for the same reason the repair
 * and QA-gate surfaces are: that file is large and several workers edit it at
 * once, and a surface that reads in one screen is worth more than proximity.
 *
 * ── Who may do what, and why ────────────────────────────────────────────────
 * A SCAN IS A READ. It costs S3 bandwidth and CPU — no TTS, no writes, nothing
 * on the learner path — so every route here is open to any dashboard user, the
 * same posture the repair queue and preview reads already take. Nothing here is
 * admin-only because nothing here spends money or changes what a learner hears.
 *
 * The one operational guard is that a course may have only ONE scan running at
 * a time: the work is IO- and subprocess-bound and two concurrent whole-course
 * scans would fight each other for the same box. A second start gets a 409
 * naming the job already running.
 *
 * ── What this surface will never do ─────────────────────────────────────────
 * No route here writes to S3, renders audio, repairs a clip, passes a clip or
 * deletes anything. Scanning and reporting write NOTHING at all.
 *
 * There is exactly ONE write, added 2026-08-06 on Tom's ruling: POST /raise-flags
 * inserts the detector's findings into audio_clip_flags so they outlive the scan
 * process — a finding that evaporates when a job ends cannot be the machine
 * proof-of-quality step feeding the manual gate, which is the job it was built for.
 * That write is narrow on purpose and worth being precise about:
 *   · a flag is an ANNOTATION, not a mutation. It puts a clip in a human's field
 *     of view. No audio is touched, nothing is passed, nothing is repaired.
 *   · the insert is performed BY THE GATE (services/course-qa-gate.cjs), the one
 *     module that owns that table, so there is one place deciding what a flag may
 *     be. This surface builds rows and asks.
 *   · it is machine-attributed AND person-attributed: source='detector', the
 *     detector's name and measured precision on every row, raised_by
 *     "<detector> via <whoever pressed it>".
 *   · only a human clears a flag, with a reason — unchanged, on the gate.
 *   · it will not reopen a flag a human already cleared at that revision.
 * GET /flag-rows remains, and still writes nothing: it is the preview of what the
 * POST would do.
 *
 * Clip bytes are NOT re-served here. The repair surface already serves them
 * without S3 credentials at /api/audio/repair/:courseCode/:audioId/current-audio,
 * and every report row carries that url — one player route, not two.
 */

const { createTailScanStore } = require('../audio-tail-scan.cjs')

/**
 * @param {object} app        express app
 * @param {object} deps
 * @param {function} deps.requireDashboardUser  (req,res) -> user|null (responds on failure)
 * @param {object}   [deps.store]               injected scan store (tests)
 * @param {object}   [deps.logger]
 */
function mount (app, deps) {
  const { requireDashboardUser, logger = console } = deps

  // Lazy for the same reason the repair surface is: mounting must not build a
  // Supabase client or pull in phase8, or one missing env var takes the whole
  // production API down at boot rather than failing one scan request.
  let _store = deps.store || null
  const store = () => (_store || (_store = createTailScanStore({ logger })))
  // The gate owns audio_clip_flags. This surface builds rows and asks; it does not
  // reach into that table itself, so there stays exactly one place that decides what a
  // flag is allowed to be.
  let _gate = deps.gate || null
  const gate = () => (_gate || (_gate = require('../course-qa-gate.cjs').createGate({
    getDb: deps.getDb || (() => require('../audio-repair.cjs').core().supabase), logger,
  })))

  const who = (user) => user?.email || user?.username || user?.id || 'unknown'

  function fail (res, err, context) {
    const status = err && err.status ? err.status : 500
    if (status >= 500) logger.error?.(`[tail-scan] ${context}:`, err)
    else logger.log?.(`[tail-scan] ${context}: ${err.message}`)
    res.status(status).json({ error: err.message, code: err.code || 'scan_failed' })
  }

  /** Every reported clip is playable through the repair surface's byte route. */
  const withUrls = (courseCode, items) => (items || []).map(i => ({
    ...i,
    url: `/api/audio/repair/${courseCode}/${i.audioId}/current-audio`,
  }))

  // ── POST start a scan ─────────────────────────────────────────────────────
  // Body: { maxSeedNumber?, role?, concurrency? }. Omitting maxSeedNumber scans
  // the WHOLE course, which on a 50,000-clip course is hours of decoding — the
  // UI says so before the button is pressed.
  app.post('/api/audio/tail-scan/:courseCode', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    const { maxSeedNumber = null, role = null, concurrency } = req.body || {}
    try {
      const job = store().start({
        courseCode: req.params.courseCode,
        maxSeedNumber, role, concurrency, actor: who(user),
      })
      res.json(store().get(job.id))
    } catch (err) { fail(res, err, `start ${req.params.courseCode}`) }
  })

  // ── GET jobs for a course, newest first ───────────────────────────────────
  app.get('/api/audio/tail-scan/:courseCode/jobs', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try { res.json(store().list(req.params.courseCode)) }
    catch (err) { fail(res, err, `jobs ${req.params.courseCode}`) }
  })

  // ── GET job status — the poll. Counts and per-voice rates, never items ────
  app.get('/api/audio/tail-scan/jobs/:jobId', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try { res.json(store().get(req.params.jobId)) }
    catch (err) { fail(res, err, `status ${req.params.jobId}`) }
  })

  // ── GET the per-clip report ───────────────────────────────────────────────
  // ?category=tail-truncation|duration|all &voiceId= &limit= &offset=
  app.get('/api/audio/tail-scan/jobs/:jobId/report', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const out = store().report(req.params.jobId, {
        category: req.query.category, voiceId: req.query.voiceId,
        limit: req.query.limit, offset: req.query.offset,
      })
      res.json({ ...out, items: withUrls(out.courseCode, out.items) })
    } catch (err) { fail(res, err, `report ${req.params.jobId}`) }
  })

  // ── GET the approval-gate seam — rows an insert WOULD make, never inserted ─
  app.get('/api/audio/tail-scan/jobs/:jobId/flag-rows', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    try {
      const s = store()
      // Reuse `report`'s not-found / not-finished errors rather than a second
      // set of them: a job that cannot be reported cannot be converted either.
      s.report(req.params.jobId, { limit: 1 })
      const rows = s.flagRowsFromScan(s.raw(req.params.jobId), who(user))
      res.json({
        jobId: req.params.jobId,
        table: 'audio_clip_flags',
        written: false,
        note: 'These rows are NOT inserted — this is the preview. POST to ' +
          'jobs/<jobId>/raise-flags to raise them for real; that route writes through the ' +
          'approval gate, with a name against it, and only a human can clear one.',
        count: rows.length,
        rows,
      })
    } catch (err) { fail(res, err, `flag-rows ${req.params.jobId}`) }
  })

  // ── POST raise those rows into the approval gate, for real ───────────────
  //
  // Tom's ruling, 2026-08-06: findings that vanish when the scan ends cannot be the
  // machine proof-of-quality step feeding the manual gate, so this is the durable exit.
  // A flag is an ANNOTATION — it puts a clip in a human's field of view and touches no
  // audio — which is why a scan may raise one where it may never pass, repair or delete.
  //
  // The insert itself lives in the gate, the one module that owns audio_clip_flags: it
  // enforces source='detector', stamps `<detector> via <whoever pressed this>`, refuses to
  // double-raise a flag that is already open, and refuses to REOPEN one a human already
  // cleared at that revision — a machine does not get to overrule a person. Clearing stays
  // exactly where it was, on the gate, human-only, with a reason.
  app.post('/api/audio/tail-scan/jobs/:jobId/raise-flags', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    try {
      const s = store()
      // Same not-found / not-finished errors as `report`: a job that cannot be reported
      // cannot be raised either.
      s.report(req.params.jobId, { limit: 1 })
      const raw = s.raw(req.params.jobId)
      const rows = s.flagRowsFromScan(raw, who(user))
      const out = await gate().raiseDetectorFlags({
        courseCode: raw.courseCode, rows, actor: who(user),
      })
      res.json({
        jobId: req.params.jobId,
        written: true,
        ...out,
        // The counts mean different things and a reviewer must not read them as one number.
        note: `${out.raised} new flag(s) raised${out.alreadyOpen ? `; ${out.alreadyOpen} were already open` : ''}` +
          `${out.clearedAlready ? `; ${out.clearedAlready} had already been cleared by a human at this revision and were NOT reopened` : ''}. ` +
          'Flags are annotations, never changes to audio. A human clears them, or a repair moves the revision past them.',
      })
    } catch (err) { fail(res, err, `raise-flags ${req.params.jobId}`) }
  })

  // ── GET verdicts by audio id — the Audio Preview sampler's seam ───────────
  // ?audioIds=a,b,c (optional; omitted returns every verdict the scan holds).
  // Answers from the newest FINISHED scan of the course, and says which job that
  // was, so a stale annotation can never masquerade as a fresh measurement.
  app.get('/api/audio/tail-scan/:courseCode/verdicts', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const s = store()
      const job = s.latestFinished(req.params.courseCode)
      if (!job) {
        return res.json({
          courseCode: req.params.courseCode, jobId: null, scannedAt: null, verdicts: {},
          note: 'No finished scan of this course is held in this API process. Scan verdicts ' +
            'are in-memory and do not survive a restart — run a scan to populate them.',
        })
      }
      const all = s.verdictsByAudioId(job)
      const wanted = String(req.query.audioIds || '').split(',').map(x => x.trim()).filter(Boolean)
      const verdicts = wanted.length
        ? Object.fromEntries(wanted.filter(id => all[id]).map(id => [id, all[id]]))
        : all
      res.json({
        courseCode: req.params.courseCode,
        jobId: job.id,
        scannedAt: job.finishedAt,
        scope: job.scope,
        detector: s.DETECTOR,
        flagMeaning: s.FLAG_MEANING,
        // Absence is not a pass: a clip outside the scan's scope, or one the
        // decode failed on, simply has no verdict here.
        note: 'Only flagged clips carry a verdict. A clip with no entry was either not in ' +
          'the scan scope, could not be measured, or was not flagged — never "passed".',
        verdicts,
      })
    } catch (err) { fail(res, err, `verdicts ${req.params.courseCode}`) }
  })

  logger.log?.('[tail-scan] routes mounted: /api/audio/tail-scan/*')
}

module.exports = { mount }
