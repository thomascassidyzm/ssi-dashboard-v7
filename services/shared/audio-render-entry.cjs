/**
 * THE ONE ENTRY INTO THE POPTY AUDIO CHAIN — what any agent, worker or human
 * calls to get a line of audio made.
 *
 * Tom, 2026-09-29 00:45Z: "Single route for audio from now on. Always. Popty is
 * the only way to do it. If Kai tells his Watson to make audio, it has to use the
 * standard Popty chain itself."
 *
 * Callers never import this: they POST /api/audio/render on production Popty
 * (`node tools/audio/render.cjs`, which authenticates and prints the result). The
 * route runs `renderClip` inside the phase8 service, and that is the whole chain:
 *
 *   1. LIBRARY FIRST  the clip library is asked for these words (any voice,
 *                     every course); a hit is linked into the course row and
 *                     costs nothing — the route is idempotent, asking twice
 *                     never pays twice.
 *   2. SPEND GUARD    only on a miss, and only inside this chain marker
 *                     (services/shared/chain-context.cjs) does the door hand
 *                     the provider call a ticket; the guard then enforces the
 *                     50k-chars/day total cap, the repeat cap, provider trips
 *                     and Tom-signed exemptions (services/shared/tts-spend-guard.cjs).
 *   3. RENDER ONCE    one provider attempt (maxRetries 1). A refusal or a
 *                     failure is returned to the caller as it is; nothing here
 *                     re-rolls, and the guard never re-rolls a refusal either.
 *   4. WRITE BACK     master, S3, the course_audio row, the clip_index entry.
 *
 * Every step that touches the outside world is a dep, so the chain is testable
 * end to end without a provider. Nothing here spends a character on its own.
 */
const chain = require('./chain-context.cjs')
const { approverOf } = require('./human-take-guard.cjs')
const adoptException = require('./adopt-exception.cjs')
const trialMode = require('./audio-trial-mode.cjs')
const drillCut = require('./drill-cut-guard.cjs')
const existsInLanguage = require('./exists-in-language-guard.cjs')
const paidWrite = require('./paid-write.cjs')
const standIn = require('./aran-clone-standin.cjs')
const pronunciation = require('./pronunciation-overrides.cjs')

const REQUIRED = ['courseCode', 'role', 'purpose', 'requestedBy']

/**
 * SHARED AUDIO (job #464, Kai; Tom's Watson 2026-10-27: one route for audio, r-2026-09-29): the known-language narration
 * that is not a LEGO slot — the course WELCOME, and the guide lines (ENCOURAGEMENT, INSTRUCTION) every course of one known
 * language shares. They take the same chain as a target clip: library first, spend guard, one render, write back.
 *   - spoken in the course's PRESENTATION voice (the known-side narrator; the old welcome-service rule), resolved for that slot;
 *   - welcome: one per course, a course_audio row role 'welcome' (what the player reads). Its text defaults to the course's
 *     welcome script (services/shared/welcome-script.cjs). A course that already has a welcome is answered with it — a new
 *     one is a re-record (replaceAudioId), never a second row;
 *   - encouragement / instruction: one per (words, known language) in shared_audio (what the player reads), never per course;
 *     the courseCode only names whose narrator speaks it.
 */
const SHARED_ROLES = ['welcome', 'encouragement', 'instruction']
const LANGUAGE_SHARED_ROLES = ['encouragement', 'instruction']
const isSharedRole = (role) => SHARED_ROLES.includes(role)
/** The course slot whose voice a role speaks in: a shared role borrows the presentation narrator's. */
const voiceSlotFor = (role) => (isSharedRole(role) ? 'presentation' : role)

/** Trial renders may slow a read natively (job #751, Tom 2026-10-12): 0.7-1.0 of the voice's pace. */
const TRIAL_SPEED_MIN = 0.7, TRIAL_SPEED_MAX = 1.0

class RenderRequestError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') { super(message); this.status = status; this.code = code }
}

