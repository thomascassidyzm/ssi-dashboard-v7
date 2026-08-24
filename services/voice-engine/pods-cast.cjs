/**
 * pods-cast.cjs — pure logic for the pod human-recording CAST
 * (keystone: docs/voice-engine/design/pods-recording-model.md §1).
 *
 * The cast maps pod SPEAKER characters → human voices and lives ADDITIVELY in
 * courses.voice_config.podCast:
 *
 *   { "podCast": { "<speakerName>": { "voiceId": "human_catrin_cym",
 *                                     "name": "Catrin", "email": "..." } } }
 *
 * voice_config drives LIVE TTS SERVING via voices.* — podCast is an additive
 * key serving never reads (same safety contract as the roster's
 * previousVoice). Every transform here is SURGICAL, exactly like
 * voice-slots.cjs slot merges: deep-clone, touch only the podCast entries
 * being written, preserve every other key byte-for-byte.
 *
 * The EXPLAINER voice is its own cast entry under the reserved key
 * "__explainer__". It carries the KNOWN-LANGUAGE (English) lines. It used to
 * also carry explainer narration; that workload was deprecated 2026-08-24 and
 * the cast key survives for the known-language leg alone.
 *
 * Pure module — no DB, no I/O. Vocabulary: known / target / seed.
 */

'use strict'

const { canonicalSpeakerName, extractGenderMarker, proposeHumanCast } = require('../../tools/pod-voice-colour-n.cjs')
const { emailLocalPart, targetLangFromCourseCode } = require('./voice-slots.cjs')

/** Reserved cast key for the explainer voice (keystone §1). */
const EXPLAINER_SPEAKER = '__explainer__'

/**
 * How many human voices a pod cast holds (Tom, voice note 2026-08-06):
 *
 *   "the whole point of doing this in this way was that we could get by with
 *    just two different voices, a male voice and a female voice […] probably
 *    do it for two voices as the default. And then if you want to try it with
 *    three or four voices because you do have additional human voice
 *    recorders, then fantastic, we can do that."
 *
 * So two is the DEFAULT — what a course gets without anyone configuring
 * anything — and three or four is an OPT-IN UPGRADE for courses that genuinely
 * have extra recorders. It is never a requirement and never a prerequisite for
 * recording. Ceiling is five: the solver already handles it and the extra room
 * costs nothing, but nothing here enforces ceremony to reach it.
 *
 * The governing principle behind the numbers, same voice note: "If we are
 * making it a lot more complicated to even get the recordings done, it's going
 * to be harder for people to do community courses, isn't it?"
 */
const DEFAULT_POD_VOICES = 2
const MAX_POD_VOICES = 5

/**
 * The cast rows a course starts from when nobody has configured anything:
 * two voices, one female and one male, genders pre-set so the default path
 * never asks a community leader how many voices a pod needs. Roster humans
 * already holding the course prefill the names/emails when they exist.
 *
 * @param {{rosterVoices?: Array<{name?:string, email?:string}>}} [args]
 * @returns {Array<{name:string, email:string, gender:'f'|'m', guide:boolean}>}
 */
function defaultCastPeople({ rosterVoices = [] } = {}) {
  const rows = [
    { name: '', email: '', gender: 'f', guide: false },
    { name: '', email: '', gender: 'm', guide: false },
  ]
  ;(rosterVoices || []).slice(0, DEFAULT_POD_VOICES).forEach((v, i) => {
    if (!v) return
    rows[i].name = v.name || ''
    rows[i].email = v.email || ''
  })
  return rows
}

/**
 * Is this a castable set of people? Two is the default; three to five is the
 * opt-in upgrade. Every size needs at least one female and one male voice —
 * with only those voices covering every character, a cast missing a gender
 * leaves characters with nobody to read them.
 *
 * Returns leader-facing language, not engineer language: community leaders
 * read these messages.
 *
 * @param {Array} people - raw rows from the panel
 * @returns {{ok:true}|{ok:false, error:string}}
 */
