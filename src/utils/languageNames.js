/**
 * Language and course display names — the ONE place Popty turns a code into
 * words a human reads.
 *
 * Why this file exists: Popty used to render `pdc_for_eng` as "PDC for English
 * Speakers" because each screen carried its own little map of language names
 * and none of them had heard of Pennsylvania Dutch. Volunteers who check a
 * course (Doug and Erik on Pennsylvania Dutch) read a three-letter code as
 * jargon. Every display site now routes through `languageName()` /
 * `courseName()` here, so a language is named once and named everywhere.
 *
 * Resolution order, deliberately:
 *   1. CURATED — mirrored verbatim from the learner app's own curated names
 *      (ssi-learning-app packages/player-vue/src/locales/eng.json → languages),
 *      plus HOUSE entries for languages the learner app has no curated name for.
 *      A learner and a course-builder must never see two different words for
 *      the same language, so this map wins over everything below it.
 *   2. Intl.DisplayNames — the browser's own ICU names. Same second step the
 *      learner app takes. Covers anything we ship before anyone curates it.
 *   3. The /api/languages CSV names — fills gaps only; it never overrides a
 *      curated name, because that CSV exists for TTS locale mapping and its
 *      wording drifts from ours ("Hakka Chinese" where the house says "Hakka").
 *   4. The raw code, exactly as written. Showing the code is honest; showing
 *      nothing is not.
 *
 * This is DISPLAY ONLY. Nothing here is ever keyed on, stored, or sent back —
 * course codes, ids and language codes are untouched.
 */

import { ref } from 'vue'

/**
 * Mirrored verbatim from the learner app's curated language names.
 * If you change a name here, change it there too — the two products showing
 * different words for one language is the bug this file prevents.
 */
const CURATED = {
  amh: 'Amharic',
  ara: 'Arabic',
  aze: 'Azerbaijani',
  ben: 'Bengali',
  bos: 'Bosnian',
  bre: 'Breton',
  bul: 'Bulgarian',
  cat: 'Catalan',
  ces: 'Czech',
  cmn: 'Mandarin',
  cor: 'Cornish',
  cym: 'Welsh',
  cym_n: 'Welsh (North)',
  cym_s: 'Welsh (South)',
  dan: 'Danish',
  deu: 'German',
  ell: 'Greek',
  eng: 'English',
  est: 'Estonian',
  eus: 'Basque',
  fas: 'Persian',
  fil: 'Filipino',
  fin: 'Finnish',
  fra: 'French',
  gla: 'Scottish Gaelic',
  gle: 'Irish',
  glg: 'Galician',
  guj: 'Gujarati',
  hau: 'Hausa',
  heb: 'Hebrew',
  hin: 'Hindi',
  hrv: 'Croatian',
  hun: 'Hungarian',
  hye: 'Armenian',
  ind: 'Indonesian',
  isl: 'Icelandic',
  ita: 'Italian',
  jpn: 'Japanese',
  kat: 'Georgian',
  kor: 'Korean',
  kur: 'Kurdish',
  lav: 'Latvian',
  lit: 'Lithuanian',
  mkd: 'Macedonian',
  msa: 'Malay',
  nld: 'Dutch',
  nno: 'Norwegian (Nynorsk)',
  nob: 'Norwegian (Bokmål)',
  nor: 'Norwegian',
  pan: 'Punjabi',
  pol: 'Polish',
  por: 'Portuguese',
  ron: 'Romanian',
  rus: 'Russian',
  sin: 'Sinhala',
  slk: 'Slovak',
  slv: 'Slovenian',
  spa: 'Spanish',
  sqi: 'Albanian',
  srp: 'Serbian',
  swa: 'Swahili',
  swe: 'Swedish',
  tam: 'Tamil',
  tel: 'Telugu',
  tha: 'Thai',
  tur: 'Turkish',
  ukr: 'Ukrainian',
  urd: 'Urdu',
  vie: 'Vietnamese',
  yor: 'Yoruba',
  yue: 'Cantonese',
  zho: 'Chinese',
  zul: 'Zulu',

  // HOUSE — languages we build courses in that the learner app's curated map
  // does not name. Taken from the course's own display_name in the database,
  // which is the name the people who build and check the course use. Three of
  // them disagree with the browser's ICU name on purpose: ICU says
  // "Pennsylvania German", "Hakka Chinese" and "Min Nan Chinese"; the house
  // says Pennsylvania Dutch, Hakka and Taiwanese Hokkien.
  afr: 'Afrikaans',
  fur: 'Friulian',
  hak: 'Hakka',
  kan: 'Kannada',
  lmo: 'Lombard',
  mar: 'Marathi',
  mlt: 'Maltese',
  nan: 'Taiwanese Hokkien',
  nap: 'Neapolitan',
  nep: 'Nepali',
  pdc: 'Pennsylvania Dutch',
  rgn: 'Romagnol',
  roh: 'Romansh',
  scn: 'Sicilian',
  sme: 'Northern Sami',
  vec: 'Venetian',
  yid: 'Yiddish',

  // Regional variants that appear in course codes. The base code alone would
  // read "Arabic for English Speakers" for four different Arabics.
  ara_eg: 'Egyptian Arabic',
  ara_lb: 'Lebanese Arabic',
  ara_sy: 'Syrian Arabic',
  deu_at: 'Austrian German',
  deu_ch: 'Swiss German',
  fra_ca: 'Quebec French',
  por_br: 'Brazilian Portuguese',
  spa_mx: 'Mexican Spanish',

  // Not a language — a course slug that sits in the target position.
  cym_anthem: 'Welsh Anthem',
}