/** Refuse a malformed request before anything is looked up. */
function validate(input) {
  const missing = REQUIRED.filter(k => !input || input[k] == null || String(input[k]).trim() === '')
  // A welcome may leave its words to the course's welcome script; every other role names them.
  if (input && input.role !== 'welcome' && (input.text == null || String(input.text).trim() === '')) missing.splice(2, 0, 'text')
  if (missing.length) throw new RenderRequestError(`missing required field(s): ${missing.join(', ')} — a render says which course, which line, why, and who is asking`)
  if (input.text != null && String(input.text).length > 1000) throw new RenderRequestError('text longer than 1,000 characters — this is one clip, not a script')
  const out = {
    courseCode: String(input.courseCode),
    role: String(input.role),
    text: input.text == null || String(input.text).trim() === '' ? null : String(input.text),
    purpose: String(input.purpose).slice(0, 300),
    requestedBy: String(input.requestedBy).slice(0, 100),
    language: input.language ? String(input.language) : null,
    voiceId: input.voiceId ? String(input.voiceId) : null,
    legoId: input.legoId ? String(input.legoId) : null,
    // A POD LINE (job #799, shared/pod-line-voice.cjs): the voice is the pod's cast for this line's speaker, read from the DB.
    podSentenceId: input.podSentenceId ? String(input.podSentenceId) : null,
    // …and podRecast:true takes the course's CURRENT cast for that side at the speaker's gender instead of the line's old clip voice.
    podRecast: input.podSentenceId ? input.podRecast === true : false,
    dryRun: !!input.dryRun,
    // TRIAL (job #748, services/shared/audio-trial-mode.cjs): skip the voice gates, store apart from every course, link nothing.
    trial: input.trial === true,
    // A POD CLIP (job #628): 'target' | 'known'. With trial:true the render is filed as a pod-only course_audio row
    // (pod_atom / pod_fine_known, shared/pod-audio.cjs) — never linked into a course slot. Pod Drill pieces and Talk
    // Bollocks lines are rendered this way; a trial WITHOUT podSide is an audition and stays a trial clip.
    podSide: input.podSide == null ? null : String(input.podSide),
    // TRIAL ONLY (job #751): a native speed for the provider (Cartesia generation_config.speed) instead of a time-stretch. Null = the voice's own speed.
    speed: input.speed == null ? null : Number(input.speed),
    // TRIAL ONLY, POST-RENDER-PACED VOICE (job #590): ONE take, stored once per pace in this list, so a pace comparison
    // hears the same performance at each tempo. Separate takes cannot compare paces: the clone wanders more take to take
    // than the 10-25% between belts (job #590 measured a 1.1 take 44% LONGER than a 1.0 take of the same line).
    paces: input.paces == null ? null : (Array.isArray(input.paces) ? input.paces.map(Number) : [NaN]),
    // TRIAL ONLY (job #23): who started this trial — a person; the lane never runs unattended (r-2026-10-13).
    startedBy: input.startedBy ? String(input.startedBy).slice(0, 100) : null,
    // TRIAL ONLY, ELEVENLABS (job #23): the model (allow-list) and voice_settings passed through to the provider.
    model: input.model == null || input.model === '' ? null : String(input.model),
    voiceSettings: input.voiceSettings == null ? null : input.voiceSettings,
    // Answer only with a clip in THIS voice. A two-voice phrase's male and female
    // slots are told apart by voice alone; any-voice reuse files one in the other.
    // ALWAYS ON (job #303, Tom 2026-11-02: no slot may play another slot's voice). There is no opt-out: an any-voice answer
    // handed store() the other voice's BYTES, filed under this slot's voice label (services/audio-render-voicebound-always.test.cjs).
    voiceBound: true,
    // RE-RECORD: replace this course_audio row's bytes in place (same id, next
    // audio_revision). The library is never asked to answer it.
    replaceAudioId: input.replaceAudioId ? String(input.replaceAudioId) : null,
    // RE-RECORD ONLY (job #749): a deliberate second take of a row this same requester already re-recorded for this same
    // purpose within the day. Without it such a request is answered with the take already made (rerecord's idempotency).
    retake: input.retake === true,
    // What to SAY when it differs from the stored text (qualcos'altro-style
    // pronunciation fixes). The stored text is never changed by it.
    spokenText: input.spokenText ? String(input.spokenText) : null,
    // The job this render belongs to ("#913"). It rides into the spend ledger, and a
    // job Tom has approved (tools/tts-cap.cjs approve) spends from its own
    // allowance up to the 300k ceiling instead of the automatic 100k (job #913).
    job: input.job ? String(input.job).slice(0, 100) : null,
    // ADOPT (job #140): file an object a paid render already put in S3 but could not save a row for. No provider call.
    adoptS3Key: input.adoptS3Key ? String(input.adoptS3Key) : null,
    // INSTRUCTION ONLY (job #464): its place in the ordered sequence the player plays (shared_audio.sequence).
    sequence: input.sequence == null ? null : Number(input.sequence),
    // KAI'S (or Tom's) APPROVAL TOKEN `kai:YYYY-MM-DD:<reason>` (Tom 2026-10-30): lets a re-record past the permission gate. Shape-checked only.
    approval: input.approval ? String(input.approval) : null,
    // COURSE POSITION of the line (its seed number; a phrase's LEGO S0014L01 → 14). Read only by the clone stand-in's
    // pace-by-belt rule (aran-clone-standin.cjs, Aran 2026-11-03, job #579); every other slot ignores it.
    seedPosition: input.seedPosition == null ? null : Number(input.seedPosition),
  }
  if (out.seedPosition != null && !(Number.isInteger(out.seedPosition) && out.seedPosition > 0)) throw new RenderRequestError('seedPosition is the line\'s seed number, a positive integer', 400, 'BAD_SEED_POSITION')
  if (out.approval && !approverOf(out.approval)) throw new RenderRequestError('approval must look like kai:YYYY-MM-DD:<reason> (or tom:YYYY-MM-DD:<reason>)', 400, 'BAD_APPROVAL')
  if (out.sequence != null && (out.role !== 'instruction' || !Number.isInteger(out.sequence) || out.sequence < 0)) throw new RenderRequestError('sequence is a non-negative integer, for an instruction only', 400, 'BAD_SEQUENCE')
  if (out.text == null && (out.trial || out.adoptS3Key || out.replaceAudioId)) throw new RenderRequestError('trial, adoptS3Key and replaceAudioId name the words — send text', 400, 'TEXT_REQUIRED')
  if (isSharedRole(out.role) && (out.trial || out.legoId)) throw new RenderRequestError(`a ${out.role} is no LEGO's and no trial's — legoId and trial do not apply`, 400, 'SHARED_ROLE_ALONE')
  if (LANGUAGE_SHARED_ROLES.includes(out.role) && (out.replaceAudioId || out.adoptS3Key)) throw new RenderRequestError(`a ${out.role} lives in shared_audio — replaceAudioId and adoptS3Key file course_audio rows`, 400, 'SHARED_ROLE_ALONE')
  if (out.adoptS3Key) {
    // ONE-OFF EXCEPTION (r-2026-10-28 deu_at Tamara 732, services/shared/adopt-exception.cjs): a listed trial key, for its
    // exact course/role/words only. Anything not on that list is still refused here.
    const ex = adoptException.exceptionFor(out.adoptS3Key)
    if (!paidWrite.isAdoptableKey(out.adoptS3Key) && !ex) throw new RenderRequestError('adoptS3Key must be a mastered/<UUID>.mp3 key phase8 wrote', 400, 'BAD_ADOPT_KEY')
    if (ex) {
      const why = adoptException.mismatch(ex, out)
      if (why) throw new RenderRequestError(`${out.adoptS3Key} is adoptable only under ${ex.ruling}: ${why}`, 400, 'ADOPT_EXCEPTION_MISMATCH')
    }
    if (out.trial || out.replaceAudioId || out.spokenText) throw new RenderRequestError('adoptS3Key files one paid-but-unsaved clip — trial, replaceAudioId and spokenText do not apply', 400, 'ADOPT_ALONE')
  }
  if (out.trial && (out.replaceAudioId || out.spokenText || out.legoId)) throw new RenderRequestError('a trial render connects to nothing — replaceAudioId, spokenText and legoId do not apply', 400, 'TRIAL_NO_LINKS')
  if ((out.model || out.voiceSettings || out.startedBy) && !out.trial) throw new RenderRequestError('model, voiceSettings and startedBy are trial-only — a course render speaks the course voice as cast', 400, 'TRIAL_ONLY_OPTION')
  if (out.podSide != null) {
    if (out.podSide !== 'target' && out.podSide !== 'known') throw new RenderRequestError('podSide is target or known', 400, 'BAD_POD_SIDE')
    if (!out.trial || out.paces) throw new RenderRequestError('a pod clip is one trial take (trial:true, no paces) filed as a pod-only row', 400, 'POD_SIDE_TRIAL_ONLY')
  }
  if (out.trial) {
    // STARTED, NEVER UNATTENDED (job #23, r-2026-10-13): a trial names a person or a job, and keeps to one-off clips.
    if (!out.startedBy && !out.job) throw new RenderRequestError('a trial render names who started it — startedBy (a person) or job ("#23")', 400, 'TRIAL_NEEDS_STARTER')
    const cap = trialMode.maxCharsPerCall()
    if (out.text && out.text.length > cap) throw new RenderRequestError(`a trial render is one short clip — ${out.text.length} characters is over the ${cap}-character per-call trial cap; bulk work needs Tom`, 400, 'TRIAL_CALL_CAP')
    try { out.model = trialMode.checkModel(out.model); out.voiceSettings = trialMode.checkVoiceSettings(out.voiceSettings) } catch (e) { throw new RenderRequestError(e.message, e.status || 400, e.code || 'BAD_REQUEST') }
  }
  if (out.speed != null) {
    if (!out.trial) throw new RenderRequestError('speed is a trial-only option — a course render speaks at the course voice\'s own speed', 400, 'SPEED_TRIAL_ONLY')
    // Above 1.0 only for the clone stand-in voice, up to its fastest belt pace (checked against the resolved voice in trialRender).
    if (!(out.speed >= TRIAL_SPEED_MIN && out.speed <= Math.max(TRIAL_SPEED_MAX, standIn.STANDIN_MAX_PACE))) throw new RenderRequestError(`speed must be between ${TRIAL_SPEED_MIN} and ${TRIAL_SPEED_MAX} (up to ${standIn.STANDIN_MAX_PACE} for the clone stand-in voice)`, 400, 'BAD_SPEED')
  }
  if (out.paces != null) {
    if (!out.trial) throw new RenderRequestError('paces is a trial-only option', 400, 'PACES_TRIAL_ONLY')
    if (out.speed != null) throw new RenderRequestError('send speed or paces, not both', 400, 'BAD_PACES')
    if (!(out.paces.length >= 1 && out.paces.length <= 4) || !out.paces.every((x) => x >= TRIAL_SPEED_MIN && x <= standIn.STANDIN_MAX_PACE)) throw new RenderRequestError(`paces is a list of 1-4 numbers between ${TRIAL_SPEED_MIN} and ${standIn.STANDIN_MAX_PACE}`, 400, 'BAD_PACES')
  }
  if (out.job && !/#\d+/.test(out.job)) throw new RenderRequestError('job names the job the way the estate writes it, e.g. "#913"')
  if (out.spokenText && !out.replaceAudioId) throw new RenderRequestError('spokenText only applies to a re-record — name replaceAudioId')
  if (out.spokenText && out.spokenText.length > 1000) throw new RenderRequestError('spokenText longer than 1,000 characters — this is one clip, not a script')
  return out
}

/**
 * @param {object} input  { courseCode, role, text, purpose, requestedBy, language?, voiceId?, legoId?, dryRun? }
 * @param {object} deps
 *   resolve({courseCode, role, language, voiceId}) → { language, voiceId, provider, providerConfig }   (the course's cast voice unless voiceId is named)
 *   link({...req, language, voiceId})   → { audioId, s3Key, voiceId } | null   library hit linked into the course row
 *   speak(text, provider, config, maxRetries) → { audioBuffer, wordBoundaries, existingClip, charsSpent }   the ONE door
 *   store({...req, language, voiceId, audioBuffer, wordBoundaries}) → { audioId, s3Key, durationMs }   master + S3 + course_audio row + clip_index
 *   linkLego({courseCode, legoId, audioId}) → { linked, previous }   optional; presentation role + legoId only, never in a dry run
 *   adopt({...req, language, voiceId, s3Key, dryRun}) → { audioId, s3Key, durationMs }   optional; adoptS3Key only — files an
 *        object already in S3 as the course_audio row (job #140), no provider call
 *   immersionTurn({language, text}) → { rowId, order, courseCode, audioId, voiceId } | null   optional; the served pod turn
 *        holding these words as one of its sentences (job #338: a Drill clip is cut from it, never rendered)
 * Re-record only (replaceAudioId):
 *   loadClip(audioId) → { id, course_code, role, language, voice_id, s3_key, origin } | null
 *   replace({...ident, replaceAudioId, s3Key?, audioBuffer?, wordBoundaries?}) → { audioId, s3Key, durationMs, revision }
 *        make-before-break: master + upload the new object (or take an existing library clip's key), verify it is
 *        alive, THEN swap the row onto it (versioned). The old object is retained, never deleted here.
 */
/**
 * A presentation clip is only heard when course_legos.presentation_audio_id points
 * at it, so a presentation render that names its LEGO binds it itself (job #394·J
 * had to link 43 by hand). Repoint only — the previous clip is never deleted.
 */
async function bindPresentation(req, result, deps) {
  trialMode.assertNotTrial(result.audioId, result.s3Key)
  if (req.role !== 'presentation' || !req.legoId || req.dryRun || !deps.linkLego || !result.audioId) return result
  const { linked } = await deps.linkLego({ courseCode: req.courseCode, legoId: req.legoId, audioId: result.audioId })
  return { ...result, legoLinked: !!linked }
}

/**
 * PACE BY BELT for the clone stand-in (Aran 2026-11-03, job #579; the rule lives in aran-clone-standin.cjs): a NEW render
 * of the stand-in voice in its slot is played at its belt's tempo. Every other slot keeps the resolved speed. A library
 * answer is never re-paced: library-first runs before this and links whatever clip of these words the voice has.
 * Cartesia IGNORES request-time speed for this Professional clone (job #590 measured 1.25 coming out slower than 1.0), so
 * Cartesia gets its default 1.0 and the tempo rides as paceTempo to the store step, which time-stretches before mastering.
 */
function standInPace(req, r) {
  if (r.provider !== 'cartesia' || !standIn.isStandInVoice(r.voiceId)) return {}
  if (!standIn.isCloneStandInSlot({ courseCode: req.courseCode, role: req.role, language: r.language })) return {}
  const tempo = standIn.standInSpeed(req.seedPosition)
  return tempo === 1 ? { speed: 1 } : { speed: 1, paceTempo: tempo }
}

async function renderClip(input, deps) {
  const req = validate(input)
  return chain.run(`render:${req.requestedBy}`, async () => {
    if (req.trial) return trialRender(req, deps)
    if (req.adoptS3Key) return adoptPaid(req, deps)
    if (req.replaceAudioId) return rerecord(req, deps)
    if (isSharedRole(req.role)) return renderShared(req, deps)
    // HUMAN-SPLICED INTROS (Aran 2026-10-27, job #210): a course whose intros are made from a human reader's own takes
    // (voicing-policy humanSplicedIntros) is answered here, before any voice is resolved, and never falls through to a
    // render: a missing piece throws INTRO_WAITING. null = not such a course, so the normal path carries on.
    if (req.role === 'presentation' && deps.humanIntro) {
      try {
        const built = await deps.humanIntro(req)
        if (built) return { purpose: req.purpose, requestedBy: req.requestedBy, ...built }
      } catch (e) {
        if (e && e.code && e.status) throw Object.assign(new RenderRequestError(e.message, e.status, e.code), e.waitingOn ? { waitingOn: e.waitingOn } : {}, e.expected ? { expected: e.expected } : {})
        throw e
      }
    }
    const r = await deps.resolve(req)
    const ident = { ...req, language: r.language, voiceId: r.voiceId }

    // 1. library first
    const linked = await deps.link(ident)
    if (linked) return bindPresentation(req, { ok: true, source: 'library', ...(req.dryRun ? { dryRun: true } : {}), charsSpent: 0, ...linked, purpose: req.purpose, requestedBy: req.requestedBy }, deps)

    // DRILL IS CUT (job #338, Tom 2026-10-24): one sentence of a served pod turn, in the voice that turn was recorded in,
    // is cut from that take — never paid for twice. Library first already linked any cut that exists; this stops the
    // second performance when nobody has cut it yet. Another voice (a main-flow second seat) is not refused here.
    if (deps.immersionTurn && (req.role === 'target1' || req.role === 'target2')) {
      const turn = await deps.immersionTurn({ language: r.language, text: req.text, voice: r.voiceId })
      const refusal = drillCut.drillCutRefusal(turn, { voiceId: r.voiceId, text: req.text })
      if (refusal) throw new RenderRequestError(refusal.message, refusal.status, refusal.code)
    }

    // DICE AND SPLICE (job #516, Tom 2026-10-11): an English-known presentation intro is assembled from existing Charlotte clips
    // (a missing piece is rendered once, here, and shared) — never rendered whole, which the voicing policy refuses. null = not
    // a spliceable intro, so the normal path carries on.
    if (req.role === 'presentation' && deps.spliceIntro) {
      const spliced = await deps.spliceIntro({ ...req, ...ident })
      if (spliced) return bindPresentation(req, { purpose: req.purpose, requestedBy: req.requestedBy, ...spliced }, deps)
    }

    // ALREADY RECORDED IN THIS LANGUAGE (job #352, services/shared/exists-in-language-guard.cjs): recordings are per language,
    // not per course. Library-first above linked a clip in THIS voice; a clip of these words in this language in ANY other
    // voice, any course, either side, makes this a second performance — refused (409 EXISTS_IN_LANGUAGE, dry run too) naming
    // the clips, unless the route's existing re-record authority covers it (Tom's permission row, Kai's token). Trial renders
    // returned above and never reach this; intros (presentation) are rendered fresh per course and are not guarded.
    if (deps.clipsInLanguage && existsInLanguage.guardsSlot(req.role)) {
      const found = await deps.clipsInLanguage({ language: r.language, text: req.text, courseCode: req.courseCode })
      const refusal = existsInLanguage.existsInLanguageRefusal(found, { voiceId: r.voiceId, courseCode: req.courseCode, role: req.role, language: r.language, text: req.text })
      if (refusal) {
        const grant = deps.rerecordGranted ? await deps.rerecordGranted({ courseCode: req.courseCode, role: req.role, approval: req.approval }) : null
        if (!grant) throw Object.assign(new RenderRequestError(refusal.message, refusal.status, refusal.code), { existing: refusal.existing })
      }
    }

    // slotRole: the same words already in this course role in another voice make this a re-voice — a re-record (Tom 2026-10-11).
    const cfg = { ...r.providerConfig, ...standInPace(req, r), door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: req.voiceBound, slotRole: req.role, job: req.job, approval: req.approval, podLine: !!req.podSentenceId } }
    // 2 + 3. the door → guard → one provider attempt
    const out = await deps.speak(req.text, r.provider, cfg, 1)
    if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, purpose: req.purpose, requestedBy: req.requestedBy }
    if (out.existingClip) {
      // A clip appeared between our lookup and the door's own: link it, spend nothing.
      const again = await deps.link(ident)
      if (again) return bindPresentation(req, { ok: true, source: 'library', charsSpent: 0, ...again, purpose: req.purpose, requestedBy: req.requestedBy }, deps)
    }
    // 4. write back
    const stored = await deps.store({ ...ident, audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null, ...(cfg.paceTempo ? { tempo: cfg.paceTempo } : {}) })
    return bindPresentation(req, { ok: true, source: 'rendered', charsSpent: out.charsSpent, ...stored, ...(cfg.paceTempo ? { tempo: cfg.paceTempo } : {}), purpose: req.purpose, requestedBy: req.requestedBy }, deps)
  })
}

