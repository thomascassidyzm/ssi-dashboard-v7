// Pure planning rules for the Tom-006 whole presentation intros (jobs #794 seeds 1-100 of deu/spa/fra/ita, #836 everything else up to 668).
// Tom 2026-10-12, r-2026-10-12-goal-by-the-23-oct-reset: all 668 seeds of the 11 premium X_for_eng courses get the English side in Tom-006.
const policy = require('../../services/shared/voicing-policy.cjs')
const BREAK = '<break time="300ms"/>'
// seeds 1-100 of these four belong to job #794 (its unit cs-long-794-all); this plan never touches them
const OWNED_BY_794 = ['deu_for_eng', 'spa_for_eng', 'fra_for_eng', 'ita_for_eng']
const defaultRange = course => ({ from: OWNED_BY_794.includes(course) ? 101 : 1, to: 668 })
/** The BASE language an intro names (spa_mx -> Spanish, por_br -> Portuguese): policy's introLanguageName on the course's target_lang. */
const langName = targetLang => policy.introLanguageName({ target_lang: targetLang })
/** "The German for: 'X', as in — 'ctx', is:" / bare form -> { x, ctx }; null when it does not parse. */
function parseIntro(text) {
  if (!text) return null
  const m = text.match(/^The (\w+) for:?\s*'(.*?)'\s*,?\s*-?\s*as in\s*[—-]?\s*'(.*)'\s*,\s*is:?\s*$/s)
  if (m) return { x: m[2], ctx: m[3] }
  const b = text.match(/^The (\w+) for:?\s*'(.*)'\s*,?\s*is:?\s*$/s)
  return b ? { x: b[2], ctx: null } : null
}
/** The as-in context survives only at intro-context score 3-5 (stripped at 1-2 and when unscored). */
const keepAsIn = (ctx, score) => !!(ctx && score >= 3 && score <= 5)
/** Hand-written intro that names a language but does not parse: keep its words, add the break tag (and fix the language name). null when it is not a "The X for" line. */
function handWritten(text, lang) {
  const m = text && text.match(/^The \w+ for\b(.*)$/s); if (!m) return null
  return `The ${lang} for${m[1].replace(/\s*<break[^>]*\/>\s*$/, '').trimEnd()} ${BREAK}`
}
function newText(oldText, lang, score) {
  const p = parseIntro(oldText)
  if (p) return { text: `The ${lang} for: '${p.x}'${keepAsIn(p.ctx, score) ? `, as in — '${p.ctx}'` : ''}, is: ${BREAK}`, x: p.x, ctx: p.ctx, keepAsIn: keepAsIn(p.ctx, score), hand: false }
  const h = handWritten(oldText, lang)
  return h ? { text: h, x: null, ctx: null, keepAsIn: false, hand: true } : null
}
module.exports = { BREAK, OWNED_BY_794, defaultRange, langName, parseIntro, keepAsIn, handWritten, newText }
