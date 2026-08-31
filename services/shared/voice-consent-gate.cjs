/**
 * VOICE CONSENT GATE — a voice with no recorded consent is not used. Anywhere.
 *
 * Tom's ruling, 2026-08-31, on the Voice Lab consent flow:
 *
 *   "we are never going to use a voice without consent"
 *
 * and, in the same breath, that this is a STANDING PRINCIPLE and not a screen:
 * a voice with no valid recorded consent must be REFUSED, not warned about.
 *
 * ── WHAT CHANGED, AND WHY IT NEEDED A MODULE ────────────────────────────────
 * The 2026-08-31 consent flow recorded consent and DESCRIBED it. Its own
 * comments say so out loud: "Casting is deliberately NOT blocked — a hard block
 * is Tom's call and he has not made it — so the warning is the whole of the
 * protection". He has now made it. A warning is protection only while somebody
 * is reading, and the render path has no reader at all: a cloned voice reaches
 * a learner from a cron job at three in the morning.
 *
 * So the refusal has to live where the DECISIONS are, not where the pixels are,
 * and it has to be the same refusal in every one of them. That is this file.
 * It is required by:
 *   - services/voicelab/router.cjs   the cast-writing endpoint (409, no write)
 *   - services/tts-service.cjs       generate(), the one switch every provider
 *                                    path passes through (403, never retried)
 * and it is deliberately the ONLY answer to "may this voice speak?", for the
 * same reason services/voicelab/consent.cjs is the only answer to "what is this
 * voice's consent state": a second, quieter answer growing in a component is
 * exactly how warning-only came back.
 *
 * ── WHICH VOICES THIS IS EVEN ABOUT ─────────────────────────────────────────
 * A vendor's stock voice has no person behind it to ask. Refusing all 290 Azure
 * and Cartesia catalogue rows would not protect anybody and would stop the
 * estate rendering anything, so the gate applies exactly where the consent
 * question is REAL — voice-personhood.requiresConsent(): a clone this estate
 * made from somebody, or a voice with a person named on it.
 *
 * NOT a recordist's own recordings. Tom's ruling, 2026-08-31: "gate anything
 * CLONED from a person's voice; do not gate a person's own recording — the
 * recording session IS the consent". Playing somebody their own take back is
 * not synthesis, and there is nobody left to ask: they answered by recording
 * it. Until that ruling this gate refused all 17 `human_*` voices — Aran,
 * Catrin Lliar, Sasha Wanasky, Kai and the Welsh/Spanish course recordist slots
 * — from casting and rendering their own audio. A clone made FROM one of those
 * recordings is a different row with clone provenance and is gated as a clone
 * (voice-personhood.cjs, "the clone made from one"); a recordist who has since
 * REFUSED or WITHDRAWN is `named` and is refused here as before.
 *
 * That last clause used to read "any voice somebody has already recorded a
 * consent state for", and it was wrong in the way Tom caught on 2026-08-31: a
 * consent state written on a stock catalogue row turned it into a person, for
 * good. Personhood is now decided from what the voice IS, in
 * services/shared/voice-personhood.cjs.
 *
 * `human_sasha_wanasky_deu_at` is cast into deu_at_for_eng today and has NO
 * `voices` row at all. A `human_*` id is still a person by construction — it is
 * the convention the whole estate names recordists by — and a missing row does
 * not turn their own recording into a synthesis of it, so they render.
 *
 * ── FAIL CLOSED ─────────────────────────────────────────────────────────────
 * If the consent state cannot be READ, the answer is no. An unreadable consent
 * record is not consent. This costs nothing in practice — nothing in the estate
 * renders without Supabase anyway, because the text being spoken comes from it
 * — and the alternative is precisely the warning-only behaviour being retired.
 *
 * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
 * It touches NOTHING that already exists. No cast is cleared, no clip is
 * deleted or unlinked, no already-rendered audio stops being served. Whether
 * the 20 course roles currently holding an unconsented clone stay cast is Tom's
 * decision and his alone (docs/voice/consent-hard-block-2026-08-31.md).
 */

'use strict'

const consent = require('../voicelab/consent.cjs')
const cloneConfirmation = require('../voicelab/clone-confirmation.cjs')
const { voiceSpellings } = require('./clip-identity-lookup.cjs')
const { PROVIDERS } = require('./clip-identity.cjs')
const personhood = require('./voice-personhood.cjs')

/** How long a voice's consent state is trusted from cache. */
const CACHE_MS = 30_000