function validateCastPeople(people) {
  if (!Array.isArray(people) || people.length === 0) {
    return { ok: false, error: 'Send at least two people — one male voice and one female voice.' }
  }
  if (people.length < DEFAULT_POD_VOICES) {
    return {
      ok: false,
      error: 'Pods are cast with two voices — one male, one female. Send both.',
    }
  }
  if (people.length > MAX_POD_VOICES) {
    return {
      ok: false,
      error: `Two voices is the default and ${MAX_POD_VOICES} is as many as a pod cast holds — ` +
        `you sent ${people.length}.`,
    }
  }
  const genders = people.map(p => String((p && p.gender) || '').trim().toLowerCase())
  if (!genders.includes('f') || !genders.includes('m')) {
    return {
      ok: false,
      error: 'Every cast needs a male voice and a female voice, so every character has someone to read it.',
    }
  }
  return { ok: true }
}

/** Deep-clone helper (voice_config objects are plain JSON). */
function clone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj))
}

/**
 * Speaking-time heuristic — single source is pods-plan.cjs#estimateSeconds.
 * Lazy require: pods-plan requires THIS module at its top level, so a
 * top-level require back would create a CJS cycle with half-built exports.
 */
function estimateItemSeconds(text) {
  return require('./pods-plan.cjs').estimateSeconds(text)
}
/** Continuation rows of a glue chain add reading time but no per-item overhead. */
function continuationSeconds(text) {
  return estimateItemSeconds(text) - estimateItemSeconds('')
}

/**
 * Surgically merge cast updates into a voice_config. NON-DESTRUCTIVE:
 * - returns a new object; the input is never mutated
 * - every key outside voice_config.podCast is preserved exactly
 * - inside podCast, only the speakers named in `updates` change; existing
 *   entry keys not named in the update are preserved (mirror of
 *   assignVoiceToSlot's inside-the-slot behaviour)
 * - `updates[speaker] = null` removes that speaker's cast entry
 *
 * @param {object|null} voiceConfig - raw courses.voice_config (may be null)
 * @param {Object<string, {voiceId:string, name?:string|null, email?:string|null}|null>} updates
 * @returns {object} new voice_config
 */
function mergePodCast(voiceConfig, updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new Error('mergePodCast: updates must be an object of speaker → entry|null')
  }
  const config = clone(voiceConfig) || {}
  if (!config.podCast || typeof config.podCast !== 'object') config.podCast = {}

  for (const [speaker, entry] of Object.entries(updates)) {
    if (!speaker || !speaker.trim()) throw new Error('mergePodCast: empty speaker name')
    if (entry === null) {
      delete config.podCast[speaker]
      continue
    }
    if (!entry || typeof entry !== 'object' || typeof entry.voiceId !== 'string' || !entry.voiceId.trim()) {
      throw new Error(`mergePodCast: entry for "${speaker}" needs a voiceId (or null to remove)`)
    }
    const existing = config.podCast[speaker] || {}
    const next = { ...existing, voiceId: entry.voiceId.trim() }
    // name/email/gender: only touched when present in the update; empty string
    // clears. (gender is the leader's SOFT f/m preference for the person —
    // ridden through so the people-first panel can prefill on reload.)
    for (const key of ['name', 'email', 'gender']) {
      if (key in entry) {
        if (entry[key]) next[key] = String(entry[key])
        else delete next[key]
      }
    }
    config.podCast[speaker] = next
  }
  return config
}

/**
 * Resolve the cast entry for a raw sentence speaker (variants like
 * "Neighbour (8 am)" collapse to their canonical character).
 * @returns {{voiceId:string, name?:string, email?:string}|null}
 */
function castVoiceFor(podCast, rawSpeaker) {
  if (!podCast || typeof podCast !== 'object') return null
  const canon = canonicalSpeakerName(rawSpeaker)
  if (!canon) return null
  if (podCast[canon] && podCast[canon].voiceId) return podCast[canon]
  // Raw-name fallback for casts keyed before canonicalisation.
  if (podCast[rawSpeaker] && podCast[rawSpeaker].voiceId) return podCast[rawSpeaker]
  return null
}

/**
 * Character inventory across a course's pods: who appears, how many recording
 * items each carries, plus the __explainer__ cast entry's workload — which is
 * the KNOWN-LANGUAGE lines and nothing else. (Explainer narration was
 * deprecated 2026-08-24: no longer counted, planned or recorded.)
 *
 * Line counting matches the recording plan: a glue chain (glue_to_next) by
 * one character is ONE item. Gender resolution per recon §4: the pods'
 * generation-side speakers entry wins, then explicit (F)/(M)/(N) markers.
 *
 * @param {{pods:Array, sentences:Array}} args
 *   pods: listening_pods rows ({ id, speakers }) — speakers jsonb optional
 *   sentences: listening_pod_sentences rows across those pods
 * @returns {{
 *   speakers: Array<{speaker:string, gender:string, variants:string[],
 *                    lineCount:number, podIds:string[]}>,
 *   explainer: { knownLines:number, estimatedSeconds:number },
 * }}
 */
