/**
 * audio-repair-routes.cjs — HTTP surface for the non-destructive audio repair
 * flow (services/audio-repair-core.cjs).
 *
 * Mounted from production-api.cjs in one line, rather than written inline
 * there: production-api.cjs is a large file that several workers edit
 * concurrently, and a repair surface that can be read in one screen is worth
 * more than proximity to the other /api/audio/* routes.
 *
 * ── Who may do what, and why ────────────────────────────────────────────────
 * PROPOSE via TTS costs money, so it is admin-only — the same posture as
 * /api/audio/regenerate-phrase. PROPOSE via upload spends nothing and is open
 * to any dashboard user, because the person holding the better take is usually
 * the recorder, not the admin.
 *
 * ACCEPT is the human pass — the moment audio reaches learners — so it is
 * admin-only too. That is deliberately the conservative end: loosening it
 * later is one line, and the approval-gate commission (a separate piece of
 * work) is what should really decide who may pass audio. See the seam note at
 * the bottom of this file.
 *
 * REJECT and every read are open to dashboard users: neither can touch the
 * learner path.
 *
 * ── What this surface will never do ─────────────────────────────────────────
 * There is no endpoint here that passes audio automatically, and no endpoint
 * that deletes anything. The detector's output is returned with its precision
 * attached, every time, because "machines may flag audio, only humans may pass
 * it" is the whole point of the flow.
 */

/**
 * @param {object} app        express app
 * @param {object} deps
 * @param {function} deps.requireAdmin          (req,res) -> user|null (responds on failure)
 * @param {function} deps.requireDashboardUser  (req,res) -> user|null (responds on failure)
 * @param {object}   [deps.core]                repair core; defaults to the live one
 * @param {object}   [deps.logger]
 */
