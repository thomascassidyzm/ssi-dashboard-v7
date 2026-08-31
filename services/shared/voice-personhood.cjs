/**
 * IS THERE A PERSON BEHIND THIS VOICE?
 *
 * Tom, 2026-08-31, on reading the consent census: "this is impossible - it is
 * only me and Aran with cloned voices."
 *
 * He was right, and the mistake underneath it is worth naming: A RULE ABOUT
 * PEOPLE GOT APPLIED TO THINGS. "We are never going to use a voice without
 * consent" is a rule about people whose voices we hold. Skylar, Ollie
 * Multilingual, en-US-JennyNeural and the other ~280 rows in `voices` are not
 * people we know; they are catalogue entries licensed from Cartesia, Azure and
 * xAI. There is nobody to ask, so "no consent recorded" against one of them is
 * not a gap in our records — it is the check asking a question that does not
 * apply. Shown on a screen it is noise that buries the handful of rows where
 * the question is real; enforced, it would refuse ordinary production casting.
 *
 * ── WHAT REPLACED THE OLD TEST, AND WHY ─────────────────────────────────────
 * consent.isAboutAPerson() used to say yes if ANY consent state had ever been
 * written on the row. That is backwards: writing a state on a stock row (a
 * probe, a mis-click, a repair) MADE it a person, permanently, and no data
 * about the voice could ever take it back. This module inverts the default —
 * STOCK UNLESS SOMETHING SAYS OTHERWISE — and each "otherwise" is a fact the
 * estate actually holds, never a name:
 *
 *   RECORDIST   `type = 'human'`, or a `human_*` id. A real person's own
 *               recordings. The consent question is at its most real here, and
 *               a `human_*` id is a person BY CONSTRUCTION — an id with no row
 *               is the strongest reason to refuse, never a reason to allow.
 *   CLONE       provenance on the row says this estate cloned somebody:
 *               `metadata_source` from a clone flow ('cartesia-clone (Voice
 *               Lab)'), or the word "clone" in the notes/display name written
 *               when it was made ("English Narrator (Aran Clone - Presentation)"
 *               — an id the old test waved straight through).
 *   NAMED       `consent_person` is filled in, or somebody has recorded a
 *               refusal/withdrawal. A human has named a human on this voice.
 *
 * ── AND WHAT MAKES SOMETHING STOCK ──────────────────────────────────────────
 * Provider voice-library membership, from the data, in the order it is trusted:
 *   1. the row says where it came from — `cartesia-catalogue (Voice Lab)`,
 *      `xai:GET /v1/tts/voices/{id}` — the catalogue loaders write this;
 *   2. the id has a vendor catalogue SHAPE. `en-GB-OllieMultilingualNeural` is
 *      Azure's own `<lang>-<REGION>-<Name>Neural` convention, not a name on a
 *      list: it keeps working for voices Azure has not published yet.
 *   3. the provider has no clone flow in this estate at all. Today only
 *      Cartesia does (services/voicelab/cartesia.cjs `/voices/clone`); Azure,
 *      Google and Narakeet speak catalogue voices and nothing else.
 * A recordist id (`human_*`, `type='human'`) OUTRANKS all three, so no shape
 * rule can ever talk a real person's voice into being stock.
 *
 * Deliberately NOT a list of stock voice names, which would rot the first time
 * a vendor published a new one.
 */

'use strict'

/** Providers with no voice-cloning path in this estate. Catalogue-only. */
const CATALOGUE_ONLY_ENGINES = new Set(['azure', 'google', 'narakeet'])

/** What a catalogue loader writes into `metadata_source` when it fills a row. */
const CATALOGUE_PROVENANCE = /catalogue|catalog\b|:\s*GET\s|\bfrom the (vendor|provider)\b/i

/** What a clone flow writes into `metadata_source`/`notes`/`display_name`. */
const CLONE_PROVENANCE = /\bclon(e|ed|ing)\b/i

/**
 * Azure's own naming convention for a catalogue voice: `en-GB-OliverNeural`,
 * `ar-EG-ShakirNeural`, `zh-CN-XiaoxiaoMultilingualNeural`. A vendor-defined
 * SHAPE, so it covers voices the vendor has not shipped yet.
 */
const AZURE_CATALOGUE_ID = /^[a-z]{2,3}(-[A-Za-z]{2,8})?-[A-Za-z0-9]+Neural$/

function text (v) { return v === null || v === undefined ? '' : String(v) }

/** A voice id that names a person by construction. `human_aran_cym_n`. */
function looksLikeARecordist (voiceId) {
  return /^human[_-]/i.test(text(voiceId).trim())
}

/** Does the row's own provenance say a vendor catalogue put it there? */
function looksLikeCatalogueProvenance (voice) {
  return CATALOGUE_PROVENANCE.test(text(voice && voice.metadata_source))
}

/** Does the row's own provenance say WE cloned somebody to make it? */
function looksLikeOurClone (voice) {
  if (!voice) return false
  return CLONE_PROVENANCE.test(
    `${text(voice.metadata_source)} ${text(voice.notes)} ${text(voice.display_name)} ${text(voice.human_name)}`,
  )
}

