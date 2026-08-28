/**
 * VOICELAB — the lab's HTTP surface. Mounted from production-api.cjs in one line.
 *
 * Tom asked for "an actual LAB with parameters, running tests, and process and all
 * sorts" (2026-08-07). Three layers, and each one is an endpoint group here:
 *
 *   PARAMETERS  /params        every knob, per provider, with an honest supports[] flag
 *                              so the UI greys out what the provider does not honour —
 *                              and the gate thresholds, which really do reach the gates.
 *   TESTS       /estimate      what it will cost, BEFORE the run button is armed
 *               /runs          single clip, blind A/B, or a small batch
 *   PROCESS     /runs, /runs/:id, /runs/:id/rerun, /runs/:id/export
 *                              every run is an experiment: listed, re-runnable,
 *                              comparable side by side, exportable once approved
 *
 * ── WHAT THIS SURFACE WILL NEVER DO ────────────────────────────────────────────────
 * It does not write course_audio. It does not bind a slot. It does not write
 * `algorithm_config` — /export hands back JSON for a human to apply, which is Pod Lab's
 * rule and Pod Lab's reason: a config write is global to every learner within about five
 * minutes and has no draft/live split. A lab that could deploy from a slider is a lab
 * that can break every course from a slider.
 *
 * ── WHO MAY DO WHAT ────────────────────────────────────────────────────────────────
 * Reads and /estimate: any dashboard user — they spend nothing. POST /runs and
 * /runs/:id/rerun: admin only, because those are the two calls that spend money. Same
 * posture as services/api/audio-repair-routes.cjs, and the same mount signature.
 */

const fs = require('fs')

const lab = require('./lab.cjs')
const store = require('./store.cjs')
const params = require('./params.cjs')
const content = require('./content.cjs')
const registry = require('./registry.cjs')

/**
 * @param {object} app        express app
 * @param {object} deps
 * @param {function} deps.requireAdmin          (req,res) -> user|null (responds on failure)
 * @param {function} deps.requireDashboardUser  (req,res) -> user|null (responds on failure)
 * @param {object}   [deps.logger]
 */
