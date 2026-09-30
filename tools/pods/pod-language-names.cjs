'use strict'
/**
 * The language a canonical-231 pod says the learner is learning — the ONE checked-in
 * lookup, and the gate that holds it.
 *
 * Five lines of the 231-sentence pod (33, 94, 95, 221, 226) name the language being
 * learnt ("I'm learning Egyptian Arabic", "Estoy aprendiendo catalán"). Everything else
 * in the pod is the same across courses, so these five are the only place a pod built
 * from a sibling can quietly tell a learner the WRONG language. Until job #952 the names
 * came from a throwaway --overrides file per build; now they live here.
 *
 * SHAPE: LANGUAGE_NAMES[<known language>][<target key>] = the name as it appears in the
 * KNOWN language's own text, dialect included. The known language is the part after
 * `_for_` in the course code, the target key the part before it (`ara_eg`, `fra_ca`,
 * `spa_mx` — dialect-bearing, so two dialects of one language can name themselves
 * differently). A name is a STEM: the gate does a substring test after stripping Arabic
 * vowel marks and case, because the same name inflects line to line ("catalán" is fine,
 * but Japanese "ドイツ語を", Arabic "بِالإِنْجِليزِيَّةِ" carry particles and vowelling).
 *
 * Seeded 2026-09-30 from what the 49 live/held 231-line pods already say. A known
 * language with no entry for a target key is REFUSED by the builder, never guessed:
 * add the line here, in the known language's own words, and the next build reads it.
 */

const LANGUAGE_NAMES = {
  eng: {
    ara: 'Arabic', ara_eg: 'Egyptian Arabic', ara_sy: 'Syrian Arabic', bul: 'Bulgarian', cat: 'Catalan',
    cym_n: 'Welsh', cym_s: 'Welsh', dan: 'Danish', deu: 'German', deu_at: 'German', ell: 'Greek',
    est: 'Estonian', eus: 'Basque', fas: 'Persian', fra: 'French', fra_ca: 'Canadian French',
    gle: 'Irish', heb: 'Hebrew', hin: 'Hindi', hrv: 'Croatian', hye: 'Armenian', isl: 'Icelandic',
    ita: 'Italian', jpn: 'Japanese', kor: 'Korean', lav: 'Latvian', lit: 'Lithuanian', nep: 'Nepali',
    nld: 'Dutch', nor: 'Norwegian', pol: 'Polish', por: 'Portuguese', por_br: 'Brazilian Portuguese',
    ron: 'Romanian', spa: 'Spanish', spa_mx: 'Mexican Spanish', swa: 'Swahili', swe: 'Swedish',
    tha: 'Thai', tur: 'Turkish', ukr: 'Ukrainian', zho: 'Chinese',
  },
  spa: { cat: 'catalán', eus: 'euskera', eng: 'inglés' },
  jpn: { deu: 'ドイツ語', fra: 'フランス語', ita: 'イタリア語', spa: 'スペイン語', zho: '中国語', eng: '英語' },
  ara: { eng: 'إنجليزي' },
  ben: { eng: 'ইংরেজি' },
  deu: { eng: 'Englisch' },
  fra: { eng: 'anglais' },
  guj: { eng: 'અંગ્રેજી' },
  hin: { eng: 'अंग्रेज़ी' },
  ita: { eng: 'inglese' },
  kor: { eng: '영어' },
  pan: { eng: 'ਅੰਗਰੇਜ਼ੀ' },
  por: { eng: 'inglês' },
  sin: { eng: 'ඉංග්‍රීසි' },
  tam: { eng: 'ஆங்கிலம்' },
  urd: { eng: 'انگریزی' },
  zho: { eng: '英文' },
}

/** The five lines of the canonical 231 that name the language being learnt. */
const LANGUAGE_NAME_LINES = [33, 94, 95, 221, 226]

/** Placeholders a draft carries until somebody writes the real name. */
const PLACEHOLDER = /\[\s*target\s+language\s*\]/i

/** `ara_eg_for_eng` → { targetKey: 'ara_eg', knownLang: 'eng' }; null if not a course code. */
function splitCourse (course) {
  const m = /^([a-z]{3}(?:_[a-z]{1,2})?)_for_([a-z]{3})$/.exec(String(course || ''))
  return m ? { targetKey: m[1], knownLang: m[2] } : null
}

