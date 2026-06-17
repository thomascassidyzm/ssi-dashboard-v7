/**
 * Impact analysis — "responsible editing" enforcement.
 *
 * Editing course content has downstream consequences an agent can easily miss.
 * Before a LEGO / seed / phrase edit is applied, the analyzer surfaces them as a
 * structured report, and the operation layer REFUSES to proceed until the agent
 * acknowledges the exact report (by echoing back its `ackToken`). Block-severity
 * impacts (a genuine ZUT clash) need a second explicit override.
 *
 * Impact types:
 *  - downstream_phrases  : phrases quoting the LEGO's OLD text (lego-rename-downstream-audit)
 *  - zut_clash           : another LEGO maps the same known_text → a different target (BLOCK)
 *  - component_mismatch  : an M-LEGO component no longer tiles into the new target
 *  - presentation_regen  : known_text changed → presentation narration text is stale
 *  - seed_cascade        : seed edit → review its LEGOs (and their phrases)
 *  - tiling_break        : a LEGO target no longer appears in the new seed translation
 *  - lego_drift          : an edited phrase no longer contains its own LEGO's target
 *
 * Severity: 'info' (FYI) · 'warn' (must acknowledge) · 'block' (ack + override).
 */

const crypto = require('crypto')

const MAX_ITEMS = 50 // cap listed items; `count` always reports the true total

function rank(sev) { return { info: 0, warn: 1, block: 2 }[sev] ?? 0 }
function contains(haystack, needle) {
  return typeof haystack === 'string' && typeof needle === 'string' && needle.length > 0 && haystack.includes(needle)
}
function sharedPrefixLen(a, b) {
  const m = Math.min(a.length, b.length)
  let n = 0
  while (n < m && a[n] === b[n]) n++
  return n
}
/**
 * Heuristic "related form" detector: does any token of `text` share a long
 * enough stem with `base` (a conjugation/declension) without containing it
 * exactly? Cheap stand-in for a lemmatizer; only used for info-level hints.
 */
function hasRelatedForm(text, base) {
  if (typeof text !== 'string' || typeof base !== 'string' || base.length < 4) return false
  const b = base.toLowerCase()
  const need = Math.max(4, Math.ceil(b.length * 0.6))
  for (const tok of text.toLowerCase().split(/\s+/)) {
    if (!tok || tok === b) continue
    if (sharedPrefixLen(tok, b) >= Math.min(need, b.length)) return true
  }
  return false
}

function buildReport(impacts) {
  const present = impacts.filter(Boolean)
  const maxSeverity = present.reduce((m, i) => (rank(i.severity) > rank(m) ? i.severity : m), 'info')
  const requiresAck = present.some((i) => i.severity === 'warn' || i.severity === 'block')
  // Stable hash over the SEMANTIC content (type + sorted item ids + key message),
  // so the token only changes when the actual impacts change.
  const digestInput = JSON.stringify(
    present.map((i) => ({
      type: i.type,
      severity: i.severity,
      ids: (i.items || []).map((x) => x.id || x.lego_id || x.key).sort(),
    }))
  )
  const ackToken = crypto.createHash('sha1').update(digestInput).digest('hex').slice(0, 12)
  return { impacts: present, maxSeverity, requiresAck, ackToken }
}

function listImpact(type, severity, message, items) {
  return { type, severity, message, count: items.length, items: items.slice(0, MAX_ITEMS) }
}

class ImpactAnalyzer {
  constructor(editor) { this.editor = editor }

  async forLegoEdit(courseCode, cur, fields) {
    const impacts = []
    const knownChanging = fields.known_text !== undefined && fields.known_text !== cur.known_text
    const targetChanging = fields.target_text !== undefined && fields.target_text !== cur.target_text
    const newKnown = knownChanging ? fields.known_text : cur.known_text
    const newTarget = targetChanging ? fields.target_text : cur.target_text

    if (knownChanging || targetChanging) {
      // 1. Downstream phrases quoting the OLD text.
      const phrases = await this.editor.select('course_practice_phrases', { course_code: courseCode })
      const hits = []
      for (const p of phrases) {
        const inKnown = knownChanging && contains(p.known_text, cur.known_text)
        const inTarget = targetChanging && contains(p.target_text, cur.target_text)
        if (inKnown || inTarget) {
          hits.push({ id: p.id, known_text: p.known_text, target_text: p.target_text, matched: inKnown && inTarget ? 'both' : inKnown ? 'known' : 'target' })
        }
      }
      if (hits.length) {
        impacts.push(listImpact('downstream_phrases', 'warn',
          `${hits.length} phrase(s) contain the LEGO's old text. Review each: it may need the same edit, or the quote may now be wrong.`, hits))
      }

      // Related forms (info): phrases with a conjugation/declension of the OLD
      // target that exact-substring matching misses (e.g. LEGO "quiero" → phrase
      // "quieres"). Both UX agents asked for this. info-level, non-gating.
      if (targetChanging && cur.target_text && cur.target_text.length >= 4) {
        const seenIds = new Set(hits.map((h) => h.id))
        const related = []
        for (const p of phrases) {
          if (seenIds.has(p.id)) continue
          if (hasRelatedForm(p.target_text, cur.target_text)) {
            related.push({ id: p.id, target_text: p.target_text, stem_of: cur.target_text })
          }
        }
        if (related.length) {
          impacts.push(listImpact('related_forms', 'info',
            `${related.length} phrase(s) may contain a related form (conjugation/declension) of the old target "${cur.target_text}". Not an exact match — review if a verb/noun swap should carry over.`, related))
        }
      }
    }

    // 2. ZUT clash — another LEGO maps the (prospective) known_text to a different target.
    const legos = await this.editor.select('course_legos', { course_code: courseCode })
    const clashers = legos.filter((l) => l.id !== cur.id && l.known_text === newKnown && l.target_text !== newTarget)
    if ((knownChanging || targetChanging) && clashers.length) {
      impacts.push(listImpact('zut_clash', 'block',
        `ZUT conflict: known_text "${newKnown}" already maps to a different target in this course. Same known → different target confuses learners. Resolve (expand/rename/mark is_new=false) or override deliberately (e.g. gender pair).`,
        clashers.map((l) => ({ id: l.id, lego_id: l.lego_id, known_text: l.known_text, target_text: l.target_text }))))
    }

    // 3. Component tiling — M-LEGO components must still appear in the new target.
    if (targetChanging && cur.type === 'M' && Array.isArray(cur.components)) {
      const broken = cur.components.filter((c) => c && c.target && !contains(newTarget, c.target))
      if (broken.length) {
        impacts.push(listImpact('component_mismatch', 'warn',
          `${broken.length} component(s) no longer appear in the new target — the LEGO may no longer tile from its components. Review the decomposition.`,
          broken.map((c, i) => ({ id: `${cur.lego_id}#c${i}`, known: c.known, target: c.target }))))
      }
    }

    // 4. Presentation narration is stale when known_text changes.
    if (knownChanging) {
      impacts.push(listImpact('presentation_regen', 'warn',
        `known_text changed: the presentation narration ("The {lang} for '${cur.known_text}', as in '…', is:") is now stale and must be regenerated (presentation_audio_id will be nulled).`,
        [{ id: cur.lego_id, old: cur.known_text, new: newKnown }]))
    }

    return buildReport(impacts)
  }