function speakerInventory({ pods, sentences }) {
  const rows = [...(sentences || [])].sort((a, b) =>
    a.pod_id < b.pod_id ? -1 : a.pod_id > b.pod_id ? 1 : (a.global_order || 0) - (b.global_order || 0))

  // Generation-side gender (listening_pods.speakers[canon].gender), any pod.
  const genderFromPods = new Map()
  for (const pod of pods || []) {
    const sp = pod && pod.speakers
    if (!sp || typeof sp !== 'object') continue
    for (const [canon, entry] of Object.entries(sp)) {
      if (canon === '_default') continue
      const g = entry && entry.gender
      if ((g === 'f' || g === 'm') && !genderFromPods.has(canon)) genderFromPods.set(canon, g)
    }
  }

  const byCanon = new Map()
  let knownLines = 0
  let explainerSeconds = 0   // the __explainer__ voice's sitting = known lines only
  let prev = null
  for (const s of rows) {
    const canon = canonicalSpeakerName(s.speaker)
    const continuesGlue = prev && prev.pod_id === s.pod_id && prev.glue_to_next === true &&
      canonicalSpeakerName(prev.speaker) === canon
    const knownText = (s.known_text || '').trim()
    if (knownText) {
      if (!continuesGlue) knownLines++
      explainerSeconds += continuesGlue ? continuationSeconds(knownText) : estimateItemSeconds(knownText)
    }
    if (canon) {
      if (!byCanon.has(canon)) byCanon.set(canon, { variants: new Set(), lineCount: 0, podIds: new Set(), seconds: 0 })
      const rec = byCanon.get(canon)
      rec.variants.add(s.speaker)
      rec.podIds.add(s.pod_id)
      if (!continuesGlue) rec.lineCount++
      const targetText = (s.target_text || '').trim()
      rec.seconds += continuesGlue ? continuationSeconds(targetText) : estimateItemSeconds(targetText)
    }
    prev = s
  }

  const speakers = [...byCanon.entries()].map(([canon, rec]) => {
    let gender = genderFromPods.get(canon) || null
    if (!gender) {
      for (const v of rec.variants) {
        const marked = extractGenderMarker(v)
        if (marked) { gender = marked; break }
      }
    }
    return {
      speaker: canon,
      gender: gender || 'n',
      variants: [...rec.variants],
      lineCount: rec.lineCount,
      podIds: [...rec.podIds],
      estimatedSeconds: Math.round(rec.seconds * 10) / 10,
    }
  }).sort((a, b) => b.lineCount - a.lineCount || (a.speaker < b.speaker ? -1 : 1))

  return {
    speakers,
    explainer: { knownLines, estimatedSeconds: Math.round(explainerSeconds * 10) / 10 },
  }
}

/**
 * Does any pod carry generation-side slot colouring in listening_pods.speakers?
 * (Keystone addendum 2026-06-11: when it does, the casting UI and recording
 * plan CONSUME it verbatim — the solver is only a fallback.)
 */
function hasGenerationColouring(pods) {
  for (const pod of pods || []) {
    const sp = pod && pod.speakers
    if (!sp || typeof sp !== 'object') continue
    for (const [canon, entry] of Object.entries(sp)) {
      if (canon === '_default') continue
      if (entry && entry.target && entry.target.voice_id) return true
    }
  }
  return false
}

/**
 * Build the update patch for a community script edit (pre- or post-recording).
 * Editing a line clears THAT line's audio pointer so the recording plan
 * resurfaces it (recorded=false) and TTS refills stay null-only — the old
 * audio ROW is never deleted (origin guard keeps human takes; provenance
 * keeps history).
 *
 * explainer_text is NOT editable (deprecated 2026-08-24): the column and its
 * existing rows stay exactly as they are, they simply stop being written.
 * Returns null when the body carries nothing editable.
 */