// Names from /api/languages (CSV-backed). Gap-fill only — see resolution order.
const apiNames = {}
let apiNamesLoaded = false

/**
 * Reactive counter, bumped when the API names land. Touch it inside a computed
 * that calls into this module so the computed re-evaluates once they do.
 */
export const nameVersion = ref(0)

/**
 * Fetch the CSV-backed name list. Safe to call repeatedly; runs once.
 * The API module reads localStorage as it loads, so it is pulled in here
 * rather than at the top of the file — that keeps this module importable
 * outside a browser (tests, tooling) where the curated names are all it needs.
 */
export async function loadLanguageNames() {
  if (apiNamesLoaded) return
  if (typeof window === 'undefined') return
  try {
    const { getApiUrl } = await import('../services/api')
    const res = await fetch(`${getApiUrl()}/api/languages?format=legacy`)
    if (!res.ok) return
    for (const lang of await res.json()) {
      if (lang.code && lang.name) apiNames[lang.code] = lang.name
    }
    apiNamesLoaded = true
    nameVersion.value++
  } catch {
    // Curated names cover everything we ship — a failed fetch changes nothing.
  }
}

// Intl.DisplayNames throws RangeError on anything that isn't a well-formed
// language tag, and every one of our variant codes (cym_n, por_br…) is one of
// those. Curated already answers for all of them; this is for codes we have
// never met.
function intlName(code) {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(code)
    if (name && name !== code) return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    // Unknown or malformed tag — fall through.
  }
  return null
}

/**
 * A language code as words. `pdc` → "Pennsylvania Dutch".
 * An unknown code comes back exactly as it went in.
 */
export function languageName(code) {
  if (!code) return ''
  void nameVersion.value

  if (CURATED[code]) return CURATED[code]

  const fromIntl = intlName(code)
  if (fromIntl) return fromIntl

  if (apiNames[code]) return apiNames[code]

  // Regional code we have not curated: fall back to the base language rather
  // than to the raw code — "Arabic" beats "ara_ma".
  const base = code.split('_')[0]
  if (base !== code) {
    if (CURATED[base]) return CURATED[base]
    const baseIntl = intlName(base)
    if (baseIntl) return baseIntl
    if (apiNames[base]) return apiNames[base]
  }

  return code
}

/**
 * A course code as words. `pdc_for_eng` → "Pennsylvania Dutch for English
 * Speakers". Anything that isn't a `{target}_for_{known}` code comes back
 * untouched.
 */
export function courseName(code) {
  if (!code || !code.includes('_for_')) return code || ''
  const i = code.indexOf('_for_')
  const target = code.slice(0, i)
  const known = code.slice(i + 5)
  return `${languageName(target)} for ${languageName(known)} Speakers`
}

/**
 * The name with the code kept alongside it, for the places where a builder
 * needs the identifier too: "Pennsylvania Dutch for English Speakers
 * (pdc_for_eng)". Falls back to the bare code when there is no name to add.
 */
export function courseNameWithCode(code) {
  if (!code) return ''
  const name = courseName(code)
  return name === code ? code : `${name} (${code})`
}

// Kick the API fetch off immediately; nothing waits on it.
loadLanguageNames()

/**
 * The two halves of a `{target}_for_{known}` code. Target may carry a region
 * (`ara_eg`, `por_br`), which is why this splits on `_for_` rather than on `_`.
 */
export function courseLangs(code) {
  const i = String(code || '').indexOf('_for_')
  if (i === -1) return { target: code || '', known: '' }
  return { target: code.slice(0, i), known: code.slice(i + 5) }
}

/**
 * Order two course codes the way an eye reads them: by TARGET language name,
 * then by KNOWN language name, then by the code itself so the order is total
 * and stable.
 *
 * Tom, 2026-08-29, of the Voice Lab's course picker: "this is a nightmare to
 * parse - and it is not even alphabetical by either target or known language".
 * It was ordered by seed_count, which is a fact about the database and not
 * about anything a human is looking for. Sorting on the DISPLAY names is the
 * point — the codes sort `zho` beside `zul` while the words sort "Chinese"
 * beside "Cornish", and it is the words that are on the screen.
 *
 * localeCompare, so accented names land where a reader expects them.
 */
export function compareCourseCodes(a, b) {
  void nameVersion.value
  const A = courseLangs(a)
  const B = courseLangs(b)
  const t = languageName(A.target).localeCompare(languageName(B.target), 'en')
  if (t) return t
  const k = languageName(A.known).localeCompare(languageName(B.known), 'en')
  if (k) return k
  return String(a || '').localeCompare(String(b || ''), 'en')
}

/**
 * A course list in that order. Non-mutating; `codeOf` reads the code off
 * whatever shape the caller's rows are (`code` here, `course_code` there).
 */
export function sortCourses(list, codeOf = (c) => c?.code || c?.course_code || '') {
  return [...(list || [])].sort((a, b) => compareCourseCodes(codeOf(a), codeOf(b)))
}