/**
 * A WELCOME, ENCOURAGEMENT or INSTRUCTION (job #464, see SHARED_ROLES). The same four steps as renderClip's main path:
 * no intro splice, no drill cut, no LEGO. deps (beyond renderClip's):
 *   welcomeScript(courseCode) → string | null                  the course's welcome words, when the caller sent none
 *   courseWelcome(courseCode) → { audioId, s3Key, voiceId, durationMs } | null   the course's welcome, if it has one
 *   linkShared({ text, language, role }) → { audioId, s3Key, voiceId, durationMs } | null   the shared_audio row for these words
 *   storeShared({ ...ident, audioBuffer?, s3Key?, sequence }) → { audioId, s3Key, durationMs }   master + S3 (unless s3Key) + shared_audio row
 */
async function renderShared(req, deps) {
  const echo = () => ({ purpose: req.purpose, requestedBy: req.requestedBy, role: req.role })
  if (req.role === 'welcome') {
    if (!req.text) {
      req.text = deps.welcomeScript ? await deps.welcomeScript(req.courseCode) : null
      if (!req.text) throw new RenderRequestError(`no welcome script for ${req.courseCode} — services/shared/welcome-templates has no template for its known language or no slot for its target; send text`, 404, 'NO_WELCOME_SCRIPT')
      if (req.text.length > 1000) throw new RenderRequestError('the welcome script is longer than 1,000 characters — this is one clip, not a script')
    }
    const has = deps.courseWelcome ? await deps.courseWelcome(req.courseCode) : null
    if (has) return { ok: true, source: 'library', existing: true, ...(req.dryRun ? { dryRun: true } : {}), charsSpent: 0, ...has, ...echo(),
      note: `${req.courseCode} already has a welcome (${has.audioId}) — a new one is a re-record: send replaceAudioId` }
  }
  const shared = LANGUAGE_SHARED_ROLES.includes(req.role)
  if (shared && (!deps.linkShared || !deps.storeShared)) throw new RenderRequestError(`this service cannot file a ${req.role}`, 501, 'NO_SHARED_STORE')
  const r = await deps.resolve({ ...req, role: voiceSlotFor(req.role) })
  const ident = { ...req, language: r.language, voiceId: r.voiceId }
  const said = req.role === 'welcome' ? { text: req.text } : {}

  // 1. library first: a guide line is one row per words and language whoever speaks it; a welcome is a clip like any other.
  const findLinked = () => (shared ? deps.linkShared(ident) : deps.link(ident))
  const linked = await findLinked()
  if (linked) return { ok: true, source: 'library', ...(req.dryRun ? { dryRun: true } : {}), charsSpent: 0, ...linked, ...echo(), ...said }

  // 2 + 3. the door → guard → one provider attempt. slotRole is the shared role itself: the voicing policy governs slots only.
  const cfg = { ...r.providerConfig, door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: req.voiceBound, slotRole: req.role, job: req.job, approval: req.approval } }
  const out = await deps.speak(req.text, r.provider, cfg, 1)
  if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, voiceId: r.voiceId, language: r.language, ...echo(), ...said }
  if (out.existingClip && !shared) {
    const again = await deps.link(ident)
    if (again) return { ok: true, source: 'library', charsSpent: 0, ...again, ...echo(), ...said }
  }
  // 4. write back. A guide line the door found in the clip library is filed on that clip's own object: nothing re-uploaded.
  const stored = shared
    ? await deps.storeShared({ ...ident, sequence: req.sequence, ...(out.existingClip && out.existingClip.s3_key ? { s3Key: out.existingClip.s3_key, durationMs: out.existingClip.duration_ms || null } : { audioBuffer: out.audioBuffer }) })
    : await deps.store({ ...ident, audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null })
  return { ok: true, source: out.existingClip ? 'library' : 'rendered', charsSpent: out.charsSpent, voiceId: r.voiceId, ...stored, ...echo(), ...said }
}