/**
 * A voice id that names a person by construction, with or without a row.
 * `human_aran_cym_n`, `human_kai_fin`, `human_sasha_wanasky_deu_at`.
 */
function looksLikeAPerson (voiceId) {
  return personhood.looksLikeARecordist(voiceId)
}

/**
 * Is the consent question real for this voice?
 *
 * ONE ANSWER, shared with consent.describe() and with the census tools:
 * services/shared/voice-personhood.cjs. Corrected 2026-08-31 after Tom read
 * the census — "it is only me and Aran with cloned voices" — and found the
 * block asking for consent on vendor stock catalogue entries, which have
 * nobody behind them to ask. A rule about people had been applied to things.
 *
 * The correction cuts BOTH ways and neither half is optional. Stock voices stop
 * being treated as people, and `elevenlabs_FOIN928B9X0jwgJ95cLt` — "English
 * Narrator (Aran Clone - Presentation)", a real clone of a real person that the
 * old row test waved straight through because its `metadata_source` is null —
 * starts being one.
 *
 * @param {string} voiceId
 * @param {object|null} voice  the `voices` row, or null when there is none
 */
function isAboutAPerson (voiceId, voice) {
  return personhood.isAboutAPerson(voiceId, voice)
}

/**
 * The question the DECISION turns on, which is narrower: may this voice only
 * speak with a recorded yes behind it? Clones and named people, yes. Stock, no
 * — nobody to ask. A recordist's own recordings, no — Tom's 2026-08-31 ruling,
 * the recording session is the consent (voice-personhood.requiresConsent).
 */
function requiresConsent (voiceId, voice) {
  return personhood.requiresConsent(voiceId, voice)
}

/** The name to use in a sentence a human reads. Never an id if we can help it. */
function nameOf (voiceId, voice) {
  const person = voice && String(voice.consent_person || '').trim()
  if (person) return person
  const display = voice && String(voice.display_name || voice.human_name || '').trim()
  if (display) return display
  return String(voiceId || 'this voice')
}

/**
 * THE SENTENCE. Says what is missing and what to do about it, in that order,
 * and blames nobody — the person reading it did not cause this, and a refusal
 * that reads like a stack trace gets worked around rather than fixed.
 */
function refusalMessage (status, voiceId, voice) {
  const who = nameOf(voiceId, voice)
  switch (status) {
    case 'awaiting_authorisation':
      // TWO WAYS TO BE HERE, and they need different next steps (2026-08-31).
      // Somebody who declared at sign-up is not somebody nobody has asked: they
      // have said yes once and are waiting to hear the clone. Saying "ask them"
      // to an operator who already did would read as the system losing the
      // answer they gave.
      if (cloneConfirmation.isHearableForDecision(voice)) {
        // AND SAY WHAT THEY ACTUALLY HAVE TO HEAR (Tom, 2026-08-31). Telling a
        // Welsh recordist to go and play them "this clone" sends an operator
        // looking for a thing that does not exist and cannot be made — Cartesia
        // cannot clone Welsh, Breton or Cornish at all. What that person
        // confirms is their own take, so that is what the refusal names.
        if (cloneConfirmation.hearingSourceOf(voice, voiceId) === cloneConfirmation.HEARING_SOURCES.OWN_RECORDING) {
          return `${who} agreed at sign-up but has not heard their own recording back yet. Play one of their takes to them, and this goes through the moment they confirm it.`
        }
        return `${who} agreed at sign-up but has not heard this clone yet. Play it to them, and this goes through the moment they confirm it sounds like them.`
      }
      return `${who} has not authorised this voice yet. Ask them, record their answer on the voice in the Voice Lab, and then this will go through.`
    case 'refused':
      return `${who} said no to their voice being used. This voice cannot be used. Pick a different one.`
    case 'withdrawn':
      return `${who} has withdrawn permission for their voice. This voice cannot be used. Pick a different one.`
    default:
      return `No consent is recorded for ${who}. Record consent for this voice in the Voice Lab — whose voice it is, who said yes, how and when — and then this will go through.`
  }
}

/**
 * The verdict for one voice. PURE: give it the row you already have.
 *
 * @param {object} args
 * @param {string} args.voiceId
 * @param {object|null} [args.voice]  the `voices` row, null when there is none
 * @returns {{allowed: boolean, aboutAPerson: boolean, status: string, code?: string, message?: string, person?: string|null}}
 */