function buildSentenceEditPatch(body = {}) {
  const patch = {}
  if (typeof body.target_text === 'string') {
    patch.target_text = body.target_text.trim()
    patch.target_audio_id = null
    // A human editing the target line IS the proofread a draft was waiting for,
    // so the DRAFT marker comes off in the same update (Tom 2026-08-06: "opus
    // drafts, Aran proofreads" — this is the gate closing).
    patch.target_text_draft = false
    // An approval is bound to the WORDS it approved (A-109, 2026-08-16). Clearing
    // the draft flag already makes this line renderable, so this is not what
    // unblocks it — it stops a verdict about the OLD text outliving that text.
    // Without it, target_text_review would name words that no longer exist, and
    // anything that later re-marked the line a draft would find it silently
    // pre-approved on someone else's say-so.
    patch.target_text_approved_at = null
    patch.target_text_approved_by = null
    patch.target_text_review = null
  }
  if (typeof body.known_text === 'string') {
    patch.known_text = body.known_text.trim()
    patch.known_audio_id = null
  }
  return Object.keys(patch).length ? patch : null
}

// ---------------------------------------------------------------------------
// PEOPLE-FIRST CASTING (Tom's design 2026-06-11): the leader declares WHO can
// record — { name, gender (soft f/m preference), email (optional) } — and the
// solver works out the parts. The number of actual voice actors drives the
// colouring; generation-side colouring is demoted to a default suggestion
// (keystone addendum, softened 2026-06-11).
// ---------------------------------------------------------------------------

/** Sanitised slug from a person's display name: "Siân O'Neil" → "si_n_o_neil". */
function nameSlug(name) {
  const slug = String(name || '').replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()
  return slug || 'voice'
}

/**
 * Validate + normalise the leader's people rows.
 * Each person needs a name or an email; gender is SOFT — anything outside
 * f/m collapses to null (no preference). `guide: true` marks the bilingual
 * guide row. Throws on an empty/invalid list (router 400s).
 */
function normalizePeople(people) {
  if (!Array.isArray(people) || people.length === 0) {
    throw new Error('people must be a non-empty array of { name, gender?, email?, guide? }')
  }
  return people.map((p, i) => {
    const name = String((p && p.name) || '').trim()
    const email = String((p && p.email) || '').trim().toLowerCase()
    if (!name && !email) throw new Error(`person ${i + 1} needs a name or an email`)
    const g = String((p && p.gender) || '').trim().toLowerCase()
    return {
      name: name || email.split('@')[0],
      email: email || null,
      gender: g === 'f' || g === 'm' ? g : null,
      guide: !!(p && p.guide),
    }
  })
}

/**
 * Mint a human voice id per person, per the voice-slots convention:
 *   human_{email-localpart-or-name-slug}_{target lang}, collision-suffixed.
 *
 * Stability across re-solves: a person whose EMAIL already holds a voiceId in
 * the saved podCast keeps that id (their recorded takes stay theirs); ids
 * already saved for OTHER emails are never re-minted onto someone else.
 *
 * @param {object} args
 * @param {Array} args.people - normalised people (normalizePeople output)
 * @param {string} args.courseCode
 * @param {object|null} [args.existingCast] - saved voice_config.podCast
 * @returns {Array} people, each with a `voiceId` added
 */
function mintPeopleVoiceIds({ people, courseCode, existingCast = null }) {
  const targetLang = targetLangFromCourseCode(courseCode)
  const savedByEmail = new Map()   // email → voiceId (first entry wins)
  const savedTaken = new Map()     // voiceId → email|null (reserved for that person)
  for (const entry of Object.values(existingCast || {})) {
    if (!entry || !entry.voiceId) continue
    const email = entry.email ? String(entry.email).toLowerCase() : null
    if (email && !savedByEmail.has(email)) savedByEmail.set(email, entry.voiceId)
    if (!savedTaken.has(entry.voiceId)) savedTaken.set(entry.voiceId, email)
  }

  const taken = new Set()
  return people.map(person => {
    let voiceId = person.email ? savedByEmail.get(person.email) : null
    if (!voiceId || taken.has(voiceId)) {
      const local = person.email ? emailLocalPart(person.email) : nameSlug(person.name)
      const base = `human_${local}_${targetLang}`
      voiceId = base
      let n = 1
      // Taken = already minted in this pool, or saved in the cast for a
      // DIFFERENT person's email (never silently adopt someone else's takes).
      const isTaken = (id) =>
        taken.has(id) || (savedTaken.has(id) && savedTaken.get(id) !== person.email)
      while (isTaken(voiceId)) {
        n += 1
        if (n > 1000) throw new Error(`Could not mint a unique voice id from ${base}`)
        voiceId = `${base}_${n}`
      }
    }
    taken.add(voiceId)
    return { ...person, voiceId }
  })
}