/**
 * The classification, in one word. Exported so a screen or a census can SAY
 * which it is rather than re-deriving it from a boolean.
 *
 * THE ORDER IS THE DESIGN, and two of the steps are there because the obvious
 * ordering was wrong against the live data:
 *
 *   `bedd6226` ("Olivia") is an xAI CATALOGUE voice whose notes happen to
 *   quote Tom calling something "his own clone". A naive word-search for
 *   "clone" over the notes classified it as a person and would have refused
 *   1,367 live cast sites. So POSITIVE CATALOGUE PROVENANCE BEATS LOOSE CLONE
 *   TEXT: what a loader wrote about where the voice came from outranks a word
 *   in a comment about it.
 *
 *   `azure_en-GB-ThomasNeural` is a stock Azure voice carrying a test row that
 *   says "voicelab:clone". You cannot clone INTO Azure's namespace — this
 *   estate has no Azure clone flow at all (only Cartesia does, see
 *   services/voicelab/cartesia.cjs) — so a catalogue-only engine, or a vendor
 *   catalogue id shape, beats clone provenance too. A voice is what it is, not
 *   what a stray row says about it.
 *
 * @returns {'recordist'|'clone'|'named'|'stock'}
 */
function classify (voiceId, voice = null) {
  const id = text(voiceId).trim()

  // 1. A PERSON BY CONSTRUCTION. Outranks everything, row or no row. An id
  //    nothing is known about is the strongest reason to refuse, never to allow.
  if (looksLikeARecordist(id)) return 'recordist'
  if (voice && voice.type === 'human') return 'recordist'

  // 2. A PROVIDER WE CANNOT CLONE WITH. Structural, and it beats anything
  //    written on the row, because no sentence can make a voice into a clone
  //    that no flow in this estate could have produced.
  const engine = text(voice && voice.tts_engine).toLowerCase()
  if (engine && CATALOGUE_ONLY_ENGINES.has(engine)) return 'stock'
  if (AZURE_CATALOGUE_ID.test(stripProviderPrefix(id))) return 'stock'

  // 3. OUR OWN CLONE, said by the field a clone flow writes. Checked BEFORE the
  //    catalogue test: `cartesia-clone (Voice Lab)` and `cartesia-catalogue
  //    (Voice Lab)` are one word apart, and Tom's xAI clone's provenance
  //    mentions both words in one sentence. The clone must win that tie.
  if (CLONE_PROVENANCE.test(text(voice && voice.metadata_source))) return 'clone'

  // 4. THE VENDOR'S CATALOGUE PUT IT HERE. Beats step 5's looser evidence.
  if (looksLikeCatalogueProvenance(voice)) return 'stock'

  // 5. OUR OWN CLONE, said by the name or note somebody wrote when they made
  //    it. Weaker than a provenance field and ranked accordingly, but it is the
  //    ONLY thing that identifies `elevenlabs_FOIN928B9X0jwgJ95cLt` — "English
  //    Narrator (Aran Clone - Presentation)" — a real clone of a real person
  //    made before there was a provenance field to write.
  if (looksLikeOurClone(voice)) return 'clone'

  // 6. A HUMAN NAMED A HUMAN ON THIS VOICE. Either whose voice it is, or a
  //    recorded no — and a no is never walked back by a provenance rule.
  if (voice) {
    if (text(voice.consent_person).trim()) return 'named'
    // A CONSENT PROCESS IS UNDER WAY ON THIS VOICE. Kept as a safety net for a
    // clone mid-confirmation whose row has not been filled in yet — but ranked
    // SIXTH, so it can no longer do what it used to do at rank one: turn a
    // vendor catalogue row into a person, permanently, because something once
    // wrote a status on it.
    const st = text(voice.consent_status).trim()
    if (st === 'refused' || st === 'withdrawn' || st === 'awaiting_authorisation') return 'named'
  }

  // 7. STOCK. Everything else: a voice nothing knows a person for. The default
  //    is stock BECAUSE the estate is ~97% stock, and because a rule about
  //    people must not be applied to things.
  return 'stock'
}

/** Is the consent question real for this voice? The one question callers ask. */
function isAboutAPerson (voiceId, voice = null) {
  return classify(voiceId, voice) !== 'stock'
}

/**
 * Is this positively identifiable as a vendor catalogue voice, as opposed to
 * merely "nothing says it is a person"? Used for reporting, not for deciding —
 * the decision is classify() — so that a census can tell "known stock" apart
 * from "unattributed", which is a real distinction when 186 rows carry no
 * provenance at all.
 */
function looksLikeStockCatalogue (voiceId, voice = null) {
  if (classify(voiceId, voice) !== 'stock') return false
  if (looksLikeCatalogueProvenance(voice)) return true
  if (AZURE_CATALOGUE_ID.test(stripProviderPrefix(text(voiceId)))) return true
  return Boolean(voice && CATALOGUE_ONLY_ENGINES.has(text(voice.tts_engine).toLowerCase()))
}

function stripProviderPrefix (id) {
  const m = /^(azure|xai|elevenlabs|google|narakeet|cartesia)_(.+)$/.exec(id)
  return m ? m[2] : id
}

module.exports = {
  classify,
  isAboutAPerson,
  looksLikeARecordist,
  looksLikeOurClone,
  looksLikeCatalogueProvenance,
  looksLikeStockCatalogue,
  CATALOGUE_ONLY_ENGINES,
  AZURE_CATALOGUE_ID,
}