function verdict ({ voiceId, voice = null }) {
  const kind = personhood.classify(voiceId, voice)
  const aboutAPerson = kind !== 'stock'
  const status = voice ? consent.statusOf(voice) : 'not_recorded'
  // REPORTED HONESTLY, DECIDED NARROWLY: a recordist comes back aboutAPerson
  // true — they are one — and allowed, because their own recording is not a
  // voice cloned from them. `kind` rides along so a caller never has to
  // re-derive which of the two ungated reasons it got.
  if (!requiresConsent(voiceId, voice)) return { allowed: true, aboutAPerson, kind, status }
  if (voice && consent.isAuthorised(voice)) {
    return { allowed: true, aboutAPerson: true, kind, status: 'authorised' }
  }
  return {
    allowed: false,
    aboutAPerson: true,
    kind,
    status,
    code: 'NO_RECORDED_CONSENT',
    person: voice ? (voice.consent_person || null) : null,
    message: refusalMessage(status, voiceId, voice),
  }
}

/**
 * The same verdict, having read the voice from the database.
 *
 * @param {string} voiceId
 * @param {object} args
 * @param {object} args.db     a supabase client
 * @param {Map}    [args.cache]
 */
const defaultCache = new Map()

async function verdictFor (voiceId, { db, provider = null, cache = defaultCache } = {}) {
  const id = String(voiceId || '').trim()
  if (!id) return { allowed: true, aboutAPerson: false, status: 'not_recorded' }
  const read = await readVoice(id, { db, provider, cache })
  if (read.unreadable) return read.unreadable
  return verdict({ voiceId: id, voice: read.voice })
}

/**
 * The `voices` row behind an id, cached, or the fail-closed verdict to return
 * instead of one.
 *
 * Separated from verdictFor so that the ONE other question anybody may ask of a
 * voice — "may the person hear it in order to decide?" — reads the same row
 * through the same cache and the same spellings, rather than growing its own
 * lookup that misses the `cartesia_` prefix in a way nobody notices for a month.
 */
async function readVoice (id, { db, provider = null, cache = defaultCache } = {}) {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < CACHE_MS) return { voice: hit.voice }

  if (!db) {
    // No client to ask. Fail closed for the ids we can recognise as people
    // without one; a stock catalogue id is still not a person and is still fine.
    return { voice: null }
  }

  // EVERY SPELLING, or the gate is a sieve. The registry stores Tom's Cartesia
  // clone as `cartesia_e7ed10ad-…` while the render path is handed the bare
  // uuid, and six voices sit in `voices` under both spellings already
  // (services/shared/clip-identity-lookup.cjs). A single-spelling lookup would
  // find no row for the bare form, conclude "not a person", and wave the exact
  // clone this gate exists for straight through.
  const { data, error } = await db
    // `notes` and the display names ride along because personhood reads the
    // provenance a clone flow wrote there — "English Narrator (Aran Clone -
    // Presentation)" is a display_name and nothing else on that row says clone.
    .from('voices').select(`voice_id, ${consent.COLUMNS}, display_name, human_name, notes, tts_engine`)
    .in('voice_id', spellingsToTry(id, provider))
    .limit(1)
  if (error) {
    // FAIL CLOSED. An unreadable consent record is not consent.
    return {
      voice: null,
      unreadable: {
        allowed: false,
        aboutAPerson: true,
        status: 'unreadable',
        code: 'CONSENT_UNREADABLE',
        message: `The consent record for ${id} could not be read, so this voice has not been used. Try again in a moment; if it keeps happening the voices table is unreachable (${error.message}).`,
      },
    }
  }
  const row = Array.isArray(data) ? (data[0] || null) : (data || null)
  cache.set(id, { at: Date.now(), voice: row })
  return { voice: row }
}

/**
 * EVERY SPELLING, or the gate is a sieve.
 *
 * voiceSpellings() answers this properly WHEN the provider is known. It cannot
 * when it is not: a bare `e7ed10ad-…` uuid carries no shape of its own, so it
 * does not canonicalise, and a lookup on it alone misses the
 * `cartesia_e7ed10ad-…` row that says whose voice it is — the exact clone this
 * gate exists for, waved through for want of a prefix. Not every caller of
 * tts-service.generate() threads a provider into `config`, and one that forgets
 * must not be able to turn the block off by accident.
 *
 * So an unprefixed id is also tried under every provider prefix. Seven extra
 * strings in one `.in()` on a 30-second cache; the alternative is a hole whose
 * size depends on which call site you came through.
 */
function spellingsToTry (id, provider) {
  const out = new Set(voiceSpellings(id, provider ? { provider } : undefined))
  if (!/^[a-z]+_/i.test(id)) for (const p of PROVIDERS) out.add(`${p}_${id}`)
  return [...out]
}

