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
async function registerVoice (db, { voiceId, name, language, gender = null, notes = null, isClone = false, registeredBy = null }) {
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
async function createClone (db, { clip, filename = 'sample.wav', name, language, gender = null, description = null, registeredBy = null }) {
  if (!clip || !clip.length) throw Object.assign(new Error('A sample clip is required to clone a voice.'), { status: 400 })
  if (!name) throw Object.assign(new Error('A name is required for the new voice.'), { status: 400 })

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
  })
  return { cartesia: meta, voice }
}

module.exports = {
  CARTESIA_API_VERSION,
  CLONE_AUDITION_MAX_CLIPS,
  PREVIEW_MAX_CLIPS,
  registerVoice,
  fetchVoice,
  createClone,
}
