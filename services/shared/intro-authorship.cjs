'use strict'
/**
 * INTRO AUTHORSHIP — the SOFT guard on hand-written LEGO intros, every course, every language.
 *
 * Kai, 2026-11-11 (job #247·AH): a hand-written intro ("The Spanish for: 'anywhere', as in —
 * 'have you seen my keys anywhere?', is:" — #212) can be quietly replaced by a later template
 * rebuild. The only guard that existed (human-authored-presentations.cjs, Kai's 2026-09-21 ruling)
 * is HARD — a DB trigger refuses any other words — and the only tool that ever placed that mark
 * marked two German lines. Kai wants it GENERAL and SOFT:
 *
 *   • When a rebuild/rewrite would replace an intro that carries hand-authored wording — an
 *     "as in" clause, a line no template produces, or a mark — do NOT block.
 *   • WARN: show the old line and the new one.
 *   • SUGGEST carrying the old "as in" example into the new line, but only where it still makes
 *     sense: a rewrite may have changed the LEGO, and an example that no longer contains the
 *     words being introduced must not be carried (intro-mirror.cjs's rule: a context has to
 *     demonstrate its chunk). Then the warning says so, and suggests nothing.
 *
 * Everything here is pure: it takes texts, the course's compiled templates and an optional mark,
 * and returns a warning object or null. Callers (phase8 /regenerate-presentations, /generate's
 * authoring step, /regenerate-presentation, the Script Viewer) report it; nothing here writes.
 *
 * WHY "AS IN" COUNTS EVEN THOUGH THE TEMPLATE ALSO WRITES ONE. Frame B of the template is itself
 * an as-in line, so an as-in clause alone does not prove a human wrote it. It does not need to: a
 * rebuild of an UNCHANGED template line produces the same words (the context pick is
 * deterministic per lego_id) and no warning fires, so the warnings concentrate on lines whose
 * example is about to change — hand-written or not, losing an example the learner was hearing is
 * worth one line of warning. Kai asked for exactly this signal.
 *
 * SSML. Live intros carry `<break time="300ms"/>` tails (spa_for_eng, 1,401 of 1,412 lines on
 * 2026-11-11), which no template matches; markup is stripped before any parsing or comparison.
 */

const { compileTemplate, parseIntro, containsWords, quotes, exact } = require('./intro-mirror.cjs')
const { renderIntro, introChunk } = require('../phases/presentation-author.cjs')

