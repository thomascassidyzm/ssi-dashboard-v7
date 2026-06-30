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
 * a voice; gender is only a tie-break. Where a native set lacks a gender (es and
 * it natives are all-male), we top the missing gender up from multilingual voices
 * carrying the same locale handle.
 */

const path = require('path')
const XAI = require(path.join(__dirname, 'pod-voices-xai.json'))      // { <lang>: [{voice_id,name,gender}], multilingual: [...] }
const AZURE = require(path.join(__dirname, 'pod-voices-azure.json'))  // { <locale>: { f:[...], m:[...] } }

// Multilingual voices usable as TARGET overflow. `leo` is reserved for the
// KNOWN pool, so it is excluded here to avoid the same voice playing a target
// character AND an English narration line (cross-track collision).
const MULTI = (XAI.multilingual || []).filter(v => v.voice_id !== 'leo')
const MULTI_F = MULTI.filter(v => v.gender === 'f')
const MULTI_M = MULTI.filter(v => v.gender === 'm')

function xaiVoice(v, locale) {
  return { provider: 'xai', voice_id: v.voice_id, name: v.name, gender: v.gender, locale }
}
function azureVoice(v) {
  return { provider: 'azure', voice_id: v.voice_id, name: v.name, gender: v.gender, locale: v.locale }
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
function elevenVoice(v, locale) {
  return { provider: 'elevenlabs', voice_id: v.voice_id, name: v.name, gender: v.gender, locale }
}

// -----------------------------------------------------------------------------
// KNOWN (English) pool — British only. xAI first, en-GB Azure for colour headroom.
// gfzdpspr5fdp (Tom) intentionally absent: reserved for the explainer narrator.
// -----------------------------------------------------------------------------
const KNOWN_POOL = {
  locale: 'en-GB',
  f: [
    { provider: 'xai',   voice_id: 'bedd6226',           name: 'Olivia', gender: 'f', locale: 'en' },
    { provider: 'azure', voice_id: 'en-GB-SoniaNeural',  name: 'Sonia',  gender: 'f', locale: 'en-GB' },
    { provider: 'azure', voice_id: 'en-GB-LibbyNeural',  name: 'Libby',  gender: 'f', locale: 'en-GB' },
    { provider: 'azure', voice_id: 'en-GB-HollieNeural', name: 'Hollie', gender: 'f', locale: 'en-GB' },
    { provider: 'azure', voice_id: 'en-GB-MaisieNeural', name: 'Maisie', gender: 'f', locale: 'en-GB' },
  ],
  m: [
    { provider: 'xai',   voice_id: 'leo',                name: 'Leo',    gender: 'm', locale: 'en' },
    { provider: 'azure', voice_id: 'en-GB-RyanNeural',   name: 'Ryan',   gender: 'm', locale: 'en-GB' },
    { provider: 'azure', voice_id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'm', locale: 'en-GB' },
    { provider: 'azure', voice_id: 'en-GB-AlfieNeural',  name: 'Alfie',  gender: 'm', locale: 'en-GB' },
  ],
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
  ita:    { native: 'it',    locale: 'it'    },          // natives all-male → F from multilingual
  jpn:    { native: 'ja',    locale: 'ja'    },
  kor:    { native: 'ko',    locale: 'ko'    },
  nld:    { native: 'nl',    locale: 'nl'    },
  pol:    { native: 'pl',    locale: 'pl'    },
  por_br: { native: 'pt',    locale: 'pt-BR' },          // native pt IS Brazilian
  rus:    { native: 'ru',    locale: 'ru'    },
  spa:    { native: 'es',    locale: 'es-ES' },          // natives all-male → F from multilingual; accent assumed Castilian (verify by ear like pt)
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
 * Returns { tier, provider, locale, f:[voice], m:[voice], human, humanPreferred, note }.
 * Each voice = { provider, voice_id, name, gender, locale }.
 */
function resolveTargetPool(targetLang) {
  const key = targetKey(targetLang)
  const e = TARGET[key]
  if (!e) {
    throw new Error(`pod-voice-coverage: no resolution for target "${targetLang}" (add it to TARGET)`)
  }
  if (e.human) {
    return { tier: 0, provider: 'human', locale: null, f: [], m: [], human: true,
             note: `${targetLang}: no xAI or Azure voice — human recording required` }
  }
  if (e.azure) {
    const pick = AZURE[e.azure] || { f: [], m: [] }
    let f = (pick.f || []).map(azureVoice)
    let m = (pick.m || []).map(azureVoice)
    // Premium top-up: ElevenLabs voices AFTER the native Azure (cheaper-first),
    // for thin languages that opt in — the colourer only reaches them when a
    // scene needs more colours than the native pool provides.
    if (e.eleven) {
      f = f.concat(ELEVEN_F.map(v => elevenVoice(v, e.azure)))
      m = m.concat(ELEVEN_M.map(v => elevenVoice(v, e.azure)))
    }
    return { tier: 3, provider: 'azure', locale: e.azure, f, m,
             humanPreferred: !!e.humanPreferred,
             note: `${targetLang}: Azure ${e.azure}${e.eleven ? ' + ElevenLabs top-up' : ''}${e.humanPreferred ? ' (course audio is human; pods fall back to Azure)' : ''}` }
  }
  if (e.multi) {
    const f = MULTI_F.map(v => xaiVoice(v, e.locale))
    const m = MULTI_M.map(v => xaiVoice(v, e.locale))
    return { tier: 2, provider: 'xai', locale: e.locale, f, m,
             note: `${targetLang}: xAI multilingual + ${e.locale}` }
  }
  // tier 1 native, topped up with multilingual where a gender is thin
  const nat = XAI[e.native] || []
  let f = nat.filter(v => v.gender === 'f').map(v => xaiVoice(v, e.locale))
  let m = nat.filter(v => v.gender === 'm').map(v => xaiVoice(v, e.locale))
  const toppedF = f.length === 0
  // multilingual overflow AFTER natives (natives preferred; multilingual only when a scene needs more colours)
  f = f.concat(MULTI_F.map(v => xaiVoice(v, e.locale)))
  m = m.concat(MULTI_M.map(v => xaiVoice(v, e.locale)))
  return { tier: 1, provider: 'xai', locale: e.locale, f, m,
           note: `${targetLang}: xAI native ${e.native}${toppedF ? ' (no native F → F from multilingual)' : ''}, locale ${e.locale}` }
}

// The known pool must speak the KNOWN language. English is the default and
// keeps its curated British pool (eng isn't in TARGET — English is never a
// target language). Any OTHER known language resolves exactly like a target,
// so e.g. _for_jpn pods get Japanese known voices instead of (wrong) English
// ones that produce empty (Azure) or wrong-language (xAI) audio.
function resolveKnownPool(knownLang) {
  const c = String(knownLang || 'eng').toLowerCase().trim()
  if (!knownLang || c === 'eng' || c === 'en') return { ...KNOWN_POOL }
  return resolveTargetPool(knownLang)
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
  TARGET, KNOWN_POOL, MULTI, XAI_EXPLAINER_LANGS,
}