/**
 * PEOPLE-FIRST cast proposal: who plays which characters, line counts,
 * estimated minutes, plain-language warnings, and feasibility.
 *
 * The pool handed to proposeHumanCast is built FROM the people (voice ids
 * minted per the voice-slots convention); gender stays soft (mismatches are
 * reported, never blocking); doubling — one person playing several
 * characters, or the guide also voicing dialogue — is allowed.
 *
 * @param {object} args
 * @param {Array} args.people - raw rows from the panel: { name, gender?, email?, guide? }
 * @param {Array} args.sentences - listening_pod_sentences rows across all pods
 * @param {string} args.courseCode
 * @param {Object<string,'f'|'m'|'n'>} [args.genderBySpeaker] - character genders
 * @param {object|null} [args.existingCast] - saved voice_config.podCast (id stability)
 * @param {{knownLines:number, estimatedSeconds:number}|null}
 *   [args.explainerWorkload] - from speakerInventory().explainer (known lines)
 *
 * @returns {{
 *   people: Array,            // normalised, each with voiceId
 *   assignments: Array<{name, email, gender, voiceId, characters:string[],
 *                       lineCount:number, estimatedMinutes:number,
 *                       isGuide:boolean, guideSuggested:boolean}>,
 *   podCast: object,          // speaker → {voiceId,name,email,gender} incl. __explainer__ — ready for PUT /cast
 *   warnings: Array<{type:string, message:string}>,
 *   feasibility: { minimumActors:number, collisions:{count:number, pairs:number,
 *                  turns:number, details:Array} },
 *   explainer: { person:string|null, suggested:boolean, knownLines:number,
 *                estimatedMinutes:number },
 *   report: object,           // raw solver report (solver-literate callers)
 * }}
 */
