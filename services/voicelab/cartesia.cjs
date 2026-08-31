/**
 * VOICELAB · CARTESIA — registering voices, and cloning new ones, from inside Popty.
 *
 * Tom, 2026-08-28: "including probably we should wire it up - how to create a
 * clone of any voice using the Cartesia back-end … but enabling everything from
 * here, from within popty".
 *
 * ── WHY REGISTERING MATTERS AS MUCH AS CLONING ──────────────────────────────
 * Measured 2026-08-28: the `voices` table held 165 Azure rows, 118 xAI, 2
 * ElevenLabs, 17 human and **zero Cartesia**. Cartesia is the estate's standing
 * default provider, so the per-language screen could show gaps but could not
 * let anyone fill one with the very provider they are supposed to use. Cloning
 * without registering would have produced the same dead end one voice at a
 * time. So both paths below end in the same place: a row in `voices` with
 * `tts_engine = 'cartesia'`, which is what makes a voice castable, and which is
 * also the lever tts-provider-policy.cjs names for turning Cartesia on per
 * language ("registering a voices row with tts_engine='cartesia'").
 *
 * ── THE MONEY GATE ──────────────────────────────────────────────────────────
 * Neither call here renders course audio, and neither can trigger a bulk run.
 * Registering is a database insert and spends nothing at all. Cloning uploads
 * one sample to Cartesia and returns an id — it renders no speech. Auditioning
 * a new voice goes through the lab's ordinary render path, which is capped by
 * lab.LIMITS (maxSentencesPerBatch, and the daily character ceiling that
 * refuses). There is deliberately no "render a sample set for the new clone"
 * convenience here: that is precisely the shape that turns one click into a
 * bulk spend.
 */

const policy = require('../shared/tts-provider-policy.cjs')
const consent = require('./consent.cjs')

/** Cartesia pins its API to a date. REQUIRED — verified against a live 400. */
const CARTESIA_API_VERSION = '2026-08-14'
const CARTESIA_BASE = 'https://api.cartesia.ai'

/**
 * How many clips a clone audition may render before anything else happens.
 *
 * TASTE DEFAULT, Tom's to move (2026-08-28): three. Enough to hear whether a
 * clone is worth keeping, far too few to be a bulk render by accident. This is
 * a CEILING, not a target — it is enforced in router.cjs on the audition route,
 * and the lab's own daily character ceiling still applies underneath it.
 */
const CLONE_AUDITION_MAX_CLIPS = Number(process.env.VOICELAB_CLONE_AUDITION_CLIPS || 3)

/** A preview from the Languages screen is capped harder than a lab batch. */
const PREVIEW_MAX_CLIPS = Number(process.env.VOICELAB_PREVIEW_CLIPS || 10)

function apiKey () {
  const key = process.env.CARTESIA_API_KEY
  if (!key) throw Object.assign(new Error('No CARTESIA_API_KEY on this backend — Cartesia cannot be reached from here.'), { status: 503 })
  return key
}

function headers (extra = {}) {
  return { Authorization: `Bearer ${apiKey()}`, 'Cartesia-Version': CARTESIA_API_VERSION, ...extra }
}

/**
 * Write (or refresh) a `voices` row for a Cartesia voice.
 *
 * UPSERT rather than insert: re-registering the same voice must be harmless, so
 * a double click cannot fail with a primary-key error and leave the operator
 * wondering which half happened.
 *
 * The stored `voice_id` is prefixed `cartesia_`, matching how the estate spells
 * provider-scoped ids elsewhere (`xai_…`, `azure_…`) and how
 * params.describeStoredVoice reads them back.
 */