/**
 * ADOPT a paid-but-unsaved clip (job #140): the render was paid for, its object is in S3, its course_audio
 * write failed. Library first (a clip for these words in this voice since → link that, the orphan stays
 * unused), else deps.adopt files the existing object as the row. Never calls deps.speak: nothing is paid.
 */
async function adoptPaid(req, deps) {
  if (!deps.adopt) throw new RenderRequestError('this service cannot adopt S3 objects', 501, 'NO_ADOPT')
  const r = await deps.resolve({ ...req, role: voiceSlotFor(req.role) })
  const ident = { ...req, language: r.language, voiceId: r.voiceId }
  const echo = { purpose: req.purpose, requestedBy: req.requestedBy, adoptS3Key: req.adoptS3Key, charsSpent: 0 }
  // An exception adopt files THE clip Kai picked: the resolved voice must be the listed one, and the library is not asked
  // (it would answer with some other clip of the words). phase8 slows it and files it under a fresh mastered/ key.
  const ex = adoptException.exceptionFor(req.adoptS3Key)
  if (ex) {
    const why = adoptException.mismatch(ex, { ...req, voiceId: r.voiceId })
    if (why) throw new RenderRequestError(`${req.adoptS3Key} is adoptable only under ${ex.ruling}: ${why}`, 400, 'ADOPT_EXCEPTION_MISMATCH')
    const adopted = await deps.adopt({ ...ident, s3Key: req.adoptS3Key, dryRun: req.dryRun, exception: ex })
    if (req.dryRun) return { ok: true, source: 'would-adopt', dryRun: true, exception: ex.ruling, ...adopted, ...echo }
    return bindPresentation(req, { ok: true, source: 'adopted', exception: ex.ruling, ...adopted, ...echo }, deps)
  }
  const linked = await deps.link(ident)
  if (linked) return bindPresentation(req, { ok: true, source: 'library', ...(req.dryRun ? { dryRun: true } : {}), ...linked, ...echo }, deps)
  const adopted = await deps.adopt({ ...ident, s3Key: req.adoptS3Key, dryRun: req.dryRun })
  if (req.dryRun) return { ok: true, source: 'would-adopt', dryRun: true, ...adopted, ...echo }
  return bindPresentation(req, { ok: true, source: 'adopted', ...adopted, ...echo }, deps)
}