function proposePeopleCast({
  people,
  sentences,
  courseCode,
  genderBySpeaker = null,
  existingCast = null,
  explainerWorkload = null,
}) {
  const normalized = normalizePeople(people)
  const pool = mintPeopleVoiceIds({ people: normalized, courseCode, existingCast })
  const personByVoiceId = new Map(pool.map(p => [p.voiceId, p]))

  const { castBySpeaker, report } = proposeHumanCast({
    sentences,
    voices: pool.map(p => ({ voiceId: p.voiceId, name: p.name, email: p.email, gender: p.gender })),
    genderBySpeaker,
  })

  // Feasibility: the smallest pool with NO forced same-scene reuse — probe
  // neutral synthetic pools of growing size (the solver load-balances, so its
  // voicesUsed over-counts; "first N with zero forced" is the honest answer).
  // Character counts per course are tiny, so this stays cheap.
  const characterCount = Object.keys(castBySpeaker).length
  let minimumActors = 0
  for (let n = 1; n <= characterCount; n++) {
    const synthetic = Array.from({ length: n }, (_, i) => ({
      voiceId: `feasibility_probe_${i + 1}`, gender: null,
    }))
    if (proposeHumanCast({ sentences, voices: synthetic }).report.forced.length === 0) {
      minimumActors = n
      break
    }
  }

  // Per-character estimated seconds (target lines, glue chains = one item).
  const secondsBySpeaker = new Map()
  for (const sp of speakerInventory({ pods: [], sentences }).speakers) {
    secondsBySpeaker.set(sp.speaker, sp.estimatedSeconds)
  }

  // Per-person dialogue allocation.
  const assignments = pool.map(person => {
    const characters = Object.entries(castBySpeaker)
      .filter(([, entry]) => entry.voiceId === person.voiceId)
      .map(([speaker]) => speaker)
      .sort((a, b) => (secondsBySpeaker.get(b) || 0) - (secondsBySpeaker.get(a) || 0))
    const lineCount = characters.reduce((sum, sp) => sum + (report.lineCounts.bySpeaker[sp] || 0), 0)
    const seconds = characters.reduce((sum, sp) => sum + (secondsBySpeaker.get(sp) || 0), 0)
    return {
      name: person.name,
      email: person.email,
      gender: person.gender,
      voiceId: person.voiceId,
      characters,
      lineCount,
      estimatedMinutes: Math.round((seconds / 60) * 10) / 10,
      isGuide: false,
      guideSuggested: false,
      _seconds: seconds,
    }
  })

  // The bilingual guide (__explainer__): the leader's marked row wins;
  // default suggestion is the lightest-loaded person. Doubling with a
  // dialogue voice is ALLOWED (a distinct voice is just nicer).
  const markedIdx = pool.findIndex(p => p.guide)
  let guideIdx = markedIdx
  if (guideIdx < 0 && assignments.length) {
    guideIdx = assignments.reduce((best, a, i) =>
      a._seconds < assignments[best]._seconds ? i : best, 0)
  }
  const exWork = explainerWorkload || { knownLines: 0, estimatedSeconds: 0 }
  if (guideIdx >= 0) {
    assignments[guideIdx].isGuide = true
    assignments[guideIdx].guideSuggested = markedIdx < 0
    assignments[guideIdx].estimatedMinutes =
      Math.round(((assignments[guideIdx]._seconds + (exWork.estimatedSeconds || 0)) / 60) * 10) / 10
  }
  for (const a of assignments) delete a._seconds

  // The saveable cast: every character entry + the guide's __explainer__.
  const podCast = {}
  for (const [speaker, entry] of Object.entries(castBySpeaker)) {
    const person = personByVoiceId.get(entry.voiceId)
    podCast[speaker] = {
      voiceId: entry.voiceId,
      name: person ? person.name : entry.name,
      email: (person && person.email) || null,
      gender: (person && person.gender) || null,
    }
  }
  if (guideIdx >= 0) {
    const guide = pool[guideIdx]
    podCast[EXPLAINER_SPEAKER] = {
      voiceId: guide.voiceId, name: guide.name, email: guide.email || null, gender: guide.gender || null,
    }
  }

  // Plain-language warnings — community leaders read these, not engineers.
  const warnings = []
  if (report.forced.length > 0) {
    const short = Math.max(1, minimumActors - pool.length)
    warnings.push({
      type: 'need-more-people',
      message: `You need ${short} more ${short === 1 ? 'person' : 'people'} — with ${pool.length}, ` +
        `${report.forced.length} ${report.forced.length === 1 ? 'character' : 'characters'} would share a voice ` +
        `with someone they talk to, so those exchanges would talk to themselves. ` +
        `These dialogues need at least ${minimumActors} different voices.`,
    })
  }
  for (const mm of report.genderMismatches) {
    // mm.voice is the solver's display handle (person name, else voice id).
    const person = pool.find(p => p.name === mm.voice || p.voiceId === mm.voice)
    const personName = (person && person.name) || mm.voice
    warnings.push({
      type: 'gender-mismatch',
      message: `${mm.speaker} reads as ${mm.speakerGender === 'f' ? 'female' : 'male'} but would be ` +
        `voiced by ${personName} — absolutely fine if you're happy with it.`,
    })
  }
  const guideAssignment = guideIdx >= 0 ? assignments[guideIdx] : null
  if (guideAssignment && guideAssignment.characters.length > 0) {
    warnings.push({
      type: 'guide-doubles',
      message: `${guideAssignment.name} is the bilingual guide and also plays ` +
        `${guideAssignment.characters.join(', ')} — that works fine, though a separate ` +
        `voice for the guide is nicer when you have someone spare.`,
    })
  }

  return {
    people: pool,
    assignments,
    podCast,
    warnings,
    feasibility: {
      minimumActors,
      collisions: {
        count: report.forced.length,
        pairs: report.adjacentCollisions.pairs,
        turns: report.adjacentCollisions.turns,
        details: report.forced,
      },
    },
    explainer: {
      person: guideIdx >= 0 ? pool[guideIdx].name : null,
      suggested: guideIdx >= 0 && markedIdx < 0,
      knownLines: exWork.knownLines || 0,
      estimatedMinutes: Math.round(((exWork.estimatedSeconds || 0) / 60) * 10) / 10,
    },
    report,
  }
}

// ---------------------------------------------------------------------------
// LEGACY-CAST COLLAPSE (two-voice rule, founder ruling 2026-07-17). Casts
// saved before the rule split the SAME two humans across version-suffixed
// identities ("Aran"/"Aranv2"/"Aranv3"). Collapse them into one voice per
// gender so the panel shows exactly two people and the DB stops accumulating
// versions. Dropped ids come back as ALIASES of their survivor so old record
// links keep resolving and already-recorded takes still count as recorded.
// ---------------------------------------------------------------------------