  async forSeedEdit(courseCode, cur, fields) {
    const impacts = []
    const targetChanging = fields.target_text !== undefined && fields.target_text !== cur.target_text
    const newTarget = targetChanging ? fields.target_text : cur.target_text

    const legos = await this.editor.select('course_legos', { course_code: courseCode, seed_number: cur.seed_number })
    const phrases = await this.editor.select('course_practice_phrases', { course_code: courseCode, seed_number: cur.seed_number })

    if (legos.length) {
      // Mark which phrases actually quote the old seed text — turns a vague
      // "review N phrases" into a specific list (UX feedback).
      const oldTarget = cur.target_text
      const oldKnown = cur.known_text
      const affectedPhrases = phrases.filter((p) => contains(p.target_text, oldTarget) || contains(p.known_text, oldKnown))
      const items = [
        ...legos.map((l) => ({ kind: 'lego', id: l.id, lego_id: l.lego_id, known_text: l.known_text, target_text: l.target_text })),
        ...affectedPhrases.map((p) => ({ kind: 'phrase', id: p.id, known_text: p.known_text, target_text: p.target_text })),
      ]
      const affNote = affectedPhrases.length ? ` ${affectedPhrases.length} phrase(s) quote the old seed text directly.` : ''
      impacts.push(listImpact('seed_cascade', 'warn',
        `Editing this seed cascades: review its ${legos.length} LEGO(s) and ${phrases.length} phrase(s) — derived from the old seed text.${affNote}`,
        items))
    }

    // Tiling heuristic: every LEGO target should still appear in the new seed translation.
    if (targetChanging) {
      const orphaned = legos.filter((l) => l.target_text && !contains(newTarget, l.target_text))
      if (orphaned.length) {
        impacts.push(listImpact('tiling_break', 'warn',
          `${orphaned.length} LEGO target(s) no longer appear in the new seed translation — tiling may be broken. Confirm the seed still decomposes into its LEGOs.`,
          orphaned.map((l) => ({ id: l.id, lego_id: l.lego_id, target_text: l.target_text }))))
      }
    }

    return buildReport(impacts)
  }

  async forPhraseEdit(courseCode, cur, fields) {
    const impacts = []
    const targetChanging = fields.target_text !== undefined && fields.target_text !== cur.target_text
    const newTarget = targetChanging ? fields.target_text : cur.target_text

    if (targetChanging && cur.seed_number != null && cur.lego_index != null) {
      const [lego] = await this.editor.select('course_legos', { course_code: courseCode, seed_number: cur.seed_number, lego_index: cur.lego_index })
      // Only flag drift the edit actually INTRODUCES: the old target contained
      // the LEGO target and the new one doesn't. A phrase that never contained
      // it (e.g. a conjugation like "quieres" vs LEGO "quiero") is pre-existing
      // and must NOT cry wolf (UX feedback).
      if (lego && lego.target_text && contains(cur.target_text, lego.target_text) && !contains(newTarget, lego.target_text)) {
        // info, not warn: surface without blocking the (frequent) phrase edit.
        impacts.push(listImpact('lego_drift', 'info',
          `Heads-up: this edit removes the LEGO's target ("${lego.target_text}") from the phrase. A practice phrase should usually exercise its LEGO.`,
          [{ id: lego.id, lego_id: lego.lego_id, target_text: lego.target_text }]))
      }
    }
    return buildReport(impacts)
  }
}

function createAnalyzer(editor) { return new ImpactAnalyzer(editor) }

module.exports = { ImpactAnalyzer, createAnalyzer, buildReport, MAX_ITEMS }
