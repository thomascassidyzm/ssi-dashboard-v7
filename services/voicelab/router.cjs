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
const cartesia = require('./cartesia.cjs')

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

  /**
   * Read one multipart upload: a single audio clip plus text fields.
   *
   * Capped at 25 MB. A clone sample is seconds of speech, so anything larger is
   * a mistake or an abuse, and streaming it to a vendor unbounded is how a
   * "small" endpoint becomes a bill.
   */
  const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
  function readUpload (req) {
    return new Promise((resolve, reject) => {
      let bus
      try {
        bus = require('busboy')({ headers: req.headers, limits: { files: 1, fileSize: MAX_UPLOAD_BYTES } })
      } catch (e) {
        return reject(Object.assign(new Error(`Expected a multipart upload: ${e.message}`), { status: 400 }))
      }
      const fields = {}
      const chunks = []
      let filename = 'sample.wav'
      let tooBig = false
      bus.on('field', (name, value) => { fields[name] = value })
      bus.on('file', (_name, stream, info) => {
        filename = info.filename || filename
        stream.on('data', (c) => chunks.push(c))
        stream.on('limit', () => { tooBig = true })
      })
      bus.on('error', (e) => reject(Object.assign(new Error(String(e.message)), { status: 400 })))
      bus.on('close', () => {
        if (tooBig) return reject(Object.assign(new Error(`Sample is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`), { status: 413 }))
        if (!chunks.length) return reject(Object.assign(new Error('No sample clip was uploaded.'), { status: 400 }))
        resolve({ clip: Buffer.concat(chunks), filename, fields })
      })
      req.pipe(bus)
    })
  }

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
      // The catalogue load is cached in params.cjs and never allowed to throw
      // into a request: a Cartesia outage must degrade this screen to
      // "registered voices only", not break it.
      await params.cartesiaCatalogue()
      const { CARTESIA_CATALOGUE } = params._state()
      res.json(await registry.build(supabase(), { cartesiaCatalogue: CARTESIA_CATALOGUE }))
    } catch (err) { fail(res, err, 'languages') }
  })

  /**
   * Cast a voice into a slot: (slot, language, gender, rank).
   *
   * `slot` is 'phrase' (the male/female course-material voices — the default,
   * and what every existing caller means) or 'guide' (the instruction and
   * encouragement voice, one per KNOWN language, no gender axis).
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
      const { rank, voiceId, notes = null } = req.body || {}
      // THE GUIDE SLOT IS NOT A GENDERED SLOT (Tom, 2026-08-29). It is one
      // voice per known language — the instruction and encouragement voice —
      // so a guide cast carries no gender from the caller. `gender` is still
      // written, because it is in the primary key, but it records the VOICE's
      // own gender as a fact and nothing reads it to decide anything. A partial
      // unique index keeps one guide per (language, rank) regardless.
      const slot = String((req.body || {}).slot || 'phrase')
      if (!registry.SLOTS.includes(slot)) {
        throw Object.assign(new Error(`slot must be one of ${registry.SLOTS.join(', ')}`), { status: 400 })
      }
      const gender = slot === 'guide' ? null : (req.body || {}).gender
      if (!language) throw Object.assign(new Error('language is required'), { status: 400 })
      if (slot === 'phrase' && !registry.GENDERS.includes(gender)) {
        throw Object.assign(new Error(`gender must be one of ${registry.GENDERS.join(', ')}`), { status: 400 })
      }
      const r = Number(rank)
      if (!Number.isInteger(r) || r < 0 || r >= registry.REQUIRED_RANKS) {
        throw Object.assign(new Error(`rank must be an integer 0..${registry.REQUIRED_RANKS - 1}`), { status: 400 })
      }
      if (!voiceId) throw Object.assign(new Error('voiceId is required — to empty a slot use DELETE'), { status: 400 })

      // A voice can only hold a slot if it has a `voices` row — the slot table
      // carries a foreign key to it. The Languages screen offers Cartesia
      // catalogue voices that may not be registered yet, so registering is done
      // here rather than making the operator do it as a separate step. It is
      // still only a catalogue lookup and an upsert; nothing renders.
      let slotVoiceId = String(voiceId)
      const { data: existing } = await supabase()
        .from('voices').select('voice_id, gender').eq('voice_id', slotVoiceId).maybeSingle()
      let voiceGender = existing ? existing.gender : null
      if (!existing && /^cartesia_/.test(slotVoiceId)) {
        const meta = await cartesia.fetchVoice(slotVoiceId)
        const voice = await cartesia.registerVoice(supabase(), {
          voiceId: slotVoiceId,
          name: meta.name,
          language: meta.language,
          gender: meta.gender === 'feminine' ? 'f' : meta.gender === 'masculine' ? 'm' : gender,
          registeredBy: who(user),
        })
        slotVoiceId = voice.voice_id
        voiceGender = voice.gender || null
      }

      // ── THE VOICE ALREADY SPEAKING THIS LANGUAGE ────────────────────────
      // Eleven of the twelve known languages read their instructions in a voice
      // that has no `voices` row — the estate has been rendering them from
      // per-course voice_config blocks for a long time. The slot table carries
      // a foreign key, so without this the Languages screen would show "eng is
      // currently Aran" beside a slot that could not be cast. Registering is a
      // single upsert of what the voice id already tells us; NOTHING renders,
      // and `human_recording` is refused because it is a marker on a clip
      // rather than a voice anything can speak with.
      if (!existing && !/^cartesia_/.test(slotVoiceId)) {
        if (slotVoiceId === 'human_recording') {
          throw Object.assign(new Error('human_recording is a marker on a clip, not a voice that can be cast into a slot.'), { status: 400 })
        }
        const engine = String(slotVoiceId).split('_')[0].toLowerCase()
        const { error: regErr } = await supabase().from('voices').upsert({
          voice_id: slotVoiceId,
          type: 'tts',
          tts_engine: engine,
          display_name: slotVoiceId,
          languages: [language],
          gender: registry.GENDERS.includes(gender) ? gender : null,
          is_active: true,
          notes: `Registered by the Voice Lab on ${new Date().toISOString().slice(0, 10)} when cast into the ${slot} slot for ${language}: it was already speaking this language's clips but had no voices row.`,
        }, { onConflict: 'voice_id' })
        if (regErr) throw Object.assign(new Error(`could not register voice ${slotVoiceId}: ${regErr.message}`), { status: 400 })
        voiceGender = registry.GENDERS.includes(gender) ? gender : null
      }

      // A guide row's gender is the VOICE's own, recorded as a fact and read by
      // nothing. Where the voice row carries none — Aran's does not — 'm' is
      // written to satisfy the key's NOT NULL, and the one-guide-per-rank index
      // is what actually keeps the slot single.
      const rowGender = slot === 'guide' ? (registry.GENDERS.includes(voiceGender) ? voiceGender : 'm') : gender

      const { error } = await supabase()
        .from('voice_language_roles')
        .upsert({
          language, gender: rowGender, rank: r, slot, voice_id: slotVoiceId, notes,
          assigned_by: who(user), updated_at: new Date().toISOString(),
        }, { onConflict: 'slot,language,gender,rank' })
      if (error) throw Object.assign(new Error(error.message), { status: 400 })

      logger.log?.(`[voicelab] cast ${slot} ${language}/${rowGender}/rank${r} = ${slotVoiceId} by ${who(user)}`)
      res.json({ ok: true, language, slot, gender: rowGender, rank: r, voiceId: slotVoiceId })
    } catch (err) { fail(res, err, 'cast') }
  })

  /**
   * Register a Cartesia catalogue voice into `voices` so it becomes castable.
   *
   * SPENDS NOTHING: a catalogue lookup and one database upsert. No speech is
   * rendered. This is the lever tts-provider-policy.cjs names for turning
   * Cartesia on for a language.
   */
  app.post('/api/voicelab/voices/cartesia/register', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const { voiceId, language, gender = null, name = null } = req.body || {}
      if (!voiceId) throw Object.assign(new Error('voiceId is required'), { status: 400 })
      // Ask Cartesia rather than trusting the caller: registering a voice id
      // that does not exist would create a row that fails at render time, which
      // is the false-green this whole screen exists to prevent.
      const meta = await cartesia.fetchVoice(voiceId)
      const voice = await cartesia.registerVoice(supabase(), {
        voiceId,
        name: name || meta.name,
        language: language || meta.language,
        gender: gender || (meta.gender === 'feminine' ? 'f' : meta.gender === 'masculine' ? 'm' : null),
        registeredBy: who(user),
      })
      logger.log?.(`[voicelab] registered cartesia voice ${voiceId} by ${who(user)}`)
      res.json({ ok: true, voice })
    } catch (err) { fail(res, err, 'register-cartesia-voice') }
  })

  /**
   * Clone a voice on Cartesia from one uploaded sample.
   *
   * RENDERS NOTHING and CANNOT trigger a bulk run: it uploads a sample and
   * returns a voice id. Hearing the result is a separate, capped audition
   * through the ordinary render path, which the daily character ceiling still
   * governs. Admin only, because it creates a resource on a metered vendor
   * account.
   */
  app.post('/api/voicelab/voices/cartesia/clone', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const parsed = await readUpload(req)
      const { clip, filename, fields } = parsed
      const out = await cartesia.createClone(supabase(), {
        clip,
        filename,
        name: fields.name,
        language: fields.language,
        gender: fields.gender || null,
        description: fields.description || null,
        registeredBy: who(user),
      })
      logger.log?.(`[voicelab] cloned cartesia voice ${out.cartesia.id} by ${who(user)}`)
      res.json({ ok: true, ...out })
    } catch (err) { fail(res, err, 'clone-cartesia-voice') }
  })

  /** Empty a slot. The language then reads as incomplete, which is the point. */
  app.delete('/api/voicelab/languages/:language/slot', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const language = String(req.params.language || '').trim()
      const slot = String(req.query.slot || 'phrase')
      const gender = String(req.query.gender || '')
      const rank = Number(req.query.rank)
      if (!registry.SLOTS.includes(slot)) {
        throw Object.assign(new Error(`slot must be one of ${registry.SLOTS.join(', ')}`), { status: 400 })
      }
      // A guide slot is keyed by (language, rank) alone, so clearing one does
      // not need — and must not require — a gender the caller has no business
      // knowing.
      if (!language || !Number.isInteger(rank) || (slot === 'phrase' && !registry.GENDERS.includes(gender))) {
        throw Object.assign(new Error('language and rank are required, plus gender for a phrase slot'), { status: 400 })
      }
      let q = supabase()
        .from('voice_language_roles')
        .delete()
        .eq('slot', slot).eq('language', language).eq('rank', rank)
      if (slot === 'phrase') q = q.eq('gender', gender)
      const { error } = await q
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      logger.log?.(`[voicelab] cleared ${slot} ${language}/${gender || '-'}/rank${rank} by ${who(user)}`)
      res.json({ ok: true, language, slot, gender, rank })
    } catch (err) { fail(res, err, 'clear') }
  })

  // ── PER-VOICE NATURAL PACE ────────────────────────────────────────────────
  //
  // Tom, 2026-08-29: "we should ALSO probably have a look at setting learning
  // app player speeds per voice from here … the speeds are a little different
  // between voices … maybe we have settings in the voice lab that should/could
  // be then read by the player?"
  //
  // These are that. Read-only measurement plus one human dial, and NOTHING
  // here renders, spends or touches audio — the pace is computed from clips
  // that already exist (tools/voice/measure-natural-pace.cjs).

  /**
   * GET /api/voicelab/pace — every measured voice, fastest first.
   *
   * THIS IS THE READING SURFACE the learner app will consume. `effective` is
   * the only number a consumer should divide by; it is the measurement times
   * the human's nudge, and it is null — never 1.0 — for a voice nobody has
   * measured, because a consumer must be able to tell "typical for its
   * language" from "we have not looked".
   */
  app.get('/api/voicelab/pace', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const { data, error } = await supabase()
        .from('voices')
        .select('voice_id, display_name, human_name, tts_engine, gender, languages, is_active, natural_pace_ratio, natural_pace_cps, natural_pace_samples, natural_pace_measured_at, natural_pace_method, natural_pace_nudge, natural_pace_nudge_note')
        .not('natural_pace_ratio', 'is', null)
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      const voices = (data || []).map((v) => ({
        voiceId: v.voice_id,
        name: v.display_name || v.human_name || v.voice_id,
        engine: v.tts_engine || null,
        gender: v.gender || null,
        languages: v.languages || [],
        active: v.is_active !== false,
        method: v.natural_pace_method || null,
        ...registry.paceOf(v),
      })).sort((a, b) => (b.effective || 0) - (a.effective || 0))
      res.json({ voices, count: voices.length })
    } catch (err) { fail(res, err, 'pace') }
  })

  /**
   * PUT /api/voicelab/voices/:voiceId/pace — the human's nudge, and ONLY that.
   *
   * The measurement is never writable from a screen (Tom's ruling: pace is
   * measured from rendered audio, not asked of a human), and this route
   * deliberately cannot write it. What an ear IS allowed to say is "the number
   * is close but that one still drags", and that is a separate column so a
   * re-measurement can never delete it.
   *
   * Body: { nudge: number|null, note?: string }. null clears it.
   */
  app.put('/api/voicelab/voices/:voiceId/pace', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const voiceId = String(req.params.voiceId || '').trim()
      if (!voiceId) throw Object.assign(new Error('voiceId is required'), { status: 400 })
      const raw = (req.body || {}).nudge
      let nudge = null
      if (raw !== null && raw !== undefined && raw !== '') {
        nudge = Number(raw)
        // The same bounds the migration's CHECK holds, refused here with a
        // sentence rather than a constraint violation.
        if (!Number.isFinite(nudge) || nudge < 0.5 || nudge > 2.0) {
          throw Object.assign(new Error('nudge must be a number between 0.5 and 2.0, or null to clear it'), { status: 400 })
        }
      }
      const note = (req.body || {}).note ? String((req.body || {}).note).slice(0, 500) : null
      const { data, error } = await supabase()
        .from('voices')
        .update({ natural_pace_nudge: nudge, natural_pace_nudge_note: note })
        .eq('voice_id', voiceId)
        .select('voice_id, natural_pace_ratio, natural_pace_nudge, natural_pace_nudge_note')
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      if (!data || !data.length) throw Object.assign(new Error(`no voice ${voiceId} in the registry`), { status: 404 })
      logger.log?.(`[voicelab] pace nudge ${voiceId} -> ${nudge === null ? 'cleared' : nudge} by ${who(user)}`)
      res.json({ ok: true, voiceId, ...registry.paceOf(data[0]) })
    } catch (err) { fail(res, err, 'pace-nudge') }
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