/**
 * A TRIAL render: no library link, no splice, no course row, no pointer. The door runs with door.trial (gates off, cap on);
 * the clip is stored apart by deps.storeTrial and comes back as trial_<UUID>.
 */
async function trialRender(req, deps) {
  trialMode.assertTrialOpen(deps.now ? deps.now() : new Date())
  const r = await deps.resolve(req)
  const ident = { ...req, language: r.language, voiceId: r.voiceId }
  // An EXPLICIT speed (1 included: the voice's own settings.speed may be 0.8) is a different recording of the same words, so the
  // library (keyed on text+voice) must not answer it: door.skipLibrary. Unset keeps the normal trial path, library hit and all.
  const slowed = req.speed != null
  // Only Cartesia takes a native speed; tts-service never sends it to ElevenLabs, so honouring it would echo a speed we did not buy.
  if (slowed && r.provider !== 'cartesia') throw new RenderRequestError(`native trial speed is Cartesia-only — ${r.provider} voices take voiceSettings.speed instead`, 400, 'SPEED_PROVIDER_UNSUPPORTED')
  if (slowed && req.speed > TRIAL_SPEED_MAX && !standIn.isStandInVoice(r.voiceId)) throw new RenderRequestError(`a trial faster than ${TRIAL_SPEED_MAX} is only for the clone stand-in voice's belt pace (job #579) — ${r.voiceId} is not it`, 400, 'BAD_SPEED')
  // ELEVENLABS PASS-THROUGH (job #23): model + voice_settings reach the provider only on a trial. Either one makes a different
  // recording of the same words, so — like an explicit speed — the library (keyed on text+voice) must not answer it.
  const tuned = !!(req.model || req.voiceSettings)
  if (tuned && r.provider !== 'elevenlabs') throw new RenderRequestError(`model and voiceSettings are ElevenLabs-only — ${r.voiceId} is a ${r.provider} voice`, 400, 'MODEL_PROVIDER_UNSUPPORTED')
  const elSpeed = req.voiceSettings && req.voiceSettings.speed != null ? req.voiceSettings.speed : null
  // MAX STABILITY BY DEFAULT (Kai 2026-10-28): every ElevenLabs trial that reaches the provider sends stability 1.0 unless it names
  // one. Only an EXPLICIT model/voiceSettings skips the library: a plain trial is still answered by an existing clip of the words.
  const elSettings = r.provider === 'elevenlabs' ? { stability: trialMode.TRIAL_DEFAULT_STABILITY, ...(req.voiceSettings || {}) } : null
  // A Professional clone ignores Cartesia's native speed (job #590): it is rendered at 1.0 and the asked speed is applied
  // afterwards as a tempo (storeTrial). paceTempo also keys the spend guard's repeat count, as speed does for native speeds.
  const postPace = slowed && standIn.paceIsPostRender(r.voiceId)
  if (req.paces) return trialPaces(req, r, ident, deps)
  const cfg = {
    ...r.providerConfig,
    ...(slowed ? (postPace ? { speed: 1, paceTempo: req.speed } : { speed: req.speed }) : {}),
    ...(elSettings ? { voiceSettings: elSettings } : {}),
    // speed on the config is what the spend guard's repeat key reads: a 0.85 read is counted apart from a 1.0 one.
    ...(tuned ? { modelId: req.model || undefined, speed: elSpeed != null ? elSpeed : 1 } : {}),
    door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: req.voiceBound, trial: true, skipLibrary: slowed || tuned, audioTags: trialMode.audioTagsAllowed(req.model), job: req.job },
  }
  const out = await deps.speak(req.text, r.provider, cfg, 1)
  const echo = { trial: true, ...(slowed ? { speed: req.speed } : {}), ...(req.model ? { model: req.model } : {}), ...(elSettings ? { voiceSettings: elSettings } : {}), purpose: req.purpose, requestedBy: req.requestedBy, ...(req.startedBy ? { startedBy: req.startedBy } : {}), ...(req.job ? { job: req.job } : {}), voiceId: r.voiceId, provider: r.provider, language: r.language }
  if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, ...echo }
  const stored = await deps.storeTrial({ ...ident, speed: slowed ? req.speed : (elSpeed != null && elSpeed !== 1 ? elSpeed : null), ...(postPace && req.speed !== 1 ? { tempo: req.speed } : {}), audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null })
  if (req.podSide) {
    // A POD CLIP (job #628): rendered with a trial's free voice choice, then filed at once as a pod-only course_audio row
    // (shared/pod-audio.cjs) — the answer's audioId is the ROW, which is what the app plays; the trial object stays behind it.
    if (!deps.filePodClip) throw new RenderRequestError('this service cannot file pod clips', 501, 'NO_POD_FILE')
    const filed = await deps.filePodClip({ courseCode: req.courseCode, trialId: stored.audioId, text: req.text, voiceId: r.voiceId, side: req.podSide })
    return { ok: true, source: out.existingClip ? 'library' : 'rendered', charsSpent: out.charsSpent, ...stored, trialAudioId: stored.audioId, audioId: filed.audioId, s3Key: filed.s3Key, podRole: filed.role, ...echo }
  }
  return { ok: true, source: out.existingClip ? 'library' : 'rendered', charsSpent: out.charsSpent, ...stored, ...echo }
}

