/**
 * course-qa-gate-routes.cjs — HTTP surface for the manual approval gate
 * (services/course-qa-gate.cjs).
 *
 * Mounted from production-api.cjs in one line rather than written inline
 * there, for the same reason the audio-repair surface is: production-api.cjs
 * is a large file several workers edit at once, and a surface that reads in
 * one screen is worth more than proximity.
 *
 * ── Who may do what, and why ────────────────────────────────────────────────
 * SIGNING OFF A ROUND is open to any dashboard user. The gate's whole premise
 * is that human listening time is the scarce resource; restricting who may
 * spend it to admins would make 100 rounds per paid course undeliverable, and
 * the sign-off records who did it either way. Assignment is likewise open —
 * dividing work is not a privileged act.
 *
 * PASSING THE GATE is nobody's endpoint. There is no route here that sets
 * gate_status to 'passed'. It becomes passed when, and only when, every round
 * in the first X carries a current human sign-off — the arithmetic
 * consequence of X human actions, never a decision anything here makes.
 *
 * CHANGING X and OVERRIDING THE GATE are admin-only: both change what "safe
 * to publish" means for a whole course. An override additionally requires a
 * written reason and is logged loudly — there is no silent override flag.
 *
 * ── What this surface will never do ─────────────────────────────────────────
 * No route clears a flag on an automated judgement. Clearing takes a human
 * and their words. On 2026-08-05 an agent overruled a detector's flag as a
 * "transcription artifact" and cleared five of six genuinely damaged German
 * intros; the duration data later proved every flag real. That is the
 * mistake this surface has no verb for.
 */

/**
 * @param {object} app        express app
 * @param {object} deps
 * @param {function} deps.requireAdmin          (req,res) -> user|null (responds on failure)
 * @param {function} deps.requireDashboardUser  (req,res) -> user|null (responds on failure)
 * @param {function} deps.getDb                 () -> supabase client
 * @param {object}   [deps.gate]                injected gate (tests)
 * @param {object}   [deps.logger]
 */
