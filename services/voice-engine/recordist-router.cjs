/**
 * recordist-router.cjs — the ONE recordist surface (/api/recording/*).
 *
 * Tom, 2026-08-14: the human-recording flow was five surfaces. This is the
 * backend for the one that replaces them. Human recording is for the languages
 * WE DECIDE we have no TTS voice for; `language_recording_policy` is the single
 * place that decision lives, and routes 4/5 below are its control surface.
 *
 * LINK IS IDENTITY (routes 1-3). No login, no account, no role check, no voice
 * slot to assign: the voice id in the URL IS the claim, checked against the
 * policy table, and every take is attributed to that voice from the first tap.
 * Aran gets a link, taps it, and reads. Nothing else. The admin routes (4/5)
 * keep the estate's normal auth, because they change what everyone else sees.
 *
 *   GET  /mine                              which voice(s) the SIGNED-IN user reads
 *   GET  /voice/:voiceId                    the by-language queue (recordist-queue.cjs)
 *   POST /voice/:voiceId/take               a take → the EXISTING upload seam
 *   GET  /voice/:voiceId/line/:lineId/clip  the STORED bytes, for playback
 *   GET  /coverage                          per-language bar (every human_only language)
 *   GET  /languages  PUT /languages/:language   the policy itself (admin)
 *
 * The take route does NOT contain an uploader. It adapts its body into the
 * shape of POST /api/production/:courseCode/recording/upload and calls that
 * handler, so raw/{UUID}.{ext} archive-BEFORE-process (the fix that exists
 * because the T-20 originals were lost), both take refusals, provenance and pod
 * registration are literally the same code on both surfaces.
 */

'use strict'

const express = require('express')
const Busboy = require('busboy')
const {
  resolveRecordist,
  voicesForEmail,
  buildQueue,
  buildCoverage,
  loadPolicies,
  languageName,
  propagateTakeToDuplicates,
  clearRerecordWants,
  isTestFixtureCourse,
  parseSeedLineId,
  parseQuarryLineId,
  linkSeedTake,
  seedCastEntry,
  policyVoiceList,
} = require('./recordist-queue.cjs')
const { resolvePack, findItem } = require('./clone-source-pack.cjs')
const {
  takeKey,
  packPrefix,
  indexTakes,
  probeDurationSeconds,
  overCapMessage,
  buildPackQueue,
} = require('./clone-source-store.cjs')
const { canonicalLanguage, canonicalVoiceId, ClipIdentityError } = require('../shared/clip-identity.cjs')
const { audioKeyCandidates } = require('../shared/text-normalize.cjs')
const { resolveCurrentClip } = require('./take-selection.cjs')
const { bucketKey } = require('../shared/dialect.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')

const MAX_TAKE_BYTES = 60 * 1024 * 1024

/**
 * Parse a multipart take: one audio file part plus text fields.
 * Kept here rather than pulling in a middleware — this is the only multipart
 * route on the service, and a request-scoped parse cannot leak into others.
 */
function parseMultipartTake(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_TAKE_BYTES } })
    const fields = {}
    const chunks = []
    let mimeType = null
    let truncated = false

    busboy.on('field', (name, value) => { fields[name] = value })
    busboy.on('file', (_name, stream, info) => {
      mimeType = info.mimeType || info.mimetype || null
      stream.on('data', (d) => chunks.push(d))
      stream.on('limit', () => { truncated = true })
    })
    busboy.on('error', reject)
    busboy.on('close', () => {
      if (truncated) return reject(new Error(`take exceeds ${MAX_TAKE_BYTES} bytes`))
      resolve({ fields, buffer: chunks.length ? Buffer.concat(chunks) : null, mimeType })
    })
    req.pipe(busboy)
  })
}

/**
 * Run the production upload handler and capture what it would have sent,
 * instead of sending it. The handler stays the single source of truth for how a
 * take is stored; this route owns only the recordist-shaped response.
 */
function captureResponse() {
  const captured = { status: 200, body: null }
  const res = {
    status(code) { captured.status = code; return res },
    json(body) { captured.body = body; return res },
    send(body) { captured.body = body; return res },
  }
  return { res, captured }
}