/**
 * ONE take of a post-render-paced voice (the clone stand-in), stored once per asked pace (job #590). One provider call at
 * Cartesia's default speed; each stored copy is the same bytes time-stretched to its pace before mastering.
 */
async function trialPaces(req, r, ident, deps) {
  if (!standIn.paceIsPostRender(r.voiceId)) throw new RenderRequestError(`paces is for a voice whose pace is applied after the render (the clone stand-in) — ${r.voiceId} is not one`, 400, 'PACES_VOICE_UNSUPPORTED')
  const cfg = { ...r.providerConfig, speed: 1, door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: req.voiceBound, trial: true, skipLibrary: true, job: req.job } }
  const out = await deps.speak(req.text, r.provider, cfg, 1)
  const echo = { trial: true, paces: req.paces, purpose: req.purpose, requestedBy: req.requestedBy, ...(req.startedBy ? { startedBy: req.startedBy } : {}), ...(req.job ? { job: req.job } : {}), voiceId: r.voiceId, provider: r.provider, language: r.language }
  if (req.dryRun) return { ok: true, source: 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, ...echo }
  const takes = []
  for (const pace of req.paces) {
    const stored = await deps.storeTrial({ ...ident, speed: pace === 1 ? null : pace, ...(pace !== 1 ? { tempo: pace } : {}), audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null })
    takes.push({ pace, ...stored })
  }
  return { ok: true, source: 'rendered', charsSpent: out.charsSpent, takes, ...echo }
}

