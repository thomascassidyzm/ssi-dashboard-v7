/**
 * Pod voice coverage map — the single source of truth for which voice pool,
 * TTS locale, and provider each course target language resolves to.
 *
 * Built 2026-06-07 from: live xAI catalog (71 voices, tools/pod-voices-xai.json),
 * xAI multilingual `language` handles (docs), and the live Azure catalog
 * (554 voices → tools/pod-voices-azure.json). Full rationale + the 58-language
 * classification: ~/Desktop/SSi-pod-voice-coverage-map.md.
 *
 * Resolution chain per TARGET track:
 *   Tier 1  xAI native voice for the language          (best; 19 languages)
 *   Tier 2  xAI multilingual + EXPLICIT locale handle  (regional variants: pt-PT, es-MX, ar-EG)
 *   Tier 3  Azure locale-specific voice                (the long minority-language tail)
 *   Tier 0  no TTS exists at all → human recording     (Breton, Scottish Gaelic, Yoruba)
 *
 * The KNOWN track is always English → the British pool below (no American, no
 * generic multilingual). Tom's own voice (gfzdpspr5fdp) is RESERVED for the
 * explainer narrator and deliberately kept out of the character known pool.
 *
 * Pools are gender-split for soft preference, but DISTINCTNESS > GENDER per Tom:
 * the colouring (tools/pod-voice-colour.cjs) guarantees conversants never share
 * a voice; gender is only a tie-break. Where a native set genuinely lacks a
 * gender, we top the missing gender up from multilingual voices carrying the
 * same locale handle.
 *
 * WHERE A VOICE'S GENDER COMES FROM (Tom, 2026-08-11). It is READ, never
 * assumed: `voices.gender` holds the PROVIDER's own word, filled by
 * tools/xai-voice-metadata-sync.cjs from GET /v1/tts/voices/{id} (and by the
 * Azure catalogue read in tools/pod-voice-pool-gender-audit.cjs). Call
 * `await loadVerifiedGenders()` before resolving a pool and every voice in
 * every tier — xAI native, xAI multilingual, Azure, ElevenLabs — carries the
 * gender the provider states; the JSON catalogues are only the fallback for a
 * voice the provider has stated nothing about.
 *
 * This file used to carry the opposite: a hard-coded "es and it natives are
 * all-male" belief, written into two comments and silently true in the data.
 * The 2026-08-11 metadata reconciliation proved it wrong — `hqxr4yub` (Luca,
 * it) is FEMALE by xAI's own answer — so an Italian scene was topping its
 * female slots up from multilingual voices while a native female voice sat
 * unused in the male list. No language is special-cased here any more: an
 * empty gender list is a fact about the data, discovered per resolve, and the
 * only thing that triggers a top-up.
 *
 * Resolving is READ-ONLY. Nothing in this module writes: no listening_pods,
 * no courses.voice_config, no app_config. Correcting a live cast is a separate,
 * deliberate run of the casting/approval flow.
 */

const path = require('path')
const XAI = require(path.join(__dirname, 'pod-voices-xai.json'))      // { <lang>: [{voice_id,name,gender}], multilingual: [...] }
const AZURE = require(path.join(__dirname, 'pod-voices-azure.json'))  // { <locale>: { f:[...], m:[...] } }

// Multilingual voices usable as TARGET overflow. `leo` is reserved for the
// KNOWN pool, so it is excluded here to avoid the same voice playing a target
// character AND an English narration line (cross-track collision).
const MULTI = (XAI.multilingual || []).filter(v => v.voice_id !== 'leo')

// -----------------------------------------------------------------------------
// Provider-verified gender — `voices.gender`, the provider's own word.
//
// A Map<voice_id, 'f'|'m'>, loaded once per process and then consulted by every
// resolve. NULL in the column means the provider has stated nothing (Tom's
// clone, which xAI 404s on) — such a voice is simply absent from the map and
// keeps whatever the JSON catalogue says, rather than becoming a guess.
//
// Not loaded (`null`) is deliberately distinct from loaded-and-empty: resolve
// still works without a database — the JSON catalogues are the fallback — and
// says so in `genderSource`, so a caller that forgot to load can tell.
// -----------------------------------------------------------------------------
let _verified = null

function defaultClient() {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
  const { createClient } = require('@supabase/supabase-js')
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}

/**
 * Read every provider-stated gender out of `voices` and cache it for this
 * process. SELECT only — this module never writes anything, anywhere.
 * Call it once before resolving pools in a casting run.
 */
async function loadVerifiedGenders({ client, reload = false } = {}) {
  if (_verified && !reload) return _verified
  const db = client || defaultClient()
  const { data, error } = await db.from('voices').select('voice_id,gender').not('gender', 'is', null)
  if (error) throw new Error(`pod-voice-coverage: load voices.gender: ${error.message}`)
  _verified = new Map((data || [])
    .filter(r => r.gender === 'f' || r.gender === 'm')
    .map(r => [r.voice_id, r.gender]))
  return _verified
}

