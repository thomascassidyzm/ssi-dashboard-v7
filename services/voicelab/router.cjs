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
// A cast slot is keyed on the DIALECT entity ('deu_at'); a PROVIDER only ever
// knows the base language ('deu'). Everything that steers a render, registers a
// voice's spoken languages or asks Cartesia a question uses the base.
const { baseLanguageOfCastKey } = require('../shared/cast-language-key.cjs')
const content = require('./content.cjs')
const registry = require('./registry.cjs')
const cartesia = require('./cartesia.cjs')
const samples = require('./samples.cjs')
const humanRecorded = require('../shared/human-recorded-roles.cjs')
const speakers = require('./speakers.cjs')
const consent = require('./consent.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')
const declaration = require('./declaration.cjs')
const { isHumanVoiceLang } = require('../shared/human-voice-courses.cjs')

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
    // Injectable for the same reason `supabase` is: the sample routes' wire
    // contract — the NDJSON framing a progress bar reads — is testable without
    // spending a penny on TTS, but only if the renderer can be stood in for.
    samples: samplesModule = samples,
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
    // `err.detail` rides alongside the sentence for the callers that have to
    // BRANCH on a refusal rather than merely show it. The consent gate is the
    // case that forced it (2026-09-01): the browser needs to know whether to
    // offer the attestation instead or to ask for the line to be read again,
    // and making a screen string-match English prose to find that out means the
    // day the sentence is redlined the screen silently takes the wrong branch.
    // The sentence stays the thing a human reads; the flag is the thing code reads.
    res.status(status).json({ error: err.message, code: err.code || 'voicelab_failed', ...(err.detail || {}) })
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
   * The samples for one language: the real course line, and a playable URL for every
   * voice that already has a sample of it — cached here, or free from the estate's own
   * clips. Voices with neither come back in `missing`, with what preparing them costs.
   *
   * SPENDS NOTHING. Three SELECTs and a disk read. This is the call the page makes on
   * open, which is why it must never render: "open a language and it plays" is the
   * whole ask, and a page that renders on open is a page that spins.
   */
  app.get('/api/voicelab/languages/:language/samples', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const language = String(req.params.language || '').trim()
      if (!language) throw Object.assign(new Error('language is required'), { status: 400 })
      const voiceIds = String(req.query.voices || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200)
      res.json(await samplesModule.read({ language, voiceIds }))
    } catch (err) { fail(res, err, `samples ${req.params.language}`) }
  })

  /**
   * Prepare the missing samples for one language.
   *
   * SPENDS MONEY — one Cartesia clip per voice, on the line above, capped at
   * SAMPLE_PREPARE_MAX voices per press and refused on top of that by the lab's daily
   * character ceiling. Ledgered per clip the moment the money is spent, so the ceiling
   * and the spend report both count a sample exactly as they count an audition.
   * Nothing here writes course_audio.
   */
  /**
   * ONE PRESS COVERS THE WHOLE ROW (Tom, 2026-08-31). The cap was 12, which on
   * a 21-voice Chinese row or an 80-voice French one left most of the list as
   * dots after a press — and a press that half-works is why the row looked
   * unpreviewable in the first place. 80 is the registry's own candidate cap,
   * so the ceiling here is now the row, not an arbitrary slice of it. The daily
   * character ceiling still governs underneath, per clip.
   */
  const SAMPLE_PREPARE_MAX = 80
  app.post('/api/voicelab/languages/:language/samples/prepare', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const language = String(req.params.language || '').trim()
      if (!language) throw Object.assign(new Error('language is required'), { status: 400 })
      const voiceIds = ((req.body || {}).voiceIds || []).map((s) => String(s).trim()).filter(Boolean)
      if (!voiceIds.length) throw Object.assign(new Error('voiceIds is required'), { status: 400 })
      const max = Math.min(Number((req.body || {}).max) || SAMPLE_PREPARE_MAX, SAMPLE_PREPARE_MAX)
      const out = await samplesModule.prepare({
        language, voiceIds, maxVoices: max, force: Boolean((req.body || {}).force),
        renderOne: (a) => runner().renderOne(a),
      })
      logger.log?.(`[voicelab] prepared ${out.rendered.length} sample(s) for ${language} (${out.chars} chars) for ${who(user)}`)
      res.json({ ok: true, maxPerPress: SAMPLE_PREPARE_MAX, ...out })
    } catch (err) { fail(res, err, `prepare-samples ${req.params.language}`) }
  })

  /**
   * The same press, reported CLIP BY CLIP as it happens.
   *
   * A twenty-voice row takes a couple of minutes to render, and a button that
   * goes quiet for two minutes is a button nobody trusts. So this writes one
   * NDJSON line per clip the moment that clip exists — the screen plays voice
   * one while voice fourteen is still rendering — and a final line carrying the
   * whole refreshed state, which is exactly what the plain endpoint returns.
   *
   * NDJSON rather than SSE because every lab endpoint is behind a bearer token
   * and EventSource cannot carry a header; a streamed fetch can.
   *
   * Once the first byte is written the status code is spent, so an error after
   * that point is a `{ "error": … }` LINE, never a 500 the client cannot see.
   */
  app.post('/api/voicelab/languages/:language/samples/prepare/stream', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    const language = String(req.params.language || '').trim()
    const write = (o) => { res.write(`${JSON.stringify(o)}\n`) }
    try {
      if (!language) throw Object.assign(new Error('language is required'), { status: 400 })
      const voiceIds = ((req.body || {}).voiceIds || []).map((s) => String(s).trim()).filter(Boolean)
      if (!voiceIds.length) throw Object.assign(new Error('voiceIds is required'), { status: 400 })
      const max = Math.min(Number((req.body || {}).max) || SAMPLE_PREPARE_MAX, SAMPLE_PREPARE_MAX)
      res.set('Content-Type', 'application/x-ndjson; charset=utf-8')
      res.set('Cache-Control', 'no-cache, no-transform')
      res.set('X-Accel-Buffering', 'no')
      res.flushHeaders?.()
      const out = await samplesModule.prepare({
        language, voiceIds, maxVoices: max, force: Boolean((req.body || {}).force),
        renderOne: (a) => runner().renderOne(a),
        onClip: (ev) => write({ clip: ev }),
      })
      logger.log?.(`[voicelab] prepared ${out.rendered.length} sample(s) for ${language} (${out.chars} chars) for ${who(user)}`)
      write({ done: true, ok: true, maxPerPress: SAMPLE_PREPARE_MAX, ...out })
      res.end()
    } catch (err) {
      logger.error?.(`[voicelab] prepare-samples-stream ${language}: ${err.message}`)
      if (res.headersSent) { write({ done: true, error: err.message }); res.end() }
      else fail(res, err, `prepare-samples-stream ${language}`)
    }
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
  /**
   * ── THE HUMAN-VOICE GUARD, AT THE FRONT DOOR (Tom, 2026-08-31) ───────────
   *
   * "A visible refusal beats a quiet one." A cast on a language whose courses
   * are human-recorded must not be written and then quietly ignored by the
   * reader: the operator has to be told, on screen, before they walk away.
   *
   * Two outcomes, and which one applies is arithmetic, not taste:
   *   EVERY course this cast could reach is human-recorded → 409, no write.
   *   SOME are → the cast is written for the synthetic courses and the response
   *   names the ones it will not speak over, so the screen can show them.
   *
   * Read live rather than from registry.build(): this is one small SELECT and
   * the answer must be the state at the moment of the tap, not the state when
   * the page was opened.
   */
  async function humanGuardFor (language, slot) {
    const db = supabase()
    const [{ data: courses }, humanRows] = await Promise.all([
      db.from('courses').select('course_code, target_lang, known_lang, voice_config'),
      humanRecorded.loadHumanRecordedRoles(db),
    ])
    const list = courses || []
    const affected = humanRecorded.humanRecordedForLanguage({
      language, slot, courses: list, humanRows,
    })
    // How many courses this cast could reach AT ALL, so "all of them are human"
    // is a fact rather than an impression.
    const reach = slot === 'guide'
      ? list.filter((c) => c.known_lang === language).length
      : list.filter((c) => c.target_lang === language || c.known_lang === language).length
    return { ...affected, reach, blocked: reach > 0 && affected.total >= reach }
  }

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

      // THE HUMAN-VOICE GUARD. Checked BEFORE the voice is registered, so a
      // refused cast leaves no trace anywhere — not even a stray `voices` row.
      const guard = await humanGuardFor(language, slot)
      if (guard.blocked) {
        const names = guard.courses.map((c) => `${c.course} (${c.roles.join(', ')})`).join(', ')
        return res.status(409).json({
          error: `Every ${slot === 'guide' ? 'course taught from' : 'course that uses'} ${language} is human-recorded, so this cast would speak over real recordings and has NOT been saved: ${names}. Their gaps are a recording worklist, not a casting gap (Tom 2026-08-31; services/shared/human-voice-courses.cjs).`,
          code: 'HUMAN_RECORDED',
          language,
          slot,
          humanRecorded: guard,
        })
      }

      // ── THE RULING-LEVEL BACKSTOP: cym, bre and pdc, ALWAYS ─────────────
      // The guard above is computed from DATA — it refuses when every course
      // the cast reaches is already human-recorded. That is the right general
      // rule and it catches Welsh today. It would stop catching Welsh the
      // moment somebody added a cym course with no recordings in it yet, and
      // "there are no recordings yet" is precisely a Welsh RECORDING WORKLIST,
      // never a licence to synthesise.
      //
      // So this is the ruling stated as a rule rather than derived from a
      // count. Tom, 2026-08-13, as a hard rule: "Aran's and Catrin's
      // recordings are never overwritten by synthesis", and cym/bre/pdc are
      // permanently excluded from every TTS render queue with deliberately no
      // env var and no --force flag. A HUMAN voice may still be cast into
      // them — that is what the slot is FOR on those languages.
      if (isHumanVoiceLang(language)) {
        const { data: pv } = await supabase()
          .from('voices').select('type').eq('voice_id', String(voiceId)).maybeSingle()
        const isHumanVoice = pv ? pv.type === 'human' : /^human/i.test(String(voiceId))
        if (!isHumanVoice) {
          return res.status(409).json({
            error: `${language} is human-voiced only — Aran's and Catrin's recordings are never replaced by synthesis (Tom's ruling, 2026-08-13). A synthetic voice cannot be cast into it, and its gaps are a recording worklist rather than a render backlog.`,
            code: 'HUMAN_VOICE_LANGUAGE',
            language,
            slot,
          })
        }
      }

      // ── THE CONSENT BLOCK (Tom's ruling, 2026-08-31) ────────────────────
      //
      //   "we are never going to use a voice without consent"
      //
      // A hard refusal, not a warning. The 2026-08-31 consent flow shipped a
      // castWarning() and said in its own comments that "a hard block is Tom's
      // call and he has not made it"; he has now made it, and this is it.
      //
      // Checked HERE — before the voice is registered, before the upsert — for
      // the same reason the human-voice guard is: a refused cast must leave no
      // trace anywhere, not even a stray `voices` row for a person nobody has
      // asked. It applies only where the consent question is real (a clone, a
      // human recordist, or any voice with a consent state already recorded);
      // a vendor's stock catalogue voice has nobody to ask and is untouched.
      //
      // THE CLIENT CANNOT GET ROUND IT. The screen hides and disables the
      // control, but this is the endpoint that writes the row, so a hand-rolled
      // curl, a stale tab or a future screen that forgets all get the same 409.
      await consentGate.assertConsented(String(voiceId), {
        db: supabase(),
        context: `cast ${slot} ${language}`,
      })

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
          // The BASE language: this records what the voice can SPEAK, and a
          // provider has no notion of 'deu_at'. Which dialect it is cast for
          // is the slot's business, not the voice row's.
          languages: [baseLanguageOfCastKey(language) || language],
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
      if (guard.total) {
        logger.log?.(`[voicelab] cast ${slot} ${language} SKIPS ${guard.total} human-recorded course(s): ${guard.courses.map((c) => c.course).join(', ')}`)
      }
      // `skipped` is the visible half of the refusal: the cast is saved, and the
      // response says out loud which courses it will not reach and why, so the
      // screen can show it rather than the operator discovering it at render.
      res.json({
        ok: true, language, slot, gender: rowGender, rank: r, voiceId: slotVoiceId,
        skipped: guard.courses,
        skippedTotal: guard.total,
        reach: guard.reach,
      })
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
      // The catalogue is memoised for the life of the process, so a voice
      // registered a second ago would otherwise be invisible in the lab's own
      // menu until the next restart.
      params.invalidateCartesiaCatalogue()
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

      // ── THE CONSENT GATE (2026-09-01) ─────────────────────────────────────
      //
      // Tom: "A clone must not be creatable from a browser recording where the
      // phrase was not read." So this route will not reach Cartesia at all
      // until it can say, in a column, what this person consented to. There are
      // exactly three ways through, and they are not interchangeable.
      const sampleFrom = String(fields.sampleFrom || '').trim().toLowerCase()
      const attestedBy = String(fields.attestedBy || '').trim()
      const agreed = String(fields.declarationAgreed || '').trim().toLowerCase() === 'true'
      const person = fields.person || null
      let declarationRecord = null

      if (sampleFrom === 'record') {
        // Recorded here, in the browser, seconds ago: the person is present and
        // the line they read is inside the very bytes about to be cloned.
        const check = await declaration.verifySpoken(clip, { language: fields.language })
        if (check.available && check.ok) {
          declarationRecord = declaration.declarationRecord({ kind: 'spoken', heard: check.heard, person })
        } else if (check.available) {
          // We listened, and the line was not in the recording. Quote what WAS
          // heard: the operator needs to see why — a misread word, the wrong
          // clip picked up, or a microphone that captured nothing — and a bare
          // "consent phrase not detected" sends them round the loop blind.
          throw Object.assign(new Error(
            `The consent line was not heard in that recording. It needs to say: "${declaration.SPOKEN_PHRASE}" — what came through instead was: "${(check.heard || '').trim() || 'nothing at all'}". Record it again, reading the line aloud.`,
          ), { status: 400, detail: { declarationNotHeard: true, heard: check.heard, coverage: check.coverage } })
        } else {
          // THE HONEST FALLBACK, and it is deliberate. Whisper runs locally and
          // on some machines it is simply not installed, so "could not check"
          // is a real state — it is not a pass and it is not a failure. Waving
          // the clone through would record a spoken declaration that nothing
          // verified, which is the one lie this feature exists to prevent.
          // Blocking would make a legitimate recording uncloneable because of a
          // missing binary. So the recording route drops to exactly the same
          // attestation the upload route uses, and the voice carries
          // 'attested' — the weaker, truthful claim — rather than 'spoken'.
          if (!agreed || !attestedBy) {
            throw Object.assign(new Error(
              'This machine cannot listen to the recording to check that the consent line was read, so it needs the written statement instead: tick the consent wording and say who is making the statement.',
            ), { status: 400, detail: { needsAttestation: true } })
          }
          declarationRecord = declaration.declarationRecord({ kind: 'attested', attestedBy, person })
        }
      } else {
        // UPLOAD, and the default when nothing says otherwise — because the
        // default must be the branch that cannot be faked. A missing
        // sampleFrom must never fall into the spoken path and record a
        // declaration nobody made.
        if (!agreed || !attestedBy) {
          throw Object.assign(new Error(
            `Nobody has agreed to the consent wording. An uploaded recording cannot prove who spoke, so somebody has to state it: tick "${declaration.ATTESTATION}" and say who is making the statement.`,
          ), { status: 400, detail: { needsAttestation: true } })
        }
        declarationRecord = declaration.declarationRecord({ kind: 'attested', attestedBy, person })
      }

      const out = await cartesia.createClone(supabase(), {
        clip,
        filename,
        name: fields.name,
        language: fields.language,
        gender: fields.gender || null,
        description: fields.description || null,
        registeredBy: who(user),
        // WHOSE VOICE IT IS. Required — see cartesia.createClone. Still
        // required even with a declaration attached: a yes that cannot be
        // matched to a person is a record nobody can ever act on.
        person,
        personContact: fields.personContact || null,
        consentNote: fields.consentNote || null,
        source: fields.source || (filename ? `uploaded or recorded sample (${filename})` : 'uploaded sample'),
        // Merged over the birth record inside createClone, so the consent fact
        // is part of the voice's FIRST write — never a follow-up update.
        declaration: declarationRecord,
      })
      // Same reason as register, and it matters more here: this voice did not
      // exist a second ago, so without this the operator gets a green tick for
      // a voice they cannot then find or hear.
      params.invalidateCartesiaCatalogue()
      logger.log?.(`[voicelab] cloned cartesia voice ${out.cartesia.id} by ${who(user)} — consent ${declarationRecord.consent_declaration_kind}`)
      res.json({ ok: true, ...out })
    } catch (err) { fail(res, err, 'clone-cartesia-voice') }
  })

  /**
   * Hear a Cartesia voice — the audition, and the one place cloning touches money.
   *
   * WHY IT EXISTS (2026-08-30): cloning returned an id and nothing to listen to.
   * A clone you cannot hear is a clone you cannot judge, and the operator's next
   * move was to cast an unheard voice into a course, which is exactly the
   * false-green the Languages screen exists to prevent.
   *
   * THE CEILINGS, both of them:
   *  - CLONE_AUDITION_MAX_CLIPS (3 by default) caps one press. This is the
   *    ceiling cartesia.cjs already declared and nothing enforced.
   *  - lab.refuse() applies the lab's ordinary daily CHARACTER ceiling on top,
   *    so a finger stuck on the button stops at the same wall a batch run does.
   * Nothing here writes course_audio, casts a slot, or starts a run.
   */
  app.post('/api/voicelab/voices/cartesia/audition', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const { voiceId, language } = req.body || {}
      if (!voiceId) throw Object.assign(new Error('voiceId is required'), { status: 400 })

      const lang = params.findLanguage(baseLanguageOfCastKey(language) || language)
      if (!lang) {
        throw Object.assign(
          new Error(`The lab cannot steer "${language}". Auditioning is limited to the languages params.cjs knows how to steer; the voice is created and castable regardless.`),
          { status: 400 },
        )
      }

      // ── A REAL COURSE LINE, FROM A NAMED COURSE, BY DEFAULT ─────────────
      // Tom's commission, 2026-08-31: "hear it back saying a real course line".
      // Until now this route said whatever it was handed, and the page handed
      // it "This is what the new voice sounds like, on a full sentence." —
      // which tells you the voice can talk and nothing about whether it can
      // carry the course. The picker that answers this properly already exists
      // (samples.pickLine), it already NAMES the course it took the line from,
      // and it is already deterministic so two voices are compared on identical
      // text. So the audition uses it, and an explicit `sentences` array still
      // wins for anyone who wants to hear a specific line.
      let sentences = (req.body?.sentences || [])
        .map((t) => String(t || '').trim())
        .filter(Boolean)
        .slice(0, cartesia.CLONE_AUDITION_MAX_CLIPS)
      let line = null
      if (!sentences.length) {
        line = await samples.pickLine(lang.code) || await samples.pickLine(language)
        if (!line) {
          throw Object.assign(new Error(
            `No course line was found in ${language} to audition on, and no sentence was given. Type one to hear this voice.`,
          ), { status: 404 })
        }
        sentences = [line.text]
      }
      if (!sentences.length) throw Object.assign(new Error('Give the audition at least one sentence to say.'), { status: 400 })

      const cfg = {
        ...lab.normaliseConfig({ provider: 'cartesia', voiceId: String(voiceId).replace(/^cartesia_/, ''), language: lang.code }),
        key: 'A',
      }
      const refusal = lab.refuse({ kind: 'batch', sentences, configs: [cfg], charsSpentToday: store.charsSpentToday() })
      if (refusal) return res.status(refusal.status).json({ error: refusal.error, code: refusal.status === 429 ? 'ceiling_reached' : 'refused' })

      const clips = []
      for (const text of sentences) {
        const id = store.newId()
        const { mastered, durationMs } = await runner().renderOne({ text, cfg })
        store.writeClip(id, mastered)
        // Recorded the moment the money is spent, so the daily ceiling counts an
        // audition exactly as it counts a run.
        store.appendLedger({ audition: id, chars: text.length, provider: 'cartesia', voiceId: cfg.voiceId, language: cfg.language })
        clips.push({ id, text, durationMs, url: `/api/voicelab/clip/${id}.mp3` })
      }
      logger.log?.(`[voicelab] auditioned cartesia ${cfg.voiceId} on ${clips.length} clip(s) for ${who(user)}`)
      // `line` travels back so the screen can print the course beside the
      // audio. A line with no named course is the thing Tom corrected on
      // 2026-08-31: what is SAID belongs to the course, not the language.
      res.json({ ok: true, clips, line, maxClips: cartesia.CLONE_AUDITION_MAX_CLIPS })
    } catch (err) { fail(res, err, 'audition-cartesia-voice') }
  })

  // ── CLONING FROM RECORDINGS THE ESTATE ALREADY HOLDS ──────────────────────
  //
  // Tom, 2026-08-31: "We do NOT need to ask anyone to record a fresh sample
  // first. We already hold clean studio audio of the people we want to clone,
  // and cloning FROM OUR OWN EXISTING RECORDINGS is the main route, not a
  // fallback." These three routes are that route: list the speakers, list one
  // speaker's clips, clone from a chosen subset. Uploading and recording on the
  // page both survive underneath as the secondary path, for people the estate
  // holds no audio of.
  //
  // The first two SPEND NOTHING. The third spends nothing at Cartesia either —
  // a clone is an upload and an id, and hearing it is a separate capped press.

  /**
   * Every speaker the estate holds recordings of, with BOTH numbers: how many
   * clips, and how much total audio. Tom: "'we have some Aran' is not an answer
   * an operator can act on."
   */
  app.get('/api/voicelab/speakers', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const language = String(req.query.language || '').trim() || null
      res.json({ ...(await speakers.listSpeakers(supabase(), { language })), guidance: speakers.SAMPLE_GUIDANCE })
    } catch (err) { fail(res, err, 'speakers') }
  })

  /**
   * One speaker's clips, longest first, each with a URL that plays the ORIGINAL
   * file straight from the estate's bucket. Nothing is copied to audition it,
   * and no original is ever written, moved or re-encoded.
   */
  app.get('/api/voicelab/speakers/:voiceId/clips', async (req, res) => {
    if (!await requireDashboardUser(req, res)) return
    try {
      const out = await speakers.listClips(supabase(), {
        voiceId: String(req.params.voiceId || ''),
        language: String(req.query.language || '').trim() || null,
        limit: Number(req.query.limit) || 60,
      })
      res.json({
        ...out,
        maxSourceClips: speakers.MAX_SOURCE_CLIPS,
        maxSourceSeconds: speakers.MAX_SOURCE_SECONDS,
        minSourceSeconds: speakers.MIN_SOURCE_SECONDS,
        guidance: speakers.SAMPLE_GUIDANCE,
        // Printed on the screen beside the list, every time. The 2026-08-27
        // failure was believing this column; the fix is a listening step, not a
        // better heuristic.
        identityWarning: 'origin=human is a label somebody wrote, not proof of a human. Two clone attempts in this estate were built from TTS wearing that label. Listen to every clip you tick.',
      })
    } catch (err) { fail(res, err, `speaker-clips ${req.params.voiceId}`) }
  })

  /**
   * Clone from clips the estate already holds.
   *
   * Downloads the chosen originals, joins them into one source file on this
   * box, and posts that to Cartesia. RENDERS NOTHING and touches no original.
   * The new voice is born `awaiting_authorisation` with the person named —
   * Tom obtains the consent, this route only records that it is outstanding.
   */
  app.post('/api/voicelab/voices/cartesia/clone-from-estate', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const { name, language, gender = null, person = null, personContact = null, consentNote = null, speaker = null } = req.body || {}
      const keys = ((req.body || {}).s3Keys || []).map((k) => String(k || '').trim()).filter(Boolean)
      if (!keys.length) throw Object.assign(new Error('Tick at least one clip to clone from.'), { status: 400 })
      if (!name) throw Object.assign(new Error('A name is required for the new voice.'), { status: 400 })

      // Re-read the clips from the database rather than trusting the durations
      // and keys the browser sent back: the source that goes to a vendor must
      // be built from what the estate actually holds.
      //
      // SCOPED BY SPEAKER AND ORIGIN, and that is not decoration. `s3_key` has
      // no index on a 2.5-million-row table, so an `in (s3_key)` on its own is
      // a sequential scan and times out — measured live 2026-08-31, the first
      // clone-from-estate attempt died on "canceling statement due to statement
      // timeout". Adding origin and voice_id puts this read on the same index
      // path the clip list already uses (idx_course_audio_origin). It is also
      // the stricter check: a key can only be cloned from as part of the
      // speaker it was listed under.
      if (!speaker) throw Object.assign(new Error('Say which speaker these clips belong to.'), { status: 400 })
      const { data: rows, error } = await supabase()
        .from('course_audio')
        .select('s3_key, duration_ms, text, role, language, course_code')
        .eq('origin', 'human')
        .eq('voice_id', speaker)
        .in('s3_key', keys.slice(0, speakers.MAX_SOURCE_CLIPS * 2))
      if (error) throw Object.assign(new Error(`course_audio read failed: ${error.message}`), { status: 502 })
      const byKey = new Map()
      for (const r of rows || []) {
        if (byKey.has(r.s3_key)) continue
        byKey.set(r.s3_key, {
          s3Key: r.s3_key,
          url: speakers.clipUrl(r.s3_key),
          durationMs: Number(r.duration_ms || 0),
          seconds: Math.round(Number(r.duration_ms || 0) / 100) / 10,
          text: r.text || '', role: r.role || null,
        })
      }
      // The caller's order is the operator's order — it is the order the
      // passage will be spoken in, so it is not re-sorted here.
      const chosen = keys.map((k) => byKey.get(k)).filter(Boolean)
      if (!chosen.length) throw Object.assign(new Error(`None of those clips are in the estate under "${speaker}".`), { status: 404 })

      const built = await speakers.buildSource(chosen, { tmpRoot: process.env.CS_SCRATCH || undefined })
      const out = await cartesia.createClone(supabase(), {
        clip: built.buffer,
        filename: built.filename,
        name,
        language,
        gender,
        registeredBy: who(user),
        person,
        personContact,
        consentNote,
        source: speaker ? `${built.provenance} — filed under voice id "${speaker}"` : built.provenance,
      })
      params.invalidateCartesiaCatalogue()
      logger.log?.(`[voicelab] cloned cartesia voice ${out.cartesia.id} from ${built.used.length} estate clip(s) (${built.seconds}s) by ${who(user)}`)
      res.json({
        ok: true,
        ...out,
        source: {
          seconds: built.seconds,
          used: built.used,
          skipped: built.skipped,
          short: built.short,
          stitched: built.stitched,
          // True when the chosen clip went to Cartesia byte-for-byte, with no
          // decode and no re-encode. Worth saying on screen: it is the highest
          // fidelity path and it is what was done to the clone judged good.
          passthrough: Boolean(built.passthrough),
        },
      })
    } catch (err) { fail(res, err, 'clone-from-estate') }
  })

  /**
   * RECORD A CONSENT DECISION against a voice.
   *
   * Tom, 2026-08-31: consent "is Tom to obtain, not you… There must be a plain
   * way for Tom to authorise a voice once he has actually asked the person."
   * This is that way. It writes only the consent columns; nothing else about
   * the voice moves, nothing renders, and no clip is touched.
   *
   * It cannot be used to invent a yes: `authorised` without a named human, a
   * means and a date is refused here in plain English and refused again by the
   * database's own CHECK constraint.
   */
  app.put('/api/voicelab/voices/:voiceId/consent', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const voiceId = String(req.params.voiceId || '').trim()
      if (!voiceId) throw Object.assign(new Error('voiceId is required'), { status: 400 })
      const record = consent.decisionRecord({ ...(req.body || {}), recordedBy: who(user) })
      const { data, error } = await supabase()
        .from('voices').update(record).eq('voice_id', voiceId).select().maybeSingle()
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      if (!data) throw Object.assign(new Error(`No voice called ${voiceId}.`), { status: 404 })
      logger.log?.(`[voicelab] consent ${record.consent_status} recorded on ${voiceId} by ${who(user)}`)
      res.json({ ok: true, voiceId, consent: consent.describe(data) })
    } catch (err) { fail(res, err, `consent ${req.params.voiceId}`) }
  })

  /**
   * REMOVE A VOICE — the un-create the page has never had.
   *
   * The case this is for is the one a live demo produces: a clone made by
   * accident with somebody watching, which until now stayed in the estate's
   * voice list until a human went to the database. SPENDS NOTHING.
   *
   * Order is deliberate and it is make-before-break's mirror image: the
   * `voices` row is deleted only AFTER Cartesia has confirmed the voice is gone
   * there, so a half-delete leaves the estate knowing about a voice that still
   * exists rather than not knowing about one that does.
   *
   * A voice that is CAST is refused outright. Removing it would silently empty
   * a slot the render path reads, and "never touch a voice that is currently
   * cast without saying so plainly first" is the whole of the safety here.
   */
  app.delete('/api/voicelab/voices/:voiceId', async (req, res) => {
    const user = await requireAdmin(req, res)
    if (!user) return
    try {
      const voiceId = String(req.params.voiceId || '').trim()
      if (!voiceId) throw Object.assign(new Error('voiceId is required'), { status: 400 })

      const { data: cast } = await supabase()
        .from('voice_language_roles').select('language, slot, gender, rank').eq('voice_id', voiceId)
      if (cast && cast.length) {
        const where = cast.map((c) => `${c.slot} ${c.language}/${c.gender}/rank${c.rank}`).join(', ')
        throw Object.assign(new Error(
          `${voiceId} is cast into ${cast.length} slot(s) — ${where}. Clear those slots first; removing a cast voice would empty them without saying so.`,
        ), { status: 409 })
      }

      // Historic clips keep playing whatever happens to the row, so this is not
      // a check that blocks — it is a fact the operator is told before they act.
      const { count: clipCount } = await supabase()
        .from('course_audio').select('id', { count: 'exact', head: true }).eq('voice_id', voiceId)

      let atCartesia = null
      if (/^cartesia_/.test(voiceId)) {
        atCartesia = await cartesia.deleteClone(voiceId)
      }
      const { error } = await supabase().from('voices').delete().eq('voice_id', voiceId)
      if (error) throw Object.assign(new Error(error.message), { status: 400 })
      params.invalidateCartesiaCatalogue()
      logger.log?.(`[voicelab] removed voice ${voiceId} by ${who(user)}${atCartesia ? ' (and at Cartesia)' : ''}`)
      res.json({ ok: true, voiceId, atCartesia, existingClips: clipCount || 0 })
    } catch (err) { fail(res, err, `remove-voice ${req.params.voiceId}`) }
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
  // here renders, spends or touches audio. The measurement itself comes from
  // tools/voice/measure-provider-pace.cjs — one controlled sentence per
  // language rendered straight from each provider API at 1.0x, because Tom's
  // ruling of 2026-08-29 is that "we can only use the providers APIs for the
  // voice as the truth - not the recordings we have in the estate".

  /**
   * GET /api/voicelab/pace — every measured voice, fastest first, plus the
   * per-language reference each ratio is measured against.
   *
   * THIS IS THE READING SURFACE the learner app will consume. `effective` is
   * the only number a consumer should divide by; it is the measurement times
   * the human's nudge, and it is null — never 1.0 — for a voice nobody has
   * measured, because a consumer must be able to tell "typical for its
   * language" from "we have not looked". `easy` and `fast` are the resulting
   * TARGET-LANGUAGE playback speeds under the role+mode rule; known and
   * listening are 1.0 flat and carry no per-voice correction at all.
   *
   * `languages` is the reference block: the sentence every voice in that
   * language spoke, how long the reference read took, and how many voices are
   * behind it. Read from tools/voice/provider-pace-reference.json, the artifact
   * the measurement tool writes — a ratio with no visible reference is a number
   * nobody can check.
   */
  /**
   * The committed reference artifact. Read fresh on each request (it is a few
   * kB and changes only when someone re-measures) and NEVER fatal: a missing
   * file means the screen shows no reference, not a broken endpoint.
   */
  function paceReference () {
    try {
      const file = require('path').join(__dirname, '..', '..', 'tools', 'voice', 'provider-pace-reference.json')
      const ref = JSON.parse(require('fs').readFileSync(file, 'utf8'))
      return { languages: ref.languages || {}, referenceMethod: ref.method || null, referenceMeasuredAt: ref.measured_at || null }
    } catch {
      return { languages: {}, referenceMethod: null, referenceMeasuredAt: null }
    }
  }

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
      res.json({ voices, count: voices.length, ...paceReference() })
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