/**
 * Re-record one named clip in its OWN voice. The voice is the row's, never the
 * course cast's, so a male slot is re-recorded male. The row is refused when it
 * belongs to another course, or is a human recording (precious).
 */
async function rerecord(req, deps) {
  const row = await deps.loadClip(req.replaceAudioId)
  if (!row) throw new RenderRequestError(`no course_audio row ${req.replaceAudioId}`, 404, 'NO_CLIP')
  if (row.course_code !== req.courseCode) throw new RenderRequestError(`${req.replaceAudioId} belongs to ${row.course_code}, not ${req.courseCode}`, 409, 'WRONG_COURSE')
  if (row.origin === 'human') throw new RenderRequestError(`${req.replaceAudioId} is a human recording — never re-rendered over`, 409, 'HUMAN_CLIP')
  if (req.role !== row.role) throw new RenderRequestError(`${req.replaceAudioId} is a ${row.role} clip, request said ${req.role}`, 409, 'WRONG_ROLE')
  if (req.voiceId && req.voiceId !== row.voice_id) throw new RenderRequestError(`a re-record keeps the clip's own voice (${row.voice_id}); voiceId ${req.voiceId} differs`, 409, 'VOICE_MISMATCH')
  // A line on the course's pronunciation-override list (shared/pronunciation-overrides.cjs) is re-recorded in its spoken
  // form: sent as the words, the door cannot answer with another (misread) clip of the same characters in its place.
  const said = req.spokenText || pronunciation.spokenFor({ courseCode: req.courseCode, text: req.text }) || req.text
  if (said !== req.text && !req.spokenText) req.spokenText = said
  // A RE-RECORD IS IDEMPOTENT (job #749). The door below is told to EXCLUDE the row's current clip (`replacing`), so a
  // repeat of a re-record that already landed can never be answered from the library: it pays for a fresh take every time.
  // That is what looped on ara_lb_for_eng 2026-11-05: Popty's proxy answered 503 "socket hang up" while phase8 went on to
  // render and swap, the caller (#641's runner) re-sent the same ask, and one 5-character word was paid for five times
  // (revisions 2-6) before the spend guard's REPEAT refused it. So when the row's current clip IS the take this requester
  // made for this purpose within the day, answer with it and render nothing. A deliberate new take says retake: true.
  if (!req.retake && deps.lastRerecord) {
    const last = await deps.lastRerecord(row.id)
    if (sameRerecordAsk(last, row, req)) {
      return { ok: true, source: 'already-rerecorded', charsSpent: 0, ...(req.dryRun ? { dryRun: true, wouldSpendChars: 0 } : {}),
        audioId: row.id, s3Key: row.s3_key, revision: last.revision, rerecordedAt: last.created_at,
        purpose: req.purpose, requestedBy: req.requestedBy, replaceAudioId: row.id, spoken: said }
    }
  }
  const r = await deps.resolve({ ...req, role: voiceSlotFor(req.role), language: row.language, voiceId: row.voice_id })
  const ident = { ...req, language: r.language, voiceId: r.voiceId }
  // voiceBound + replacing: the door can only answer with a same-voice clip other than the one being replaced.
  // forceRerecord: this IS a re-record whatever words are spoken (spokenText) — one named clip is an INDIVIDUAL re-record, always allowed (Tom 2026-10-16); the permission gate is for batch runs.
  const cfg = { ...r.providerConfig, door: { ...(r.providerConfig.door || {}), courseCode: req.courseCode, language: r.language, dryRun: req.dryRun, voiceBound: true, replacing: [row.id, row.s3_key], forceRerecord: true, individual: true, job: req.job } }
  const spoke = await deps.speak(said, r.provider, cfg, 1)
  // Timings echo the words SENT: a spoken-form token goes back to the stored character (null if it cannot).
  const out = said === req.text ? spoke : { ...spoke, wordTimings: pronunciation.restoreWordTimings(spoke.wordTimings || null, req.courseCode, row.language) }
  const echo = { purpose: req.purpose, requestedBy: req.requestedBy, replaceAudioId: row.id, spoken: said }
  if (req.dryRun) return { ok: true, source: out.existingClip ? 'library' : 'would-render', dryRun: true, wouldSpendChars: out.wouldSpendChars || 0, charsSpent: 0, ...echo }
  const swapped = out.existingClip
    ? await deps.replace({ ...ident, replaceAudioId: row.id, s3Key: out.existingClip.s3_key, wordBoundaries: out.wordBoundaries || null, wordTimings: out.wordTimings || null })   // the row now points at the library clip's bytes, so it takes that clip's timings with it
    : await deps.replace({ ...ident, replaceAudioId: row.id, audioBuffer: out.audioBuffer, wordBoundaries: out.wordBoundaries, wordTimings: out.wordTimings || null })
  return { ok: true, source: out.existingClip ? 'library' : 'rendered', charsSpent: out.charsSpent, ...swapped, ...echo }
}