/** Remove SSML/markup tags and collapse whitespace. */
function stripMarkup(text) {
  return String(text == null ? '' : text).replace(/<[^>]{1,200}>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Same words for warning purposes: markup-free, apostrophe-normalised, whitespace-collapsed, case kept. */
function sameIntroWords(a, b) {
  return exact(stripMarkup(a)) === exact(stripMarkup(b))
}

// The "as in" marker in every known language a template has used (presentation-author.cjs
// SEED_CLAUSE_PATTERNS), plus English "like" — Kai's own free lines use it ("…in a negative
// phrase like 'I didn't go anywhere', is:", ita S0376L02).
const LATIN_MARKERS = ['as in', 'like', 'como en', 'comme dans', 'wie in', 'como em', 'come in', 'fel yn', 'kaip', 'كما في']
const OPEN_Q = `['‘"“「]`
const CLOSE_Q = `['’"”」]`
const MARKER_RE = new RegExp(
  `(?:^|[^\\p{L}])(?:${LATIN_MARKERS.map(m => m.replace(/\s+/g, '\\s+')).join('|')})\\s*[—–-]?\\s*${OPEN_Q}(.+?)${CLOSE_Q}(?=\\s*[,，、—–:;.!?]|\\s*$|\\s+\\p{L})`,
  'iu')
// CJK quotes nest no further: the example is the last quoted run before the particle.
const CJK_POSTFIX_RE = new RegExp(`${OPEN_Q}([^'‘’"“”「」]+)${CLOSE_Q}\\s*(?:のように|처럼)`, 'u')
const CJK_PREFIX_RE = new RegExp(`如\\s*${OPEN_Q}([^'‘’"“”「」]+)${CLOSE_Q}`, 'u')

/**
 * The "as in" example an intro line carries, or null. Template parse first (exact for template
 * lines), then the marker patterns (free lines a human wrote).
 * @param {string} text
 * @param {object[]} [compiled]  compileTemplate() output for the course's templates
 */
function parseAsIn(text, compiled = []) {
  const t = stripMarkup(text)
  if (!t) return null
  if (compiled.length) {
    const p = parseIntro(t, compiled)
    if (p && p.frame === 'B' && p.seed != null && String(p.seed).trim()) return String(p.seed).trim()
  }
  for (const re of [MARKER_RE, CJK_POSTFIX_RE, CJK_PREFIX_RE]) {
    const m = re.exec(t)
    if (m && m[1] && m[1].trim()) return m[1].trim()
  }
  return null
}

/** Compile every template of a course's known language (array of strings) for parseAsIn. */
function compileAll(templates, knownLang = null) {
  return (templates || []).filter(Boolean).flatMap(t => compileTemplate(t, { knownLang }))
}

/**
 * What marks this line as hand-authored wording.
 *   asIn       the "as in" example, or null
 *   freeForm   no template parses it (only judged when templates were supplied)
 *   marked     'hard' | 'soft' | null — the human_authored_presentations mark, if any
 *   handAuthored  any of the three
 */
function authorshipSignals(text, { compiled = [], mark = null } = {}) {
  const t = stripMarkup(text)
  const asIn = parseAsIn(t, compiled)
  const freeForm = !!t && compiled.length > 0 && (() => {
    const p = parseIntro(t, compiled)
    return !p || p.frame === 'free'
  })()
  const marked = mark ? (mark.guard === 'soft' ? 'soft' : 'hard') : null
  return { asIn, freeForm, marked, handAuthored: !!(asIn || freeForm || marked) }
}

/**
 * THE SOFT GUARD. Would replacing `oldText` with `newText` lose hand-authored wording?
 * Returns null (nothing to say) or a warning:
 *   { lego_id, kind: 'as-in'|'hand-written'|'marked', marked, old, new, old_example,
 *     new_example, example_still_fits, suggestion, message }
 * It never blocks — callers report it and carry on.
 *
 * @param {object} o
 * @param {string} o.legoId
 * @param {string|null} o.oldText    the line the learner hears now (null if no rendered row)
 * @param {string} o.newText         the line the rebuild would write
 * @param {string} o.knownText       the LEGO's CURRENT known text
 * @param {object} [o.mark]          human_authored_presentations row (soft or hard)
 * @param {object[]} [o.compiled]    compileAll(templates)
 * @param {string} [o.template]      the active template, to render a suggestion
 * @param {string} [o.targetLangName]
 * @param {string} [o.knownLang]
 */
function rewriteWarning({ legoId, oldText = null, newText, knownText, mark = null, compiled = [], template = null, targetLangName = null, knownLang = null }) {
  // Nothing is replaced when the learner already hears the new words — whatever a mark says.
  if (oldText && newText && sameIntroWords(oldText, newText)) return null
  // The words of record: a mark's (it outlives the row), else the line heard now.
  const reference = (mark && mark.text) || oldText
  if (!reference || !newText) return null
  if (sameIntroWords(reference, newText)) return null

  const sig = authorshipSignals(reference, { compiled, mark })
  if (!sig.handAuthored) return null

  const chunk = introChunk(knownText)
  const newAsIn = parseAsIn(newText, compiled)
  const kind = sig.marked ? 'marked' : (sig.asIn ? 'as-in' : 'hand-written')

  // The example survives the rewrite word for word: nothing hand-written is lost unless a mark
  // says the whole line is someone's.
  if (sig.asIn && newAsIn && sameIntroWords(sig.asIn, newAsIn) && !sig.marked) return null

  let fits = null
  let suggestion = null
  let advice
  if (sig.asIn) {
    fits = !!chunk && containsWords(sig.asIn, chunk)
    if (fits) {
      if (template && targetLangName) {
        suggestion = renderIntro({ frame: 'B', template, targetLangName, chunk, seed: sig.asIn, knownLang })
      } else if (newAsIn) {
        suggestion = stripMarkup(newText).replace(newAsIn, sig.asIn)
      }
      advice = suggestion
        ? `the old example still contains '${chunk}' — suggest carrying it: "${suggestion}"`
        : `the old example still contains '${chunk}' — carry it into the new line by hand`
    } else {
      advice = `the old example '${sig.asIn}' no longer contains '${chunk}' (the LEGO has changed), so it cannot simply be carried — write a new example by hand, or accept the new line`
    }
  } else {
    // A free line or a marked line with no as-in: the old words are the suggestion if they
    // still name the LEGO; otherwise only a person can rewrite them.
    fits = !!chunk && quotes(stripMarkup(reference), chunk)
    if (fits) {
      suggestion = stripMarkup(reference)
      advice = `the old wording still quotes '${chunk}' — suggest keeping it`
    } else {
      advice = `the old wording no longer quotes '${chunk}' (the LEGO has changed) — reword it by hand, or accept the new line`
    }
  }

  const what = kind === 'marked' ? `a ${sig.marked}-marked hand-authored line${mark && mark.author ? ` (${mark.author})` : ''}`
    : kind === 'as-in' ? `an intro with an "as in" example` : 'a hand-written intro (no template produces it)'
  return {
    lego_id: legoId,
    kind,
    marked: sig.marked,
    old: stripMarkup(reference),
    new: stripMarkup(newText),
    old_example: sig.asIn,
    new_example: newAsIn,
    example_still_fits: fits,
    suggestion,
    message: `WARNING ${legoId}: this would replace ${what}. Old: "${stripMarkup(reference)}" New: "${stripMarkup(newText)}" — ${advice}. Not blocked.`,
  }
}

// ─── The one IO helper every rebuild path calls ─────────────────────────────────────────────

/**
 * Everything a caller needs to judge a course's intros: every template the course's known
 * language has (an old line from a retired template is still a template line, not a human's),
 * the active one (to render a suggestion), the localised target name, and the soft marks.
 * Never throws: a guard that only warns must not take a rebuild down — an unreadable piece is
 * reported in `problems` and the warnings are made from what could be read.
 */
async function loadIntroContext(supabase, course, { activeTemplate = null } = {}) {
  const { localisedLangName } = require('../phases/presentation-author.cjs')
  const problems = []
  let templates = []
  try {
    const { data, error } = await supabase.from('presentation_templates')
      .select('template, is_active, priority').eq('known_lang', course.known_lang)
    if (error) throw error
    templates = (data || []).sort((a, b) => (b.is_active - a.is_active) || ((b.priority || 0) - (a.priority || 0))).map(t => t.template)
  } catch (e) { problems.push(`templates unreadable: ${e.message}`) }
  if (activeTemplate && !templates.includes(activeTemplate)) templates.unshift(activeTemplate)
  let softMarks = new Map()
  try {
    softMarks = await require('./human-authored-presentations.cjs').loadMarks(supabase, course.course_code, null, { soft: true })
  } catch (e) { problems.push(`soft marks unreadable: ${e.message}`) }
  let targetLangName = null
  try { targetLangName = localisedLangName(course.target_lang, course.known_lang) } catch (_) { /* no suggestion text then */ }
  return {
    compiled: compileAll(templates, course.known_lang),
    template: activeTemplate || templates[0] || null,
    targetLangName, knownLang: course.known_lang, softMarks, problems,
  }
}

/**
 * Warnings for a batch of proposed rewrites. items: [{ lego_id, oldText, newText, knownText }].
 * A LEGO under a HARD mark is skipped — that guard already substitutes the human's words.
 */
function warningsFor(ctx, items, { hardMarkedIds = null } = {}) {
  const out = []
  for (const it of items || []) {
    if (hardMarkedIds && hardMarkedIds.has(it.lego_id)) continue
    const w = rewriteWarning({
      legoId: it.lego_id, oldText: it.oldText || null, newText: it.newText, knownText: it.knownText,
      mark: ctx.softMarks.get(it.lego_id) || null, compiled: ctx.compiled,
      template: ctx.template, targetLangName: ctx.targetLangName, knownLang: ctx.knownLang,
    })
    if (w) out.push(w)
  }
  return out
}

/** One plain line for logs and progress feeds. */
function summariseWarnings(warnings) {
  if (!warnings || !warnings.length) return null
  const fits = warnings.filter(w => w.suggestion).length
  return `${warnings.length} intro(s) carrying hand-authored wording would be replaced (not blocked): ${fits} with a suggestion to carry the old wording, ${warnings.length - fits} where it no longer fits the LEGO. See introWarnings.`
}

module.exports = {
  stripMarkup, sameIntroWords, parseAsIn, compileAll, authorshipSignals, rewriteWarning,
  loadIntroContext, warningsFor, summariseWarnings,
}