async function registerVoice (db, { voiceId, name, language, gender = null, notes = null, isClone = false, registeredBy = null, consentRecord = null }) {
  const bare = String(voiceId || '').replace(/^cartesia_/, '').trim()
  if (!bare) throw Object.assign(new Error('voiceId is required'), { status: 400 })

  const code = policy.toCartesiaLangCode(language)
  if (!code) throw Object.assign(new Error(`Cannot register a voice without a language it speaks (got "${language}")`), { status: 400 })

  const row = {
    voice_id: `cartesia_${bare}`,
    type: 'tts',
    tts_engine: 'cartesia',
    provider_id: bare,
    display_name: name || bare,
    // Stored as the two-letter code Cartesia itself reports, which is what
    // registry.sameLang normalises to on both sides.
    languages: [code],
    // NULL rather than a guess: voices.gender is CHECK-constrained to f/m, and
    // an invented gender would put a voice in the wrong slot on a screen whose
    // entire job is to say who the male and female voices are.
    gender: gender === 'f' || gender === 'm' ? gender : null,
    is_active: true,
    model: 'sonic-3.6',
    metadata_source: isClone ? 'cartesia-clone (Voice Lab)' : 'cartesia-catalogue (Voice Lab)',
    metadata_checked_at: new Date().toISOString(),
    notes: notes || (isClone ? `Cloned from the Voice Lab${registeredBy ? ` by ${registeredBy}` : ''}.` : null),
    updated_at: new Date().toISOString(),
    // THE CONSENT RECORD IS PART OF THE VOICE'S FIRST WRITE, not a follow-up.
    // Tom, 2026-08-31: "shown on the voice itself, because these are real
    // people". A record added in a second call is a record that can fail to be
    // added — and an optional consent field is an empty consent field. Omitted
    // entirely for a catalogue registration, which is a vendor's stock voice
    // and has no person behind it to ask.
    ...(consentRecord || {}),
  }

  const { data, error } = await db.from('voices').upsert(row, { onConflict: 'voice_id' }).select().single()
  if (error) throw Object.assign(new Error(`voices upsert failed: ${error.message}`), { status: 400 })
  return data
}

