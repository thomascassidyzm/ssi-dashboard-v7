/**
 * NAMED VOICES — how a clip that carries no canonical voice id gets the voice
 * it really has, for the clip library (job #703, Tom 2026-09-29 00:49Z: "human
 * recordings are tracked as named voices … and enter the SAME library").
 *
 * Three kinds of clip were invisible to public.clip_index because
 * clip-identity.tryCanonicalVoiceId could not name their voice:
 *
 *   1. a person, unnamed — `legacy_import` (39k Welsh takes), `human`,
 *      `human_recording`. course_audio keeps that word; who spoke is recorded in
 *      human_clip_attribution, with its evidence, and read here.
 *   2. a person under an old spelling — `catrin_human`, `Aran`,
 *      `human_aran_cym_n_2`. language_recording_policy.voices lists these as the
 *      artist's `aliases`; that list is Tom's own and is the single source.
 *   3. a machine under its bare id — xAI custom voices filed as `b1a7441b97a1`
 *      where the same voice is `xai_b1a7441b97a1` everywhere else. The voices
 *      table names it (tts_engine = 'xai'), so the canonical spelling is derived,
 *      never guessed.
 *
 * And one kind was filed under the wrong WORDS: a gender-expanded take is stored
 * under its unexpanded label. clip_spoken_text holds what the clip says.
 *
 * NOTHING HERE WRITES course_audio. The resolvers only change which clip_index
 * entry a row answers to; an unresolved row stays unindexed and is counted as
 * awaiting a name, never given one by guess.
 */
const { tryCanonicalVoiceId } = require('./clip-identity.cjs')

/**
 * @param {object} src
 * @param {{voice_id:string, tts_engine?:string}[]} src.voices         the voices table
 * @param {{voices:object}[]} src.policyRows                           language_recording_policy rows
 * @param {Map<string,string>|{audio_id:string, voice_id:string}[]} [src.attributions]  audio_id → artist voice id
 * @param {Map<string,string>|{audio_id:string, spoken_text:string}[]} [src.spoken]     audio_id → spoken words
 */
function buildVoiceResolver({ voices = [], policyRows = [], attributions = new Map(), spoken = new Map() } = {}) {
  const toMap = (v, k, val) => (v instanceof Map ? v : new Map((v || []).map(r => [r[k], r[val]])))
  const attrib = toMap(attributions, 'audio_id', 'voice_id')
  const spokenBy = toMap(spoken, 'audio_id', 'spoken_text')

  // an artist's other spellings → the artist's own voice id
  const alias = new Map()
  for (const p of policyRows) {
    for (const entry of Object.values(p.voices || {})) {
      if (!entry || !entry.voiceId) continue
      const target = tryCanonicalVoiceId(entry.voiceId)
      if (!target) continue
      for (const a of entry.aliases || []) alias.set(a, target)
    }
  }

  // a bare provider id the voices table names → '<provider>_<id>'
  const bareXai = new Set(
    voices.filter(v => v.tts_engine === 'xai' && v.voice_id && !tryCanonicalVoiceId(v.voice_id)).map(v => v.voice_id))

  function voiceOf(row) {
    const attributed = attrib.get(row.id)
    if (attributed) return tryCanonicalVoiceId(attributed)
    const aliased = alias.get(row.voice_id)
    if (aliased) return aliased
    const own = tryCanonicalVoiceId(row.voice_id)
    if (own) return own
    if (bareXai.has(row.voice_id)) return `xai_${row.voice_id}`
    return null
  }

  const spokenText = row => spokenBy.get(row.id) || row.text

  return { voiceOf, spokenText, sizes: { attributed: attrib.size, aliases: alias.size, bareXai: bareXai.size, spoken: spokenBy.size } }
}

/**
 * Why a row a resolver could not name is still unnamed. `awaiting-name` is the
 * honest state of a legacy clip nobody has named yet; the rest are not people.
 */
function whyUnnamed(row) {
  if (['legacy_import', 'human', 'human_recording'].includes(row.voice_id) && row.origin === 'human') return 'awaiting-name'
  return 'not-a-voice'
}

const CHUNK = 100
const TTL_MS = 5 * 60 * 1000

/**
 * The same resolvers, for the WRITE side: every writer of clip_index that goes
 * through clip-index.writeThrough (a lookup's fallback, the in-tray, phase8's
 * write-back) files a clip under the identity the reconcile would give it, so the
 * nightly does not drop what a lookup just wrote and the lookup does not rewrite
 * what the nightly just dropped.
 *
 * Returns async rows => resolvers. The small tables (voices, the cast policy) are
 * cached five minutes; attributions and spoken-text verdicts are read only for the
 * rows in hand — the ones that could have one — in chunks small enough for a URL.
 * A read that fails yields null: the caller falls back to the plain canonical
 * identity it always used, never to a guess.
 */
function supabaseResolversFor(supabase, { log = console } = {}) {
  let base = null, at = 0
  const loadBase = async () => {
    const [v, p] = await Promise.all([
      supabase.from('voices').select('voice_id, tts_engine').limit(5000),
      supabase.from('language_recording_policy').select('language, voices'),
    ])
    if (v.error) throw new Error(v.error.message)
    if (p.error) throw new Error(p.error.message)
    base = { voices: v.data || [], policyRows: p.data || [] }; at = Date.now()
  }
  const chunked = async (table, cols, ids) => {
    const out = []
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data, error } = await supabase.from(table).select(cols).in('audio_id', ids.slice(i, i + CHUNK))
      if (error) throw new Error(error.message)
      out.push(...(data || []))
    }
    return out
  }
  return async rows => {
    try {
      if (!base || Date.now() - at > TTL_MS) await loadBase()
      const unnamedPerson = rows.filter(r => r.origin === 'human' && !tryCanonicalVoiceId(r.voice_id)).map(r => r.id)
      const gendered = rows.filter(r => r.origin === 'tts' && (r.role === 'target1' || r.role === 'target2')).map(r => r.id)
      const [attributions, spoken] = await Promise.all([
        unnamedPerson.length ? chunked('human_clip_attribution', 'audio_id, voice_id', unnamedPerson) : [],
        gendered.length ? chunked('clip_spoken_text', 'audio_id, spoken_text', gendered) : [],
      ])
      return buildVoiceResolver({ ...base, attributions, spoken })
    } catch (e) {
      log.warn && log.warn(`[clip-index] named-voice resolvers unavailable (${e.message}) — indexing under the plain identity`)
      return null
    }
  }
}

module.exports = { buildVoiceResolver, whyUnnamed, supabaseResolversFor }
