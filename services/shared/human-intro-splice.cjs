/**
 * HUMAN-SPLICED LEGO INTROS — a presentation intro assembled from a human reader's own takes, never rendered.
 *
 * Aran, 2026-10-27 (job #210; he leads the Welsh method): the missing LEGO intros of cym_nv2_for_eng and cym_sv2_for_eng
 * are made in HIS English voice, not Charlotte's. One intro is four pieces, in speaking order:
 *
 *   fragment  "The Welsh for"     his take, recorded once (the "Intro pieces" card on his English booth)
 *   x         the LEGO's English  his take of exactly those words — a LEGO, practice-phrase or sentence take all serve
 *                                  (Aran 2026-10-15: identical words share one recording)
 *   joiner    "is"                his take, recorded once (same card)
 *   target    the Welsh           the LEGO's own target1 clip, a human take saying the LEGO's target words
 *
 * which is the old cym intro format, stored as  The Welsh for <src>X</src> is <tgt>Y</tgt>.
 * NOTHING HERE RENDERS. A piece that does not exist yet means the intro WAITS (INTRO_WAITING, naming what it waits on);
 * it never falls back to Charlotte or any TTS voice. The courses, voice and words are data in voicing-policy.config.json
 * (humanSplicedIntros); this file is the logic. Joined with intro-splice.cjs's joinPcm (trim, level-match, click-free
 * fades, comma-length gaps), so the seams are the ones the Charlotte splice already uses.
 *
 * Reached through the ONE audio route: POST /api/audio/render, role 'presentation', with legoId (audio-render-entry.cjs
 * asks deps.humanIntro before anything else). The batch command is tools/audio/human-intros.cjs.
 *
 * THE SPLICE IS OFF (Aran, 2026-10-29, job #587): "I would like to record the full sentence for each introduction … we
 * don't need to break up into English bits and Welsh bits, because I can do both in one sentence." He reads each intro
 * WHOLE on the Introductions card of his English booth (services/voice-engine/intro-sentence-lines.cjs); that take is
 * filed as the intro clip under exactly the text humanIntroText gives and linked into the LEGO's presentation slot, and
 * it replaces a spliced intro of his voice wherever one is linked. With `splice: false` (the config as it stands) this
 * module still answers already-linked / library, and otherwise WAITS on the whole-sentence take (kind 'sentence'); the
 * four-piece splice below stays as a fallback a course switches back on with `splice: true`.
 */
const config = require('./voicing-policy.config.json')
const { normalizeForAudio, audioKeyCandidates } = require('./text-normalize.cjs')

/** The silence after each piece, ms. The pause before the Welsh is a beat longer: it is the answer. */
const HUMAN_GAPS_MS = Object.freeze({ fragment: 190, x: 230, joiner: 320, target: 0 })

class HumanIntroError extends Error {
  constructor(message, status, code, extra = {}) { super(message); this.status = status; this.code = code; Object.assign(this, extra) }
}

/** The human-intro rule for a course, or null when the course's intros are not human-spliced. Own properties only. */
function humanIntroConfig(courseCode, table = config.humanSplicedIntros) {
  if (!table || !Object.hasOwn(table, String(courseCode || ''))) return null
  const c = table[courseCode]
  if (!c || !c.voiceId || !c.fragment) return null
  return { courseCode, voiceId: c.voiceId, fragment: c.fragment, joiner: c.joiner || null, withTarget: c.withTarget !== false, splice: c.splice === true }
}

/** Every configured course read by this voice (any spelling), in config order. */
function humanIntroCoursesFor(spellings, table = config.humanSplicedIntros) {
  const mine = new Set(spellings || [])
  return Object.keys(table || {}).map((c) => humanIntroConfig(c, table)).filter((c) => c && mine.has(c.voiceId))
}

/**
 * The once-recorded pieces this voice owes, one per distinct wording across its courses:
 * [{ key: 'fragment'|'joiner', text, courseCodes }]. The booth card is built from this.
 */
function fixedPiecesFor(spellings, table = config.humanSplicedIntros) {
  const out = []
  // No splice, no pieces to read: the whole sentence is the take (job #587).
  for (const c of humanIntroCoursesFor(spellings, table).filter((x) => x.splice)) {
    for (const key of ['fragment', 'joiner']) {
      const text = c[key]
      if (!text) continue
      const have = out.find((p) => p.key === key && normalizeForAudio(p.text) === normalizeForAudio(text))
      if (have) have.courseCodes.push(c.courseCode)
      else out.push({ key, text, courseCodes: [c.courseCode] })
    }
  }
  return out
}

