/**
 * KNOWN-SIDE VOICE GENDER — the language-general rule for gendered known
 * languages (Kai's design, 2026-09-23; first course eng_for_hin, must also fit
 * Italian and every other known language whose grammar marks the SPEAKER).
 *
 * THE PROBLEM. A Hindi speaker hears speaker gender in every sentence. A course
 * whose prompts are only ever in one (female) voice with feminine grammar
 * teaches, silently, that the English answer is gendered too. Two things fix
 * that together: two known voices, and prompts whose grammar matches the voice
 * that speaks them.
 *
 * THE RULE, IN TWO HALVES.
 *
 *  1. NEUTRAL known lines (the grammar does not move with the speaker) are
 *     split roughly half and half between the male and the female known voice,
 *     ONE clip each. The split is a deterministic hash of the text, not a
 *     random draw: phase8 renders one clip per distinct text|language|role and
 *     the link RPC links slots by normalised text, so the voice has to be a
 *     function of the TEXT or two renders of the same course would disagree.
 *
 *  2. GENDERED known lines (the grammar moves with the speaker) exist as ONE
 *     phrase in ONE form — the male-speaker form OR the female-speaker form,
 *     never both (Kai, 2026-09-23 20:13Z; Tom: no doubling). The male form is
 *     ALWAYS spoken by the male voice, the female form ALWAYS by the female
 *     voice: no voice ever reads a line in the other gender's grammar. The
 *     pairing is recorded in course_gender_expansions with text_side='known'
 *     (expanded_m/expanded_f are the pair); a text that matches either side of
 *     a stored pair takes that side's gender. Which side a phrase gets is the
 *     balanced split in services/known-gender/gendered-known-plan.cjs, applied
 *     ONCE and stamped on the row (metadata.known_gender); after that the text
 *     itself carries the decision and this rule needs no special case.
 *
 *  2b. LEGO DEBUTS AND SEEDS. A gendered LEGO debuts in the FEMALE form; its
 *     introduction stays in the female voice and quotes BOTH forms
 *     (presentation-author.cjs expandGenderedKnownSlot). Gendered seed lines
 *     are split half and half like phrases. A neutral LEGO or seed line is
 *     ANCHORED female (the split is for practice phrases); a pair beats an
 *     anchor, so a male-form seed line is spoken by the male voice.
 *
 * NOTHING RANDOM IN THE APP. The player's ordinary phrase selection is what
 * mixes the two variants (see the proposal published with job #883·H for
 * exactly how deterministic that selection is).
 *
 * WHY A HASH AND NOT A COLUMN. The estate's whole audio pipeline is keyed by
 * text: getAudioNeeds selects distinct texts, getExistingAudioSet and
 * link_all_audio_ids match on normalised text, the text-change trigger relinks
 * by text. A per-row gender column would have to be threaded through all of
 * that and would still disagree with itself when the same text sits on two
 * rows. A text-keyed rule needs no schema, agrees with itself everywhere, and
 * is reproducible: the same course renders the same voice for the same line
 * on any machine on any day. The salt is the course code, so two courses that
 * share a known line may still split it differently — that is fine, a line's
 * voice is a course-level fact.
 *
 * Pure. No DB, no I/O. Callers hand in the stored pairs.
 */

const M = 'm'
const F = 'f'