/** Inject a gender map directly (tests, or a caller that already read the column). */
function setVerifiedGenders(map) {
  _verified = map == null ? null : new Map(map instanceof Map ? map : Object.entries(map))
}

/** What the CURRENT process knows: the loaded map, or null if nobody has loaded it. */
function verifiedGenders() {
  return _verified
}

// The provider's word if we have it, else the catalogue label we shipped with.
function genderOf(v, genders) {
  const g = genders && genders.get(v.voice_id)
  return g || v.gender
}

// Split any catalogue list into f/m by RESOLVED gender — the one place gender
// is decided, shared by every tier, so no tier can grow its own assumption.
function splitByGender(list, genders, make) {
  const out = { f: [], m: [] }
  for (const v of list) {
    const gender = genderOf(v, genders)
    if (gender !== 'f' && gender !== 'm') continue
    out[gender].push(make(v, gender))
  }
  return out
}

function xaiVoice(v, locale, gender) {
  return { provider: 'xai', voice_id: v.voice_id, name: v.name, gender: gender || v.gender, locale }
}
function azureVoice(v, gender) {
  return { provider: 'azure', voice_id: v.voice_id, name: v.name, gender: gender || v.gender, locale: v.locale }
}

// ElevenLabs multilingual_v2 voices — the PREMIUM top-up (Tom 2026-06-30). xAI
// (cheap) covers the Big 10 + ~20 langs and Azure fills native gaps; ElevenLabs
// is APPENDED only for thin languages that opt in (`eleven: true`), and only
// AFTER the cheaper voices — the colourer picks lowest-index first, so an
// ElevenLabs voice is used solely when a scene runs out of cheaper colours.
// (eleven_multilingual_v2 auto-detects language from the text.)
const ELEVEN_F = [
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'f' },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'f' },
]
const ELEVEN_M = [
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George',  gender: 'm' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'm' },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger',   gender: 'm' },
]
function elevenVoice(v, locale, gender) {
  return { provider: 'elevenlabs', voice_id: v.voice_id, name: v.name, gender: gender || v.gender, locale }
}

// -----------------------------------------------------------------------------
// KNOWN (English) pool — a SINGLE voice: Tom's xAI clone (Tom 2026-06-30).
// The English track is a comprehension aid / translator, not the drama — the
// target cast already carries "who's speaking", so per-character English voices
// added complexity for no real value. One consistent coach voice for ALL English
// (translations AND the "means …" breakdown glosses, which already use it).
// Both gender slots point to the same voice — the known track is a translator,
// not the character performing, so gender needn't track the speaker.
const TOM_CLONE_KNOWN = { provider: 'xai', voice_id: 'gfzdpspr5fdp', name: 'Tom', gender: 'm', locale: 'en' }
const KNOWN_POOL = {
  locale: 'en',
  f: [TOM_CLONE_KNOWN],
  m: [TOM_CLONE_KNOWN],
}