/** The stored text of one intro, in the old cym markup. */
function humanIntroText(cfg, lego) {
  const x = String(lego.known_text || '').trim()
  const y = String(lego.target_text || '').trim()
  const joiner = cfg.joiner ? ` ${cfg.joiner}` : ''
  return cfg.withTarget ? `${cfg.fragment} <src>${x}</src>${joiner} <tgt>${y}</tgt>.` : `${cfg.fragment} <src>${x}</src>${joiner}`
}

/** The pieces of one intro in speaking order. `target` carries the clip id, the rest carry the words to find. */
function planHumanIntro(cfg, lego) {
  const pieces = [{ kind: 'fragment', text: cfg.fragment }, { kind: 'x', text: String(lego.known_text || '').trim() }]
  if (cfg.joiner) pieces.push({ kind: 'joiner', text: cfg.joiner })
  if (cfg.withTarget) pieces.push({ kind: 'target', text: String(lego.target_text || '').trim(), audioId: lego.target1_audio_id || null })
  return pieces.map((p) => ({ ...p, gapAfterMs: HUMAN_GAPS_MS[p.kind] }))
}

const sameWords = (a, b) => {
  const want = audioKeyCandidates(normalizeForAudio(String(b || '')))
  return audioKeyCandidates(normalizeForAudio(String(a || ''))).some((k) => want.includes(k))
}
const liveKey = (k) => !!k && !String(k).startsWith('pending/')

/**
 * Is the Welsh piece usable? A HUMAN take (Welsh is human-recorded), with bytes, saying the LEGO's target words.
 * Returns null when it is, else the reason it waits.
 */
function targetWaitReason(clip, lego) {
  if (!lego.target1_audio_id) return 'no Welsh take linked to this LEGO yet'
  if (!clip || !liveKey(clip.s3_key)) return 'the Welsh take has no audio yet'
  if (clip.origin !== 'human') return 'the Welsh clip is not a human take'
  if (!sameWords(clip.text, lego.target_text)) return `the Welsh take says "${clip.text}", not "${lego.target_text}"`
  return null
}

/**
 * Pure: which pieces exist. `takes` maps a normalised-text key → this voice's clip ({id, s3_key, text}); `targetClip` is
 * the LEGO's target1 clip row (or null). Returns { pieces (with .clip), waitingOn: [{kind, text, why}] }.
 */
function resolvePieces(cfg, lego, { takes, targetClip }) {
  const pieces = planHumanIntro(cfg, lego)
  const waitingOn = []
  for (const p of pieces) {
    if (p.kind === 'target') {
      const why = targetWaitReason(targetClip, lego)
      if (why) waitingOn.push({ kind: p.kind, text: p.text, why })
      else p.clip = targetClip
      continue
    }
    if (!p.text) { waitingOn.push({ kind: p.kind, text: p.text, why: 'the LEGO has no English text' }); continue }
    const hit = audioKeyCandidates(normalizeForAudio(p.text)).map((k) => takes.get(k)).find((c) => c && liveKey(c.s3_key))
    if (hit) p.clip = hit
    else waitingOn.push({ kind: p.kind, text: p.text, why: p.kind === 'x' ? 'no English take of the LEGO yet' : 'the once-recorded piece is not recorded yet' })
  }
  return { pieces, waitingOn }
}

/**
 * Build (or dry-run) one human intro.
 * @param {{courseCode, legoId, text?, dryRun?}} req   text, when given, must be the intro this LEGO gets (stale callers refused)
 * @param {object} deps
 *   loadLego(courseCode, legoId) → {lego_id, known_text, target_text, target1_audio_id, presentation_audio_id} | null
 *   findTakes(voiceSpellingsOrId, texts) → Map(normalised key → clip {id, s3_key, text})   this voice's English takes, any course
 *   loadClip(id) → {id, s3_key, text, origin} | null
 *   findIntro(courseCode, text, voiceId) → {id, s3_key} | null       an intro already stored for these words
 *   fetchObject(s3Key) → Buffer;  decode(Buffer) → Float32Array;  join(pcms, gaps) → {pcm};  encode(pcm) → wav Buffer
 *   master(wav, text) → {buffer, durationMs};  store({...}) → {audioId, s3Key}
 *   linkFill(courseCode, legoId, audioId) → {linked:boolean}   fills presentation_audio_id ONLY when it is empty
 * @returns null when the course's intros are not human-spliced (the caller carries on); else the result. Throws
 *   HumanIntroError INTRO_WAITING (409) when a piece is missing, NO_LEGO (404), INTRO_TEXT_MISMATCH (409), NEEDS_LEGO (400).
 */