/** The name this course's pod must use for its target, or null when nobody has written it. */
function languageNameFor (course) {
  const s = splitCourse(course)
  if (!s) return null
  return (LANGUAGE_NAMES[s.knownLang] || {})[s.targetKey] || null
}

// Compare on letters only: NFC, lower-case, Arabic vowel marks/shadda/tatweel dropped, Hindi nukta
// folded, apostrophes unified. Enough that an inflected or vowelled occurrence still contains its stem.
const fold = (t) => String(t == null ? '' : t)
  .normalize('NFD').replace(/[ً-ٰٟـ़]/g, '')
  .normalize('NFC').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim()

/**
 * Judge the five lines of one 231-sentence pod. Pure: no DB.
 *   course   — e.g. 'eng_for_spa'
 *   lines    — { 33: text, 94: text, … } the KNOWN-side text of the five lines
 *   siblings — [{ course, lines }] other courses with the SAME known language
 * Returns an array of plain-English problems; empty means fit.
 */
function checkLanguageNameLines ({ course, lines, siblings = [] }) {
  const problems = []
  const s = splitCourse(course)
  if (!s) return [`${course}: not a <target>_for_<known> course code`]
  const name = languageNameFor(course)
  if (!name) {
    problems.push(`${course}: no entry in tools/pods/pod-language-names.cjs for known "${s.knownLang}" / target "${s.targetKey}" — add the language's name as the known language writes it`)
  }
  for (const g of LANGUAGE_NAME_LINES) {
    const text = lines[g]
    if (!String(text == null ? '' : text).trim()) { problems.push(`line ${g}: blank`); continue }
    if (PLACEHOLDER.test(text)) { problems.push(`line ${g}: still carries [target language]`); continue }
    if (name && !fold(text).includes(fold(name))) problems.push(`line ${g}: does not name "${name}"`)
    for (const sib of siblings) {
      const other = splitCourse(sib.course)
      if (!other || other.knownLang !== s.knownLang || other.targetKey === s.targetKey || sib.course === course) continue
      // Two targets the lookup itself names identically (Welsh north/south, German/Austrian German)
      // legitimately share their five lines; it is only a fault when the names differ.
      if (name && fold(languageNameFor(sib.course)) === fold(name)) continue
      if (fold(sib.lines[g]) && fold(sib.lines[g]) === fold(text)) {
        problems.push(`line ${g}: identical to ${sib.course}, which teaches a different language`)
        break
      }
    }
  }
  return problems
}

/**
 * The same judgement for a pod's sentence rows (`{ global_order, known_text }`), applied only to
 * a canonical 231 — the 142-sentence legacy pods do not carry these five lines.
 */
function nameLineProblemsForRows ({ course, rows, siblings = [] }) {
  if (!rows || rows.length !== 231) return []
  const lines = {}
  for (const r of rows) if (LANGUAGE_NAME_LINES.includes(r.global_order)) lines[r.global_order] = r.known_text
  return checkLanguageNameLines({ course, lines, siblings })
}

/** Fetch the five known-side lines of every OTHER pod-1 / pod-1-231 of the same known language. */
async function loadSiblingLines (db, course) {
  const s = splitCourse(course)
  if (!s) return []
  const { rows } = await db.query(
    `select p.course_code, s.global_order, s.known_text
       from listening_pods p join listening_pod_sentences s on s.pod_id = p.id
      where p.course_code like $1 and p.course_code <> $2 and p.slug in ('pod-1','pod-1-231')
        and s.global_order = any($3::int[])`,
    [`%\\_for\\_${s.knownLang}`, course, LANGUAGE_NAME_LINES])
  const by = {}
  for (const r of rows) (by[r.course_code] ??= {})[r.global_order] = r.known_text
  return Object.entries(by).map(([c, l]) => ({ course: c, lines: l }))
}

module.exports = { LANGUAGE_NAMES, LANGUAGE_NAME_LINES, languageNameFor, splitCourse, checkLanguageNameLines, nameLineProblemsForRows, loadSiblingLines }