/** "Aranv2" / "aran_v3" → "aran" — the version-suffix stem of a display name. */
function nameVersionStem(name) {
  return String(name || '').toLowerCase().replace(/[\s_-]*v\d+$/, '').trim()
}

/**
 * Collapse a legacy multi-identity podCast into one voice per gender.
 * Pure — no DB, no I/O. No-op ({ changed: false }) when the cast already
 * holds two or fewer distinct voiceIds.
 *
 * Gender per voiceId: any entry's explicit f/m wins; else the lineCount-
 * weighted majority gender of the characters it plays; else the gender of a
 * resolved voiceId whose name shares its version stem (Aranv3 → Aran).
 * Survivor per gender: most recorded human takes (takesByVoiceId), then most
 * lines, then has-email, then first seen — the link people are actually
 * using is the one that survives.
 * VoiceIds whose gender cannot be resolved are left untouched and reported
 * in `unresolved` — never guess a voice onto the wrong person.
 *
 * @param {object} args
 * @param {object} args.podCast - voice_config.podCast (speaker → entry)
 * @param {Array}  [args.speakers] - speakerInventory().speakers (gender + lineCount)
 * @param {Object<string, number>} [args.takesByVoiceId] - recorded human takes per voiceId
 * @returns {{ changed:boolean, podCast:object, aliases:Object<string,string[]>,
 *             dropped:string[], unresolved:string[] }}
 */
function collapseTwoVoiceCast({ podCast, speakers = [], takesByVoiceId = {} }) {
  const cast = podCast && typeof podCast === 'object' ? podCast : {}
  const bySpeaker = new Map(speakers.map(s => [s.speaker, s]))

  // Gather the distinct voice identities and what each plays.
  const voices = new Map() // voiceId → { entry, speakers:[], lines, f, m }
  for (const [speaker, entry] of Object.entries(cast)) {
    if (!entry || !entry.voiceId) continue
    if (!voices.has(entry.voiceId)) {
      voices.set(entry.voiceId, { entry, speakers: [], lines: 0, f: 0, m: 0 })
    }
    const v = voices.get(entry.voiceId)
    // The identity's face keeps the first entry's name; email/gender fill in
    // from whichever entry carries them.
    if (entry.email && !v.entry.email) v.entry = { ...v.entry, email: entry.email }
    if (entry.gender && !v.entry.gender) v.entry = { ...v.entry, gender: entry.gender }
    v.speakers.push(speaker)
    if (speaker === EXPLAINER_SPEAKER) continue // guide lines carry no character gender
    const sp = bySpeaker.get(speaker)
    const weight = (sp && sp.lineCount) || 1
    v.lines += weight
    if (sp && sp.gender === 'f') v.f += weight
    if (sp && sp.gender === 'm') v.m += weight
  }
  if (voices.size <= 2) {
    return { changed: false, podCast: cast, aliases: {}, dropped: [], unresolved: [] }
  }

  // Resolve a gender for each identity.
  const genderOf = new Map()
  for (const [voiceId, v] of voices) {
    const explicit = String(v.entry.gender || '').toLowerCase()
    if (explicit === 'f' || explicit === 'm') genderOf.set(voiceId, explicit)
    else if (v.f !== v.m) genderOf.set(voiceId, v.f > v.m ? 'f' : 'm')
  }
  // Version-stem fallback: adopt the gender of a resolved same-stem sibling.
  for (const [voiceId, v] of voices) {
    if (genderOf.has(voiceId)) continue
    const stem = nameVersionStem(v.entry.name || voiceId)
    if (!stem) continue
    for (const [otherId, other] of voices) {
      if (otherId === voiceId || !genderOf.has(otherId)) continue
      if (nameVersionStem(other.entry.name || otherId) === stem) {
        genderOf.set(voiceId, genderOf.get(otherId))
        break
      }
    }
  }

  // Pick one survivor per gender.
  const survivorOf = {} // gender → voiceId
  for (const gender of ['f', 'm']) {
    const bucket = [...voices.keys()].filter(id => genderOf.get(id) === gender)
    if (!bucket.length) continue
    bucket.sort((a, b) =>
      (takesByVoiceId[b] || 0) - (takesByVoiceId[a] || 0) ||
      voices.get(b).lines - voices.get(a).lines ||
      (voices.get(b).entry.email ? 1 : 0) - (voices.get(a).entry.email ? 1 : 0))
    survivorOf[gender] = bucket[0]
  }

  // Rewrite every speaker in a resolved bucket to its survivor's identity.
  const newCast = {}
  const aliases = {}
  const dropped = []
  const unresolved = []
  for (const [voiceId, v] of voices) {
    const gender = genderOf.get(voiceId)
    const survivorId = gender && survivorOf[gender]
    if (!survivorId) {
      unresolved.push(voiceId)
      for (const speaker of v.speakers) newCast[speaker] = cast[speaker]
      continue
    }
    const sv = voices.get(survivorId)
    // The survivor keeps its own name; email falls back to any in the bucket.
    const email = sv.entry.email ||
      [...voices.keys()].filter(id => genderOf.get(id) === gender)
        .map(id => voices.get(id).entry.email).find(Boolean) || null
    for (const speaker of v.speakers) {
      newCast[speaker] = {
        voiceId: survivorId,
        name: sv.entry.name || survivorId,
        ...(email ? { email } : {}),
        gender,
      }
    }
    if (voiceId !== survivorId) {
      dropped.push(voiceId)
      ;(aliases[survivorId] = aliases[survivorId] || []).push(voiceId)
    }
  }

  return { changed: dropped.length > 0, podCast: newCast, aliases, dropped, unresolved }
}