function mount (app, deps) {
  const { requireAdmin, requireDashboardUser, getDb, logger = console } = deps

  // Lazy, for the same reason the repair surface is lazy: mounting must not
  // build a client, or one missing env var takes the whole production API
  // down at boot instead of failing one QA request.
  let _gate = deps.gate || null
  const gateCore = () => (_gate || (_gate =
    require('../course-qa-gate.cjs').createGate({ getDb, logger })))
  const gate = new Proxy({}, { get: (_t, k) => (...a) => gateCore()[k](...a) })

  const who = (user) => user?.email || user?.username || user?.id || 'unknown'

  function fail (res, err, context) {
    const status = err && err.status ? err.status : 500
    if (status >= 500) logger.error?.(`[qa-gate] ${context}:`, err)
    else logger.log?.(`[qa-gate] ${context}: ${err.message}`)
    const body = { error: err.message, code: err.code || 'qa_gate_error' }
    if (err.held) body.held = err.held
    if (err.gate) body.gate = err.gate
    res.status(status).json(body)
  }

  // ── Estate (Part 4) — the retrofit's priority list ────────────────────────
  app.get('/api/qa-gate/estate', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try { res.json(await gate.estate()) } catch (err) { fail(res, err, 'estate') }
  })

  // ── One course: gate, progress, open flags, assignments ──────────────────
  app.get('/api/qa-gate/:courseCode', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try { res.json(await gate.courseStatus(req.params.courseCode)) }
    catch (err) { fail(res, err, `status ${req.params.courseCode}`) }
  })

  // ── The play-through worklist ────────────────────────────────────────────
  app.get('/api/qa-gate/:courseCode/rounds', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json(await gate.rounds({
        courseCode: req.params.courseCode,
        from: req.query.from, limit: req.query.limit,
        all: req.query.all === 'true' || req.query.all === '1',
      }))
    } catch (err) { fail(res, err, `rounds ${req.params.courseCode}`) }
  })

  // ── The cycles of one round, with derived verification status ────────────
  app.get('/api/qa-gate/:courseCode/rounds/:legoId/cycles', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json(await gate.cycles({
        courseCode: req.params.courseCode, legoId: req.params.legoId,
      }))
    } catch (err) { fail(res, err, `cycles ${req.params.legoId}`) }
  })

  // ── Every clip in one round, so a flag can name which one was wrong ──────
  app.get('/api/qa-gate/:courseCode/rounds/:legoId/clips', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json(await gate.roundClips({
        courseCode: req.params.courseCode, legoId: req.params.legoId,
      }))
    } catch (err) { fail(res, err, `clips ${req.params.legoId}`) }
  })

  // ── The human pass on a round ────────────────────────────────────────────
  app.post('/api/qa-gate/:courseCode/rounds/:roundIndex/signoff', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    const { verdict, notes, flaggedAudioIds } = req.body || {}
    try {
      res.json(await gate.signOffRound({
        courseCode: req.params.courseCode,
        roundIndex: req.params.roundIndex,
        verdict, notes,
        flaggedAudioIds: Array.isArray(flaggedAudioIds) ? flaggedAudioIds : [],
        actor: who(user),
      }))
    } catch (err) { fail(res, err, `signoff ${req.params.courseCode}/${req.params.roundIndex}`) }
  })

  // ── Flags: what still needs a human ──────────────────────────────────────
  app.get('/api/qa-gate/:courseCode/flags', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json(await gate.openFlags({ courseCode: req.params.courseCode, limit: req.query.limit }))
    } catch (err) { fail(res, err, `flags ${req.params.courseCode}`) }
  })

  app.post('/api/qa-gate/:courseCode/flags/:flagId/clear', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    try {
      res.json(await gate.clearFlag({
        flagId: req.params.flagId, actor: who(user), reason: (req.body || {}).reason,
      }))
    } catch (err) { fail(res, err, `clear flag ${req.params.flagId}`) }
  })

  // ── Dividing the work ────────────────────────────────────────────────────
  app.post('/api/qa-gate/:courseCode/assignments', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    const { fromRound, toRound, assignee } = req.body || {}
    try {
      res.json(await gate.assignRounds({
        courseCode: req.params.courseCode, fromRound, toRound,
        assignee: assignee || who(user), actor: who(user),
      }))
    } catch (err) { fail(res, err, `assign ${req.params.courseCode}`) }
  })

  app.delete('/api/qa-gate/:courseCode/assignments/:assignmentId', async (req, res) => {
    const user = await requireDashboardUser(req, res)
    if (!user) return
    try {
      res.json(await gate.releaseAssignment({
        assignmentId: req.params.assignmentId, actor: who(user),
        reason: (req.body || {}).reason,
      }))
    } catch (err) { fail(res, err, `release ${req.params.assignmentId}`) }
  })

  // ── X, and the override. Both admin-only. ────────────────────────────────
  app.post('/api/qa-gate/:courseCode/required-rounds', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      res.json(await gate.setRequiredRounds(
        req.params.courseCode, (req.body || {}).requiredRounds, who(user)))
    } catch (err) { fail(res, err, `set X ${req.params.courseCode}`) }
  })

  app.post('/api/qa-gate/:courseCode/override', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      res.json(await gate.overrideGate({
        courseCode: req.params.courseCode, actor: who(user), reason: (req.body || {}).reason,
      }))
    } catch (err) { fail(res, err, `override ${req.params.courseCode}`) }
  })

  app.delete('/api/qa-gate/:courseCode/override', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      res.json(await gate.clearOverride({ courseCode: req.params.courseCode, actor: who(user) }))
    } catch (err) { fail(res, err, `clear override ${req.params.courseCode}`) }
  })

  logger.log?.('[qa-gate] routes mounted: /api/qa-gate/*')
}

module.exports = { mount }