async function buildHumanIntro(req, deps) {
  const cfg = humanIntroConfig(req.courseCode, deps.table || undefined)
  if (!cfg) return null
  if (!req.legoId) throw new HumanIntroError(`${req.courseCode} intros are spliced from ${cfg.voiceId}'s takes per LEGO — name legoId`, 400, 'NEEDS_LEGO')
  const lego = await deps.loadLego(req.courseCode, req.legoId)
  if (!lego) throw new HumanIntroError(`no LEGO ${req.legoId} in ${req.courseCode}`, 404, 'NO_LEGO')
  const text = humanIntroText(cfg, lego)
  if (req.text && normalizeForAudio(req.text) !== normalizeForAudio(text)) {
    throw new HumanIntroError(`the intro for ${req.legoId} is "${text}", not "${req.text}" — the LEGO changed; re-read it`, 409, 'INTRO_TEXT_MISMATCH', { expected: text })
  }
  const base = { voiceId: cfg.voiceId, legoId: req.legoId, text, charsSpent: 0 }
  if (lego.presentation_audio_id) return { ok: true, source: 'already-linked', ...base, audioId: lego.presentation_audio_id, ...(req.dryRun ? { dryRun: true } : {}) }

  const existing = await deps.findIntro(req.courseCode, text, cfg.voiceId)
  if (existing) {
    if (req.dryRun) return { ok: true, source: 'library', dryRun: true, ...base, audioId: existing.id }
    const { linked } = await deps.linkFill(req.courseCode, req.legoId, existing.id)
    return { ok: true, source: 'library', ...base, audioId: existing.id, s3Key: existing.s3_key, legoLinked: !!linked }
  }

  // SPLICE OFF (job #587): the intro is his whole-sentence take or nothing — it waits on the Introductions card.
  if (!cfg.splice) {
    const waitingOn = [{ kind: 'sentence', text, why: `no whole-sentence take yet (the Introductions card on ${cfg.voiceId}'s booth)` }]
    throw new HumanIntroError(`${req.legoId} waits on its whole-sentence intro take "${text}"`, 409, 'INTRO_WAITING', { waitingOn })
  }
  const planned = planHumanIntro(cfg, lego)
  const takes = await deps.findTakes(cfg.voiceId, planned.filter((p) => p.kind !== 'target').map((p) => p.text).filter(Boolean))
  const targetClip = cfg.withTarget && lego.target1_audio_id ? await deps.loadClip(lego.target1_audio_id) : null
  const { pieces, waitingOn } = resolvePieces(cfg, lego, { takes, targetClip })
  if (waitingOn.length) {
    throw new HumanIntroError(`${req.legoId} waits on: ${waitingOn.map((w) => `${w.kind} "${w.text}" (${w.why})`).join('; ')}`, 409, 'INTRO_WAITING', { waitingOn })
  }
  const shown = pieces.map((p) => ({ kind: p.kind, text: p.text, audioId: p.clip.id }))
  if (req.dryRun) return { ok: true, source: 'would-splice', dryRun: true, ...base, pieces: shown }

  const pcms = []
  for (const p of pieces) pcms.push(await deps.decode(await deps.fetchObject(p.clip.s3_key)))
  const { pcm } = deps.join(pcms, pieces.map((p) => p.gapAfterMs))
  const mastered = await deps.master(deps.encode(pcm), text)
  const splicedFrom = pieces.map((p) => ({ kind: p.kind, text: p.text, audio_id: p.clip.id, rendered_now: false }))
  const stored = await deps.store({ courseCode: req.courseCode, text, legoId: req.legoId, voiceId: cfg.voiceId, buffer: mastered.buffer, durationMs: mastered.durationMs, splicedFrom })
  const { linked } = await deps.linkFill(req.courseCode, req.legoId, stored.audioId)
  return { ok: true, source: 'human-spliced', ...base, durationMs: mastered.durationMs, ...stored, legoLinked: !!linked, pieces: shown }
}

module.exports = {
  HUMAN_GAPS_MS, HumanIntroError, humanIntroConfig, humanIntroCoursesFor, fixedPiecesFor, humanIntroText, planHumanIntro,
  resolvePieces, targetWaitReason, buildHumanIntro,
}