/** Drop the cache. Testing seam, and what a freshly-recorded consent needs. */
function clearCache (cache = defaultCache) { cache.clear() }

/**
 * Refuse, loudly, by throwing. `status` 409 is the shape the Voice Lab's other
 * hard refusals already use (HUMAN_RECORDED, HUMAN_VOICE_LANGUAGE), and the
 * "(403)" in the message is what makes tts-service's isRetriableTtsError treat
 * this as a client error: a missing consent record is not a transient failure
 * and retrying it eight times helps nobody.
 *
 * @param {string} voiceId
 * @param {object} args
 * @param {object} args.db
 * @param {string} [args.context]  where the refusal came from, for the log
 * @param {boolean} [args.tts]     phrase it for the TTS chokepoint
 */
async function assertConsented (voiceId, { db, context = '', tts = false, provider = null, cache } = {}) {
  const v = await verdictFor(voiceId, { db, provider, cache })
  if (v.allowed) return v
  const where = context ? ` [${context}]` : ''
  const err = new Error(tts ? `Voice consent blocked (403): ${v.message}${where}` : `${v.message}`)
  err.status = 409
  err.code = v.code
  err.detail = { code: v.code, voiceId: String(voiceId || ''), consentStatus: v.status, person: v.person || null }
  throw err
}


/**
 * The render-path door, supplying its own database client.
 *
 * Every synthesis entry point in the estate is a plain function that was handed
 * a voice id and an API key; none of them carry a supabase client, and threading
 * one through six services in order to add a guard is how a guard ends up added
 * to four of them. So the gate fetches its own, lazily, and the call site is one
 * line it cannot get wrong.
 *
 * `(403)` in the message is what makes tts-service's isRetriableTtsError treat
 * this as a client error rather than retrying it eight times.
 */
async function assertConsentedForRender (voiceId, { context = '', provider = null } = {}) {
  let db = null
  try { db = require('../supabase-client.cjs').getClient() } catch { db = null }
  return assertConsented(voiceId, { db, tts: true, provider, context })
}

/**
 * MAY THE PERSON HEAR THIS VOICE IN ORDER TO DECIDE ABOUT IT?
 *
 * The one deliberate hole in "no consent, no speech", and the flow does not
 * work without it: an unconfirmed clone cannot be rendered, so the person can
 * never hear the thing they are being asked to confirm. That is a deadlock, and
 * a deadlock in a consent flow gets solved by somebody switching the gate off.
 *
 * It is shaped so that it can only ever be used for the thing it is for:
 *   - the ORDINARY verdict is tried first, so a confirmed voice comes through
 *     the front door and this branch is not involved;
 *   - it opens ONLY for `awaiting_hearing` — declared, not yet heard. A voice
 *     nobody has declared for stays refused, and so do `refused` and
 *     `withdrawn`: somebody has said no, and "play it once more" is how a no
 *     gets worn down;
 *   - it is a SEPARATE EXPORT rather than a flag on assertConsented, so no
 *     caller can widen the ordinary door by passing an option.
 * What comes out is played to one person, once, and stored in the Voice Lab's
 * own clip store. It never reaches course_audio and it casts nothing.
 */
async function assertHearableForDecision (voiceId, { db, context = '', provider = null, cache } = {}) {
  const id = String(voiceId || '').trim()
  let client = db
  if (client === undefined) {
    try { client = require('../supabase-client.cjs').getClient() } catch { client = null }
  }
  const v = await verdictFor(id, { db: client, provider, cache })
  if (v.allowed) return { ...v, forDecision: false }

  const read = await readVoice(id, { db: client, provider, cache })
  if (!read.unreadable && cloneConfirmation.isHearableForDecision(read.voice)) {
    return { allowed: true, aboutAPerson: true, status: 'awaiting_authorisation', forDecision: true }
  }
  const where = context ? ` [${context}]` : ''
  const err = new Error(`Voice consent blocked (403): ${v.message}${where}`)
  err.status = 409
  err.code = v.code
  err.detail = { code: v.code, voiceId: id, consentStatus: v.status, person: v.person || null }
  throw err
}

module.exports = {
  assertConsentedForRender,
  assertHearableForDecision,
  readVoice,
  spellingsToTry,
  CACHE_MS,
  looksLikeAPerson,
  isAboutAPerson,
  requiresConsent,
  refusalMessage,
  verdict,
  verdictFor,
  assertConsented,
  clearCache,
}