function mount (app, deps) {
  const {
    requireAdmin,
    requireDashboardUser,
    logger = console,
    // Defaulted rather than required, so mounting this router does not change
    // production-api.cjs's one-line mount call. Lazy for the same reason the
    // runner is lazy: requiring the client at mount time would make one missing
    // env var take the whole production API down at boot.
    supabase = () => require('../supabase-client.cjs').getClient(),
  } = deps

  // Lazy: mounting must not pull in phase8 or a TTS client, or one missing env var takes
  // the whole production API down at boot rather than failing one lab request.
  const runner = () => require('./runner.cjs')

  const who = (user) => user?.email || user?.username || user?.id || 'unknown'

  function fail (res, err, context) {
    const status = err && err.status ? err.status : 500
    if (status >= 500) logger.error?.(`[voicelab] ${context}:`, err)
    else logger.log?.(`[voicelab] ${context}: ${err.message}`)
    res.status(status).json({ error: err.message, code: err.code || 'voicelab_failed' })
  }

  /**
   * An <audio src> cannot set an Authorization header, so the clip route also accepts the
   * same bearer token as `?access_token=`. It is the identical token through the identical
   * check — the transport changes, the gate does not.
   */
  function allowQueryToken (req) {
    if (!req.headers.authorization && req.query && req.query.access_token) {
      req.headers.authorization = `Bearer ${req.query.access_token}`
    }
  }

  // ── PARAMETERS ────────────────────────────────────────────────────────────
  app.get('/api/voicelab/params', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json(await params.payload({ charsSpentToday: store.charsSpentToday() }))
    } catch (err) { fail(res, err, 'params') }
  })

  // ── THE PER-LANGUAGE REGISTRY — the lab's front door ─────────────────────
  //
  // Tom, 2026-08-28: "a single place to check configured voices per language".
  // Read-only and spends nothing, so it is open to any dashboard user; the two
  // writes below are admin, because casting a voice is an estate decision.

  app.get('/api/voicelab/languages', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json(await registry.build(supabase()))
    } catch (err) { fail(res, err, 'languages') }
  })

  /**
   * Cast a voice into a (language, gender, rank) slot.
   *
   * SPENDS NOTHING. This writes one row of voice_language_roles and nothing
   * else — no render is triggered, no course_audio row is touched, no
   * voice_config is written. Casting and rendering are deliberately separate:
   * the lab exports a config for a human to apply, and that rule survives.
   */
  app.put('/api/voicelab/languages/:language/slot', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const language = String(req.params.language || '').trim()
      const { gender, rank, voiceId, notes = null } = req.body || {}
      if (!language) throw Object.assign(new Error('language is required'), { status: 400 })
      if (!registry.GENDERS.includes(gender)) {
        throw Object.assign(new Error(`gender must be one of ${registry.GENDERS.join(', ')}`), { status: 400 })
      }
      const r = Number(rank)
      if (!Number.isInteger(r) || r < 0 || r >= registry.REQUIRED_RANKS) {
        throw Object.assign(new Error(`rank must be an integer 0..${registry.REQUIRED_RANKS - 1}`), { status: 400 })
      }
      if (!voiceId) throw Object.assign(new Error('voiceId is required — to empty a slot use DELETE'), { status: 400 })

      const { error } = await supabase()
        .from('voice_language_roles')
        .upsert({
          language, gender, rank: r, voice_id: String(voiceId), notes,
          assigned_by: who(user), updated_at: new Date().toISOString(),
        }, { onConflict: 'language,gender,rank' })
      if (error) throw Object.assign(new Error(error.message), { status: 400 })

      logger.log?.(`[voicelab] cast ${language}/${gender}/rank${r} = ${voiceId} by ${who(user)}`)
      res.json({ ok: true, language, gender, rank: r, voiceId })
    } catch (err) { fail(res, err, 'cast') }
  })

  /** Empty a slot. The language then reads as incomplete, which is the point. */
  app.delete('/api/voicelab/languages/:language/slot', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const language = String(req.params.language || '').trim()
      const gender = String(req.query.gender || '')
      const rank = Number(req.query.rank)
      if (!language || !registry.GENDERS.includes(gender) || !Number.isInteger(rank)) {
        throw Object.assign(new Error('language, gender and rank are all required'), { status: 400 })
      }
      const { error } = await supabase()
        .from('voice_language_roles')
        .delete()
        .eq('language', language).eq('gender', gender).eq('rank', rank)
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      logger.log?.(`[voicelab] cleared ${language}/${gender}/rank${rank} by ${who(user)}`)
      res.json({ ok: true, language, gender, rank })
    } catch (err) { fail(res, err, 'clear') }
  })

  // ── The sentence picker: real course text, read-only, spends nothing ──────
  app.get('/api/voicelab/courses', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      res.json({ courses: await content.courses() })
    } catch (err) { fail(res, err, 'courses') }
  })

  app.get('/api/voicelab/sentences', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const out = await content.sentences({
        course: req.query.course,
        role: req.query.role || 'seed',
        q: req.query.q || '',
        limit: req.query.limit,
      })
      res.json(out)
    } catch (err) { fail(res, err, 'sentences') }
  })

  // ── ESTIMATE — what it costs, before anything is armed ────────────────────
  app.post('/api/voicelab/estimate', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const { sentences = [], configs = [] } = req.body || {}
      const cfgs = configs.map((c, i) => ({ key: String.fromCharCode(65 + i), ...lab.normaliseConfig(c) }))
      res.json(lab.estimate({
        sentences: sentences.map((s) => (typeof s === 'string' ? s : s?.text)),
        configs: cfgs,
        charsSpentToday: store.charsSpentToday(),
      }))
    } catch (err) { fail(res, err, 'estimate') }
  })

  // ── RUN — the one call that spends money ──────────────────────────────────
  app.post('/api/voicelab/runs', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const body = req.body || {}
      const kind = ['single', 'ab', 'batch'].includes(body.kind) ? body.kind : 'single'
      const sentences = (body.sentences || []).map((s) => (typeof s === 'string' ? s : s?.text)).filter(Boolean)
      const configs = (body.configs || []).map((c, i) => ({ key: String.fromCharCode(65 + i), ...lab.normaliseConfig(c) }))

      const refusal = lab.refuse({ kind, sentences, configs, charsSpentToday: store.charsSpentToday() })
      if (refusal) return res.status(refusal.status).json({ error: refusal.error, code: refusal.status === 429 ? 'ceiling_reached' : 'refused' })

      const missingVoice = configs.find((c) => !c.voiceId || !params.findLanguage(c.language))
      if (missingVoice) {
        return res.status(400).json({ error: 'Every config needs a voiceId and a language this lab can steer.', code: 'bad_config' })
      }

      const exp = runner().buildExperiment({
        id: store.newId(),
        kind,
        title: body.title,
        sentences: body.sentences,
        configs,
        blind: body.blind,
        notes: body.notes,
        createdBy: who(user),
      })
      store.writeExperiment(exp)
      logger.log?.(`[voicelab] ${who(user)} started ${exp.id} (${kind}, ${exp.clips.length} clips, ${exp.totals.chars} chars)`)

      // Deliberately not awaited: the clip is playable long before the whisper passes
      // finish, and the UI polls GET /runs/:id.
      runner().execute(exp.id, { logger }).catch((e) => logger.error?.(`[voicelab] run ${exp.id} died: ${e.message}`))

      res.json({ experiment: exp })
    } catch (err) { fail(res, err, 'run') }
  })

  // ── PROCESS — the experiment log ──────────────────────────────────────────
  app.get('/api/voicelab/runs', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200)
      res.json({ experiments: store.listExperiments(limit).map(lab.summarise) })
    } catch (err) { fail(res, err, 'runs') }
  })

  app.get('/api/voicelab/runs/:id', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const exp = store.readExperiment(req.params.id)
      if (!exp) return res.status(404).json({ error: 'unknown experiment', code: 'not_found' })
      res.json({ experiment: exp })
    } catch (err) { fail(res, err, `run ${req.params.id}`) }
  })

  app.post('/api/voicelab/runs/:id/rerun', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const prev = store.readExperiment(req.params.id)
      if (!prev) return res.status(404).json({ error: 'unknown experiment', code: 'not_found' })

      const sentences = prev.sentences.map((s) => s.text)
      const refusal = lab.refuse({ kind: prev.kind, sentences, configs: prev.configs, charsSpentToday: store.charsSpentToday() })
      if (refusal) return res.status(refusal.status).json({ error: refusal.error, code: refusal.status === 429 ? 'ceiling_reached' : 'refused' })

      const exp = runner().buildExperiment({
        id: store.newId(),
        kind: prev.kind,
        title: `${prev.title} · rerun`,
        sentences: prev.sentences,
        configs: prev.configs,
        blind: prev.blind,
        notes: prev.notes,
        createdBy: who(user),
        rerunOf: prev.id,
      })
      store.writeExperiment(exp)
      logger.log?.(`[voicelab] ${who(user)} rerun ${prev.id} -> ${exp.id}`)
      runner().execute(exp.id, { logger }).catch((e) => logger.error?.(`[voicelab] rerun ${exp.id} died: ${e.message}`))
      res.json({ experiment: exp })
    } catch (err) { fail(res, err, `rerun ${req.params.id}`) }
  })

  // ── EXPORT — a parameter set for a human to apply. Writes nothing ─────────
  app.post('/api/voicelab/runs/:id/export', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const exp = store.readExperiment(req.params.id)
      if (!exp) return res.status(404).json({ error: 'unknown experiment', code: 'not_found' })
      res.json(lab.exportConfig(exp, (req.body || {}).configKey))
    } catch (err) { fail(res, err, `export ${req.params.id}`) }
  })

  // ── The bytes ─────────────────────────────────────────────────────────────
  // A literal regex route, not a path pattern: the id is 16 hex characters and nothing
  // else, so `..` never reaches the filesystem in the first place.
  app.get(/^\/api\/voicelab\/clip\/([a-f0-9]{16})\.mp3$/, async (req, res) => {
    allowQueryToken(req)
    if (!await requireDashboardUser(req, res)) return
    try {
      const id = req.params[0]
      const file = store.readClip(id)
      if (!file) return res.status(404).json({ error: 'clip not found', code: 'not_found' })
      const stat = fs.statSync(file)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Content-Length', stat.size)
      // A lab clip is immutable once written — the id is content's, not a slot's — so it
      // is safe to cache, and a blind A/B that re-fetches on every play is a slow A/B.
      res.setHeader('Cache-Control', 'private, max-age=86400')
      fs.createReadStream(file).pipe(res)
    } catch (err) { fail(res, err, 'clip') }
  })

  logger.log?.(`[voicelab] routes mounted: /api/voicelab/* (lab dir ${store.LAB_DIR})`)
}

module.exports = { mount }
