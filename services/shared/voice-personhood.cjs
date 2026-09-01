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
 *               recordings, played back. A person BY CONSTRUCTION — but NOT a
 *               voice the consent gate asks about; see the ruling below.
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
 *
 * ── THE THIRD CATEGORY: A PERSON'S OWN RECORDING ────────────────────────────
 * Tom's ruling, 2026-08-31, drawing the boundary this module was left holding:
 *
 *   gate anything CLONED from a person's voice; do not gate a person's own
 *   recording — the recording session IS the consent, and playing back
 *   somebody's own take is not synthesis.
 *
 * So `recordist` and `stock` both come out of the gate ungated, for opposite
 * reasons. Nobody is being asked about a stock voice because there is nobody to
 * ask; nobody is being asked about a recordist's own take because they already
 * answered — by turning up and recording it. The thing consent protects
 * against is a machine speaking in your voice without you, and a recording of
 * you speaking is not that. Left gated, the block refused all 17 human_* voices
 * — Aran, Catrin Lliar, Sasha Wanasky, Kai and the course recordist slots —
 * from casting and rendering their own audio, which protects nobody and stops
 * the Welsh and Spanish human courses dead.
 *
 * requiresConsent(), not classify(), is what the gate asks. classify() still
 * says `recordist` and isAboutAPerson() still says yes, because a recordist IS
 * a person and a screen should say so.
 *
 * ── AND THE CLONE MADE FROM ONE ─────────────────────────────────────────────
 * "If a recordist's audio is ever used as the source for a clone, THAT clone is
 * gated as a clone." That falls out of the data rather than being arranged: the
 * clone flow writes its OWN row (`cartesia_<uuid>`, `type='tts'`,
 * `metadata_source: 'cartesia-clone (Voice Lab)'` —
 * services/voicelab/cartesia.cjs registerVoice), so it never wears the source
 * recordist's id and never inherits its exemption.
 *
 * Belt and braces on top of that, because an exemption is only as good as the
 * thing that cannot be talked into it: a recordist row is only exempt while it
 * looks like RECORDED AUDIO. Two facts take it back, both derived, neither a
 * name:
 *   - clone provenance in `metadata_source`, the field a clone flow writes;
 *   - A VENDOR SYNTHESIS IDENTITY on the row — `tts_engine`, `provider_id` or
 *     `tts_voice_name`. This is the structural half and the load-bearing one.
 *     A person's own recording has no vendor voice: it is files, and all 17
 *     recordist rows carry null in all three, under an id with no vendor
 *     prefix — and `tts_engine: 'human'` is not a vendor. A clone cannot exist
 *     without one,
 *     because a clone IS a voice sitting at a provider under an id. So a
 *     human_* row that acquires a provider voice is something synthesised in
 *     that person's voice whatever it is called, and it is gated.
 * Note what is deliberately NOT used here: the loose "clone" word-search over
 * notes and display names that catches `elevenlabs_FOIN…`. On a recordist row
 * that would gate the very recording Tom's ruling exempts the moment somebody
 * notes "used as the source for Aran's clone" on it — a true sentence about the
 * SOURCE, which is not a clone.
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

/**
 * The vendors this estate can SYNTHESISE with. `human` is deliberately absent
 * though it is one of clip-identity's PROVIDERS: `tts_engine: 'human'` is what
 * the cast route writes when it auto-registers a recordist who had no row, and
 * it is the OPPOSITE of a vendor voice — it says the audio is a person's own
 * takes. Treating it as one gated `human_sasha_wanasky_deu_at` the moment she
 * was cast, which is exactly the failure this module exists to stop (caught by
 * the live probe, 2026-08-31, not by a test).
 */
const SYNTHESIS_VENDORS = new Set(['azure', 'xai', 'elevenlabs', 'google', 'narakeet', 'cartesia'])

/** An id that names a voice sitting at a vendor. `cartesia_e7ed10ad-…`. */
const PROVIDER_PREFIXED_ID = new RegExp(`^(${[...SYNTHESIS_VENDORS].join('|')})_`, 'i')

function text (v) { return v === null || v === undefined ? '' : String(v) }

/** A voice id that names a person by construction. `human_aran_cym_n`. */
function looksLikeARecordist (voiceId) {
  return /^human[_-]/i.test(text(voiceId).trim())
}

/**
 * Does this row carry a VENDOR SYNTHESIS IDENTITY — a voice sitting at a
 * provider, under an id something can be asked to speak with?
 *
 * The structural half of "recorded, not synthesised". A person's own recordings
 * are files and nothing else: all 17 recordist rows in the estate hold null in
 * all three of these columns, while every clone (`cartesia_e7ed10ad…`,
 * `elevenlabs_FOIN…`, `gfzdpspr5fdp`) holds at least one, because a clone
 * cannot be rendered without one.
 */
function carriesSynthesisIdentity (voiceId, voice = null) {
  // The id itself is one: `cartesia_e7ed10ad-…` is a voice AT CARTESIA, and no
  // `type` column on the row makes it a person's own recordings. Recordist ids
  // are `human_*` and carry no provider prefix at all.
  if (PROVIDER_PREFIXED_ID.test(text(voiceId).trim())) return true
  if (!voice) return false
  if (SYNTHESIS_VENDORS.has(text(voice.tts_engine).trim().toLowerCase())) return true
  return Boolean(text(voice.provider_id).trim() || text(voice.tts_voice_name).trim())
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

  // 1. A PERSON BY CONSTRUCTION, row or no row — and the ONE branch that can
  //    come out ungated while still being about a person (see requiresConsent).
  //    A missing row keeps them a recordist: nothing about "we hold no record
  //    of this person" makes their own recording into a synthesis of it.
  if (looksLikeARecordist(id) || (voice && voice.type === 'human')) {
    // …unless the row itself says this is no longer just their recordings.
    // Provenance first, then the structural test — a recordist who has acquired
    // a provider voice id has something synthesising in their voice, and that
    // is a clone whatever the id spells.
    if (CLONE_PROVENANCE.test(text(voice && voice.metadata_source))) return 'clone'
    if (carriesSynthesisIdentity(id, voice)) return 'clone'
    // A RECORDED NO OUTRANKS THE RECORDING. The session is the consent, but
    // consent given can be taken back, and a withdrawal is never walked back by
    // a rule about what kind of voice this is.
    const said = text(voice && voice.consent_status).trim()
    if (said === 'refused' || said === 'withdrawn') return 'named'
    return 'recordist'
  }

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

/** Is there a person behind this voice at all? A DISPLAY question. */
function isAboutAPerson (voiceId, voice = null) {
  return classify(voiceId, voice) !== 'stock'
}

/**
 * MAY THIS VOICE ONLY SPEAK WITH A RECORDED YES BEHIND IT? The gate's question,
 * and the one that is NOT the same as "is there a person behind this".
 *
 * Two kinds come out true: a clone this estate made from somebody, and a voice
 * a human has named a human on (including a recordist who has since said no —
 * classify() sends that row to `named`). A recordist's own recordings come out
 * FALSE, because the recording session already is the consent (Tom, 2026-08-31)
 * — the same answer stock gets, for the opposite reason.
 */
function requiresConsent (voiceId, voice = null) {
  const kind = classify(voiceId, voice)
  return kind === 'clone' || kind === 'named'
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
  requiresConsent,
  carriesSynthesisIdentity,
  looksLikeARecordist,
  looksLikeOurClone,
  looksLikeCatalogueProvenance,
  looksLikeStockCatalogue,
  CATALOGUE_ONLY_ENGINES,
  SYNTHESIS_VENDORS,
  AZURE_CATALOGUE_ID,
}