/** Look one voice up in Cartesia's catalogue, so registration carries real metadata. */
async function fetchVoice (voiceId) {
  const bare = String(voiceId || '').replace(/^cartesia_/, '')
  const res = await fetch(`${CARTESIA_BASE}/voices/${encodeURIComponent(bare)}`, {
    headers: headers(), signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw Object.assign(new Error(`Cartesia does not know voice ${bare} (${res.status})`), { status: res.status === 404 ? 404 : 502 })
  }
  return res.json()
}

/**
 * Create a clone on Cartesia from one audio sample, then register it.
 *
 * RENDERS NOTHING. This returns a voice id; hearing it costs a separate,
 * capped audition. Cloning and spending are kept apart on purpose.
 *
 * @param {object} db
 * @param {object} a
 * @param {Buffer} a.clip      the sample audio
 * @param {string} a.filename
 * @param {string} a.name      what to call the voice
 * @param {string} a.language  ISO-639-1/3/locale — normalised before sending
 */
async function createClone (db, { clip, filename = 'sample.wav', name, language, gender = null, description = null, registeredBy = null, person = null, personContact = null, consentNote = null, source = null, declaration = null }) {
  if (!clip || !clip.length) throw Object.assign(new Error('A sample clip is required to clone a voice.'), { status: 400 })
  if (!name) throw Object.assign(new Error('A name is required for the new voice.'), { status: 400 })

  // WHOSE VOICE IS THIS? Asked before Cartesia is, and it throws if unanswered.
  //
  // Tom's amendment of 2026-08-31 says the clone must NOT be refused for having
  // no consent — under the primary path the person has not been asked yet, and
  // refusing would make the whole flow impossible. But it must still be
  // refused for having no PERSON: a consent record nobody can attach to a human
  // is decorative, and Tom cannot go and ask a voice id. So the voice is born
  // 'awaiting_authorisation' with a name attached, and that is the state it
  // wears on screen until a real yes is recorded against it.
  const birth = consent.birthRecord({
    person, personContact, note: consentNote, source, recordedBy: registeredBy,
  })

  // A DECLARATION, WHEN THE PERSON WAS ACTUALLY THERE (2026-09-01).
  //
  // The birth record above is the estate-clone answer: nobody is present, so
  // the voice is born awaiting authorisation and Tom goes and asks. The browser
  // recording path is a different situation — the person read the consent line
  // into the microphone, or the uploader agreed to the attestation — and there
  // the consent event has ALREADY happened. So the declaration columns are
  // merged OVER the birth record rather than instead of it: the birth record
  // still supplies the person, the provenance and the operator, and still
  // refuses to exist without a name; the declaration overwrites the status and
  // the three authorised_* fields with what actually took place.
  //
  // Merged HERE, so the consent fact is part of the voice's FIRST write. A
  // record added in a follow-up update is a record that can fail to be added,
  // and the window between the two writes is a real person's voice sitting in
  // the database with no permission attached to it.
  const consentRecord = declaration ? { ...birth, ...declaration } : birth

  const code = policy.toCartesiaLangCode(language)
  if (!code) throw Object.assign(new Error(`"${language}" is not a language code Cartesia accepts.`), { status: 400 })
  if (!policy.cartesiaCoversLanguage(code)) {
    // Refuse rather than let Cartesia refuse: the honest message names the
    // provider gap, which is the thing the operator needs to know.
    throw Object.assign(
      new Error(`Cartesia does not support "${code}", so it cannot clone a voice in it. Welsh, Breton and Cornish are in this position — those languages are human-recorded.`),
      { status: 400 },
    )
  }

  const form = new FormData()
  form.append('clip', new Blob([clip]), filename)
  form.append('name', name)
  form.append('language', code)
  // Only the fields Cartesia's /voices/clone reference documents (fetched
  // 2026-08-28): clip, name, language, and optional tagline/description/
  // accent/base_voice_id/access. An undocumented field is a 422 waiting to
  // happen, so nothing else is sent.
  if (description) form.append('description', description)

  const res = await fetch(`${CARTESIA_BASE}/voices/clone`, {
    method: 'POST',
    headers: headers(),           // no Content-Type: FormData sets its own boundary
    body: form,
    signal: AbortSignal.timeout(120000),
  })
  const text = await res.text()
  if (!res.ok) throw Object.assign(new Error(`Cartesia clone failed (${res.status}): ${text.slice(0, 400)}`), { status: 502 })

  let meta
  try { meta = JSON.parse(text) } catch { throw Object.assign(new Error(`Cartesia clone returned a non-JSON body: ${text.slice(0, 200)}`), { status: 502 }) }
  if (!meta.id) throw Object.assign(new Error(`Cartesia clone returned no voice id: ${text.slice(0, 200)}`), { status: 502 })

  const voice = await registerVoice(db, {
    voiceId: meta.id,
    name: meta.name || name,
    language: code,
    gender,
    isClone: true,
    registeredBy,
    consentRecord,
  })
  return { cartesia: meta, voice, consent: consent.describe(voice) }
}

/**
 * Delete a voice AT CARTESIA. The `voices` row is the caller's business.
 *
 * A page that can create but cannot un-create is a trap, and the case it is a
 * trap for is the one Tom will actually hit: a clone made by accident during a
 * live demo with somebody watching. SPENDS NOTHING.
 *
 * A 404 is treated as success — the goal is "this voice is not at Cartesia",
 * and it already is not. Any other failure is reported rather than swallowed,
 * so a row is never deleted here on the strength of a delete that did not
 * happen there.
 */
async function deleteClone (voiceId) {
  const bare = String(voiceId || '').replace(/^cartesia_/, '')
  if (!bare) throw Object.assign(new Error('voiceId is required'), { status: 400 })
  const res = await fetch(`${CARTESIA_BASE}/voices/${encodeURIComponent(bare)}`, {
    method: 'DELETE', headers: headers(), signal: AbortSignal.timeout(30000),
  })
  if (res.ok || res.status === 404) return { deleted: res.ok, absent: res.status === 404 }
  const text = await res.text()
  throw Object.assign(new Error(`Cartesia refused to delete ${bare} (${res.status}): ${text.slice(0, 200)}`), { status: 502 })
}

module.exports = {
  CARTESIA_API_VERSION,
  deleteClone,
  CLONE_AUDITION_MAX_CLIPS,
  PREVIEW_MAX_CLIPS,
  registerVoice,
  fetchVoice,
  createClone,
}