/**
 * Fold a fresh collapse's aliases into any previously-saved ones. An old
 * survivor that has now itself been dropped hands its alias list on to the
 * new survivor, so every historic record link stays one hop from a live id.
 */
function mergeCastAliases(oldAliases, newAliases) {
  const merged = {}
  const ownerOf = {}
  for (const [survivor, list] of Object.entries(newAliases || {})) {
    merged[survivor] = [...list]
    for (const id of list) ownerOf[id] = survivor
  }
  for (const [survivor, list] of Object.entries(oldAliases || {})) {
    const target = ownerOf[survivor] || survivor
    merged[target] = merged[target] || []
    for (const id of list || []) {
      if (id !== target && !merged[target].includes(id)) merged[target].push(id)
    }
  }
  return merged
}

// ---------------------------------------------------------------------------
// AUTO-PROVISIONING decision (pure): what PUT /cast should do for a cast
// entry that carries an email. The row shape for 'create' mirrors the
// invite-redeem endpoint exactly (production-api.cjs
// POST /api/auth/invite-codes/redeem) — no invite code involved.
// ---------------------------------------------------------------------------

/**
 * Decide how to provision dashboard access for a cast member.
 *
 * NEVER-DOWNGRADE CONTRACT: an existing user's role and voice_id are never
 * touched (an admin stays admin, an editor stays editor); courses '*' (admin
 * all-access) is left alone; only a concrete courses[] array missing this
 * course gains it. Unrecognised courses shapes are left untouched (no-op) —
 * provisioning must never make access narrower or weirder than it found it.
 *
 * @param {{email?:string, role?:string, courses?:any}|null} existingRow
 *   dashboard_users row for the email, or null when none exists
 * @param {string} courseCode
 * @returns {{action:'create'}|{action:'add-course', courses:string[]}|{action:'no-op', reason:string}}
 */
function provisionPlanFor(existingRow, courseCode) {
  if (!courseCode || typeof courseCode !== 'string') {
    throw new Error('provisionPlanFor: courseCode required')
  }
  if (!existingRow) return { action: 'create' }
  const courses = existingRow.courses
  if (courses === '*') return { action: 'no-op', reason: 'holds-all-courses' }
  if (Array.isArray(courses)) {
    if (courses.includes(courseCode)) return { action: 'no-op', reason: 'already-holds-course' }
    return { action: 'add-course', courses: [...courses, courseCode] }
  }
  return { action: 'no-op', reason: 'unrecognised-courses-shape' }
}

module.exports = {
  EXPLAINER_SPEAKER,
  DEFAULT_POD_VOICES,
  MAX_POD_VOICES,
  defaultCastPeople,
  validateCastPeople,
  mergePodCast,
  castVoiceFor,
  speakerInventory,
  hasGenerationColouring,
  buildSentenceEditPatch,
  // people-first casting + auto-provisioning
  normalizePeople,
  nameSlug,
  mintPeopleVoiceIds,
  proposePeopleCast,
  provisionPlanFor,
  collapseTwoVoiceCast,
  mergeCastAliases,
}