function mount (app, deps) {
  const { requireAdmin, requireDashboardUser, logger = console } = deps

  // Lazy: mounting must not build a Supabase client or pull in phase8, or a
  // missing env var takes the whole production API down at boot rather than
  // failing one repair request.
  let _repair = deps.core || null
  const repairCore = () => (_repair || (_repair = require('../audio-repair.cjs').core()))
  const repair = new Proxy({}, { get: (_t, k) => (...a) => repairCore()[k](...a) })

  const who = (user) => user?.email || user?.username || user?.id || 'unknown'

  /** Repair errors carry their own status and code; anything else is a 500. */
  function fail (res, err, context) {
    const status = err && err.status ? err.status : 500
    if (status >= 500) logger.error?.(`[audio-repair] ${context}:`, err)
    else logger.log?.(`[audio-repair] ${context}: ${err.message}`)
    const body = { error: err.message, code: err.code || 'repair_failed' }
    if (err.rollback) body.rollback = err.rollback
    res.status(status).json(body)
  }

  /** Both preview URLs point back here, so the dashboard never needs S3 creds. */
  const urls = (courseCode, audioId, candidateId) => ({
    current: `/api/audio/repair/${courseCode}/${audioId}/current-audio`,
    candidate: candidateId ? `/api/audio/repair/candidate/${candidateId}/audio` : null,
  })

  // ── GET queue — worst first, ordering only, never a verdict ───────────────
  app.get('/api/audio/repair/:courseCode/queue', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const { courseCode } = req.params
      const limit = Math.min(Number(req.query.limit) || 50, 500)
      const out = await repair.queue({ courseCode, limit, role: req.query.role || null })
      res.json({
        ...out,
        items: out.items.map(i => ({
          ...i,
          url: `/api/audio/repair/${courseCode}/${i.audioId}/current-audio`,
        })),
      })
    } catch (err) { fail(res, err, 'queue') }
  })

  // ── POST propose — make before break; nothing is touched on failure ───────
  app.post('/api/audio/repair/:courseCode/:audioId/propose', async (req, res) => {
    const { courseCode, audioId } = req.params
    const { source = 'tts', text, voiceId, audioBase64, filename, dryRun = false } = req.body || {}

    // TTS costs money; an upload does not. Gate accordingly.
    const user = source === 'upload'
      ? await requireDashboardUser(req, res)
      : await requireAdmin(req, res)
    if (!user) return

    try {
      let buffer = null
      if (source === 'upload') {
        if (!audioBase64) {
          return res.status(400).json({ error: 'upload requires audioBase64', code: 'empty_upload' })
        }
        buffer = Buffer.from(String(audioBase64).replace(/^data:[^;]+;base64,/, ''), 'base64')
      }
      const out = await repair.propose({
        courseCode, audioId, source, text, voiceId, buffer, filename,
        actor: who(user), dryRun: !!dryRun,
      })
      if (out.dryRun) return res.json(out)
      logger.log?.(`[audio-repair] ${who(user)} proposed ${out.candidateId} (${source}) for ${audioId}`)
      res.json({
        candidateId: out.candidateId,
        candidate: {
          ...out.candidate,
          url: urls(courseCode, audioId, out.candidateId).candidate,
        },
        current: { ...out.current, url: urls(courseCode, audioId).current },
      })
    } catch (err) { fail(res, err, `propose ${audioId}`) }
  })

  // ── GET preview — current and candidate, side by side, with the facts ─────
  app.get('/api/audio/repair/:courseCode/:audioId/preview', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    const { courseCode, audioId } = req.params
    try {
      const out = await repair.preview({ courseCode, audioId })
      res.json({
        ...out,
        current: { ...out.current, url: urls(courseCode, audioId).current },
        candidates: out.candidates.map(c => ({
          ...c, url: urls(courseCode, audioId, c.candidateId).candidate,
        })),
      })
    } catch (err) { fail(res, err, `preview ${audioId}`) }
  })

  // ── POST accept — the human pass. Same id, new bytes, history kept ────────
  app.post('/api/audio/repair/:courseCode/:audioId/accept', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    const { courseCode, audioId } = req.params
    const { candidateId, reason } = req.body || {}
    if (!candidateId) {
      return res.status(400).json({ error: 'candidateId is required', code: 'missing_candidate' })
    }
    try {
      const out = await repair.accept({ courseCode, audioId, candidateId, actor: who(user), reason })
      logger.log?.(`[audio-repair] ${who(user)} ACCEPTED ${candidateId} -> ${audioId} rev ${out.revision}`)
      res.json(out)
    } catch (err) { fail(res, err, `accept ${audioId}`) }
  })

  // ── POST revert — put the clip back on the object it served before ───────
  // The safety net that makes accept safe to press: the superseded object was
  // never deleted, so undoing is data-only, costs nothing and renders nothing.
  app.post('/api/audio/repair/:courseCode/:audioId/revert', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    const { courseCode, audioId } = req.params
    const { toRevision = null, reason } = req.body || {}
    try {
      const out = await repair.revert({
        courseCode, audioId, toRevision: toRevision ? Number(toRevision) : null,
        actor: who(user), reason,
      })
      logger.log?.(`[audio-repair] ${who(user)} REVERTED ${audioId} to ${out.restoredS3Key} (rev ${out.revision})`)
      res.json(out)
    } catch (err) { fail(res, err, `revert ${audioId}`) }
  })

  // ── POST reject — discard a candidate; production is untouched ────────────
  app.post('/api/audio/repair/:courseCode/:audioId/reject', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    const { courseCode, audioId } = req.params
    const { candidateId, reason } = req.body || {}
    if (!candidateId) {
      return res.status(400).json({ error: 'candidateId is required', code: 'missing_candidate' })
    }
    try {
      res.json(await repair.reject({ courseCode, audioId, candidateId, actor: who(user), reason }))
    } catch (err) { fail(res, err, `reject ${audioId}`) }
  })

  // ── Audio bytes, so a producer can hear both without S3 credentials ───────
  // no-store: a candidate can be re-proposed under the same clip, and the
  // whole point of the panel is that what you hear is what you are deciding on.
  app.get('/api/audio/repair/candidate/:candidateId/audio', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const { buffer, contentType } = await repair.candidateBytes(req.params.candidateId)
      res.setHeader('Content-Type', contentType || 'audio/mpeg')
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Cache-Control', 'no-store')
      res.send(buffer)
    } catch (err) { fail(res, err, `candidate audio ${req.params.candidateId}`) }
  })

  app.get('/api/audio/repair/:courseCode/:audioId/current-audio', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const { buffer, contentType } = await repair.currentBytes(req.params.courseCode, req.params.audioId)
      res.setHeader('Content-Type', contentType || 'audio/mpeg')
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Cache-Control', 'no-store')
      res.send(buffer)
    } catch (err) { fail(res, err, `current audio ${req.params.audioId}`) }
  })

  logger.log?.('[audio-repair] routes mounted: /api/audio/repair/*')
}

/**
 * ── SEAM FOR THE APPROVAL GATE (a separate commission) ──────────────────────
 * The gate — "no course reaches learners without a human pass" — needs two
 * things from this half, both of which already exist as data rather than as
 * API surface, which is what makes them cheap to consume:
 *
 *   1. WHAT IS STILL SUSPECT. `repair.queue({ courseCode })` is the ordered
 *      list of clips no human has cleared, with the detector's precision
 *      attached so the gate can never mistake an ordering for a pass.
 *   2. WHAT A HUMAN HAS ACTUALLY PASSED. `course_audio_revisions` is the
 *      signed record: audio_id, revision, accepted_by, reason, created_at.
 *      A gate that wants "every flagged clip in this course has a human
 *      acceptance" can answer it with one join and no new plumbing.
 *
 * The gate should NOT call `accept` on anyone's behalf. Accept is the human
 * pass; a gate that could grant it would be the thing it exists to prevent.
 */
module.exports = { mount }