/** Normalise a known text for keying: case, trim, trailing punctuation, inner whitespace. */
function normalizeKnownKey(text) {
  return String(text || '')
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/[.?!,،؛؟।॥…"'“”‘’]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** FNV-1a 32-bit over the UTF-16 code units — stable across Node versions and platforms. */
function fnv1a32(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * The neutral-line split. Deterministic, ~50/50, keyed on the normalised text
 * plus a salt (the course code). Bit 0 of the mixed hash is the coin.
 */
function hashGender(text, salt = '') {
  const h = fnv1a32(`${salt}\u0000${normalizeKnownKey(text)}`)
  // Mix the high bits down before taking the parity, so near-identical strings
  // (which differ in one late code unit) do not correlate on bit 0.
  const mixed = (h ^ (h >>> 16) ^ (h >>> 8)) >>> 0
  return (mixed & 1) ? F : M
}

/**
 * Build the lookup from stored known-side pairs. Input rows are
 * course_gender_expansions rows with text_side='known' (any extra fields are
 * ignored). A row whose two forms are identical is not a pair and is skipped —
 * that is what "not gendered" looks like in that table.
 *
 * Returns a Map: normalised text → { gender, m, f }. BOTH forms are indexed, so
 * a course whose stored text happens to be the female form (Shuchita's
 * proofreading left ~2,600 such lines in eng_for_hin) resolves just as well as
 * one whose stored text is the male form.
 */
function buildKnownGenderIndex(rows) {
  const index = new Map()
  for (const r of rows || []) {
    if (!r || !r.expanded_m || !r.expanded_f) continue
    const mKey = normalizeKnownKey(r.expanded_m)
    const fKey = normalizeKnownKey(r.expanded_f)
    if (!mKey || !fKey || mKey === fKey) continue
    const pair = { m: r.expanded_m, f: r.expanded_f }
    // First stored pair wins for a given form — a form that is male in one
    // pair cannot be female in another without the pairs contradicting.
    if (!index.has(mKey)) index.set(mKey, { gender: M, ...pair })
    if (!index.has(fKey)) index.set(fKey, { gender: F, ...pair })
  }
  return index
}

/**
 * The gender a known text is spoken in.
 *   { gender: 'm'|'f', source: 'pair'|'hash', pair?: {m, f} }
 * 'pair' means the text is one side of a stored gendered pair and the gender
 * is a fact about its grammar; 'hash' means the text is neutral and the coin
 * decided.
 */
function knownGenderForText(text, index, { salt = '', anchors = null } = {}) {
  const key = normalizeKnownKey(text)
  const hit = index && index.get(key)
  if (hit) return { gender: hit.gender, source: 'pair', pair: { m: hit.m, f: hit.f } }
  if (anchors && anchors.has(key)) return { gender: F, source: 'anchor' }
  return { gender: hashGender(text, salt), source: 'hash' }
}

/** The set of known texts anchored female: every LEGO's and every seed's known text. */
function buildAnchorSet(texts) {
  const out = new Set()
  for (const t of texts || []) { const k = normalizeKnownKey(t); if (k) out.add(k) }
  return out
}

/** The other form of a gendered text, or null when the text is neutral. */
function counterpartForText(text, index) {
  const hit = index && index.get(normalizeKnownKey(text))
  if (!hit) return null
  return hit.gender === M ? { gender: F, text: hit.f } : { gender: M, text: hit.m }
}

/**
 * VOICE CONFIG SHAPE. A role entry in courses.voice_config.voices may carry a
 * `byGender` block naming one voice per speaker gender:
 *
 *   voices.known = {
 *     name, voiceId, provider, gender, …            ← the role's default voice
 *     byGender: {
 *       m: { name: 'Rehan', voiceId: 'cartesia_205f…', provider: 'cartesia' },
 *       f: { name: 'Kriti', voiceId: 'cartesia_5283…', provider: 'cartesia' },
 *     },
 *   }
 *
 * With no byGender block the role has ONE voice, exactly as today, and every
 * text resolves to it whatever its gender — the mechanism is inert on every
 * course that has not opted in. A byGender block with only one gender filled
 * falls back to the role default for the other.
 */
function knownVoiceForGender(voices, role, gender) {
  const entry = voices && voices[role]
  if (!entry || typeof entry !== 'object') return entry || null
  const byGender = entry.byGender
  if (byGender && byGender[gender] && (byGender[gender].voiceId || byGender[gender].voice_id)) {
    return { ...byGender[gender], gender, provider: byGender[gender].provider || entry.provider }
  }
  return entry
}

/**
 * The voice a known-side TEXT renders on for a role ('known' or
 * 'presentation'). For a presentation item pass the LEGO's known text as
 * `text` — the intro narrates a LEGO, so it follows the LEGO's grammar, not
 * its own template wording.
 */
function resolveKnownVoiceForText({ voices, role = 'known', text, index, salt = '', anchors = null }) {
  const { gender, source } = knownGenderForText(text, index, { salt, anchors })
  const voice = knownVoiceForGender(voices, role, gender)
  return { voice, gender, source }
}

/**
 * Every voice a role may legitimately render in: the default plus each
 * byGender voice. The relink guard compares a candidate clip against ONE
 * wanted voice; with two known voices the wanted voice is the one the clip's
 * TEXT resolves to, so callers use resolveKnownVoiceForText per clip. This
 * helper is for the coarse question "is this voice one of ours at all?" —
 * censuses, the SQL twin, dry-run reports.
 */
function voiceIdsForRole(voices, role) {
  const entry = voices && voices[role]
  const out = []
  const push = (v) => {
    if (!v) return
    const id = typeof v === 'string' ? v : (v.voiceId || v.voice_id)
    if (id && !out.includes(id)) out.push(id)
  }
  push(entry)
  if (entry && typeof entry === 'object' && entry.byGender) {
    push(entry.byGender.m)
    push(entry.byGender.f)
  }
  return out
}

/** True when the role has two voices to speak in. */
function roleHasGenderedVoices(voices, role) {
  const entry = voices && voices[role]
  const bg = entry && typeof entry === 'object' && entry.byGender
  return !!(bg && bg.m && bg.f && (bg.m.voiceId || bg.m.voice_id) && (bg.f.voiceId || bg.f.voice_id))
}


// ─── Per-course context and per-clip resolution (what phase8 calls) ────────
const { tryCanonicalVoiceId } = require('./clip-identity.cjs')

/**
 * Everything the render/link paths need for one course, built once from the
 * stored known-side pairs and (for presentation) the LEGO known texts.
 *   { wantsKnown, wantsPres, index, salt, legoKnownText: Map<lego_id, known_text> }
 * Pure: hand it rows.
 */
function buildKnownGenderContext({ courseCode, voices, pairs = [], legos = [], seeds = [] }) {
  const wantsKnown = roleHasGenderedVoices(voices, 'known')
  const wantsPres = roleHasGenderedVoices(voices, 'presentation')
  const legoKnownText = new Map()
  for (const l of legos) if (l && l.lego_id) legoKnownText.set(l.lego_id, l.known_text)
  const anchors = buildAnchorSet([...legos.map(l => l && l.known_text), ...seeds.map(sd => sd && sd.known_text)])
  return { wantsKnown, wantsPres, index: buildKnownGenderIndex(pairs), salt: courseCode, legoKnownText, anchors }
}

/**
 * The voice a clip renders on under the rule, or null to fall through to the
 * role's ordinary voice. `ctx` carries `voices`. For 'presentation' the
 * deciding text is the LEGO's known text (by lego_id) — an intro narrates a
 * LEGO, so it takes the LEGO's gender, not its template wording's; with no
 * LEGO to follow it falls through.
 */
function knownVoiceEntryForClip(ctx, { role, text, legoId }) {
  if (!ctx) return null
  if (role === 'known' && ctx.wantsKnown) {
    return resolveKnownVoiceForText({ voices: ctx.voices, role, text, index: ctx.index, salt: ctx.salt, anchors: ctx.anchors })
  }
  if (role === 'presentation' && ctx.wantsPres) {
    const legoText = legoId ? ctx.legoKnownText.get(legoId) : null
    if (!legoText) return null
    return resolveKnownVoiceForText({ voices: ctx.voices, role, text: legoText, index: ctx.index, salt: ctx.salt, anchors: ctx.anchors })
  }
  return null
}

/**
 * Both forms of a gendered LEGO's known text, for its INTRODUCTION (Kai,
 * 2026-09-23 20:23Z: presentations stay in the female voice and quote both
 * forms — see presentation-author.cjs expandGenderedKnownSlot). Null when the
 * course has one known voice or the text is neutral, so every other course
 * renders its intros exactly as before.
 */
function genderedChunkForms(ctx, text) {
  if (!ctx || !ctx.wantsKnown || !ctx.index) return null
  const hit = ctx.index.get(normalizeKnownKey(text))
  return hit ? { f: hit.f, m: hit.m } : null
}

/** Canonical voice id ('cartesia_<uuid>' spelling) for a clip under the rule, or null to fall through. */
function knownVoiceIdForClip(ctx, clip) {
  const r = knownVoiceEntryForClip(ctx, clip)
  if (!r || !r.voice) return null
  const raw = r.voice.voiceId || r.voice.voice_id
  return raw ? tryCanonicalVoiceId(raw, { provider: r.voice.provider }) : null
}

module.exports = {
  M, F,
  buildKnownGenderContext,
  buildAnchorSet,
  knownVoiceEntryForClip,
  knownVoiceIdForClip,
  genderedChunkForms,
  normalizeKnownKey,
  fnv1a32,
  hashGender,
  buildKnownGenderIndex,
  knownGenderForText,
  counterpartForText,
  knownVoiceForGender,
  resolveKnownVoiceForText,
  voiceIdsForRole,
  roleHasGenderedVoices,
}