const RERECORD_IDEMPOTENT_MS = 24 * 3600 * 1000 // the spend guard's REPEAT window: a day

/**
 * Is `last` (the row's newest course_audio_revisions entry) this very ask, already done? Same route, same requester, same
 * purpose, its new object still the row's current one, within the day. Anything else (a later swap, another caller,
 * another purpose) is a new ask and renders.
 */
function sameRerecordAsk(last, row, req, now = Date.now()) {
  if (!last || last.source !== 'audio-render-rerecord') return false
  if (!last.new_s3_key || last.new_s3_key !== row.s3_key) return false
  if (last.accepted_by !== `${req.requestedBy} via /api/audio/render`) return false
  if ((last.reason || null) !== (req.purpose || null)) return false
  const at = Date.parse(last.created_at)
  return Number.isFinite(at) && now - at < RERECORD_IDEMPOTENT_MS
}

/**
 * The language a role natively speaks in a course. Presentation clips are
 * known-language audio, so presentation resolves to the known side with 'known';
 * target1/target2 stay target-language and keep the cast gate's full strictness.
 */
function roleNativeLanguage(role, course) {
  return role === 'known' || role === 'presentation' || isSharedRole(role) ? course.known_lang : course.target_lang
}

/** The course_audio patch a re-record writes. Timings only when supplied. Note swapClipInPlace nulls word_timings unless the patch brings them (they describe bytes), so every branch that moves s3_key must supply the new bytes' timings. */
function rerecordPatch({ voiceId, wordBoundaries, wordTimings }) {
  return { origin: 'tts', voice_id: voiceId, ...(wordBoundaries !== undefined && { word_boundaries: wordBoundaries || null }), ...(wordTimings !== undefined && { word_timings: wordTimings || null }) }
}

module.exports = { sameRerecordAsk, rerecordPatch, roleNativeLanguage, renderClip, validate, RenderRequestError, SHARED_ROLES, isSharedRole, voiceSlotFor }
