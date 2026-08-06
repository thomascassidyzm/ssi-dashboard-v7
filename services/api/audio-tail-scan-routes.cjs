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
 * There is no route here that writes to the database, writes to S3, renders
 * audio, repairs a clip or deletes anything. `/flag-rows` is the closest thing
 * to a write and it is a GET: it hands back the rows an insert WOULD make, so
 * that raising machine flags stays an explicit, attributable act belonging to
 * whoever owns the approval gate. See the seam notes at the foot of
 * services/audio-tail-scan.cjs.
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
        note: 'These rows are NOT inserted. Raising a machine flag puts work in front of ' +
          'a human and only a human can clear one, so the insert belongs to the approval ' +
          'gate surface, with a name against it.',
        count: rows.length,
        rows,
      })
    } catch (err) { fail(res, err, `flag-rows ${req.params.jobId}`) }
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