// -----------------------------------------------------------------------------
// TARGET map: course target_lang code (ISO 639-3 / SSi variant) → resolution.
//   tier 1: { native: '<xai lang key>', locale: '<tts handle>' }
//   tier 2: { multi: true, locale: '<tts handle>' }
//   tier 3: { azure: '<azure locale>' }
//   tier 0: { human: true }
// -----------------------------------------------------------------------------
const TARGET = {
  // ---- Tier 1: xAI native ----
  ara:    { native: 'ar',    locale: 'ar'    },          // Modern Standard Arabic
  dan:    { native: 'da',    locale: 'da'    },
  deu:    { native: 'de',    locale: 'de'    },
  fin:    { native: 'fi',    locale: 'fi'    },
  fra:    { native: 'fr',    locale: 'fr'    },
  hin:    { native: 'hi',    locale: 'hi'    },
  ita:    { native: 'it',    locale: 'it'    },
  jpn:    { native: 'ja',    locale: 'ja'    },
  kor:    { native: 'ko',    locale: 'ko'    },
  nld:    { native: 'nl',    locale: 'nl'    },
  pol:    { native: 'pl',    locale: 'pl'    },
  por_br: { native: 'pt',    locale: 'pt-BR' },          // native pt IS Brazilian
  rus:    { native: 'ru',    locale: 'ru'    },
  // ⚠️ The "assumed Castilian" here is NOT verified, and one Spanish pod cast
  // off this shape was rejected by ear on 2026-08-11: "the sampled pronunciation
  // is Mexican Spanish, but spa_for_eng is an IBERIAN Spanish course."
  // What that pod actually carried was the bare handle `es`, not `es-ES` — the
  // same region-stripping that made `por` render Brazilian — so the rejection
  // does not by itself convict the es-ES path below; nobody has heard it.
  // Until someone does, the live pool (app_config.pod_voice_pools.spa) leads
  // with the Azure es-ES pair Elvira/Alvaro, which is provider-guaranteed
  // "Spanish (Spain)" and what the spa_for_eng course itself is rendered on.
  // docs/pods/spa-cast-iberian-2026-08-11.md
  spa:    { native: 'es',    locale: 'es-ES' },
  swe:    { native: 'sv-SE', locale: 'sv'    },
  tha:    { native: 'th',    locale: 'th'    },
  tur:    { native: 'tr',    locale: 'tr'    },
  zho:    { native: 'zh-CN', locale: 'zh'    },

  // ---- Tier 2: xAI multilingual + explicit locale (regional variant) ----
  por:    { multi: true, locale: 'pt-PT' },             // SOLVED: native pt is Brazilian, pt-PT renders European
  spa_mx: { multi: true, locale: 'es-MX' },
  ara_eg: { multi: true, locale: 'ar-EG' },

  // ---- Tier 3: Azure floor (Tom: drop Austrian/Canadian + the tail to Azure) ----
  deu_at: { azure: 'de-AT' },
  fra_ca: { azure: 'fr-CA' },
  ara_lb: { azure: 'ar-LB' },
  ara_sy: { azure: 'ar-SY' },
  afr:    { azure: 'af-ZA' },
  bul:    { azure: 'bg-BG' },
  cat:    { azure: 'ca-ES' },
  ces:    { azure: 'cs-CZ' },
  cym:    { azure: 'cy-GB', humanPreferred: true },     // Welsh course audio is human; pods fall back to Azure cy-GB
  cym_n:  { azure: 'cy-GB', humanPreferred: true },
  cym_s:  { azure: 'cy-GB', humanPreferred: true },
  cym_anthem: { azure: 'cy-GB', humanPreferred: true },
  ell:    { azure: 'el-GR' },
  est:    { azure: 'et-EE' },
  eus:    { azure: 'eu-ES' },
  fas:    { azure: 'fa-IR' },
  gle:    { azure: 'ga-IE' },                           // Irish (Dublin-pitch language; pitch demo itself is Chinese=Tier1)
  heb:    { azure: 'he-IL' },
  hrv:    { azure: 'hr-HR', eleven: true },   // thin native catalogue (2 Azure) → ElevenLabs top-up for dialogue colours
  hun:    { azure: 'hu-HU' },
  hye:    { azure: 'hy-AM' },
  isl:    { azure: 'is-IS' },
  lav:    { azure: 'lv-LV' },
  lit:    { azure: 'lt-LT' },
  mkd:    { azure: 'mk-MK' },
  mlt:    { azure: 'mt-MT' },
  nep:    { azure: 'ne-NP' },
  nor:    { azure: 'nb-NO' },
  ron:    { azure: 'ro-RO' },
  srp:    { azure: 'sr-RS' },
  swa:    { azure: 'sw-KE' },
  ukr:    { azure: 'uk-UA' },

  // ---- Tier 0: no TTS exists → human recordings or text-only pods ----
  bre:    { human: true },
  gla:    { human: true },
  yor:    { human: true },
}

// Normalise a course target to its TARGET key. Accepts "por", "por_br",
// "spa_mx", and also full ISO 639-1 fallbacks. Region suffix preserved.
function targetKey(code) {
  const c = String(code || '').toLowerCase().trim()
  if (TARGET[c]) return c
  // strip trailing region only if base exists (don't collapse por_br→por)
  const base = c.split(/[-_]/)[0]
  if (TARGET[base]) return base
  return c
}

/**
 * Resolve the TARGET voice pool for a course target language.
 * Returns { tier, provider, locale, f:[voice], m:[voice], human, humanPreferred,
 *           genderSource, note }.
 * Each voice = { provider, voice_id, name, gender, locale }.
 *
 * Gender per voice comes from `voices.gender` when that has been loaded
 * (`await loadVerifiedGenders()`, or `opts.genders`), otherwise from the JSON
 * catalogue — `genderSource` says which. Read-only: resolving writes nothing.
 */