module.exports = function createRecordistRouter({
  getDb,
  logger = console,
  requireAdmin,
  // Resolves ANY signed-in dashboard identity (recorder, editor, admin). Only
  // /mine takes it: that route answers "which voice am I?", which is a question
  // about the caller and cannot be answered without knowing who the caller is.
  requireDashboardUser,
  handleRecordingUpload,
  // Injectable only so the route's variant handling is testable without S3.
  s3 = require('../s3-production-service.cjs'),
}) {
  const router = express.Router()

  const db = () => {
    const client = getDb()
    if (!client) throw Object.assign(new Error('Supabase not initialized'), { status: 503 })
    return client
  }

  /** Resolve :voiceId or answer 404 — the only gate routes 1-3 have, by design. */
  async function recordistOr404(req, res) {
    const recordist = await resolveRecordist(db(), req.params.voiceId)
    if (!recordist) {
      res.status(404).json({
        error: `No recording voice ${req.params.voiceId}. A recording link is only live while ` +
          `language_recording_policy names that voice for a language.`,
      })
      return null
    }
    return recordist
  }

  // ── PACKS ──────────────────────────────────────────────────────────────────
  // A RECORDING PACK is an authored script that rides this surface but is not
  // course content and must never become it: the TTS bake-off clone source is
  // the first. Every pack branch below is taken BEFORE the policy lookup and
  // BEFORE handleRecordingUpload, so a pack take reaches no course table, no
  // pod, no provenance row and no mastering chain — only raw bytes at an S3 key
  // under `clone-source/`. Full reasoning: clone-source-pack.cjs.
  //
  // The page is untouched by all of this. A pack presents itself as a voice id,
  // so /r/pack-tom-clone loads the same screen Aran and Catrin read from, with
  // the same recorder, the same meter and the same play-it-back.

  async function packQueueResponse(req, res, pack) {
    const includeRecorded = req.query.includeRecorded === '1' || req.query.includeRecorded === 'true'
    const objects = await s3.listObjects(packPrefix(pack.id))
    const queue = buildPackQueue(pack, indexTakes(objects, pack.id), { includeRecorded })
    res.json({
      voiceId: pack.voiceId,
      displayName: pack.displayName,
      language: pack.language,
      languageName: pack.languageName,
      gender: null,
      dialect: null,
      // Paragraphs with sentence pauses in them: stopping on the first pause
      // would cut the 25-second cloning sample in half. The page reads this.
      autoAdvance: pack.autoAdvance !== false,
      pack: { id: pack.id, title: pack.title },
      total: queue.total,
      recorded: queue.recorded,
      remaining: queue.remaining,
      lines: queue.lines,
    })
  }

  /** A pack take: probe, refuse if over the vendor cap, store the raw bytes. */
  async function recordPackTake({ res, pack, itemId, audioBase64, mimeType, device }) {
    const item = findItem(pack, itemId)
    if (!item) return res.status(404).json({ error: `No item ${itemId} in pack ${pack.id}` })

    const buffer = Buffer.from(audioBase64, 'base64')
    if (!buffer.length) return res.status(400).json({ error: 'empty take' })

    // A cap here is a vendor's hard refusal, not a preference — an over-length
    // sample is not a worse clone, it is no clone at all. Probed before the
    // upload so the reader hears about it while they are still in position.
    let seconds = null
    if (item.maxSeconds) seconds = await probeDurationSeconds(buffer, mimeType)
    const overCap = seconds !== null && item.maxSeconds && seconds > item.maxSeconds

    // Stored either way. A declined take is still a take Tom has spoken, and
    // this system does not throw those away — it files them under _rejected/
    // where nothing counts them as done.
    const key = takeKey({ packId: pack.id, itemId: item.id, mimeType, rejected: !!overCap })
    await s3.uploadRawTake({
      key,
      buffer,
      contentType: mimeType || 'application/octet-stream',
      metadata: {
        packId: pack.id,
        itemId: item.id,
        // Says in the object itself what this is and what it must not become.
        purpose: 'tts-bakeoff-clone-source',
        notCourseAudio: 'true',
        durationSeconds: seconds === null ? 'unknown' : seconds.toFixed(2),
        rejected: overCap ? 'over_cap' : 'false',
        device: device || 'unknown',
        mimeType: mimeType || 'unknown',
      },
    })

    if (overCap) {
      return res.status(409).json({ error: overCapMessage(item, seconds), seconds, maxSeconds: item.maxSeconds, storedKey: key })
    }
    return res.json({
      ok: true,
      audioId: item.id,
      clipUrl: `/api/recording/voice/${encodeURIComponent(pack.voiceId)}/line/${encodeURIComponent(item.id)}/clip`,
      alsoFilled: 0,
      rawKey: key,
      seconds,
    })
  }

  /** Play back the newest stored take of a pack item. */
  async function packClipResponse(req, res, pack) {
    const item = findItem(pack, req.params.lineId)
    if (!item) return res.status(404).json({ error: `No item ${req.params.lineId} in pack ${pack.id}` })
    const objects = await s3.listObjects(packPrefix(pack.id))
    const take = indexTakes(objects, pack.id).get(item.id)
    if (!take) return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })
    // There is no mastered/raw pair for a pack: the raw bytes ARE the take, so
    // both variants resolve to the same object rather than 404-ing on `raw`.
    const url = await s3.getAudioSignedUrl(null, 3600, { s3Key: take.key })
    if (req.query.json === '1') {
      return res.json({ audioId: item.id, s3Key: take.key, url, variant: req.query.variant === 'raw' ? 'raw' : 'processed' })
    }
    res.redirect(302, url)
  }

  // ── 0. who am I? ───────────────────────────────────────────────────────────
  // The ONE authenticated recordist route. Everything below it is still
  // link-is-identity; this exists so a recordist who signs in to Popty does not
  // have to hold a link to find their own outstanding lines. It returns
  // identity only — the queue itself is route 1, unchanged, so there is exactly
  // one piece of code that decides what is left to record.
  router.get('/mine', async (req, res) => {
    try {
      if (typeof requireDashboardUser !== 'function') {
        return res.status(501).json({ error: 'Sign-in is not wired up on this service.' })
      }
      const user = await requireDashboardUser(req, res)
      if (!user) return // requireDashboardUser has already answered 401/403
      const voices = await voicesForEmail(db(), user.email)
      res.json({
        email: user.email,
        name: user.name || null,
        voices: voices.map((v) => ({
          voiceId: v.voiceId,
          displayName: v.displayName,
          language: v.language,
          languageName: v.languageName,
          gender: v.gender,
          dialect: v.dialect,
        })),
      })
    } catch (err) {
      logger.error(`[Recordist] mine: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 1. the queue ───────────────────────────────────────────────────────────
  router.get('/voice/:voiceId', async (req, res) => {
    try {
      const pack = resolvePack(req.params.voiceId)
      if (pack) return await packQueueResponse(req, res, pack)
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      const includeRecorded = req.query.includeRecorded === '1' || req.query.includeRecorded === 'true'
      // HOW MUCH OF THE COURSE the minimal set covers. Tom asked for the burden
      // at "30 SEEDS, 50/100/150/300" and this is where that scope arrives:
      // ?maxSeed=N. Clamped rather than trusted -- the booth is a no-login
      // surface and an unbounded ceiling is a language-wide scan on tap.
      const askedSeed = parseInt(req.query.maxSeed, 10)
      const quarryMaxSeed = Number.isFinite(askedSeed) ? Math.min(Math.max(askedSeed, 1), 1000) : undefined
      const queue = await buildQueue(db(), recordist, { includeRecorded, quarryMaxSeed })
      res.json({
        voiceId: recordist.voiceId,
        displayName: recordist.displayName,
        language: recordist.language,
        languageName: recordist.languageName,
        gender: recordist.gender,
        // Which accent this queue is. The recordist should be able to see, on
        // their own page, which of a language's dialects they are reading.
        dialect: recordist.dialect,
        // Echoed back so the screen can say which volume it is showing rather
        // than assuming its own query survived.
        maxSeed: quarryMaxSeed || null,
        // How big the minimal set is, in the two units a recordist standing at
        // a microphone actually cares about. Null when the course has no set.
        quarry: queue.quarry,
        total: queue.total,
        recorded: queue.recorded,
        remaining: queue.remaining,
        lines: queue.lines,
      })
    } catch (err) {
      logger.error(`[Recordist] queue: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  /**
   * A take for a queue item that is a flagged CLIP rather than a pod line
   * (narration, encouragement, instruction — see the note at the call site).
   * Regeneration mode: same upload seam, same raw archive, same refusals.
   */
  async function recordRerecordClip({ req, res, recordist, lineId, text, audioBase64, mimeType, device }) {
    const { data: clip, error: clipErr } = await db()
      .from('course_audio')
      .select('id, course_code, text, role, language, voice_id, s3_key, rerecord_wanted')
      .eq('id', lineId)
      .maybeSingle()
    // An id that is neither a pod line nor a clip is the old 404, unchanged.
    if (clipErr && clipErr.code !== '22P02') throw new Error(`clip lookup failed: ${clipErr.message}`)
    if (!clip) return res.status(404).json({ error: `No line ${lineId}` })

    if (!clip.rerecord_wanted) {
      return res.status(409).json({
        error: 'That clip is not queued for a re-record. This surface re-records what was asked for, ' +
          'and nothing else.',
      })
    }
    if (clip.language !== recordist.language) {
      return res.status(403).json({ error: `Clip ${lineId} is ${clip.language}, not ${recordist.language}` })
    }

    const clipText = (clip.text || '').trim()
    if (text && text.trim() && text.trim() !== clipText) {
      return res.status(409).json({
        error: 'The text on this line has changed since the queue was loaded — reload before recording it.',
        expected: clipText,
        received: text.trim(),
      })
    }

    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: clip.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      // uuid + no pod/script metadata IS regeneration mode: the row is looked up
      // before the S3 PUT, so a bad id cannot orphan bytes.
      body: {
        uuid: clip.id,
        audioData: audioBase64,
        mimeType,
        metadata: { text: clipText, role: clip.role, voiceId: recordist.voiceId },
        provenance: {
          recorded_by: recordist.email || recordist.displayName,
          mode: 'recordist',
          recording_device: device || null,
        },
      },
    }, innerRes)
    if (captured.status >= 400 || !captured.body || !captured.body.success) {
      return res.status(captured.status >= 400 ? captured.status : 500).json(captured.body || { error: 'upload failed' })
    }

    // Retire the want by ID, not by clip identity. Narration lives in the shared
    // untagged 'human' voice bucket, so an identity-based clear would not match
    // this row and the line would be asked for again forever.
    let retired = 0
    try {
      const { error } = await db().from('course_audio').update({ rerecord_wanted: null }).eq('id', clip.id)
      if (error) logger.error(`[Recordist] want clear failed for ${clip.id}: ${error.message}`)
      else retired = 1
    } catch (wantErr) {
      logger.error(`[Recordist] want clear threw (take is stored): ${wantErr.message}`)
    }

    return res.json({
      ok: true,
      audioId: clip.id,
      kind: 'rerecord',
      role: clip.role,
      alsoFilled: 0,
      rawKey: captured.body.rawKey || null,
      wantsRetired: retired,
    })
  }

  /**
   * The seed sentence a seed line names, plus the cast that says whether THIS
   * recordist is the one who reads it.
   *
   * The cast check is done here, from the course row, rather than by rebuilding
   * the queue: it is the same rule (voice_config.voices[role] resolved against
   * the language policy) and it costs two reads instead of a full derivation.
   * Without it the link would reach past its own queue -- /r/<anyone> could file
   * a take into any seed slot of their language.
   */
  async function resolveSeedLine(res, recordist, parsed) {
    const { data: seed, error: seedErr } = await db()
      .from('course_seeds')
      .select('id, course_code, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('id', parsed.seedId)
      .maybeSingle()
    if (seedErr && seedErr.code !== '22P02') throw new Error(`seed lookup failed: ${seedErr.message}`)
    if (!seed) { res.status(404).json({ error: `No seed ${parsed.seedId}` }); return null }

    // THE KNOWN-SIDE EXCEPTION, CHECKED ON THE SERVER. The booth has no login,
    // so the client's word for "this is a test course" is a suggestion. Only a
    // zzz_ fixture may have its English side recorded (Tom, 2026-09-02).
    if (parsed.role === 'known' && !isTestFixtureCourse(seed.course_code)) {
      res.status(403).json({
        error: 'The known side of a live course is not recorded here. Only a test fixture course records its English.',
        reason: 'known_side_live_course',
        courseCode: seed.course_code,
      })
      return null
    }

    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config, target_lang').eq('course_code', seed.course_code).maybeSingle()
    if (cErr) throw new Error(`course lookup failed: ${cErr.message}`)
    if (!course) { res.status(404).json({ error: `No course ${seed.course_code}` }); return null }

    // WRONG LANGUAGE, said in those words. Checked before the cast, because the
    // cast is resolved against the RECORDIST's own language policy: a Welsh
    // voice pointed at a zzz seed would otherwise be told "nobody is cast",
    // which is false and sends whoever reads it to change the wrong thing.
    let courseLanguage = null
    try { courseLanguage = canonicalLanguage(course.target_lang) } catch { courseLanguage = null }
    if (courseLanguage !== recordist.language) {
      res.status(403).json({
        error: `That seed belongs to ${seed.course_code}, which is ${course.target_lang}, not ${recordist.language}.`,
        reason: 'wrong_language',
        courseCode: seed.course_code,
      })
      return null
    }

    const policies = await loadPolicies(db())
    const policy = policies.find((row) => row.language === recordist.language)
    const cast = seedCastEntry(course, policyVoiceList(policy))
    const castVoice = cast[parsed.role]
    if (!castVoice || !recordist.spellings.includes(castVoice.voiceId)) {
      res.status(403).json({
        error: castVoice
          ? `${seed.course_code} casts ${castVoice.voiceId} to read its ${parsed.role} seeds, not you.`
          : `${seed.course_code} has nobody cast to read its ${parsed.role} seed sentences yet, so there is nothing here for you to record. Someone has to name a voice in the course's voice_config first.`,
        reason: castVoice ? 'not_your_slot' : 'uncast_slot',
        courseCode: seed.course_code,
        role: parsed.role,
      })
      return null
    }

    const text = String((parsed.role === 'known' ? seed.known_text : seed.target_text) || '').trim()
    return { seed, course, text, role: parsed.role }
  }

  /**
   * A take for a SEED SENTENCE. Same upload seam as everything else on this
   * surface -- archive-before-process, the silent-take refusal, provenance --
   * in SCRIPT mode, which is the mode that mints a course_audio row for content
   * that has no audio identity yet (services/script-take-filing.cjs).
   *
   * Then the seed's own FK is pointed at that row, and at every duplicate of the
   * sentence across the language. The clip exists before the pointer moves and
   * nothing is deleted: make-before-break by construction.
   */
  async function recordSeedTake({ req, res, recordist, parsed, text, audioBase64, mimeType, device }) {
    const resolved = await resolveSeedLine(res, recordist, parsed)
    if (!resolved) return

    if (!resolved.text) {
      return res.status(409).json({ error: `Seed ${resolved.seed.seed_number} has no ${parsed.role} text to read.`, reason: 'empty_line' })
    }
    if (text && text.trim() && text.trim() !== resolved.text) {
      // Same rule as a pod line: the stored text is authoritative, and a client
      // that disagrees is a stale queue. Filing it anyway would put the take
      // under an identity no queue will look up again.
      return res.status(409).json({
        error: 'The text on this line has changed since the queue was loaded -- reload before recording it.',
        expected: resolved.text,
        received: text.trim(),
      })
    }

    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: resolved.seed.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      body: {
        audioData: audioBase64,
        mimeType,
        metadata: {
          // SCRIPT mode: no pre-existing course_audio row, so one is minted and
          // filed. `cadence: natural` is deliberate -- a seed sentence read in
          // the booth is a whole natural read, which is the one cadence filing
          // accepts as a clip in its own right.
          mode: 'script',
          cadence: 'natural',
          role: parsed.role,
          kind: parsed.role,
          text: resolved.text,
          voiceId: recordist.voiceId,
          seedId: resolved.seed.id,
          seedNumber: resolved.seed.seed_number,
        },
        provenance: {
          recorded_by: recordist.email || recordist.displayName,
          mode: 'recordist',
          recording_device: device || null,
        },
      },
    }, innerRes)
    if (captured.status >= 400 || !captured.body || !captured.body.success) {
      return res.status(captured.status >= 400 ? captured.status : 500).json(captured.body || { error: 'upload failed' })
    }

    // Filing is what makes the take playable. It never fails the upload, so its
    // verdict has to be READ rather than assumed -- an unfiled take is bytes in
    // S3 with nothing that can serve them, which is the 2026-08-19 silence.
    const filing = captured.body.filing || null
    const audioId = filing && filing.courseAudioId ? filing.courseAudioId : null
    let linked = { linked: [] }
    if (audioId) {
      try {
        linked = await linkSeedTake({ db: db(), recordist, seedId: resolved.seed.id, role: parsed.role, audioId, logger })
      } catch (linkErr) {
        logger.error(`[Recordist] seed link failed (take is stored and filed): ${linkErr.message}`)
      }
    } else {
      logger.error(`[Recordist] seed take for ${resolved.seed.id} ${parsed.role} was NOT filed as a clip: ${filing && filing.reason}`)
    }

    return res.json({
      ok: true,
      audioId,
      kind: 'seed',
      role: parsed.role,
      seedNumber: resolved.seed.seed_number,
      clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(parsed.raw)}/clip`,
      // How many other copies of this sentence, in any course of this language,
      // this one take also filled.
      alsoFilled: Math.max(0, linked.linked.length - 1),
      rawKey: captured.body.rawKey || null,
      filing,
    })
  }

  /**
   * Resolve a MINIMAL-SET piece: which course it belongs to, what its words
   * are, and whether this recordist is the one who reads them.
   *
   * Everything is checked server-side and nothing is taken from the id but the
   * lookup keys. The booth has no login: `quarry:<course>:lego:<id>` is a claim,
   * not a credential, and without this a Welsh link could file takes into a
   * fixture course's LEGOs.
   */
  async function resolveQuarryLine(res, recordist, parsed) {
    // TEST FIXTURES ONLY, checked here as well as in the queue. The minimal set
    // is an experiment about whether spliced audio is acceptable at all; it does
    // not get to write into a course with learners on it.
    if (!isTestFixtureCourse(parsed.courseCode)) {
      res.status(403).json({
        error: 'The minimal set is recorded on test fixture courses only.',
        reason: 'live_course', courseCode: parsed.courseCode,
      })
      return null
    }
    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config, target_lang, known_lang').eq('course_code', parsed.courseCode).maybeSingle()
    if (cErr) throw new Error(`course lookup failed: ${cErr.message}`)
    if (!course) { res.status(404).json({ error: `No course ${parsed.courseCode}` }); return null }

    let courseLanguage = null
    try { courseLanguage = canonicalLanguage(course.target_lang) } catch { courseLanguage = null }
    if (courseLanguage !== recordist.language) {
      res.status(403).json({
        error: `That piece belongs to ${course.course_code}, which is ${course.target_lang}, not ${recordist.language}.`,
        reason: 'wrong_language', courseCode: course.course_code,
      })
      return null
    }

    // Cast like a seed's target1, because that is what a quarry piece is: the
    // target side of this course, read by whoever reads its target side.
    const policies = await loadPolicies(db())
    const policy = policies.find((row) => row.language === recordist.language)
    const castVoice = seedCastEntry(course, policyVoiceList(policy)).target1
    if (!castVoice || !recordist.spellings.includes(castVoice.voiceId)) {
      res.status(403).json({
        error: castVoice
          ? `${course.course_code} casts ${castVoice.voiceId} to read its target side, not you.`
          : `${course.course_code} has nobody cast to read its target side yet.`,
        reason: castVoice ? 'not_your_slot' : 'uncast_slot', courseCode: course.course_code,
      })
      return null
    }

    // THE WORDS COME FROM THE DATABASE, never from the id. A LEGO piece is read
    // off its own row; a fallback word is a single normalised word and IS its
    // own key, but it is only accepted if it genuinely appears in this course's
    // text -- otherwise the id would be a way to file a take under any words at
    // all.
    if (parsed.source === 'lego') {
      const { data: lego, error } = await db()
        .from('course_legos').select('lego_id, course_code, target_text, seed_number')
        .eq('course_code', course.course_code).eq('lego_id', parsed.key).maybeSingle()
      if (error) throw new Error(`lego lookup failed: ${error.message}`)
      if (!lego) { res.status(404).json({ error: `No LEGO ${parsed.key} in ${course.course_code}` }); return null }
      const legoText = String(lego.target_text || '').trim()
      if (!legoText) { res.status(409).json({ error: 'That LEGO has no target text to read.', reason: 'empty_line' }); return null }
      return { course, text: legoText, lego }
    }

    const wanted = String(parsed.key)
    // A WHOLE WORD, not a substring. `ilike '%yo%'` matches "yolanda", and a
    // take filed under a word this course never says on its own is a clip the
    // splicer would happily reach for. The ilike narrows the read; the boundary
    // test decides.
    const isWholeWord = (text) => new RegExp(`(^|[^\\p{L}\\p{N}])${wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}\\p{N}]|$)`, 'iu')
      .test(String(text || ''))
    const { data: hit, error } = await db()
      .from('course_legos').select('lego_id, target_text')
      .eq('course_code', course.course_code)
      .ilike('target_text', `%${wanted}%`)
      .limit(50)
    if (error) throw new Error(`word lookup failed: ${error.message}`)
    // A word that appears inside no LEGO of the course may still be a genuine
    // fallback -- the fallback set exists precisely because some words no LEGO
    // covers -- so the LEGO probe cannot refuse it. The phrase table decides.
    let seen = (hit || []).some((r) => isWholeWord(r.target_text))
    if (!seen) {
      const { data: ph, error: pErr } = await db()
        .from('course_practice_phrases').select('id, target_text')
        .eq('course_code', course.course_code)
        .ilike('target_text', `%${wanted}%`)
        .limit(50)
      if (pErr) throw new Error(`word lookup failed: ${pErr.message}`)
      seen = (ph || []).some((r) => isWholeWord(r.target_text))
    }
    if (!seen) {
      res.status(404).json({ error: `"${wanted}" does not appear in ${course.course_code}`, reason: 'not_in_course' })
      return null
    }
    return { course, text: wanted, lego: null }
  }

  /**
   * A take for a MINIMAL-SET piece -- a covering LEGO, or a single word no LEGO
   * covers. Read GAPPED: naturally but slowly, with dead space around the words
   * so a splice cut lands in silence rather than mid-gesture.
   *
   * Same upload seam as everything else on this surface: archive-before-process,
   * the silent-take refusal, provenance. SCRIPT mode mints the course_audio row,
   * which is what a fallback word needs -- no table row owns a span of a
   * sentence, so clip identity (course, text, language, role, voice) is the only
   * thing that can own it.
   *
   * A LEGO piece additionally has its own slot pointed at the new clip, across
   * every copy of the same words in the course. Make-before-break: the clip
   * exists before any pointer moves, and nothing is deleted.
   */
  async function recordQuarryTake({ req, res, recordist, parsed, text, audioBase64, mimeType, device }) {
    const resolved = await resolveQuarryLine(res, recordist, parsed)
    if (!resolved) return

    if (text && text.trim() && text.trim() !== resolved.text) {
      return res.status(409).json({
        error: 'The text on this line has changed since the queue was loaded -- reload before recording it.',
        expected: resolved.text, received: text.trim(),
      })
    }

    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: resolved.course.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      body: {
        audioData: audioBase64,
        mimeType,
        metadata: {
          mode: 'script',
          // GAPPED, and it is named rather than left as 'natural'. This clip is
          // splice quarry: it is deliberately not a natural read, and calling it
          // one would put a gapped recording into the estate's natural pool. It
          // is not 'isolated' either -- Pool A never feeds the splicer
          // (voice-engine/provenance-adapter.cjs), and feeding the splicer is
          // the entire reason this clip exists.
          cadence: 'gapped',
          role: 'target1',
          kind: 'quarry',
          text: resolved.text,
          voiceId: recordist.voiceId,
          legoId: resolved.lego ? resolved.lego.lego_id : null,
        },
        provenance: {
          recorded_by: recordist.email || recordist.displayName,
          mode: 'recordist',
          recording_device: device || null,
        },
      },
    }, innerRes)
    if (captured.status >= 400 || !captured.body || !captured.body.success) {
      return res.status(captured.status >= 400 ? captured.status : 500).json(captured.body || { error: 'upload failed' })
    }

    const filing = captured.body.filing || null
    const audioId = filing && filing.courseAudioId ? filing.courseAudioId : null
    let linked = 0
    if (audioId && resolved.lego) {
      // Every LEGO row of this course carrying the same words -- one take fills
      // them all, exactly as a seed take does across its duplicates. A slot
      // already holding somebody else's clip is left alone.
      const { data: rows, error } = await db()
        .from('course_legos').select('lego_id, target_text, target1_audio_id')
        .eq('course_code', resolved.course.course_code)
      if (error) logger.error(`[Recordist] lego relink read failed: ${error.message}`)
      const key = audioKeyCandidates(resolved.text)
      for (const row of rows || []) {
        if (!audioKeyCandidates(String(row.target_text || '').trim()).some((k) => key.includes(k))) continue
        if (row.target1_audio_id === audioId) continue
        const { error: upErr } = await db()
          .from('course_legos').update({ target1_audio_id: audioId })
          .eq('course_code', resolved.course.course_code).eq('lego_id', row.lego_id)
        if (upErr) { logger.error(`[Recordist] lego link failed for ${row.lego_id}: ${upErr.message}`); continue }
        linked += 1
      }
    } else if (!audioId) {
      logger.error(`[Recordist] minimal-set take for ${parsed.raw} was NOT filed as a clip: ${filing && filing.reason}`)
    }

    return res.json({
      ok: true,
      audioId,
      kind: 'quarry',
      readStyle: 'gapped',
      quarrySource: parsed.source,
      clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(parsed.raw)}/clip`,
      alsoFilled: Math.max(0, linked - 1),
      rawKey: captured.body.rawKey || null,
      filing,
    })
  }

  /**
   * Play back a minimal-set take. Resolved by CLIP IDENTITY rather than by a
   * foreign key, because a fallback word has no row that owns it -- and because
   * the LEGO's own slot may point at somebody else's clip, which is not this
   * recordist's take to hear.
   */
  async function quarryClipResponse(req, res, recordist, parsed) {
    const resolved = await resolveQuarryLine(res, recordist, parsed)
    if (!resolved) return
    const { data, error } = await db()
      .from('course_audio')
      .select('id, s3_key, voice_id, language, created_at')
      .eq('language', recordist.language)
      .in('voice_id', recordist.spellings)
      .in('text_normalized', audioKeyCandidates(resolved.text))
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw new Error(`clip lookup failed: ${error.message}`)
    const row = data && data[0] ? data[0] : null
    if (!row) return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })
    // Same serving as every other clip on this surface: raw variant, signed
    // URL, redirect or JSON.
    if (req.query.variant === 'raw') {
      const { url, rawKey, notFound } = await s3.getRawSignedUrl(row.s3_key, 3600)
      if (!rawKey) {
        return res.status(404).json({
          error: notFound
            ? 'The processed clip for this take is missing from storage, so its original cannot be found.'
            : 'No original was kept for this take.',
          reason: notFound ? 'mastered_missing' : 'no_raw_retained',
          audioId: row.id, variant: 'raw',
        })
      }
      if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: rawKey, url, variant: 'raw' })
      return res.redirect(302, url)
    }
    const url = await s3.getAudioSignedUrl(row.id, 3600, { s3Key: row.s3_key })
    if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: row.s3_key, url, variant: 'processed' })
    return res.redirect(302, url)
  }

  /** Play back the clip a seed's own slot points at. */
  async function seedClipResponse(req, res, recordist, parsed) {
    const resolved = await resolveSeedLine(res, recordist, parsed)
    if (!resolved) return
    const audioId = resolved.seed[`${parsed.role}_audio_id`]
    if (!audioId) return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })

    const { data: row, error } = await db()
      .from('course_audio').select('id, s3_key, voice_id').eq('id', audioId).maybeSingle()
    if (error) throw new Error(`seed clip lookup failed: ${error.message}`)
    if (!row) return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })

    if (req.query.variant === 'raw') {
      const { url, rawKey, notFound } = await s3.getRawSignedUrl(row.s3_key, 3600)
      if (!rawKey) {
        return res.status(404).json({
          error: notFound
            ? 'The processed clip for this take is missing from storage, so its original cannot be found.'
            : 'No original was kept for this take.',
          reason: notFound ? 'mastered_missing' : 'no_raw_retained',
          audioId: row.id,
          variant: 'raw',
        })
      }
      if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: rawKey, url, variant: 'raw' })
      return res.redirect(302, url)
    }

    const url = await s3.getAudioSignedUrl(row.id, 3600, { s3Key: row.s3_key })
    if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: row.s3_key, url, variant: 'processed' })
    res.redirect(302, url)
  }

  // ── 2. a take ──────────────────────────────────────────────────────────────
  router.post('/voice/:voiceId/take', async (req, res) => {
    try {
      const pack = resolvePack(req.params.voiceId)
      const recordist = pack ? null : await recordistOr404(req, res)
      if (!pack && !recordist) return

      const isMultipart = String(req.headers['content-type'] || '').includes('multipart/form-data')
      // What recorded this take — the recordist's chosen mic and their browser.
      // It was NULL on all 154 archived takes when the clipping was diagnosed,
      // which made "which device, which browser" unanswerable and left a mime
      // string standing in for a code path. The client sends it now.
      let lineId, text, audioBase64, mimeType, device
      if (isMultipart) {
        const parsed = await parseMultipartTake(req)
        lineId = parsed.fields.lineId
        text = parsed.fields.text
        device = parsed.fields.device || null
        mimeType = parsed.fields.mimeType || parsed.mimeType || 'audio/webm'
        if (!parsed.buffer || !parsed.buffer.length) {
          return res.status(400).json({ error: 'no audio part in the upload' })
        }
        audioBase64 = parsed.buffer.toString('base64')
      } else {
        // JSON base64 is accepted too: it is what every existing recorder client
        // on this estate sends, and refusing it would make the one surface
        // reachable by fewer clients than the five it replaces.
        lineId = req.body.lineId
        text = req.body.text
        mimeType = req.body.mimeType || 'audio/webm'
        device = req.body.device || null
        audioBase64 = req.body.audioData
        if (!audioBase64) return res.status(400).json({ error: 'audioData (base64) or a multipart audio part required' })
      }
      if (!lineId) return res.status(400).json({ error: 'lineId required' })

      // A PACK take never reaches the upload seam. Branch is here rather than
      // at the top of the route so the multipart parse stays shared.
      if (pack) return await recordPackTake({ res, pack, itemId: lineId, audioBase64, mimeType, device })

      // A SEED line carries a synthetic id (`seed:<uuid>:<role>`), because one
      // seed row is up to three recordable lines. Branched on the prefix BEFORE
      // any table lookup -- the same shape as the pack branch above, and
      // necessary rather than tidy: `seed:...` is not a uuid, so handing it to
      // the pod lookup below is a 22P02 rather than a 404.
      const seedLine = parseSeedLineId(lineId)
      if (seedLine) {
        return await recordSeedTake({ req, res, recordist, parsed: { ...seedLine, raw: lineId }, text, audioBase64, mimeType, device })
      }

      // A MINIMAL-SET piece. Same reasoning as the seed branch: `quarry:...` is
      // not a uuid, so it must never reach the pod lookup below.
      const quarryLine = parseQuarryLineId(lineId)
      if (quarryLine) {
        return await recordQuarryTake({ req, res, recordist, parsed: { ...quarryLine, raw: lineId }, text, audioBase64, mimeType, device })
      }

      // The line decides the course; the recordist decides the voice.
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, pod_id, target_text, target_audio_id')
        .eq('id', lineId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)

      // NOT A POD LINE — a flagged re-record of some other content type.
      //
      // The queue is content-type-agnostic by design (Tom, 2026-08-14: the
      // failing LEGO-narration clips "ride the new queue's existing design"),
      // and it has been emitting those items since. This route was not: it
      // resolved every lineId against listening_pod_sentences, so all 18 live
      // Welsh narration re-records answered 404 on tap — 17 of them in Aran's
      // queue, waiting for his first session.
      //
      // A re-record of an existing clip is exactly what the upload seam's
      // REGENERATION mode is for: the course_audio row keeps its id and its
      // s3_key moves to a fresh object, so the 18 course_legos rows pointing at
      // it keep working with no relink, and the old object stays at the old key
      // for reversibility. Only a clip that ASKED for a new take is accepted —
      // this is a re-record path, never a way to overwrite arbitrary audio.
      if (!sentence) {
        return recordRerecordClip({ req, res, recordist, lineId, text, audioBase64, mimeType, device })
      }

      const { data: pod, error: podErr } = await db()
        .from('listening_pods').select('id, course_code').eq('id', sentence.pod_id).maybeSingle()
      if (podErr) throw new Error(`pod lookup failed: ${podErr.message}`)
      if (!pod) return res.status(404).json({ error: `Line ${lineId} has no pod` })

      const lineText = (sentence.target_text || '').trim()
      if (text && text.trim() && text.trim() !== lineText) {
        // The stored line is authoritative; a client-sent text that disagrees is
        // a stale queue, and silently recording it would file the take under an
        // identity no queue will ever look up again.
        return res.status(409).json({
          error: 'The text on this line has changed since the queue was loaded — reload before recording it.',
          expected: lineText,
          received: text.trim(),
        })
      }

      // Hand the take to the production upload seam, in pod mode. voiceId is
      // forced to the POLICY voice (req.recordistVoiceId) so one person's clips
      // stay one identity across every course of the language.
      const { res: innerRes, captured } = captureResponse()
      const innerReq = {
        params: { courseCode: pod.course_code },
        headers: { authorization: req.headers.authorization },
        socket: req.socket,
        recordistVoiceId: recordist.voiceId,
        body: {
          audioData: audioBase64,
          mimeType,
          metadata: {
            mode: 'pod',
            podId: pod.id,
            sentenceId: sentence.id,
            kind: 'target',
            text: lineText,
            voiceId: recordist.voiceId,
          },
          provenance: {
            recorded_by: recordist.email || recordist.displayName,
            mode: 'recordist',
            recording_device: device || null,
          },
        },
      }
      await handleRecordingUpload(innerReq, innerRes)
      if (captured.status >= 400 || !captured.body || !captured.body.success) {
        return res.status(captured.status >= 400 ? captured.status : 500).json(captured.body || { error: 'upload failed' })
      }

      const audioId = captured.body.uuid
      // One recording fills every duplicate of this line across the language —
      // the other half of the queue's dedupe promise. Runs AFTER the take is
      // stored (make-before-break); a failure here never fails the take.
      let propagation = { linked: [] }
      try {
        propagation = await propagateTakeToDuplicates({
          db: db(),
          recordist,
          sentenceId: sentence.id,
          text: lineText,
          s3Key: captured.body.s3Key,
          durationMs: captured.body.audioProcessing ? captured.body.audioProcessing.durationMs : null,
          logger,
        })
      } catch (propErr) {
        logger.error(`[Recordist] propagation failed (take is stored and linked): ${propErr.message}`)
      }

      // The line was queued BECAUSE a re-record was wanted; that want is now
      // satisfied. Retired last, after the take is stored, linked and
      // propagated — and never allowed to fail the take.
      let retired = { clips: 0, sentences: 0 }
      try {
        retired = await clearRerecordWants({ db: db(), recordist, text: lineText, sentenceId: sentence.id, logger })
      } catch (wantErr) {
        logger.error(`[Recordist] want retirement failed (take is stored and linked): ${wantErr.message}`)
      }

      res.json({
        ok: true,
        audioId,
        clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${sentence.id}/clip`,
        alsoFilled: propagation.linked.length,
        rawKey: captured.body.rawKey || null,
        wantsRetired: retired.clips + retired.sentences,
      })
    } catch (err) {
      logger.error(`[Recordist] take: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 3. the stored bytes ────────────────────────────────────────────────────
  // `?variant=raw` serves the UNTOUCHED original instead of the mastered clip,
  // so a recordist can hear what the processing chain did to their take before
  // deciding to re-read anything (T-20: 107 Welsh clips lost their heads and
  // nobody could hear it, because there was nothing to compare against).
  // Default stays `processed` — every existing caller is untouched.
  router.get('/voice/:voiceId/line/:lineId/clip', async (req, res) => {
    try {
      const variant = req.query.variant === undefined || req.query.variant === ''
        ? 'processed'
        : String(req.query.variant)
      if (variant !== 'processed' && variant !== 'raw') {
        return res.status(400).json({
          error: `variant must be 'processed' or 'raw' (got '${variant}')`,
          reason: 'bad_variant',
        })
      }
      const pack = resolvePack(req.params.voiceId)
      if (pack) return await packClipResponse(req, res, pack)
      const recordist = await recordistOr404(req, res)
      if (!recordist) return

      const seedLine = parseSeedLineId(req.params.lineId)
      if (seedLine) return await seedClipResponse(req, res, recordist, { ...seedLine, raw: req.params.lineId })

      const quarryLine = parseQuarryLineId(req.params.lineId)
      if (quarryLine) return await quarryClipResponse(req, res, recordist, quarryLine)

      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, target_text, target_audio_id')
        .eq('id', req.params.lineId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)
      if (!sentence) return res.status(404).json({ error: `No line ${req.params.lineId}` })

      // THE ONE RESOLVER, asked in its recordist mode: the line's own slot
      // first — the very column the learner's bundle plays, so a filled slot
      // means this button and the learner are on the same file by construction
      // — then, only if the slot is empty or holds another voice, this
      // recordist's own take of the same text.
      const clip = await resolveCurrentClip(db(), {
        sentence,
        track: 'target',
        language: recordist.language,
        restrictToVoices: recordist.spellings,
        allowIdentityFallback: true,
      })
      const row = clip ? { id: clip.audioId, s3_key: clip.s3Key, voice_id: clip.voiceId } : null
      if (!row) {
        return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })
      }

      if (variant === 'raw') {
        // One HEAD, paid only because a human asked to compare. The raw key
        // lives in the mastered object's own metadata — there is no column.
        const { url, rawKey, notFound } = await s3.getRawSignedUrl(row.s3_key, 3600)
        if (!rawKey) {
          return res.status(404).json({
            error: notFound
              ? 'The processed clip for this take is missing from storage, so its original cannot be found.'
              : 'No original was kept for this take — it was recorded before 2026-08-14, when raw originals started being retained.',
            reason: notFound ? 'mastered_missing' : 'no_raw_retained',
            audioId: row.id,
            variant: 'raw',
          })
        }
        if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: rawKey, url, variant: 'raw' })
        return res.redirect(302, url)
      }

      const url = await s3.getAudioSignedUrl(row.id, 3600, { s3Key: row.s3_key })
      if (req.query.json === '1') return res.json({ audioId: row.id, s3Key: row.s3_key, url, variant: 'processed' })
      res.redirect(302, url)
    } catch (err) {
      logger.error(`[Recordist] clip: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 3b. rewrite a line's text ──────────────────────────────────────────────
  //
  // Tom, 2026-09-03: Aran is recording Welsh and could not work out how to fix a
  // wrong line before reading it. "build it and enable it so it's DELIGHTFUL to
  // use." The two people best placed to catch a wrong Welsh line are the two
  // Welsh speakers reading it aloud, so a POD LINE IS EDITABLE ON A LIVE COURSE.
  //
  // WHAT THAT COSTS, AND WHO PAYS IT. Learner progress is filed under a
  // sentence's SLOT, not its text (docs/pods/pod-migration-protocol.md, standing
  // doctrine A-111), so an in-place edit would otherwise credit a learner with a
  // sentence they have never heard. The protocol's own answer applies: rule 6, a
  // sentence that changed at all counts as NEW, and rule 4, a new sentence
  // arrives UNSEEN — absence IS unseen. So the edit drops this sentence's
  // learner_pod_state rows in the same call. Progress cannot go backwards from
  // that: `exposures` is a per-sentence maturity counter floored on the derived
  // main-flow value, and course progress rides an independent ratchet.
  //
  // A SEED sentence and a QUARRY piece are still refused, and that is a floor
  // rather than caution — see canEditText in recordist-queue.cjs.
  //
  // WHAT HAPPENS TO THE EXISTING AUDIO. Nothing is deleted. The clip row keeps
  // its bytes and its provenance, filed under the words it actually says.
  //
  // BUT THE SLOT IS UNLINKED, and that is not optional. This route used to
  // reason that clip identity is (language, text_normalized, voice), so new text
  // would stop matching its old take by itself. That stopped being true at
  // 06189d68c — "a filled slot is a take, even when the pause cue moved the
  // text" — which made the sentence's own target_audio_id the evidence. Proved
  // in a browser on 2026-09-03: after an edit the queue still answered
  // recorded:true and still handed out the old clip's URL. That is the one way
  // this feature can do real damage — a learner hearing yesterday's words under
  // today's sentence — so the FK goes with the text.
  //
  // This is not a break-before-make: the alternative to unlinking is not a
  // working clip, it is a WRONG clip. A silent slot is honest and is back in the
  // artist's queue within the same second; a clip saying something else is not.
  // The audio id is logged, and the clip is still findable by its own text.
  router.patch('/voice/:voiceId/line/:lineId/text', async (req, res) => {
    try {
      const recordist = await recordistOr404(req, res)
      if (!recordist) return

      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
      if (!text) return res.status(400).json({ error: 'Give the line some text.', reason: 'empty' })
      if (text.length > 600) return res.status(400).json({ error: 'That line is too long to read in one take.', reason: 'too_long' })

      const lineId = req.params.lineId
      // Seed sentences are course content, not booth content: their text is
      // changed on the admin side. Refused here explicitly, because a seed line
      // id is not a uuid and the pod lookup below would answer with a database
      // type error instead of a sentence.
      if (parseSeedLineId(lineId)) {
        return res.status(403).json({
          error: 'A seed sentence is course content -- its text is changed on the admin side, not from the booth.',
          reason: 'seed_line',
        })
      }
      // A minimal-set piece is a SPAN of course content -- a LEGO, or a single
      // word inside a sentence. There is no row to rewrite, so editing it here
      // would edit nothing and silently disagree with the course.
      if (parseQuarryLineId(lineId)) {
        return res.status(403).json({
          error: 'That is a piece of a sentence, not a line of its own -- its words come from the course and are changed there.',
          reason: 'quarry_line',
        })
      }
      // The course code is the first half of a pod sentence id, but it is not
      // trusted from the id: the row is read and its own pod's course is what
      // the gate is applied to.
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, pod_id, target_text, known_text, target_audio_id')
        .eq('id', lineId)
        .maybeSingle()
      if (sentErr) throw new Error(`line lookup failed: ${sentErr.message}`)
      if (!sentence) return res.status(404).json({ error: `No line ${lineId}` })

      const { data: pod, error: podErr } = await db()
        .from('listening_pods')
        .select('id, course_code')
        .eq('id', sentence.pod_id)
        .maybeSingle()
      if (podErr) throw new Error(`pod lookup failed: ${podErr.message}`)
      if (!pod) return res.status(404).json({ error: `No pod for line ${lineId}` })

      // The line has to be one of THIS voice's own lines. The link is the
      // identity, so the link must not reach past its own queue. This is also
      // the CROSS-ARTIST answer: a pod sentence is bucketed by (dialect, gender)
      // and a bucket routes to one voice, so a line in Aran's queue is never in
      // Catrin's, and this check refuses the case anyway.
      const queue = await buildQueue(db(), recordist, { includeRecorded: true })
      const mine = queue.lines.find((l) => l.id === lineId)
      if (!mine) {
        return res.status(403).json({ error: 'That line is not in your queue.', reason: 'not_yours' })
      }
      if (!mine.canEditText) {
        return res.status(403).json({
          error: 'That line comes from the course itself, so its words are changed there rather than here.',
          reason: 'not_editable',
        })
      }

      // THE TAKE GOES WITH THE WORDS. See the note above the route.
      const patch = { target_text: text, target_audio_id: null }
      // The known side is the recordist's crib. On a fixture whose two sides are
      // the same string, leaving it behind would put the OLD sentence under the
      // new one on screen and look like a bug; where the two genuinely differ,
      // the known side is a real translation and is not ours to rewrite.
      const knownTracksTarget = (sentence.known_text || '').trim() === (sentence.target_text || '').trim()
      if (knownTracksTarget) patch.known_text = text

      // ONE LINE ON SCREEN IS ONE LINE IN THE COURSE. The queue collapses every
      // sentence row that reads the same, in this voice's bucket, into one line
      // to read — the roster says so out loud ("this take also fills N other
      // lines"). So an edit moves all of them: leaving the copies behind would
      // split one line into two and hand the artist back a line they thought
      // they had just fixed.
      const ids = [lineId, ...(mine.duplicateSentenceIds || []).filter((id) => id && id !== lineId)]

      const { error: updErr } = await db()
        .from('listening_pod_sentences')
        .update(patch)
        .in('id', ids)
      if (updErr) throw new Error(`line update failed: ${updErr.message}`)

      // THE PROGRESS MIGRATION, in the same call as the content change. New
      // words in an old slot is a new sentence (protocol rule 6) and a new
      // sentence arrives unseen (rule 4) — absence IS unseen, so the row goes.
      // Nothing is deducted anywhere else: this costs a learner a little
      // re-listening and nothing more.
      const { error: progErr, count: progressDropped } = await db()
        .from('learner_pod_state')
        .delete({ count: 'exact' })
        .in('sentence_id', ids)
      if (progErr) throw new Error(`progress migration failed: ${progErr.message}`)

      logger.info(`[Recordist] ${recordist.voiceId} rewrote ${ids.length} row(s) for ${lineId} (${pod.course_code}): "${sentence.target_text}" -> "${text}"; unlinked take ${sentence.target_audio_id || '(none)'}; dropped ${progressDropped || 0} learner_pod_state row(s)`)
      res.json({
        ok: true,
        lineId,
        text,
        knownText: knownTracksTarget ? text : sentence.known_text,
        courseCode: pod.course_code,
        // Said out loud so the screen can say it too: the line is outstanding
        // again, and the take it used to have is still there, untouched.
        recorded: false,
        previousText: sentence.target_text,
        alsoChanged: ids.length - 1,
        // The clip that used to fill this slot. Nothing was deleted — it is
        // still in course_audio under the words it actually says.
        unlinkedAudioId: sentence.target_audio_id || null,
        progressDropped: progressDropped || 0,
      })
    } catch (err) {
      logger.error(`[Recordist] text edit: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 4. coverage ────────────────────────────────────────────────────────────
  router.get('/coverage', async (req, res) => {
    try {
      res.json(await buildCoverage(db()))
    } catch (err) {
      logger.error(`[Recordist] coverage: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── 5. the policy itself (admin) ───────────────────────────────────────────
  router.get('/languages', async (req, res) => {
    try {
      if (requireAdmin && !(await requireAdmin(req, res))) return
      const rows = await loadPolicies(db())
      res.json(rows.map((r) => ({
        language: r.language,
        languageName: languageName(r.language),
        humanOnly: !!r.human_only,
        voices: r.voices || {},
        notes: r.notes || null,
        updatedAt: r.updated_at,
      })))
    } catch (err) {
      logger.error(`[Recordist] languages: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.put('/languages/:language', async (req, res) => {
    try {
      if (requireAdmin && !(await requireAdmin(req, res))) return

      let language
      try {
        language = canonicalLanguage(req.params.language)
      } catch (e) {
        if (e instanceof ClipIdentityError) return res.status(400).json({ error: e.message })
        throw e
      }

      const { humanOnly, voices, notes } = req.body || {}
      if (humanOnly !== undefined && typeof humanOnly !== 'boolean') {
        return res.status(400).json({ error: 'humanOnly must be a boolean' })
      }
      if (voices !== undefined) {
        if (!voices || typeof voices !== 'object' || Array.isArray(voices)) {
          return res.status(400).json({ error: 'voices must be an object keyed by gender' })
        }
        // A slot is 'm' / 'f' for a single-dialect language, or 'm:<dialect>' /
        // 'f:<dialect>' when the language has more than one — Welsh needs four
        // slots, not two, and a key of 'm' alone cannot say which accent it
        // means. The gender is the leading token; the dialect is stated on the
        // ENTRY (entry.dialect), because the slot key is only a unique name and
        // the tag is the thing the queue routes on.
        const seenBuckets = new Set()
        for (const [slot, entry] of Object.entries(voices)) {
          const gender = String(slot).split(':')[0]
          if (!['m', 'f'].includes(gender)) return res.status(400).json({ error: `voices key must be 'm', 'f', 'm:<dialect>' or 'f:<dialect>' (got ${slot})` })
          if (!entry || !entry.voiceId) return res.status(400).json({ error: `voices.${slot}.voiceId required` })
          if (entry.gender !== undefined && String(entry.gender).toLowerCase() !== gender) {
            return res.status(400).json({ error: `voices.${slot}.gender (${entry.gender}) contradicts its slot key` })
          }
          if (entry.dialect !== undefined && (typeof entry.dialect !== 'string' || !entry.dialect.trim())) {
            return res.status(400).json({ error: `voices.${slot}.dialect must be a non-empty string when given` })
          }
          // Two voices in one (dialect, gender) bucket is not a richer cast, it
          // is an ambiguous queue: the second one would silently never be read.
          const bucket = bucketKey(entry.dialect, gender)
          if (seenBuckets.has(bucket)) {
            return res.status(400).json({ error: `two voices share the bucket ${bucket} — one voice per gender per dialect` })
          }
          seenBuckets.add(bucket)
          try {
            // Refuse an unspellable voice here rather than mint a queue nobody
            // can be paid attribution under.
            canonicalVoiceId(entry.voiceId)
          } catch (e) {
            return res.status(400).json({ error: `voices.${slot}.voiceId: ${e.message}` })
          }
          // ── NO CONSENT, NO CAST (Tom, 2026-08-31) ────────────────────────
          // This policy row is what routes a language's recording queue to a
          // named person's voice, so it is a cast in everything but table name
          // and takes the same lock as the Voice Lab's slot endpoint. Checked
          // before the upsert: a refused policy writes nothing at all.
          try {
            await consentGate.assertConsented(String(entry.voiceId), { db: db(), context: `${language} recording policy ${slot}` })
          } catch (err) {
            return res.status(err.status || 409).json({ error: err.message, code: err.code || 'NO_RECORDED_CONSENT', slot, voiceId: entry.voiceId })
          }
        }
      }

      const { data: existing } = await db()
        .from('language_recording_policy').select('*').eq('language', language).maybeSingle()

      const row = {
        language,
        human_only: humanOnly !== undefined ? humanOnly : (existing ? existing.human_only : false),
        voices: voices !== undefined ? voices : (existing ? existing.voices : {}),
        notes: notes !== undefined ? notes : (existing ? existing.notes : null),
      }
      const { data, error } = await db()
        .from('language_recording_policy')
        .upsert(row, { onConflict: 'language' })
        .select()
        .single()
      if (error) throw new Error(`policy write failed: ${error.message}`)
      logger.log(`[Recordist] policy ${language}: human_only=${data.human_only}, voices=${Object.keys(data.voices || {}).join('/') || 'none'}`)
      res.json({
        language: data.language,
        languageName: languageName(data.language),
        humanOnly: !!data.human_only,
        voices: data.voices || {},
        notes: data.notes || null,
        updatedAt: data.updated_at,
      })
    } catch (err) {
      logger.error(`[Recordist] policy write: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  return router
}
