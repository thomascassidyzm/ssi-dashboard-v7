/**
 * Pure text transforms encoding SSi mechanical-fix methodology.
 *
 * All functions here are pure (string in → result out, no I/O), so they are
 * trivially unit-testable and reused by the batch operations. They deliberately
 * REFUSE to guess where a human judgement is required (e.g. which side of a
 * slash to keep) — those return options for the caller to choose, rather than
 * silently picking one.
 *
 * Methodology references (agent memory):
 *  - feedback_parens_slashes_both_sides : scan known AND target
 *  - feedback_no_slashes_use_seed       : slashes need a chosen single form
 *  - feedback_question_marks            : questions end with ? even if LEGO has none
 *  - arabic_punctuation_rtl             : use ؟ (and ،) for Arabic/RTL, not ASCII
 *  - qmark-apply-language-punctuation-bug: ¿ only for Spanish
 *  - feedback_first_letter_lowercase    : phrases start lowercase unless proper noun/I/German noun
 */

// RTL / Arabic-family target languages that use the Arabic question mark.
const ARABIC_QMARK_LANGS = new Set(['ara', 'fas', 'urd', 'pus', 'snd', 'uig', 'ckb'])
// Languages that use inverted opening punctuation.
const SPANISH_QMARK_LANGS = new Set(['spa'])

// Cap input length before regex work — guards against super-linear backtracking
// on pathological bracket-heavy input (red-team BUG 6). Real fields are short.
const STRIP_MAX = 2000

/**
 * Strip parenthetical glosses: "want (to)" → "want". ROUND parens only — ( ) and
 * the fullwidth （ ）. We deliberately do NOT touch [ ] or 【 】: those carry real
 * content ("[sic]", "array[0]", CJK 【note】) and stripping them is data loss
 * (red-team BUG 3). Returns { text, changed }. Refuses to empty a non-empty field.
 */
function stripParens(input) {
  if (typeof input !== 'string') return { text: input, changed: false }
  if (input.length > STRIP_MAX) return { text: input, changed: false }
  const stripped = input
    .replace(/\s*[(（][^)）]*[)）]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // Never destroy a field outright (e.g. "(whole thing)" → "").
  if (stripped === '' && input.trim() !== '') return { text: input, changed: false }
  return { text: stripped, changed: stripped !== input }
}

/**
 * Detect slash-separated alternatives like "他/她" or "you (formal)/you".
 * We never auto-pick — the caller must choose, per feedback_no_slashes_use_seed.
 * Returns { hasSlash, options } where options is the split list (trimmed).
 * Ignores slashes inside obvious non-alternation contexts (URLs, dates n/n) only
 * when surrounded by digits — kept conservative.
 */
function detectSlashOptions(input) {
  if (typeof input !== 'string' || !input.includes('/')) {
    return { hasSlash: false, options: [] }
  }
  // Numeric slashes (dates, fractions): 1/2, 24/7 — not alternations.
  const onlyNumeric = /^\s*\d+\s*\/\s*\d+\s*$/.test(input)
  if (onlyNumeric) return { hasSlash: false, options: [] }
  const options = input.split('/').map((s) => s.trim()).filter(Boolean)
  return { hasSlash: options.length > 1, options }
}

/**
 * Choose one side of a slash alternation. `chosen` must be one of the detected
 * options (exact, trimmed). Returns { text, changed } or throws if invalid.
 */
function applySlashChoice(input, chosen) {
  const { hasSlash, options } = detectSlashOptions(input)
  if (!hasSlash) return { text: input, changed: false }
  if (!options.includes(chosen)) {
    const err = new Error(`Chosen form "${chosen}" is not one of: ${options.join(', ')}`)
    err.code = 'INVALID_SLASH_CHOICE'
    throw err
  }
  return { text: chosen, changed: chosen !== input }
}

const TERMINAL_PUNCT = /[?？؟!！.。…]+$/

/** Strip any trailing terminal punctuation (for re-deriving). */
function stripTerminalPunct(input) {
  return String(input).replace(TERMINAL_PUNCT, '').trim()
}

/**
 * Ensure a question ends with the correct terminal mark for the target language.
 * - Arabic-family → ؟
 * - Spanish → ¿…? (adds opening ¿ if absent)
 * - everything else → ?
 * Returns { text, changed }. No-op if it already ends with the right mark.
 */
function ensureQuestionMark(input, targetLang) {
  if (typeof input !== 'string' || !input.trim()) return { text: input, changed: false }
  const lang = (targetLang || '').toLowerCase()
  const mark = ARABIC_QMARK_LANGS.has(lang) ? '؟' : '?'
  const base = stripTerminalPunct(input)
  let out = `${base}${mark}`
  if (SPANISH_QMARK_LANGS.has(lang) && !out.startsWith('¿')) {
    out = `¿${out}`
  }
  return { text: out, changed: out !== input }
}

/**
 * True if two strings differ ONLY by terminal/punctuation/case — used to decide
 * whether an edit affects TTS output (memory feedback_audio_null_only_when_tts_affected).
 * A pure period/case change does NOT require nulling audio; ? / ! does.
 */
function isPunctuationOnlyDiff(a, b) {
  const norm = (s) => stripTerminalPunct(String(s)).toLowerCase().replace(/\s+/g, ' ').trim()
  return norm(a) === norm(b)
}

/**
 * Does a text change affect TTS output (→ audio must be nulled/regenerated)?
 * Per memory feedback_audio_null_only_when_tts_affected:
 *   - trailing period/ellipsis + case + whitespace only → cosmetic, NO null
 *   - adding/removing ? or ! , or any word change → affects audio, MUST null
 */
function affectsAudio(oldText, newText) {
  if (oldText === newText) return false
  // Strip trailing sentence-final period variants (ASCII . … , CJK 。, fullwidth ．)
  // — these don't change speech. ? and ! are intentionally NOT stripped: they DO
  // affect TTS and must trigger regen (memory feedback_audio_null_only_when_tts_affected).
  const cosmetic = (s) => String(s).replace(/[.。．…]+$/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
  return cosmetic(oldText) !== cosmetic(newText)
}

/**
 * Lowercase the first letter unless told to preserve it (proper noun, "I",
 * German noun). Conservative: only transforms when force=true, since we cannot
 * reliably detect proper nouns here. Returns { text, changed }.
 */
function lowercaseFirst(input, { force = false } = {}) {
  if (typeof input !== 'string' || !input || !force) return { text: input, changed: false }
  const first = input[0]
  const lowered = first.toLowerCase()
  if (lowered === first) return { text: input, changed: false }
  const out = lowered + input.slice(1)
  return { text: out, changed: true }
}

module.exports = {
  ARABIC_QMARK_LANGS,
  SPANISH_QMARK_LANGS,
  stripParens,
  detectSlashOptions,
  applySlashChoice,
  stripTerminalPunct,
  ensureQuestionMark,
  isPunctuationOnlyDiff,
  affectsAudio,
  lowercaseFirst,
}
