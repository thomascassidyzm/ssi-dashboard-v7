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
 * Since job #380 (Aran, 2026-10-14) the link carries a PRIVATE KEY (?k=) and
 * every /voice/:voiceId route checks it first — booth-link-keys.cjs.
 *
 *   GET  /mine                              which voice(s) the SIGNED-IN user reads
 *   GET  /voice/:voiceId                    the by-language queue (recordist-queue.cjs)
 *   POST /voice/:voiceId/take               a take → the EXISTING upload seam
 *   GET  /voice/:voiceId/line/:lineId/clip  the STORED bytes, for playback
 *   GET  /voice/:voiceId/latest-takes       newest stored takes, signed URLs (signed in: own voice or God admin)
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
  castEntryFor,
  isTestFixtureCourse,
  parseSeedLineId,
  parseQuarryLineId,
  parseTakeGLineId,
  takeGChunks,
  takeGChunksDetail,
  TAKEG_SEAM,
  linkSeedTake,
  seedCastEntry,
  policyVoiceList,
  lineVoiceId,
  clipVoiceId,
  voiceRegister,
  invalidateLanguageQueueCache,
  linkPhraseTake,
  getPhrasePlan,
  isLegoQueueCourse,
  parseLegoLineId,
  linkLegoTake,
  warmLanguageQueues,
  voiceTakes,
} = require('./recordist-queue.cjs')
const { enableRewarmAfterInvalidate, onLanguageQueueInvalidated } = require('./recordist-queue-cache.cjs')
const { invalidateArtistSummaries } = require('./booth-artists-summary-cache.cjs')
const { createBoothQueueCache } = require('./booth-queue-cache.cjs')
const phraseQueue = require('./phrase-queue.cjs')
const boothHome = require('./booth-home.cjs')
const boothNextPod = require('./booth-next-pod.cjs')
const boothActorQueue = require('./booth-actor-queue.cjs')
const boothRerecord = require('./booth-rerecord.cjs')
const { courseDialect } = require('../shared/dialect.cjs')
const { nextTakeGIds } = require('../shared/takeg-clip-contract.cjs')
const { isSoloReaderPod, soloReaders, soloReaderIndex, soloReaderTakeGIds } = require('../shared/pod-solo-readers.cjs')
const castingRights = require('./casting-rights.cjs')
const { resolvePack, findItem } = require('./clone-source-pack.cjs')
const setupCheck = require('./recordist-setup-check.cjs')
const rerecordAll = require('./recordist-rerecord-all.cjs')
const {
  takeKey,
  packPrefix,
  indexTakes,
  probeDurationSeconds,
  overCapMessage,
  buildPackQueue,
} = require('./clone-source-store.cjs')
const { canonicalLanguage, canonicalVoiceId, ClipIdentityError } = require('../shared/clip-identity.cjs')
const { patchVoiceSlot } = require('../shared/policy-voice-patch.cjs')
const { audioKeyCandidates } = require('../shared/text-normalize.cjs')
const { resolveCurrentClip } = require('./take-selection.cjs')
const { bucketKey } = require('../shared/dialect.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')
const { isGodAdmin } = require('./booth-god-admins.cjs')
const boothLinks = require('./booth-link-keys.cjs')
const { boothTabs, parseHeldKeys } = require('./booth-tabs.cjs')
const boothUploadConcurrency = require('./booth-upload-concurrency.cjs')

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
  // (req,res,scope) -> user|null: an admin session OR a signed same-host agent
  // holding `scope` (services/shared/agent-admin-identity.cjs). Falls back to
  // plain requireAdmin when not wired, so tests and old mounts are unchanged.
  requireAdminOrAgent = (req, res) => (requireAdmin ? requireAdmin(req, res) : { email: 'test' }),
  // Resolves ANY signed-in dashboard identity (recorder, editor, admin). Only
  // /mine takes it: that route answers "which voice am I?", which is a question
  // about the caller and cannot be answered without knowing who the caller is.
  requireDashboardUser,
  handleRecordingUpload,
  // The booth take's background script check (job #842, services/take-text-check-queue.cjs):
  // its per-voice failed-check list feeds the Re-record card. Absent in tests that do not use it.
  textChecks = null,
  // Injectable only so the route's variant handling is testable without S3.
  s3 = require('../s3-production-service.cjs'),
  // Build the practice-phrase plan once shortly after boot (job #619), so the
  // first Welsh reader of the day does not pay its ~3-10 s cold read on top of
  // the language read. Production passes true; tests leave it off.
  warmPhrasePlan = false,
  // PRIVATE BOOTH LINKS (job #380): the per-voice key gate on every /voice/:voiceId route. Production
  // builds it once (production-api.cjs) so the admin panel can read its grace log; left out, the
  // router builds its own over the same DB. `identifyCaller` resolves a signed-in caller WITHOUT
  // answering, for the God-admin / own-voice bypass; `boothKeys` is the key store.
  boothKeys = null,
  boothKeyGate = null,
  identifyCaller = null,
  // PHASE 1, TWO TAKES AT ONCE (job #221, booth-upload-concurrency.cjs): the ceiling advertised
  // on every take reply, and the per-line lock that keeps two takes of one line from racing.
  boothUpload = null,
  takeLineLock = null,
}) {
  const router = express.Router()
  const uploadSetting = boothUpload || boothUploadConcurrency.createConcurrencySetting()
  const lineLock = takeLineLock || boothUploadConcurrency.createKeyedLock({
    onTimeout: (key) => logger.warn(`[BoothTake] line lock wait passed ${boothUploadConcurrency.WAIT_CAP_MS} ms for ${key} — proceeding unserialised`),
  })
  let takesInFlight = 0

  const db = () => {
    const client = getDb()
    if (!client) throw Object.assign(new Error('Supabase not initialized'), { status: 503 })
    return client
  }
  if (warmPhrasePlan) {
    // Job #337: the language read was cold after every deploy and after every
    // take. Warm it at boot beside the plan, and re-warm it after a take.
    enableRewarmAfterInvalidate()
    const t = setTimeout(() => {
      try { warmLanguageQueues(db()).catch((e) => logger.warn(`[Recordist] language queue warm failed: ${e.message}`)) } catch (e) { logger.warn(`[Recordist] language queue warm skipped: ${e.message}`) }
      try { getPhrasePlan(db()).catch((e) => logger.warn(`[Recordist] phrase plan warm failed: ${e.message}`)) } catch (e) { logger.warn(`[Recordist] phrase plan warm skipped: ${e.message}`) }
    }, 15_000)
    if (typeof t.unref === 'function') t.unref()
  }

  const keys = boothKeys || boothLinks.createBoothKeyStore({ getDb })
  const ownsVoice = async (user, voiceKeyId) => {
    if (!user || !user.email) return false
    return (await voicesForEmail(db(), user.email)).some((v) => v.voiceId === voiceKeyId)
  }
  // THE BOOTH KEY GATE, before every /voice/:voiceId route below (booth-link-keys.cjs): the link is
  // still the identity, but only with its private key, or for a signed-in God admin / the artist.
  router.use('/voice/:voiceId', boothKeyGate || boothLinks.createBoothKeyGate({
    store: keys, identify: identifyCaller, isGodAdmin, ownsVoice, logger,
  }))

  /** Resolve :voiceId or answer 404 — the only gate routes 1-3 have, by design. */
  async function recordistOr404(req, res) {
    const course = typeof req.query.course === 'string' && req.query.course.trim() ? req.query.course.trim() : undefined
    const recordist = await resolveRecordist(db(), req.params.voiceId, { course })
    if (!recordist) {
      res.status(404).json({
        error: `No recording voice ${req.params.voiceId}. A recording link is only live while ` +
          `language_recording_policy names that voice for a language, or a course's cast names it.`,
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

  // ── SETUP CHECKS (job #838) ───────────────────────────────────────────────
  // A setup check is a per-artist pack whose ten lines live in
  // recordist_setup_checks. Everything that asks "is this voice id a pack"
  // asks THIS, so the static pack and the per-artist packs share every branch.
  async function loadSetupRow(voiceId) {
    const { data, error } = await db().from('recordist_setup_checks').select('*').eq('voice_id', voiceId).maybeSingle()
    if (error) throw new Error(`setup check read failed: ${error.message}`)
    return data || null
  }

  async function resolveAnyPack(packVoiceId) {
    const staticPack = resolvePack(packVoiceId)
    if (staticPack) return staticPack
    const inner = setupCheck.voiceIdFromPackVoiceId(packVoiceId)
    if (!inner) return null
    const row = await loadSetupRow(inner)
    if (!row) return null
    return setupCheck.packFromRow(row, { displayName: inner })
  }

  /** A setup-pack take: remember which device made it, and re-open a check that was waiting on a decision. */
  async function noteSetupTake(pack, itemId, device, key) {
    if (!pack.setup) return
    const row = await loadSetupRow(pack.setup.voiceId)
    if (!row) return
    const metrics = row.metrics && typeof row.metrics === 'object' ? row.metrics : {}
    const takes = { ...(metrics.takes || {}), [itemId]: { key, device: device || 'unknown', at: new Date().toISOString() } }
    const measured = { ...(metrics.measured || {}) }
    delete measured[itemId] // a new take of this phrase has not been measured yet
    await db().from('recordist_setup_checks').update({ metrics: { ...metrics, takes, measured } }).eq('voice_id', row.voice_id)
    // The reopen is CONDITIONAL on the status we read: a Submit that landed
    // between that read and now must stay submitted (review #857).
    const next = setupCheck.statusAfterTake(row.status)
    if (row.status === 'approved' || next === row.status) return
    await db().from('recordist_setup_checks').update({ status: next }).eq('voice_id', row.voice_id).eq('status', row.status)
  }

  /**
   * Measure every newest take that is not yet measured at the current
   * MEASURE_VERSION and judge the set (job #435). Returns {items, measured,
   * verdict, dirty}; the caller persists. A take that cannot be fetched or
   * measured is left unmeasured, which the judge ignores -- never failed.
   */
  async function measureAndJudgeSetup(row, pack, newest) {
    const metrics = row.metrics && typeof row.metrics === 'object' ? row.metrics : {}
    const measured = { ...(metrics.measured || {}) }
    let dirty = false
    const items = []
    for (const item of pack.items) {
      const take = newest.get(item.id) || null
      const entry = { id: item.id, text: item.text, recorded: !!take, url: null, device: (metrics.takes || {})[item.id]?.device || null, measures: null }
      if (take) {
        entry.url = await s3.getAudioSignedUrl(null, 3600, { s3Key: take.key })
        const have = measured[item.id]
        if (!have || have.key !== take.key || have.v !== setupCheck.MEASURE_VERSION) {
          try {
            const r = await fetch(entry.url)
            const buf = Buffer.from(await r.arrayBuffer())
            measured[item.id] = { key: take.key, ...(await setupCheck.measureTake(buf, 'audio/' + String(take.key).split('.').pop())) }
            dirty = true
          } catch (err) { logger.error(`[Recordist] setup-check measure ${item.id}: ${err.message}`) }
        }
        entry.measures = measured[item.id] || null
      }
      items.push(entry)
    }
    const judged = setupCheck.judgeSetupCheck(Object.fromEntries(items.filter((i) => i.measures).map((i) => [i.id, i.measures])))
    const verdict = { verdict: judged.verdict, reasons: judged.reasons, judged: judged.judged, perTake: judged.perTake, at: new Date().toISOString() }
    return { items, measured, verdict, dirty, metrics }
  }

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
      pack: { id: pack.id, title: pack.title, setup: pack.setup ? { status: pack.setup.status, voiceId: pack.setup.voiceId, note: pack.setup.note, autoVerdict: pack.setup.autoVerdict || null } : null },
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
    await noteSetupTake(pack, item.id, device, key)
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
      // Their own private link key (job #380), so the login door opens the booth with it.
      const keyOf = async (voiceId) => keys.keyFor(voiceId).catch(() => null)
      const withKeys = await Promise.all(voices.map(async (v) => ({ v, boothKey: await keyOf(v.voiceId) })))
      res.json({
        email: user.email,
        name: user.name || null,
        voices: withKeys.map(({ v, boothKey }) => ({
          boothKey,
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
  // WHERE THIS VOICE IS CAST, for the login page (Tom, 2026-09-12: a booth-
  // link-only artist with no Popty login used to land on a blank login page).
  // Link-is-identity like its siblings, and light: course codes, the display
  // name, and a HINT of the email the casting names - never the full address.
  router.get('/voice/:voiceId/casting', async (req, res) => {
    try {
      const casting = await castingRights.castingForVoice(db(), req.params.voiceId)
      if (!casting) return res.status(404).json({ error: `No recording voice ${req.params.voiceId}.` })
      res.json(casting)
    } catch (err) {
      logger.error(`[Recordist] casting lookup: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // THE PERSON'S OTHER VOICES, as tabs on one booth page (Aran, 2026-10-14, job #392). Only the
  // voices this caller could open on their own (their key in x-booth-keys, or signed in as the
  // artist / a God admin) are listed; booth-tabs.cjs says who counts as the same person.
  router.get('/voice/:voiceId/tabs', async (req, res) => {
    try {
      const user = identifyCaller && req.headers.authorization ? await identifyCaller(req).catch(() => null) : null
      const out = await boothTabs({
        db: db(), voiceId: req.params.voiceId, user, heldKeys: parseHeldKeys(req.headers['x-booth-keys']), store: keys, isGodAdmin,
      })
      if (!out) return res.status(404).json({ error: `No recording voice ${req.params.voiceId}.` })
      res.json(out)
    } catch (err) {
      logger.error(`[Recordist] tabs: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // ── ONE VOICE'S QUEUE, CACHED (job #378) ────────────────────────────────
  // Aran's tab-return reloads rebuilt his whole queue every time. The home
  // screen and the batch a card opens now share one cached build per voice
  // (booth-queue-cache.cjs says how fresh it is kept). Any write this process
  // makes for the voice drops it, and so does any invalidation of its language.
  const boothQueue = createBoothQueueCache()
  onLanguageQueueInvalidated((language) => { boothQueue.invalidateLanguage(language); invalidateArtistSummaries() })
  router.use('/voice/:voiceId', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const voiceId = req.params.voiceId
      boothQueue.invalidateVoice(voiceId)
      res.on('finish', () => { boothQueue.invalidateVoice(voiceId); invalidateArtistSummaries() }) // the team cards' counts (job #416)
    }
    next()
  })
  /** {value: {recordist, queue, setupRow}, fresh, ageMs}, or null for an unknown voice. */
  async function homeQueueFor(voiceIdParam, { allowStale = false } = {}) {
    const got = await boothQueue.get(voiceIdParam, async () => {
      const recordist = await resolveRecordist(db(), voiceIdParam, {})
      if (!recordist) return null
      const [queue, setupRow] = await Promise.all([
        buildQueue(db(), recordist, { includeRecorded: true }),
        loadSetupRow(recordist.voiceId),
      ])
      return { recordist, queue, setupRow }
    }, { allowStale })
    if (!got.value) { boothQueue.invalidateVoice(voiceIdParam); return null }
    return got
  }

  // THE RE-RECORD LIST (Aran, 2026-10-15, job #788), built once per cached queue: the skips and
  // text changes of booth-rerecord.cjs. Memoised ON the cached value, so it is dropped exactly
  // when the queue is — any take or edit for the voice, or its language's invalidation.
  const rerecordLists = new WeakMap()
  function rerecordListFor(value) {
    let p = rerecordLists.get(value)
    if (!p) {
      const idx = boothRerecord.indexQueue(value.queue)
      p = voiceTakes(db(), value.recordist, idx.courses, { provenanceFor: (t) => boothRerecord.isOrphanTake(idx, t) })
        .then((takes) => boothRerecord.buildRerecordList(value.queue, takes, idx))
      p.catch(() => rerecordLists.delete(value))
      rerecordLists.set(value, p)
    }
    return p
  }
  const idList = (v) => (typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 500) : [])

  // TAKES THAT SAVED BUT DID NOT MATCH THEIR WORDS (job #842). The script check runs after the
  // upload has answered, so its failures arrive here, not on the take's response. Read fresh on
  // every call (a small local file), never memoised with the queue: a check can land at any time.
  const voiceIdsOf = (recordist) => [...new Set([recordist.voiceId, ...(recordist.spellings || [])].filter(Boolean))]
  const textCheckFailures = (recordist) => {
    if (!textChecks || !recordist) return []
    try { return textChecks.failuresFor(voiceIdsOf(recordist)) } catch (e) {
      logger.error(`[Recordist] text-check failures for ${recordist.voiceId}: ${e.message}`)
      return []
    }
  }
  const withTextChecks = (list, recordist) => boothRerecord.withTextCheckFailures(list, textCheckFailures(recordist))

  // THE FAILED-CHECK LIST ON ITS OWN (job #842): cheap enough to poll while he records, so a take
  // that did not match comes back to him within the session — on the slim bar in a batch, and on
  // the Re-record card at home. `pending` is how many checks are still queued on this server.
  router.get('/voice/:voiceId/text-check-failures', async (req, res) => {
    try {
      const pack = await resolveAnyPack(req.params.voiceId)
      if (pack) return res.json({ voiceId: req.params.voiceId, items: [], pending: 0 })
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      const items = textCheckFailures(recordist).map((f) => ({
        lineId: f.lineId, takeId: f.takeId, heard: f.heard, reason: f.reason, checkedAt: f.checkedAt,
      }))
      res.json({ voiceId: recordist.voiceId, items, pending: textChecks ? textChecks.depth() : 0 })
    } catch (err) {
      logger.error(`[Recordist] text-check-failures: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // "IT'S FINE — KEEP IT": he listened to a flagged take and it is right (whisper mishears
  // dialect and elision: "goriadau" read as "goriada"). The take leaves the list; nothing else
  // changes — the take was always saved.
  router.post('/voice/:voiceId/text-check-failures/:takeId/keep', async (req, res) => {
    try {
      if (!textChecks) return res.status(503).json({ error: 'Script checks are not running on this server.' })
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      const f = textCheckFailures(recordist).find((x) => x.takeId === req.params.takeId)
      if (!f) return res.json({ ok: true, kept: false })
      textChecks.keep({ voiceId: recordist.voiceId, lineId: f.lineId, takeId: f.takeId })
      res.json({ ok: true, kept: true, lineId: f.lineId })
    } catch (err) {
      logger.error(`[Recordist] text-check keep: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // THE RE-RECORD CARD'S SUMMARY: the lines to read again, each with why. The page adds its own
  // refused takes (?also=<ids>) and is told which of them now have a good take (recordedAlso).
  // Read-only and not an arrival: it is fetched beside /summary, which already counts one.
  router.get('/voice/:voiceId/rerecord', async (req, res) => {
    try {
      const pack = await resolveAnyPack(req.params.voiceId)
      if (pack) return res.json({ voiceId: req.params.voiceId, total: 0, items: [], recordedAlso: [] })
      const cached = await homeQueueFor(req.params.voiceId, { allowStale: true })
      if (!cached) return res.status(404).json({ error: `No recording voice ${req.params.voiceId}.` })
      const list = withTextChecks(await rerecordListFor(cached.value), cached.value.recordist)
      res.json({
        voiceId: cached.value.recordist.voiceId,
        fresh: cached.fresh,
        total: list.items.length,
        items: list.items,
        recordedAlso: boothRerecord.recordedAmong(list, idList(req.query.also)),
        goneAlso: boothRerecord.goneAmong(list, idList(req.query.also)),
      })
    } catch (err) {
      logger.error(`[Recordist] rerecord: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // THE HOME SCREEN'S SUMMARY (Aran, 2026-10-14, job #347): sections, batches
  // and counts — no lines. The booth page used to open by fetching all of them
  // (2060 lines, 2.2MB for Aran) and drawing every one; it now draws its home
  // screen from this and fetches one batch's lines when he opens it. Same queue,
  // same counts, same recorded flag (booth-home.cjs reads them, never decides).
  // A recording pack keeps its own one-screen flow: `home: false` says so.
  // The last summary sent IN FULL per voice, so a partial one can carry its sections (job #823).
  const lastHomeTracks = new Map()
  router.get('/voice/:voiceId/summary', async (req, res) => {
    try {
      const pack = await resolveAnyPack(req.params.voiceId)
      if (pack) return res.json({ home: false, reason: 'pack' })
      // FROM THE VOICE'S QUEUE CACHE (job #378): a stale entry is served at once and
      // marked `fresh: false` (the page asks again shortly), a fresh one as it is.
      const cached = await homeQueueFor(req.params.voiceId, { allowStale: true })
      if (!cached) return res.status(404).json({ error: `No recording voice ${req.params.voiceId}.` })
      const { recordist, setupRow } = cached.value
      // AN ACTOR WITH A CONTROLLED QUEUE (job #247) is shown only its steps' lines.
      const queue = boothActorQueue.scopeQueue(recordist.voiceId, cached.value.queue)
      // The home screen is where he now ARRIVES, so the arrival is counted here
      // too, exactly as the full-queue and batch reads count it (#365 found it
      // skipped). Unscoped, so nothing is refused: the queue is his own courses.
      // Not awaited (job #378): the count is a record, and nothing on this
      // answer depends on it.
      castingRights.boothArrival({
        db: db(), recordist, courseCodes: queue.courses, method: req.method, path: req.originalUrl || req.path, logger,
      }).catch((e) => logger.warn(`[Recordist] summary arrival not counted: ${e.message}`))
      // EVERY SECTION, EVERY TIME (job #823): a kind this answer could not count (the phrase
      // plan read failed) keeps the sections this voice was last sent, marked `counting`, and the
      // answer says it is partial so the page keeps them too.
      const partial = boothHome.partialKinds(queue)
      let tracks = boothHome.buildHomeTracks(queue.lines, queue.phrases, queue.phraseBatches)
      if (partial.length) tracks = boothHome.withLastKnownSections(tracks, partial, lastHomeTracks.get(recordist.voiceId))
      else lastHomeTracks.set(recordist.voiceId, tracks)
      res.json({
        home: true,
        fresh: cached.fresh,
        ageMs: cached.ageMs,
        setupLocked: setupCheck.locksScript(setupRow),
        voiceId: recordist.voiceId,
        displayName: recordist.displayName,
        language: recordist.language,
        languageName: recordist.languageName,
        dialect: recordist.dialect,
        total: queue.total,
        recorded: queue.recorded,
        phrases: queue.phrases || null,
        notReady: queue.notReady || [],
        handedOn: queue.handedOn || [],
        partial,
        tracks,
      })
    } catch (err) {
      logger.error(`[Recordist] summary: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.get('/voice/:voiceId', async (req, res) => {
    try {
      const pack = await resolveAnyPack(req.params.voiceId)
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
      // ONE BATCH FROM THE HOME SCREEN reads the same cached build the summary
      // counted (job #378), fresh only: a reader about to record must not be
      // handed a stale recorded flag. Any other shape of read builds its own.
      const homeBatchRead = includeRecorded && quarryMaxSeed === undefined && typeof req.query.track === 'string' &&
        !(typeof req.query.course === 'string' && req.query.course.trim()) && !(typeof req.query.pod === 'string' && req.query.pod.trim())
      const cachedHome = homeBatchRead ? await homeQueueFor(req.params.voiceId) : null
      const builtQueue = cachedHome && cachedHome.value.recordist.voiceId === recordist.voiceId
        ? cachedHome.value.queue
        : await buildQueue(db(), recordist, { includeRecorded, quarryMaxSeed })
      // AN ACTOR WITH A CONTROLLED QUEUE (Kai and Aran, 2026-10-16, job #247): every read of this
      // booth is cut to the steps we put in it, in our order (booth-actor-queue.cjs). Nothing
      // outside it is drawn, counted or offered. Any other voice: the queue as built.
      const queue = boothActorQueue.scopeQueue(recordist.voiceId, builtQueue)
      // A COURSE LINK. The community course editor's "Copy link" is
      // /r/:voiceId?course=<code> (PodCastPanel): the same booth, the same
      // voice, scoped to the lines of THAT course. The language-wide link
      // (AdminRecording, no ?course=) is untouched and serves every course.
      const scoped = typeof req.query.course === 'string' && req.query.course.trim() ? req.query.course.trim() : null
      // ONE IDENTITY, TWO DOORS: the arrival is resolved as the email login
      // would be and counted the same way (casting-rights.boothArrival).
      // Refused = this voice is not cast on the course the link names.
      const arrival = await castingRights.boothArrival({
        db: db(), recordist, courseCodes: scoped ? [scoped] : queue.courses, method: req.method, path: req.originalUrl || req.path, logger,
      })
      if (scoped && arrival.refused.length) {
        return res.status(403).json({ error: arrival.refused[0].sentence, courseCode: scoped, reason: 'not_cast_no_grant' })
      }
      // A POD LINK. /production/:course/pods/:slug's "open Aran" door hands the
      // booth ?course=<code>&pod=<slug>, and until 2026-09-17 the pod half of
      // that was decoration: the server answered with the WHOLE course and the
      // booth drew all of it. For Aran that is 1221 Welsh lines and 1.7MB to
      // reach the 438-line health pod he was standing in front of — 4-10s of
      // read and transfer, through a Vercel edge rewrite that answers 502
      // rather than slowly. The scope he asked for is the scope he gets.
      //
      // MATCHED ON THE SLUG OR THE FULL POD ID, because the door has been
      // written both ways and a link a human already has in a text message
      // must not stop working.
      //
      // THE CUE CONTEXT IS UNAFFECTED: the exchange around each line is built
      // over the whole language before any of this (recordist-queue.cjs,
      // exchangeContext), so filtering here cannot take a neighbour away.
      const podScope = typeof req.query.pod === 'string' && req.query.pod.trim() ? req.query.pod.trim() : null
      const inPod = (r) => !podScope || r.podSlug === podScope || r.podId === podScope
      // A STEP LINK (job #247): ?step=<key> opens one step of a controlled queue that is not a pod
      // ('seeds' — Dan's 206 Southern seed sentences). A step the voice does not have is empty.
      const stepAsked = typeof req.query.step === 'string' && req.query.step.trim() ? req.query.step.trim() : null
      const queueStep = boothActorQueue.stepForLink(recordist.voiceId, { course: scoped, pod: podScope, step: stepAsked })
      const inStep = (r) => !stepAsked || (!!queueStep && boothActorQueue.lineInStep(r, queueStep))
      const inScope = (rows) => (rows || [])
        .filter((r) => (!scoped || r.courseCode === scoped) && inPod(r) && inStep(r))
      const forCourse = inScope
      // ONE BATCH FROM THE HOME SCREEN (job #347): ?track=<key>&batch=<n> is the
      // slice of the queue a home-screen card opens — cut by the same function
      // the summary counted it with (booth-home.cjs), so the card and the batch
      // agree. Only what goes over the wire narrows; the queue is the queue.
      const trackScope = typeof req.query.track === 'string' && req.query.track.trim() ? req.query.track.trim() : null
      // A PHRASE BATCH OPENED FROM THE HOME SCREEN may be any batch of the plan (job #697); the
      // header then describes the batch opened, not the one the queue serves. Read-only.
      const phraseCtx = { phrases: queue.phrases, phraseBatches: queue.phraseBatches, openPhraseBatch: queue.openPhraseBatch }
      const batchN = parseInt(req.query.batch, 10)
      const openedPhrase = trackScope && trackScope.startsWith('phrase.')
        ? boothHome.openPhraseBatch(inScope(queue.lines).filter((l) => boothHome.trackKeyOf(l) === trackScope), trackScope, Number.isFinite(batchN) && batchN >= 1 ? batchN : 1, phraseCtx)
        : null
      // THE RE-RECORD BATCH (job #788): the card's lines plus the page's refused ones, in course order.
      const rerecordLines = trackScope === boothRerecord.RERECORD_TRACK && cachedHome && cachedHome.value.queue === builtQueue
        ? boothRerecord.rerecordBatchLines(withTextChecks(await rerecordListFor(cachedHome.value), cachedHome.value.recordist), idList(req.query.also))
        : null
      const lines = rerecordLines ? inScope(rerecordLines) : trackScope
        ? (openedPhrase ? openedPhrase.lines : boothHome.selectBatch(inScope(queue.lines), trackScope, batchN, phraseCtx))
        : inScope(queue.lines)
      // Scoped counts are counted over the lines on the wire (the booth always
      // asks includeRecorded=1, so they are the scope's whole tally there).
      const narrowed = Boolean(scoped || podScope || stepAsked || trackScope)
      const recordedInScope = narrowed ? lines.filter((l) => l.recorded).length : queue.recorded
      const totalInScope = narrowed ? lines.length : queue.total
      const setupRow = await loadSetupRow(recordist.voiceId)
      // WHERE A FINISHED POD LINK GOES NEXT (Kai, 2026-10-16, job #189): the next pod in queue
      // order where this voice still has lines owed, skipping staged-draft and archived pods
      // (booth-next-pod.cjs says why held pods are NOT skipped). Only on a pod link, reading only
      // the candidate pods' metadata. A failed read offers no next pod; it never fails the booth.
      // A CONTROLLED QUEUE answers from its own order instead (job #247): the next step with lines
      // owed, never a pod outside it, and nothing said about lines outside it.
      let podsDone = null
      if (queue.actorQueue && (podScope || stepAsked) && !trackScope) {
        podsDone = boothActorQueue.nextStepFor(recordist.voiceId, queue.lines, queueStep)
      } else if (podScope && !trackScope) {
        try {
          const owed = [...new Set((queue.lines || []).filter((l) => l.podId && !l.recorded).map((l) => l.podId))]
          const { data: podRows, error: podErr } = owed.length
            ? await db().from('listening_pods').select('id, metadata').in('id', owed)
            : { data: [], error: null }
          if (podErr) throw podErr
          podsDone = boothNextPod.nextPodFor(queue.lines, podScope, new Map((podRows || []).map((p) => [p.id, p])))
        } catch (err) {
          logger.warn(`[booth] next pod not worked out for ${recordist.voiceId}: ${err.message}`)
        }
      }
      res.json({
        // Present while the full script is locked behind the setup check; the
        // booth swaps Start for a card that opens it. Absent once approved.
        setupCheck: setupCheck.locksScript(setupRow)
          ? { status: setupRow.status, note: setupRow.review_note || null, packVoiceId: setupCheck.packVoiceIdFor(setupRow.voice_id), autoVerdict: setupCheck.artistVerdict(setupRow) }
          : null,
        course: scoped,
        // Echoed back for the same reason maxSeed is: a screen that reports the
        // scope it ASKED for rather than the one it got is a quiet lie.
        pod: podScope,
        step: stepAsked,
        // {nextPod: {courseCode, podSlug, podTitle, remaining} | null, remainingOutsidePods}, or
        // null when this is not a pod link or it could not be worked out (job #189).
        podsDone,
        track: trackScope,
        batch: trackScope ? (parseInt(req.query.batch, 10) || 1) : null,
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
        // THE PRACTICE-PHRASE BATCH this reader is on (job #619): pass, batch,
        // how far through, what comes later. Null when they read no phrases.
        phrases: (openedPhrase && openedPhrase.summary) || queue.phrases || null,
        total: totalInScope,
        recorded: recordedInScope,
        remaining: totalInScope - recordedInScope,
        // WORK THAT IS THEIRS AND HAS NO WORDS YET. On the wire because it was
        // the one thing this response could not say: a pod line with no target
        // text was dropped before it was ever counted, so 168 untranslated
        // Senedd lines were invisible in Aran's booth AND absent from every
        // number on it, and he was told twice that nothing was missing.
        notReady: forCourse(queue.notReady),
        // LINES THEY READ THAT ARE NOW CAST TO SOMEBODY ELSE. On the wire
        // because a recast is invisible from inside a queue that only carries
        // what you are currently cast for — which is how 29 of Aran's takes
        // dropped out of his own history and made his work look as though it
        // stopped at scene 14.
        handedOn: forCourse(queue.handedOn),
        lines,
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
    // A cast-only (community) voice re-records on its cast courses and nowhere
    // else -- the same verdict the queue, the link and the pod-line take give.
    // The language check above is not enough: a sibling course of the same
    // language is the exact thing a per-course cast must not reach, and a clip
    // uuid the queue never showed is still a uuid. A policy voice is
    // language-wide and unchanged here (job #334 cold-verify of #329).
    if (Array.isArray(recordist.castCourses)) {
      const arrival = await castingRights.boothArrival({
        db: db(), recordist, courseCodes: [clip.course_code], method: req.method, path: req.originalUrl || req.path, logger,
      })
      if (arrival.refused.length) {
        return res.status(403).json({ error: arrival.refused[0].sentence, courseCode: clip.course_code, reason: 'not_cast_no_grant' })
      }
    }

    // AND ITS OWN CLIPS ONLY, for a policy voice and a cast-only voice alike.
    // A flagged clip has a voice (clipVoiceId: its own voice_id through the
    // register's aliases, or the want's gender through the policy for the
    // untagged narration bucket). Before this a policy voice of the same
    // language re-recorded any flagged clip by uuid -- Bea re-recorded Amina's
    // clip and retired Amina's want (job #349, 2026-09-12). The queue never
    // showed her that uuid; the take holds the same rule (job #351).
    //
    // A CLIP NOBODY CAN BE NAMED FOR IS NOBODY'S TO RECORD. clipVoiceId is null
    // when the clip is untagged AND its want names no gender, or names a gender
    // the course casts nobody (or two voices) for. The queue counts such a clip
    // `uncast` and offers it to no one (linesForVoice hands out owned lines
    // only); until this the take let ANY voice of the language past this check
    // on a null owner and retire the want (cold-verify #355, house re-check
    // #362). Queue and take agree: no owner, no take.
    {
      const { data: clipCourse, error: courseErr } = await db()
        .from('courses').select('course_code, voice_config, dialect').eq('course_code', clip.course_code).maybeSingle()
      if (courseErr) throw new Error(`course lookup failed: ${courseErr.message}`)
      const register = await voiceRegister(db(), recordist.language)
      const owner = clipVoiceId(clip, clipCourse, register)
      if (!owner || !recordist.spellings.includes(owner)) {
        const ownerName = owner ? ((register.aliasOwner.get(owner) || {}).name || owner) : null
        const sentence403 = `${recordist.displayName} is not cast to read this clip of ${clip.course_code}: ` +
          (owner ? `it belongs to ${ownerName}.` : 'nobody is named to carry it yet.')
        castingRights.recordAccess({
          kind: 'refused', email: recordist.email, voices: [recordist.voiceId], courseCode: clip.course_code,
          method: req.method, path: req.originalUrl || req.path, sentence: sentence403, logger,
        })
        return res.status(403).json({ error: sentence403, courseCode: clip.course_code, reason: 'not_cast_on_line' })
      }
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
      // which booth line this take is for: its script check reports back to that line (job #842)
      recordistLineId: lineId,
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
      else { retired = 1; invalidateLanguageQueueCache(recordist.language) }
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

    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config, target_lang, known_lang, dialect').eq('course_code', seed.course_code).maybeSingle()
    if (cErr) throw new Error(`course lookup failed: ${cErr.message}`)
    if (!course) { res.status(404).json({ error: `No course ${seed.course_code}` }); return null }

    const policies = await loadPolicies(db())
    const policy = policies.find((row) => row.language === recordist.language)
    const cast = seedCastEntry(course, policyVoiceList(policy))

    // THE KNOWN SIDE, CHECKED ON THE SERVER. The booth has no login, so the
    // client's word for "this is a test course" is a suggestion. A live course's
    // known side is recorded only where the known language's policy CASTS a
    // voice on it by castOn (Aran's English, job #588); otherwise only a zzz_
    // fixture records its English (Tom, 2026-09-02).
    const fixture = isTestFixtureCourse(seed.course_code)
    const knownCastOn = parsed.role === 'known' && !fixture && !!(cast.known && cast.known.fillOnly)
    if (parsed.role === 'known' && !fixture && !knownCastOn) {
      res.status(403).json({
        error: 'The known side of a live course is not recorded here unless its known language casts a reader on it. Only a test fixture course records its English otherwise.',
        reason: 'known_side_live_course',
        courseCode: seed.course_code,
      })
      return null
    }

    // WRONG LANGUAGE, said in those words. Checked before the cast, because the
    // cast is resolved against the RECORDIST's own language policy: a Welsh
    // voice pointed at a zzz seed would otherwise be told "nobody is cast",
    // which is false and sends whoever reads it to change the wrong thing. The
    // language is the SIDE's: a castOn known line speaks the course's known_lang.
    const sideLang = knownCastOn ? course.known_lang : course.target_lang
    let courseLanguage = null
    try { courseLanguage = canonicalLanguage(sideLang) } catch { courseLanguage = null }
    if (courseLanguage !== recordist.language) {
      res.status(403).json({
        error: `That seed belongs to ${seed.course_code}, which is ${sideLang}, not ${recordist.language}.`,
        reason: 'wrong_language',
        courseCode: seed.course_code,
      })
      return null
    }

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
      // which booth line this take is for: its script check reports back to that line (job #842)
      recordistLineId: parsed.raw,
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
   * Resolve a TAKE G line: the sentence, its declared seams, and whether this
   * recordist is the one cast to read it.
   *
   * Everything is read from the row. `takeg:<sentenceId>` is a claim, not a
   * credential — the booth has no login — so the speaker's cast entry decides,
   * exactly as it does for the sentence's natural line.
   */
  async function resolveTakeGLine(res, recordist, parsed) {
    const { data: sentence, error } = await db()
      .from('listening_pod_sentences')
      .select('id, pod_id, speaker, target_text, known_text, atom_map_fine, takeg_audio_ids')
      .eq('id', parsed.sentenceId)
      .maybeSingle()
    if (error) throw new Error(`take G line lookup failed: ${error.message}`)
    if (!sentence) { res.status(404).json({ error: `No line ${parsed.raw}` }); return null }

    const { chunks, reason } = takeGChunksDetail(sentence)
    if (!chunks) {
      // TWO DIFFERENT FACTS, SAID APART. "No seams" is a sentence nobody has
      // decomposed yet; "the map is not this sentence" is a decomposition that
      // belongs to some other wording, and telling the booth the first when it
      // is the second sends the reader looking for work that is not the problem.
      res.status(409).json(reason === 'map_is_not_this_sentence' ? {
        error: 'The seams recorded for this sentence do not appear in it — its decomposition belongs to different words, so a gapped read of it could not be sliced.',
        reason,
      } : {
        error: 'That sentence declares no seams, so there is nothing for a gapped read to be sliced into.',
        reason: 'no_chunks',
      })
      return null
    }

    const { data: pod, error: pErr } = await db()
      .from('listening_pods').select('id, course_code, metadata').eq('id', sentence.pod_id).maybeSingle()
    if (pErr) throw new Error(`pod lookup failed: ${pErr.message}`)
    if (!pod) { res.status(404).json({ error: `No pod for line ${parsed.raw}` }); return null }

    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config, target_lang, known_lang').eq('course_code', pod.course_code).maybeSingle()
    if (cErr) throw new Error(`course lookup failed: ${cErr.message}`)
    if (!course) { res.status(404).json({ error: `No course ${pod.course_code}` }); return null }

    // A SOLO-READER POD IS CAST BY ITS READERS. The line has no character to be
    // cast by — that is the whole point of the shape (shared/pod-solo-readers.cjs)
    // — so the pod's own list decides, and both readers are entitled to the same
    // sentence.
    if (isSoloReaderPod(pod)) {
      if (soloReaderIndex(pod, recordist.spellings) < 0) {
        res.status(403).json({
          error: `This set is read by ${soloReaders(pod).join(' and ')}, not you.`,
          reason: 'not_your_slot',
          courseCode: course.course_code,
        })
        return null
      }
      return { sentence, pod, course, chunks, text: chunks.map((c) => c.target).join(TAKEG_SEAM) }
    }

    // CAST BY SPEAKER, exactly as the sentence's own line is. A Take G is the
    // same person reading the same line a second way; it is never cast apart
    // from it.
    const podCast = (course.voice_config && course.voice_config.podCast) || null
    const entry = castEntryFor(podCast, sentence.speaker)
    const castVoiceId = entry && entry.voiceId ? String(entry.voiceId) : null
    if (!castVoiceId || !recordist.spellings.includes(castVoiceId)) {
      res.status(403).json({
        error: castVoiceId
          ? `${sentence.speaker} is read by ${castVoiceId}, not you.`
          : `${sentence.speaker} has nobody cast to read them, so there is nothing here for you to record.`,
        reason: castVoiceId ? 'not_your_slot' : 'uncast_slot',
        courseCode: course.course_code,
      })
      return null
    }
    return { sentence, pod, course, chunks, text: chunks.map((c) => c.target).join(TAKEG_SEAM) }
  }

  /**
   * A take for a TAKE G line — the gapped whole-sentence read.
   *
   * Filed as `role: 'pod_take_g'`, which is the role the estate's own TTS Take G
   * renders under (tools/render-take-g.cjs). That is what keeps it off the
   * natural take's toes: course_audio's unique key is (course_code,
   * text_normalized, language, role, voice_id), it has no cadence column, and
   * filing a gapped read under `target` would overwrite the natural one and put
   * a deliberately-halting read in front of a learner. script-take-filing.cjs
   * says so in as many words, about the same hazard.
   *
   * `cadence: 'gapped'` — not 'slow'. A slow take is deliberately never filed at
   * all (it is a measurement for the aligner and nothing else), and an unfiled
   * take leaves no row, so the queue could never tell this line was done and
   * would offer it again forever. A Take G must EXIST as a clip: it is the
   * material every ladder rung is sliced from.
   *
   * Then the clip id is appended to the sentence's `takeg_audio_ids`, which is
   * both what tools/slice-take-g.cjs reads and what scores this line recorded.
   * Nothing is deleted and nothing is unlinked: the clip exists before the
   * pointer moves.
   */
  async function recordTakeGTake({ req, res, recordist, parsed, text, audioBase64, mimeType, device }) {
    const resolved = await resolveTakeGLine(res, recordist, parsed)
    if (!resolved) return

    if (text && text.trim() && text.trim() !== resolved.text) {
      return res.status(409).json({
        error: 'The seams on this line have changed since the queue was loaded -- reload before recording it.',
        expected: resolved.text,
        received: text.trim(),
      })
    }

    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: resolved.course.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      // which booth line this take is for: its script check reports back to that line (job #842)
      recordistLineId: parsed.raw,
      body: {
        audioData: audioBase64,
        mimeType,
        metadata: {
          mode: 'script',
          cadence: 'gapped',
          role: 'pod_take_g',
          kind: 'pod_take_g',
          text: resolved.text,
          voiceId: recordist.voiceId,
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
    let linked = false
    if (audioId) {
      // THE ARRAY IS POSITIONAL, AND A HUMAN TAKE G IS THE WHOLE TURN.
      //
      // `takeg_audio_ids[i]` is the clip for GROUP i of the turn's units —
      // tools/render-take-g.cjs writes one entry per glued group and
      // tools/slice-take-g.cjs reads `takeg_audio_ids[gi]` by that same index.
      // Appending a second take therefore did not mean "a better read": it meant
      // "here is group 1's clip", and the slicer would have carved this whole
      // sentence's second half out of a take of the whole thing while group 0
      // kept the older one. The booth records ONE gapped read of the ENTIRE
      // turn, seams at every unit, so the honest write is a one-entry array
      // saying exactly that — the slicer's single-clip rule spreads it over
      // every group.
      //
      // A re-record REPLACES the pointer and nothing else: the new clip is
      // filed before this write and the old one is left in course_audio,
      // unlinked, never deleted. Make-before-break.
      // PER READER ON A SOLO-READER POD, positional-per-group everywhere else.
      // Two recordists read this one line, so one shared slot would mean the
      // second take silently unlinked the first and re-offered it.
      const next = isSoloReaderPod(resolved.pod)
        ? soloReaderTakeGIds(resolved.pod, resolved.sentence.takeg_audio_ids, recordist.spellings, audioId)
        : nextTakeGIds(resolved.sentence.takeg_audio_ids, audioId)
      const { error: upErr } = await db()
        .from('listening_pod_sentences').update({ takeg_audio_ids: next }).eq('id', resolved.sentence.id)
      if (upErr) logger.error(`[Recordist] take G link failed (take is stored and filed): ${upErr.message}`)
      else { linked = true; invalidateLanguageQueueCache(recordist.language) }
    } else {
      logger.error(`[Recordist] take G for ${resolved.sentence.id} was NOT filed as a clip: ${filing && filing.reason}`)
    }

    return res.json({
      ok: true,
      audioId,
      kind: 'takeg',
      role: 'pod_take_g',
      linked,
      chunks: resolved.chunks.length,
      clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(parsed.raw)}/clip`,
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
      // which booth line this take is for: its script check reports back to that line (job #842)
      recordistLineId: parsed.raw,
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

  /**
   * Play back a Take G — by the sentence's OWN `takeg_audio_ids`, never by text.
   *
   * The natural take of the same sentence has the same words; a text lookup
   * would happily hand it back and the artist would hear an ungapped read of
   * the line he is trying to gap. The slot is the only honest answer, which is
   * the same rule that scores the line recorded in the first place.
   */
  async function takeGClipResponse(req, res, recordist, parsed) {
    const resolved = await resolveTakeGLine(res, recordist, parsed)
    if (!resolved) return
    const ids = Array.isArray(resolved.sentence.takeg_audio_ids) ? resolved.sentence.takeg_audio_ids : []
    if (!ids.length) return res.status(404).json({ error: 'No gapped take for this line yet', reason: 'no_take' })
    const { data, error } = await db()
      .from('course_audio')
      .select('id, s3_key, voice_id, created_at')
      .in('id', ids)
      .in('voice_id', recordist.spellings)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw new Error(`take G clip lookup failed: ${error.message}`)
    const row = data && data[0] ? data[0] : null
    if (!row) return res.status(404).json({ error: 'No gapped take of your own for this line yet', reason: 'no_take' })
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

  /**
   * Resolve a PRACTICE PHRASE line (`phrase:<phraseId>:<role>`, job #619): the
   * row, its course, and whether this recordist is the one cast to read that
   * side of it. Everything is read from the row — the booth has no login, so the
   * id is a claim. Only the phrase-queue courses (the Welsh sandboxes) take a
   * phrase take here; a live course's phrases are refused outright.
   */
  async function resolvePhraseLine(res, recordist, parsed) {
    const { data: phrase, error } = await db()
      .from('course_practice_phrases')
      .select('id, course_code, seed_number, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('id', parsed.phraseId)
      .maybeSingle()
    if (error) throw new Error(`phrase lookup failed: ${error.message}`)
    if (!phrase) { res.status(404).json({ error: `No phrase ${parsed.phraseId}` }); return null }
    if (!phraseQueue.isPhraseQueueCourse(phrase.course_code)) {
      res.status(403).json({
        error: `Practice phrases of ${phrase.course_code} are not recorded in the booth.`,
        reason: 'phrase_course_not_queued',
        courseCode: phrase.course_code,
      })
      return null
    }
    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config, target_lang, known_lang, dialect').eq('course_code', phrase.course_code).maybeSingle()
    if (cErr) throw new Error(`course lookup failed: ${cErr.message}`)
    if (!course) { res.status(404).json({ error: `No course ${phrase.course_code}` }); return null }

    const sideLang = parsed.role === 'known' ? course.known_lang : course.target_lang
    let courseLanguage = null
    try { courseLanguage = canonicalLanguage(sideLang) } catch { courseLanguage = null }
    if (courseLanguage !== recordist.language) {
      res.status(403).json({ error: `That phrase's ${parsed.role} side is ${sideLang}, not ${recordist.language}.`, reason: 'wrong_language', courseCode: phrase.course_code })
      return null
    }
    const policies = await loadPolicies(db())
    const policy = policies.find((row) => row.language === recordist.language)
    const castVoice = seedCastEntry(course, policyVoiceList(policy))[parsed.role]
    if (!castVoice || !recordist.spellings.includes(castVoice.voiceId)) {
      res.status(403).json({
        error: castVoice
          ? `${phrase.course_code} casts ${castVoice.voiceId} to read its ${parsed.role} phrases, not you.`
          : `${phrase.course_code} has nobody cast to read its ${parsed.role} side.`,
        reason: castVoice ? 'not_your_slot' : 'uncast_slot',
        courseCode: phrase.course_code,
        role: parsed.role,
      })
      return null
    }
    const text = phraseQueue.roleText(phrase, parsed.role)
    return { phrase, course, text, role: parsed.role }
  }

  /**
   * A take for a PRACTICE PHRASE: the seed take's seam exactly — script-mode
   * filing mints the clip first, then linkPhraseTake points every EMPTY copy of
   * the text at it. Make-before-break by construction, and fill-empty only: an
   * existing clip in any copy's slot is never touched.
   */
  async function recordPhraseTake({ req, res, recordist, parsed, text, audioBase64, mimeType, device }) {
    const resolved = await resolvePhraseLine(res, recordist, parsed)
    if (!resolved) return
    if (!resolved.text) return res.status(409).json({ error: `That phrase has no ${parsed.role} text to read.`, reason: 'empty_line' })
    if (text && text.trim() && text.trim() !== resolved.text) {
      return res.status(409).json({
        error: 'The text on this line has changed since the queue was loaded -- reload before recording it.',
        expected: resolved.text,
        received: text.trim(),
      })
    }
    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: resolved.phrase.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      // which booth line this take is for: its script check reports back to that line (job #842)
      recordistLineId: parsed.raw,
      body: {
        audioData: audioBase64,
        mimeType,
        metadata: {
          mode: 'script',
          cadence: 'natural',
          role: parsed.role,
          kind: parsed.role,
          text: resolved.text,
          voiceId: recordist.voiceId,
          phraseId: resolved.phrase.id,
          seedNumber: resolved.phrase.seed_number,
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
    let linked = { linked: [] }
    if (audioId) {
      try {
        linked = await linkPhraseTake({ db: db(), recordist, phraseId: resolved.phrase.id, role: parsed.role, audioId, logger })
      } catch (linkErr) {
        logger.error(`[Recordist] phrase link failed (take is stored and filed): ${linkErr.message}`)
      }
    } else {
      logger.error(`[Recordist] phrase take for ${resolved.phrase.id} ${parsed.role} was NOT filed as a clip: ${filing && filing.reason}`)
    }
    return res.json({
      ok: true,
      audioId,
      kind: 'phrase',
      role: parsed.role,
      seedNumber: resolved.phrase.seed_number,
      clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(parsed.raw)}/clip`,
      alsoFilled: Math.max(0, linked.linked.length - 1),
      rawKey: captured.body.rawKey || null,
      filing,
    })
  }

  /**
   * Resolve a LEGO line (`lego:<course_legos.id>:<role>`, job #366): the row, its
   * course, and whether this recordist is the voice cast on that role. Read from
   * the row, never trusted from the client. Only LEGO_QUEUE_COURSES (the Welsh
   * sandboxes) take a LEGO take here; a live course's LEGO slots are refused.
   */
  async function resolveLegoLine(res, recordist, parsed) {
    const { data: lego, error } = await db()
      .from('course_legos')
      .select('id, course_code, seed_number, lego_index, lego_id, known_text, target_text, target1_audio_id, target2_audio_id')
      .eq('id', parsed.legoRowId)
      .maybeSingle()
    if (error) throw new Error(`lego lookup failed: ${error.message}`)
    if (!lego) { res.status(404).json({ error: `No LEGO ${parsed.legoRowId}` }); return null }
    if (!isLegoQueueCourse(lego.course_code)) {
      res.status(403).json({
        error: `LEGOs of ${lego.course_code} are not recorded in the booth.`,
        reason: 'lego_course_not_queued',
        courseCode: lego.course_code,
      })
      return null
    }
    const { data: course, error: cErr } = await db()
      .from('courses').select('course_code, voice_config, target_lang, known_lang, dialect').eq('course_code', lego.course_code).maybeSingle()
    if (cErr) throw new Error(`course lookup failed: ${cErr.message}`)
    if (!course) { res.status(404).json({ error: `No course ${lego.course_code}` }); return null }
    let courseLanguage = null
    try { courseLanguage = canonicalLanguage(course.target_lang) } catch { courseLanguage = null }
    if (courseLanguage !== recordist.language) {
      res.status(403).json({ error: `That LEGO is ${course.target_lang}, not ${recordist.language}.`, reason: 'wrong_language', courseCode: lego.course_code })
      return null
    }
    const policies = await loadPolicies(db())
    const policy = policies.find((row) => row.language === recordist.language)
    const castVoice = seedCastEntry(course, policyVoiceList(policy))[parsed.role]
    if (!castVoice || !recordist.spellings.includes(castVoice.voiceId)) {
      res.status(403).json({
        error: castVoice
          ? `${lego.course_code} casts ${castVoice.voiceId} to read its ${parsed.role} LEGOs, not you.`
          : `${lego.course_code} has nobody cast to read its ${parsed.role} side.`,
        reason: castVoice ? 'not_your_slot' : 'uncast_slot',
        courseCode: lego.course_code,
        role: parsed.role,
      })
      return null
    }
    return { lego, course, text: String(lego.target_text || '').trim(), role: parsed.role }
  }

  /**
   * A take for a LEGO: the phrase take's seam exactly — script-mode filing mints
   * the clip (with its provenance) first, then linkLegoTake points every EMPTY
   * copy of the text's `role` slot at it. Make-before-break, fill-empty only.
   */
  async function recordLegoTake({ req, res, recordist, parsed, text, audioBase64, mimeType, device }) {
    const resolved = await resolveLegoLine(res, recordist, parsed)
    if (!resolved) return
    if (!resolved.text) return res.status(409).json({ error: 'That LEGO has no text to read.', reason: 'empty_line' })
    if (text && text.trim() && text.trim() !== resolved.text) {
      return res.status(409).json({
        error: 'The text on this line has changed since the queue was loaded -- reload before recording it.',
        expected: resolved.text,
        received: text.trim(),
      })
    }
    const { res: innerRes, captured } = captureResponse()
    await handleRecordingUpload({
      params: { courseCode: resolved.lego.course_code },
      headers: { authorization: req.headers.authorization },
      socket: req.socket,
      recordistVoiceId: recordist.voiceId,
      // which booth line this take is for: its script check reports back to that line (job #842)
      recordistLineId: parsed.raw,
      body: {
        audioData: audioBase64,
        mimeType,
        metadata: {
          mode: 'script',
          cadence: 'natural',
          role: parsed.role,
          kind: parsed.role,
          text: resolved.text,
          voiceId: recordist.voiceId,
          legoId: resolved.lego.lego_id,
          seedNumber: resolved.lego.seed_number,
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
    let linked = { linked: [] }
    if (audioId) {
      try {
        linked = await linkLegoTake({ db: db(), recordist, legoRowId: resolved.lego.id, role: parsed.role, audioId, logger })
      } catch (linkErr) {
        logger.error(`[Recordist] lego link failed (take is stored and filed): ${linkErr.message}`)
      }
    } else {
      logger.error(`[Recordist] lego take for ${resolved.lego.id} ${parsed.role} was NOT filed as a clip: ${filing && filing.reason}`)
    }
    return res.json({
      ok: true,
      audioId,
      kind: 'lego',
      role: parsed.role,
      legoId: resolved.lego.lego_id,
      seedNumber: resolved.lego.seed_number,
      clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${encodeURIComponent(parsed.raw)}/clip`,
      alsoFilled: Math.max(0, linked.linked.length - 1),
      rawKey: captured.body.rawKey || null,
      filing,
    })
  }

  async function legoClipResponse(req, res, recordist, parsed) {
    const resolved = await resolveLegoLine(res, recordist, parsed)
    if (!resolved) return
    return slotClipResponse(req, res, recordist, resolved.lego[`${parsed.role}_audio_id`], resolved.text)
  }

  /**
   * Play a phrase line's take: its own slot when this voice holds it, otherwise
   * this voice's newest take of the same words (resolveCurrentClip's recordist
   * mode) — the take exists even where a copy's slot was already filled.
   */
  async function phraseClipResponse(req, res, recordist, parsed) {
    const resolved = await resolvePhraseLine(res, recordist, parsed)
    if (!resolved) return
    return slotClipResponse(req, res, recordist, resolved.phrase[`${parsed.role}_audio_id`], resolved.text)
  }

  /** A course-row slot's take — a phrase's or a LEGO's — by the same resolver rule. */
  async function slotClipResponse(req, res, recordist, slotAudioId, slotText) {
    const clip = await resolveCurrentClip(db(), {
      sentence: { slot_audio_id: slotAudioId, slot_text: slotText },
      track: 'slot',
      language: recordist.language,
      restrictToVoices: recordist.spellings,
      allowIdentityFallback: true,
    })
    if (!clip) return res.status(404).json({ error: 'No stored take for this line yet', reason: 'no_take' })
    if (req.query.variant === 'raw') {
      const { url, rawKey, notFound } = await s3.getRawSignedUrl(clip.s3Key, 3600)
      if (!rawKey) {
        return res.status(404).json({
          error: notFound ? 'The processed clip for this take is missing from storage, so its original cannot be found.' : 'No original was kept for this take.',
          reason: notFound ? 'mastered_missing' : 'no_raw_retained',
          audioId: clip.audioId,
          variant: 'raw',
        })
      }
      if (req.query.json === '1') return res.json({ audioId: clip.audioId, s3Key: rawKey, url, variant: 'raw' })
      return res.redirect(302, url)
    }
    const url = await s3.getAudioSignedUrl(clip.audioId, 3600, { s3Key: clip.s3Key })
    if (req.query.json === '1') return res.json({ audioId: clip.audioId, s3Key: clip.s3Key, url, variant: 'processed' })
    res.redirect(302, url)
  }

  // ── 2. a take ──────────────────────────────────────────────────────────────
  router.post('/voice/:voiceId/take', async (req, res) => {
    // Said on every answer, refusals included, so a booth hears "1" on its very next reply.
    uploadSetting.advertise(res)
    // One timestamped line per take (the API log has no timestamps of its own): how long the
    // server held it and how many were in flight, which is what a drain-rate measurement reads.
    const tookStart = Date.now()
    takesInFlight += 1
    const inFlightAtStart = takesInFlight
    let releaseLine = null
    let lockWaitMs = 0
    let logLine = '?'
    if (typeof res.on === 'function') {
      res.on('finish', () => {
        logger.log(`[BoothTake] ${new Date().toISOString()} voice=${req.params.voiceId} line=${logLine} status=${res.statusCode} ms=${Date.now() - tookStart} lockWaitMs=${lockWaitMs} inFlight=${inFlightAtStart}`)
      })
    }
    try {
      const pack = await resolveAnyPack(req.params.voiceId)
      const recordist = pack ? null : await recordistOr404(req, res)
      if (!pack && !recordist) return
      // THE SETUP-CHECK LOCK (Tom, r-2026-10-07): until an admin approves the
      // ten-phrase sample, no script take is accepted. 423, with words the
      // booth can show as they are.
      if (recordist) {
        const check = await loadSetupRow(recordist.voiceId)
        if (setupCheck.locksScript(check)) {
          return res.status(423).json({
            error: 'Before the full script, please record and submit your 10-phrase setup check. It opens as soon as it has been approved.',
            reason: 'setup_check_required',
            setupCheck: { status: check.status, packVoiceId: setupCheck.packVoiceIdFor(check.voice_id) },
          })
        }
      }

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
      logLine = String(lineId)

      // Same line or same words, one at a time, whoever sent them (booth-upload-concurrency.cjs).
      const lockStart = Date.now()
      releaseLine = await lineLock.acquire(boothUploadConcurrency.lineLockKey({ voiceId: req.params.voiceId, lineId, text }))
      lockWaitMs = Date.now() - lockStart

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

      // A PRACTICE PHRASE (job #619). `phrase:...` is not a uuid either.
      const phraseLine = phraseQueue.parsePhraseLineId(lineId)
      if (phraseLine) {
        return await recordPhraseTake({ req, res, recordist, parsed: { ...phraseLine, raw: lineId }, text, audioBase64, mimeType, device })
      }

      // A LEGO slot (job #366). `lego:...` is not a uuid either.
      const legoLine = parseLegoLineId(lineId)
      if (legoLine) {
        return await recordLegoTake({ req, res, recordist, parsed: { ...legoLine, raw: lineId }, text, audioBase64, mimeType, device })
      }

      // A MINIMAL-SET piece. Same reasoning as the seed branch: `quarry:...` is
      // not a uuid, so it must never reach the pod lookup below.
      const quarryLine = parseQuarryLineId(lineId)
      if (quarryLine) {
        return await recordQuarryTake({ req, res, recordist, parsed: { ...quarryLine, raw: lineId }, text, audioBase64, mimeType, device })
      }

      // A TAKE G. `takeg:<sentenceId>` — same reasoning as the two branches
      // above: it is not a uuid, so the pod lookup below would answer 22P02
      // rather than find the sentence it names.
      const takeGLine = parseTakeGLineId(lineId)
      if (takeGLine) {
        return await recordTakeGTake({ req, res, recordist, parsed: { ...takeGLine, raw: lineId }, text, audioBase64, mimeType, device })
      }

      // The line decides the course; the recordist decides the voice.
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, pod_id, speaker, target_text, target_audio_id')
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
        .from('listening_pods').select('id, course_code, metadata').eq('id', sentence.pod_id).maybeSingle()
      if (podErr) throw new Error(`pod lookup failed: ${podErr.message}`)
      if (!pod) return res.status(404).json({ error: `Line ${lineId} has no pod` })

      // A cast-only (community) voice records on its cast courses and nowhere
      // else: the same verdict the link and the login are given, counted the
      // same way. A policy voice is language-wide and unchanged here.
      if (Array.isArray(recordist.castCourses)) {
        const arrival = await castingRights.boothArrival({
          db: db(), recordist, courseCodes: [pod.course_code], method: req.method, path: req.originalUrl || req.path, logger,
        })
        if (arrival.refused.length) {
          return res.status(403).json({ error: arrival.refused[0].sentence, courseCode: pod.course_code, reason: 'not_cast_no_grant' })
        }
      }

      // AND ITS OWN LINES ONLY -- for a policy voice and a cast-only voice
      // alike. A line belongs to the voice lineVoiceId names (the queue's own
      // rule, linesForVoice), and the take holds the same rule: the course
      // admitting a voice is not the line being cast to it. This check once
      // ran only for a cast-only voice, so a POLICY voice could record any
      // line of its language by uuid -- Bea's take on Amina's line (job #349,
      // 2026-09-12), or a take by Aran on one of the 29 Welsh lines recast to
      // Catrin. Gender is a property of the voice, never a key (Tom,
      // 2026-09-12 12:08Z): two policy voices of one gender are told apart by
      // voice id here exactly as in the queue (job #351).
      if (isSoloReaderPod(pod) && soloReaderIndex(pod, recordist.spellings) < 0) {
        // Named readers, no characters (shared/pod-solo-readers.cjs). A reader on
        // the list may record it; anybody else is refused in the same words a
        // miscast character is.
        const sentence403 = `This set is read by ${soloReaders(pod).join(' and ')}, not you.`
        castingRights.recordAccess({
          kind: 'refused', email: recordist.email, voices: [recordist.voiceId], courseCode: pod.course_code,
          method: req.method, path: req.originalUrl || req.path, sentence: sentence403, logger,
        })
        return res.status(403).json({ error: sentence403, courseCode: pod.course_code, reason: 'not_cast_on_line' })
      }
      if (!isSoloReaderPod(pod)) {
        const { data: course, error: courseErr } = await db()
          .from('courses').select('course_code, voice_config, dialect').eq('course_code', pod.course_code).maybeSingle()
        if (courseErr) throw new Error(`course lookup failed: ${courseErr.message}`)
        const castEntry = castEntryFor(course && course.voice_config && course.voice_config.podCast, sentence.speaker)
        const register = await voiceRegister(db(), recordist.language)
        const owner = castEntry ? lineVoiceId(castEntry, register, courseDialect(course)) : null
        if (!owner || !recordist.spellings.includes(owner)) {
          const ownerName = owner ? ((register.aliasOwner.get(owner) || {}).name || (castEntry && castEntry.name) || owner) : null
          const sentence403 = `${recordist.displayName} is not cast to read this line of ${pod.course_code}: ` +
            (owner ? `it is cast to ${ownerName}.` : 'nobody is cast to its speaker yet.')
          castingRights.recordAccess({
            kind: 'refused', email: recordist.email, voices: [recordist.voiceId], courseCode: pod.course_code,
            method: req.method, path: req.originalUrl || req.path, sentence: sentence403, logger,
          })
          return res.status(403).json({ error: sentence403, courseCode: pod.course_code, reason: 'not_cast_on_line' })
        }
      }

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
        // which booth line this take is for: its script check reports back to that line (job #842)
        recordistLineId: lineId,
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
      // stored (make-before-break); a failure here never fails the take — but
      // it is never SWALLOWED either. Every copy the take did not reach keeps
      // its re-record mark, and the response says which (Astra cold-check
      // #592, 2026-09-13: both Senedd "Prynhawn da." marks were retired on one
      // take while the second row went on serving its old clip).
      let propagation = { linked: [], failed: [] }
      let propagationError = null
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
        propagationError = propErr.message
        logger.error(`[Recordist] propagation failed (take is stored and linked; every duplicate keeps its mark): ${propErr.message}`)
      }
      const notFilled = propagation.failed || []

      // The line was queued BECAUSE a re-record was wanted; that want is now
      // satisfied — ON THE LINES THE TAKE REACHED. Retired last, after the take
      // is stored, linked and propagated, and never allowed to fail the take.
      // A duplicate that was not filled keeps its mark: the mark is the only
      // record that it still needs the take.
      let retired = { clips: 0, sentences: 0, keptClips: 0, keptSentences: 0 }
      let retirementError = null
      try {
        retired = await clearRerecordWants({
          db: db(), recordist, text: lineText, sentenceId: sentence.id, logger,
          sourceCourseCode: pod.course_code,
          keep: propagationError
            ? { allDuplicates: true }
            : { sentenceIds: notFilled.map((f) => f.sentenceId), courseCodes: notFilled.map((f) => f.courseCode) },
        })
      } catch (wantErr) {
        retirementError = wantErr.message
        logger.error(`[Recordist] want retirement failed (take is stored and linked): ${wantErr.message}`)
      }

      const warnings = []
      if (propagationError) warnings.push(`duplicates of this line were not filled (${propagationError}); their re-record marks stay`)
      for (const f of notFilled) warnings.push(`duplicate ${f.sentenceId} in ${f.courseCode} not filled at ${f.stage}: ${f.error}; its re-record mark stays`)
      if (retirementError) warnings.push(`re-record marks were not retired: ${retirementError}`)

      res.json({
        ok: true,
        audioId,
        clipUrl: `/api/recording/voice/${encodeURIComponent(recordist.voiceId)}/line/${sentence.id}/clip`,
        alsoFilled: propagation.linked.length,
        notFilled,
        rawKey: captured.body.rawKey || null,
        wantsRetired: retired.clips + retired.sentences,
        // Counted from what retirement actually HELD, never inferred from the
        // propagation failure list: on a wholesale failure that list is empty
        // while every duplicate mark stays (Astra #595). If either count's own
        // read failed, `null` means "we don't know", not "kept nothing" — say
        // so rather than fabricating a 0 (Astra cold-check, 2026-09-16).
        wantsKept: (retired.keptClips === null || retired.keptSentences === null)
          ? 'unknown'
          : (retired.keptClips || 0) + (retired.keptSentences || 0),
        ...(warnings.length ? { warnings } : {}),
      })
    } catch (err) {
      logger.error(`[Recordist] take: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    } finally {
      takesInFlight -= 1
      if (releaseLine) releaseLine()
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
      const pack = await resolveAnyPack(req.params.voiceId)
      if (pack) return await packClipResponse(req, res, pack)
      const recordist = await recordistOr404(req, res)
      if (!recordist) return

      const seedLine = parseSeedLineId(req.params.lineId)
      if (seedLine) return await seedClipResponse(req, res, recordist, { ...seedLine, raw: req.params.lineId })

      const quarryLine = parseQuarryLineId(req.params.lineId)
      if (quarryLine) return await quarryClipResponse(req, res, recordist, quarryLine)

      const phraseLine = phraseQueue.parsePhraseLineId(req.params.lineId)
      if (phraseLine) return await phraseClipResponse(req, res, recordist, { ...phraseLine, raw: req.params.lineId })

      const legoLine = parseLegoLineId(req.params.lineId)
      if (legoLine) return await legoClipResponse(req, res, recordist, { ...legoLine, raw: req.params.lineId })

      const takeGLine = parseTakeGLineId(req.params.lineId)
      if (takeGLine) return await takeGClipResponse(req, res, recordist, { ...takeGLine, raw: req.params.lineId })

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

  // ── 3a. the voice's newest stored takes ────────────────────────────────────
  //
  // Tom, 2026-10-08: the admin recording page must let him HEAR what each
  // assigned recordist has just made. The line-keyed clip route above answers
  // "play this line"; this answers "what did they record last", straight from
  // course_audio by recording time, so it covers every kind of take (pod, seed,
  // quarry, re-record) without walking the queue.
  //
  // NOT link-is-identity (Aran, 2026-10-14, job #371): artists must never see
  // each other's work, and this route lists AND signs a voice's takes, so a
  // booth link with the voice id swapped handed anyone another artist's
  // recordings. The booth page never calls it — only /admin/recording does —
  // so it needs a signed-in caller who either reads this voice themselves
  // (voicesForEmail, the same resolution /mine uses) or is a God admin.
  router.get('/voice/:voiceId/latest-takes', async (req, res) => {
    try {
      if (typeof requireDashboardUser !== 'function') {
        return res.status(501).json({ error: 'Sign-in is not wired up on this service.' })
      }
      // A signed agent holding takes:read reads any voice's takes (job #410);
      // otherwise a signed-in person, as before.
      const agent = req.headers['x-agent-admin'] ? await requireAdminOrAgent(req, res, 'takes:read') : null
      if (req.headers['x-agent-admin'] && !agent) return // the gate has answered
      const user = agent || await requireDashboardUser(req, res)
      if (!user) return // requireDashboardUser has already answered 401/403
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      if (!agent && !isGodAdmin(user)) {
        const mine = await voicesForEmail(db(), user.email)
        const spellings = new Set([recordist.voiceId, ...(recordist.spellings || [])])
        if (!mine.some((v) => spellings.has(v.voiceId))) {
          logger.warn(`[Recordist] latest-takes: refused ${user.email || 'unknown'} for ${recordist.voiceId}`)
          return res.status(403).json({ error: 'You can only see your own recent takes.' })
        }
      }
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50)
      // ?q= finds an older take by its words ("did they ever record X?") when the
      // newest 50 are all from today. Wildcards are stripped, so it is a plain substring.
      const q = typeof req.query.q === 'string' ? req.query.q.replace(/[%_,()*\\]/g, ' ').trim().slice(0, 80) : ''
      let takesQuery = db()
        .from('course_audio')
        .select('id, course_code, role, text, s3_key, created_at')
        .eq('language', recordist.language)
        .in('voice_id', recordist.spellings)
      if (q) takesQuery = takesQuery.ilike('text', `%${q}%`)
      const { data, error } = await takesQuery
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw new Error(`latest takes read failed: ${error.message}`)
      const takes = await Promise.all((data || []).map(async (r) => ({
        audioId: r.id,
        courseCode: r.course_code,
        role: r.role,
        text: r.text,
        recordedAt: r.created_at,
        url: r.s3_key ? await s3.getAudioSignedUrl(r.id, 3600, { s3Key: r.s3_key }) : null,
      })))
      res.json({ voiceId: recordist.voiceId, takes })
    } catch (err) {
      logger.error(`[Recordist] latest-takes: ${err.message}`)
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
  // WHAT IT DOES NOT COST: THE LEARNER'S PLACE. Learner progress is filed under
  // a sentence's SLOT, not its text (docs/pods/pod-migration-protocol.md,
  // standing doctrine A-111), and until 2026-09-12 this route read rules 4/6 of
  // that protocol ("a sentence that changed at all counts as new; a new sentence
  // arrives unseen") as an order to delete the slot's learner_pod_state rows.
  // Tom overruled that for booth edits, 2026-09-12 11:28Z, his words: "Wipe
  // learner progress. Sounds bad to me. Because it's presumably only a small
  // edit. The sense of the line will be the same. So I think we keep learner
  // progress." An artist's correction is the SAME line, so the learner keeps
  // their place: this route never touches learner_pod_state, for any side, and
  // there is deliberately no "big edit" heuristic — the ruling is categorical.
  // Standing rule behind it: never touch learner progress unless asked.
  // recordist-text-edit.test.cjs holds the line on both edit paths.
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

      // TWO SIDES, EACH ITS OWN EDIT (Tom, 2026-09-12: "I am also an editor of
      // the lines … probably to edit BOTH known and target languages, although
      // editing a known language will of course orphan the audio"). `text` is
      // the TARGET side, as it always was; `knownText` is the known side. Either
      // or both may come, and each side's edit touches ONLY that side's take.
      const hasTarget = typeof req.body?.text === 'string'
      const hasKnown = typeof req.body?.knownText === 'string'
      const text = hasTarget ? req.body.text.trim() : ''
      const knownText = hasKnown ? req.body.knownText.trim() : ''
      if (!hasTarget && !hasKnown) return res.status(400).json({ error: 'Give the line some text.', reason: 'empty' })
      if (hasTarget && !text) return res.status(400).json({ error: 'Give the line some text.', reason: 'empty' })
      if (hasKnown && !knownText) return res.status(400).json({ error: 'Give the known side some text.', reason: 'empty' })
      if (text.length > 600 || knownText.length > 600) return res.status(400).json({ error: 'That line is too long to read in one take.', reason: 'too_long' })

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
      // A practice phrase is course content too: its words are changed on the
      // proof page or by the builder, never from the booth.
      if (phraseQueue.parsePhraseLineId(lineId)) {
        return res.status(403).json({
          error: 'A practice phrase is course content -- flag it on the phrase proof page; it is not changed from the booth.',
          reason: 'phrase_line',
        })
      }
      // A LEGO is course content: its words are changed by the builder.
      if (parseLegoLineId(lineId)) {
        return res.status(403).json({
          error: 'A LEGO is course content -- its words are changed in the course, not from the booth.',
          reason: 'lego_line',
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
      // A TAKE G is the same sentence read a second way. Its text is the
      // sentence's own words with the declared seams marked, so there is no
      // text of its own to rewrite -- editing the sentence changes both lines.
      if (parseTakeGLineId(lineId)) {
        return res.status(403).json({
          error: 'That is the gapped read of a sentence, not a line of its own -- edit the sentence and both reads follow.',
          reason: 'takeg_line',
        })
      }
      // The course code is the first half of a pod sentence id, but it is not
      // trusted from the id: the row is read and its own pod's course is what
      // the gate is applied to.
      const { data: sentence, error: sentErr } = await db()
        .from('listening_pod_sentences')
        .select('id, pod_id, target_text, known_text, target_audio_id, known_audio_id')
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

      // THE TAKE GOES WITH THE WORDS, ON THE SIDE THAT CHANGED AND NO OTHER.
      // See the note above the route. A target edit unlinks the target take and
      // leaves the known take exactly where it is; a known edit does the
      // reverse. A side handed back its own current words is not an edit at
      // all, and costs nothing — the mark is the unlink, and the unlink only
      // happens when the words actually moved.
      //
      // WHAT "STALE" IS, IN THE DATA. Nothing is written to the clip: a
      // course_audio row is filed under the words it says, and after this
      // update those words match no slot and no line. The one resolver
      // (take-selection.cjs isLineRecorded) reads the slot and the text, so a
      // take whose text no longer matches is not-a-recording for the queue,
      // and the learner's read of the slot finds nothing rather than the wrong
      // words. The row and its bytes stay, findable by their own text, and the
      // ids go in the log and the response as the record of what went stale.
      const targetChanged = hasTarget && text !== (sentence.target_text || '').trim()
      const knownChanged = hasKnown && knownText !== (sentence.known_text || '').trim()
      const patch = {}
      if (targetChanged) {
        patch.target_text = text
        patch.target_audio_id = null
        // The known side is the recordist's crib. On a fixture whose two sides
        // are the same string, leaving it behind would put the OLD sentence
        // under the new one on screen and look like a bug; where the two
        // genuinely differ, the known side is a real translation and it only
        // moves when the editor moves it (knownText).
        const knownTracksTarget = !hasKnown && (sentence.known_text || '').trim() === (sentence.target_text || '').trim()
        if (knownTracksTarget) patch.known_text = text
      }
      if (knownChanged) {
        patch.known_text = knownText
        patch.known_audio_id = null
      }
      if (!Object.keys(patch).length) {
        // Nothing moved, so nothing is unlinked and no learner loses a
        // sentence they have heard. The line is exactly as recorded as it was.
        return res.json({
          ok: true, lineId, text: sentence.target_text, knownText: sentence.known_text,
          courseCode: pod.course_code, recorded: mine.recorded === true,
          previousText: sentence.target_text, alsoChanged: 0, unlinkedAudioId: null,
          unlinkedKnownAudioId: null, staleTakes: [], changed: [],
        })
      }

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
      invalidateLanguageQueueCache(recordist.language)

      // NO PROGRESS MIGRATION HERE. learner_pod_state is left exactly as it is
      // for every id in the group — see the ruling at the top of this route.

      const staleTakes = []
      if (targetChanged && sentence.target_audio_id) staleTakes.push({ side: 'target', audioId: sentence.target_audio_id, text: sentence.target_text })
      if (knownChanged && sentence.known_audio_id) staleTakes.push({ side: 'known', audioId: sentence.known_audio_id, text: sentence.known_text })
      const changed = [targetChanged && 'target', knownChanged && 'known'].filter(Boolean)
      logger.info(`[Recordist] ${recordist.voiceId} rewrote ${ids.length} row(s) for ${lineId} (${pod.course_code}) [${changed.join('+')}]: ${targetChanged ? `"${sentence.target_text}" -> "${text}"` : ''}${knownChanged ? ` known "${sentence.known_text}" -> "${knownText}"` : ''}; stale takes ${staleTakes.map((t) => `${t.side}:${t.audioId}`).join(',') || '(none)'}; learner progress kept`)
      res.json({
        ok: true,
        lineId,
        text: patch.target_text !== undefined ? patch.target_text : sentence.target_text,
        knownText: patch.known_text !== undefined ? patch.known_text : sentence.known_text,
        courseCode: pod.course_code,
        // Said out loud so the screen can say it too. A TARGET edit puts the
        // line back to still-to-read for this voice — the take it used to have
        // is still there, untouched. A KNOWN-only edit does not: this voice's
        // take says the same words it always did, and stays recorded.
        recorded: targetChanged ? false : mine.recorded === true,
        previousText: sentence.target_text,
        alsoChanged: ids.length - 1,
        changed,
        // The clip(s) that used to fill the slot(s) that moved. Nothing was
        // deleted — each is still in course_audio under the words it says.
        unlinkedAudioId: targetChanged ? (sentence.target_audio_id || null) : null,
        unlinkedKnownAudioId: knownChanged ? (sentence.known_audio_id || null) : null,
        staleTakes,
      })
    } catch (err) {
      logger.error(`[Recordist] text edit: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })


  // ── 6. RE-RECORD ALL + SETUP CHECK (admin; job #838, Tom 2026-10-07) ───────
  // Both are about ONE artist and both change what that artist sees, so both
  // take requireAdmin. Nothing here deletes a take (recordist-rerecord-all.cjs).
  function adminActor(user) { return (user && (user.email || user.id)) || 'admin' }

  router.get('/voice/:voiceId/rerecord-all', async (req, res) => {
    try {
      if (requireAdmin && !(await requireAdmin(req, res))) return
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      res.json(await rerecordAll.previewReset({ voiceId: recordist.voiceId, language: recordist.language, spellings: recordist.spellings }))
    } catch (err) {
      logger.error(`[Recordist] rerecord-all preview: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.post('/voice/:voiceId/rerecord-all', async (req, res) => {
    try {
      // THE ARTIST ON THEIR OWN VOICE (Tom 2026-10-07, job #885: Dan re-records
      // himself). {"asArtist": true} takes the same door every artist route
      // takes — link-is-identity — and acts on :voiceId and nothing else, so an
      // artist can only ever reset the voice their own link names. Nothing is
      // deleted, so the admin's restore route puts it all back.
      const asArtist = !!req.body && req.body.asArtist === true
      const user = asArtist ? { email: `artist:${req.params.voiceId}` }
        : requireAdmin ? await requireAdmin(req, res) : { email: 'test' }
      if (!user) return
      if (!req.body || req.body.confirm !== true) {
        return res.status(400).json({ error: 'Re-record all needs {"confirm": true}. GET the same path first to see what it would do.' })
      }
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      // The artist door has no secret (link = voice id, guessable), so it may
      // only touch a voice that no learner can hear. Admins are not limited.
      if (asArtist) {
        const live = await rerecordAll.liveCoursesForVoice({ language: recordist.language, spellings: recordist.spellings })
        if (live.length) {
          return res.status(403).json({ error: 'This voice is live to learners; ask an admin to reset it.', liveCourses: live })
        }
      }
      const out = await rerecordAll.applyReset({
        voiceId: recordist.voiceId, language: recordist.language, spellings: recordist.spellings,
        actor: asArtist ? `artist:${recordist.voiceId}` : adminActor(user), reason: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 300) : null,
      })
      logger.log(`[Recordist] re-record all for ${recordist.voiceId}: ${JSON.stringify(out)} by ${adminActor(user)}`)
      res.json(out)
    } catch (err) {
      logger.error(`[Recordist] rerecord-all: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.post('/voice/:voiceId/rerecord-all/:resetId/restore', async (req, res) => {
    try {
      const user = requireAdmin ? await requireAdmin(req, res) : { email: 'test' }
      if (!user) return
      const out = await rerecordAll.restoreReset({ resetId: req.params.resetId, actor: adminActor(user) })
      if (out.error) return res.status(out.status || 400).json({ error: out.error })
      res.json(out)
    } catch (err) {
      logger.error(`[Recordist] rerecord-all restore: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // The setup check. GET = the review page's data (admin); POST = ask an artist
  // for one (locks their script); POST …/decision = approve / ask again.
  // The artist's own submit is link-is-identity, on the pack voice id.
  router.get('/voice/:voiceId/setup-check', async (req, res) => {
    try {
      if (requireAdmin && !(await requireAdmin(req, res))) return
      const row = await loadSetupRow(req.params.voiceId)
      if (!row) return res.json({ exists: false })
      const pack = setupCheck.packFromRow(row, { displayName: req.params.voiceId })
      const objects = await s3.listObjects(packPrefix(pack.id))
      const newest = indexTakes(objects, pack.id)
      const { items, measured, verdict, dirty, metrics } = await measureAndJudgeSetup(row, pack, newest)
      if (dirty) await db().from('recordist_setup_checks').update({ metrics: { ...metrics, measured, verdict } }).eq('voice_id', row.voice_id)
      res.json({
        exists: true, voiceId: row.voice_id, language: row.language, status: row.status,
        submittedAt: row.submitted_at, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, note: row.review_note,
        packVoiceId: pack.voiceId, items,
        autoVerdict: setupCheck.isMeasuredVerdict(verdict) ? verdict : null, verdictThresholds: setupCheck.SETUP_VERDICT,
        // The artist link's private key (job #380) — only to a caller who passed the gate WITH a key
        // or signed in; never to a grace-mode id-only request.
        boothKey: ['key', 'signed_in'].includes(req.boothAccess) ? await keys.keyFor(row.voice_id).catch(() => null) : null,
      })
    } catch (err) {
      logger.error(`[Recordist] setup-check review: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.post('/voice/:voiceId/setup-check', async (req, res) => {
    try {
      const user = requireAdmin ? await requireAdmin(req, res) : { email: 'test' }
      if (!user) return
      const recordist = await recordistOr404(req, res)
      if (!recordist) return
      const existing = await loadSetupRow(recordist.voiceId)
      if (existing) return res.json({ created: false, status: existing.status, packVoiceId: setupCheck.packVoiceIdFor(existing.voice_id) })
      const queue = await buildQueue(db(), recordist, { includeRecorded: true })
      const phrases = setupCheck.pickSetupPhrases(queue.lines)
      if (!setupCheck.isFullSetupSample(phrases)) return res.status(409).json({ error: `This artist has too few lines of their own to draw a ${setupCheck.SETUP_PHRASE_COUNT}-phrase setup check from.` })
      const { error } = await db().from('recordist_setup_checks').insert({
        voice_id: recordist.voiceId, language: recordist.language, phrases, created_by: adminActor(user),
      })
      if (error) throw new Error(error.message)
      res.json({ created: true, status: 'open', phrases: phrases.length, packVoiceId: setupCheck.packVoiceIdFor(recordist.voiceId) })
    } catch (err) {
      logger.error(`[Recordist] setup-check create: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  router.post('/voice/:voiceId/setup-check/decision', async (req, res) => {
    try {
      const user = requireAdmin ? await requireAdmin(req, res) : { email: 'test' }
      if (!user) return
      const decision = req.body && req.body.decision
      if (decision !== 'approve' && decision !== 'changes') return res.status(400).json({ error: "decision must be 'approve' or 'changes'" })
      const row = await loadSetupRow(req.params.voiceId)
      if (!row) return res.status(404).json({ error: 'No setup check for this voice.' })
      const note = typeof req.body.note === 'string' ? req.body.note.slice(0, 500) : null
      const { error } = await db().from('recordist_setup_checks').update({
        status: decision === 'approve' ? 'approved' : 'changes',
        reviewed_by: adminActor(user), reviewed_at: new Date().toISOString(), review_note: note,
      }).eq('voice_id', row.voice_id)
      if (error) throw new Error(error.message)
      res.json({ status: decision === 'approve' ? 'approved' : 'changes' })
    } catch (err) {
      logger.error(`[Recordist] setup-check decision: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  // The artist's own "I'm done" — link-is-identity, addressed by the pack voice id.
  router.post('/voice/:packVoiceId/submit', async (req, res) => {
    try {
      const pack = await resolveAnyPack(req.params.packVoiceId)
      if (!pack || !pack.setup) return res.status(404).json({ error: 'No setup check at this link.' })
      if (pack.setup.status === 'approved') return res.json({ status: 'approved' })
      const objects = await s3.listObjects(packPrefix(pack.id))
      const newest = indexTakes(objects, pack.id)
      const taken = pack.items.filter((i) => newest.has(i.id)).length
      const missing = setupCheck.setupSubmitShortfall(taken)
      if (missing) return res.status(409).json({ error: `${taken} of ${pack.items.length} phrases recorded; record at least ${setupCheck.SETUP_MIN_SUBMIT} to submit.`, missing })
      // The automatic verdict (job #435): analysis only, shown to the artist and
      // the admin; it never approves, unlocks or blocks. If measuring fails the
      // submit still goes through with no verdict.
      let autoVerdict = null
      let metricsPatch = null
      try {
        const row = await loadSetupRow(pack.setup.voiceId)
        const r = await measureAndJudgeSetup(row, pack, newest)
        autoVerdict = r.verdict.verdict === 'unmeasured' ? null : { verdict: r.verdict.verdict, reasons: r.verdict.reasons }
        metricsPatch = { ...r.metrics, measured: r.measured, verdict: r.verdict }
      } catch (err) { logger.error(`[Recordist] setup-check auto-verdict: ${err.message}`) }
      const { error } = await db().from('recordist_setup_checks').update({ status: 'submitted', submitted_at: new Date().toISOString(), ...(metricsPatch ? { metrics: metricsPatch } : {}) }).eq('voice_id', pack.setup.voiceId)
      if (error) throw new Error(error.message)
      res.json({ status: 'submitted', autoVerdict })
    } catch (err) {
      logger.error(`[Recordist] setup-check submit: ${err.message}`)
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
      if (requireAdmin && !(await requireAdminOrAgent(req, res, 'voice-slot:write'))) return
      const rows = await loadPolicies(db(), { includeRetired: true })
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

  // ── 5b. ONE voice slot, without rewriting the list (job #410) ──────────────
  // PATCH /languages/:language/voice/:voiceId  { email?, active?, slot? }
  // Only the named entry changes; every other reader is carried over untouched.
  // active:false retires the slot (see policy-voice-patch.cjs) — takes stay.
  // Compare-and-swap on updated_at, so a concurrent PUT is never overwritten.
  router.patch('/languages/:language/voice/:voiceId', async (req, res) => {
    try {
      const who = await requireAdminOrAgent(req, res, 'voice-slot:write')
      if (!who) return
      let language
      try { language = canonicalLanguage(req.params.language) } catch (e) {
        if (e instanceof ClipIdentityError) return res.status(400).json({ error: e.message })
        throw e
      }
      const { data: row, error: readErr } = await db()
        .from('language_recording_policy').select('*').eq('language', language).maybeSingle()
      if (readErr) throw new Error(`policy read failed: ${readErr.message}`)
      if (!row) return res.status(404).json({ error: `no recording policy for ${language}` })
      const { email, active, slot } = req.body || {}
      const out = patchVoiceSlot(row.voices, req.params.voiceId, { email, active, slot })
      if (!out.ok) return res.status(out.status).json({ error: out.error })
      if (!Object.keys(out.changed).length) return res.json({ ok: true, unchanged: true, language, slot: out.slot, voiceId: req.params.voiceId })
      const { data, error } = await db()
        .from('language_recording_policy')
        .update({ voices: out.voices })
        .eq('language', language).eq('updated_at', row.updated_at)
        .select('language').maybeSingle()
      if (error) throw new Error(`policy write failed: ${error.message}`)
      if (!data) return res.status(409).json({ error: 'the policy changed while this was applied — read it again and retry' })
      invalidateLanguageQueueCache()
      const shown = { ...out.changed, ...(out.changed.email ? { email: '(set)' } : {}) }
      logger.log(`[Recordist] voice slot ${language}/${out.slot} ${req.params.voiceId} ${JSON.stringify(shown)} by ${who.email}`)
      res.json({ ok: true, language, slot: out.slot, voiceId: req.params.voiceId, changed: out.changed, by: who.email })
    } catch (err) {
      logger.error(`[Recordist] voice slot patch: ${err.message}`)
      res.status(err.status || 500).json({ error: err.message })
    }
  })

  return router
}