function resolveTargetPool(targetLang, opts = {}) {
  const key = targetKey(targetLang)
  const e = TARGET[key]
  if (!e) {
    throw new Error(`pod-voice-coverage: no resolution for target "${targetLang}" (add it to TARGET)`)
  }
  const genders = opts.genders === undefined ? _verified : opts.genders
  const genderSource = genders ? 'voices.gender' : 'catalogue'
  if (e.human) {
    return { tier: 0, provider: 'human', locale: null, f: [], m: [], human: true, genderSource,
             note: `${targetLang}: no xAI or Azure voice — human recording required` }
  }
  if (e.azure) {
    const pick = AZURE[e.azure] || { f: [], m: [] }
    // The catalogue ships f/m lists, but the LIST a voice sits in is not
    // evidence — its provider-stated gender is, exactly as for xAI. Re-split
    // both lists so a mislabelled Azure entry lands where the provider says.
    const split = splitByGender([...(pick.f || []), ...(pick.m || [])], genders,
                                (v, gender) => azureVoice(v, gender))
    let { f, m } = split
    // Premium top-up: ElevenLabs voices AFTER the native Azure (cheaper-first),
    // for thin languages that opt in — the colourer only reaches them when a
    // scene needs more colours than the native pool provides.
    if (e.eleven) {
      const ev = splitByGender([...ELEVEN_F, ...ELEVEN_M], genders, (v, gender) => elevenVoice(v, e.azure, gender))
      f = f.concat(ev.f)
      m = m.concat(ev.m)
    }
    return { tier: 3, provider: 'azure', locale: e.azure, f, m,
             humanPreferred: !!e.humanPreferred, genderSource,
             note: `${targetLang}: Azure ${e.azure}${e.eleven ? ' + ElevenLabs top-up' : ''}${e.humanPreferred ? ' (course audio is human; pods fall back to Azure)' : ''}` }
  }
  const multi = splitByGender(MULTI, genders, (v, gender) => xaiVoice(v, e.locale, gender))
  if (e.multi) {
    return { tier: 2, provider: 'xai', locale: e.locale, f: multi.f, m: multi.m, genderSource,
             note: `${targetLang}: xAI multilingual + ${e.locale}` }
  }
  // Tier 1 native, topped up with multilingual only where a gender is EMPTY.
  // Which languages those are is discovered from the data every time — there is
  // no list of "all-male" languages here, and there must never be one again.
  const nat = XAI[e.native] || []
  const split = splitByGender(nat, genders, (v, gender) => xaiVoice(v, e.locale, gender))
  const topped = ['f', 'm'].filter(g => split[g].length === 0)
  // multilingual overflow AFTER natives (natives preferred; multilingual only when a scene needs more colours)
  const f = split.f.concat(multi.f)
  const m = split.m.concat(multi.m)
  const toppedNote = topped.length
    ? ` (no native ${topped.map(g => g.toUpperCase()).join('/')} → from multilingual)`
    : ''
  return { tier: 1, provider: 'xai', locale: e.locale, f, m, genderSource,
           note: `${targetLang}: xAI native ${e.native}${toppedNote}, locale ${e.locale}` }
}

// The known pool must speak the KNOWN language. English is the default and
// keeps its curated British pool (eng isn't in TARGET — English is never a
// target language). Any OTHER known language resolves exactly like a target,
// so e.g. _for_jpn pods get Japanese known voices instead of (wrong) English
// ones that produce empty (Azure) or wrong-language (xAI) audio.
function resolveKnownPool(knownLang, opts = {}) {
  const c = String(knownLang || 'eng').toLowerCase().trim()
  // The English pool is one voice in BOTH slots by design (a translator, not a
  // character), so no gender lookup applies to it — there is nothing to split.
  if (!knownLang || c === 'eng' || c === 'en') return { ...KNOWN_POOL }
  return resolveTargetPool(knownLang, opts)
}

// The explainer narration (Tom's xAI clone, mostly the English gloss + quoted
// target tokens) sounds markedly better when the TARGET language is cued
// explicitly rather than left to language:'auto' — auto anglicises ambiguous
// tokens ("bien", "pain", "comment"). Tom-validated 2026-06-07. We can only cue
// languages the xAI multilingual model actually speaks; anything outside that
// set (the Azure-tier tail) falls back to 'auto' as best-effort.
const XAI_EXPLAINER_LANGS = new Set([
  'en', 'ar', 'ar-EG', 'ar-SA', 'ar-AE', 'zh', 'fr', 'de', 'hi', 'id', 'it',
  'ja', 'ko', 'pt-BR', 'pt-PT', 'ru', 'es-MX', 'es-ES', 'tr', 'vi',
])
function resolveExplainerLanguage(targetLang) {
  try {
    const p = resolveTargetPool(targetLang)
    if (p.locale && XAI_EXPLAINER_LANGS.has(p.locale)) return p.locale
  } catch (_) { /* unknown target → fall through */ }
  return 'auto'
}

module.exports = {
  resolveTargetPool, resolveKnownPool, resolveExplainerLanguage, targetKey,
  loadVerifiedGenders, setVerifiedGenders, verifiedGenders,
  TARGET, KNOWN_POOL, MULTI, XAI_EXPLAINER_LANGS,
}
