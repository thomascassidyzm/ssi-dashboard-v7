'use strict'
// services/shared/intro-mirror.cjs
//
// THE INTRO MIRROR CHECK — does every introduction still quote the thing it introduces?
//
// Kai's ruling, 2026-09-28 (job #557·I): a problem that has recurred many times — a LEGO or
// component's text is edited and its presentation ("intro") line, and the course_audio clip
// that speaks it, is not updated, so the learner hears an introduction for words the course no
// longer teaches there. The calibration positive: ita_for_eng S0599L01C01 became
// 'I would have been' | 'sarei stato' while its intro clip 4e7a8a31-… still says
// "The Italian for: 'would have been', as in — 'I would have been happy', is:".
//
// WHAT "MIRRORS" MEANS, learned from the live data (ita_for_eng, 2026-09-28) and the authoring
// code (services/phases/presentation-author.cjs renderIntro):
//   • the intro is rendered from the course's known-language template
//     (presentation_templates), in one of two frames —
//       Frame B: "The Italian for: '{known}', as in — '{seed}', is:"
//       Frame A: the same with the "as in" clause stripped (stripSeedClause).
//   • {known} is introChunk(known_text): the LEGO's known text, or the first option of a
//     slash-compound ("to listen / to hear" introduces 'to listen'). It is quoted byte for byte.
//   • {seed} is NOT necessarily the seed sentence. On ita_for_eng it is a demonstration
//     sentence authored from vocabulary taught so far ('I want to speak Italian' for
//     'Italian' at seed 1), and on component intros it is the parent LEGO's known text. The
//     one thing every frame-B context must do is CONTAIN the chunk (fallbackFrame refuses B
//     otherwise), so that is the rule here: a context that no longer demonstrates the chunk is
//     a mismatch, a context that still does is fine whatever sentence it is.
//   • a HUMAN-AUTHORED line (human_authored_presentations, Kai's 2026-09-21 guard) keeps its
//     words; it still has to quote its LEGO, and it is never rewritten by a sweep — it is
//     listed for a person instead. That is what `guarded` on a row means.
//   • lines the template cannot parse (six ita "…, when it's someone or something…, is:"
//     lines) fall back to the quote rule: the first quoted string is the chunk. A line with no
//     quote at all is UNPARSED and counted, never judged.
//   • "intro text" and "clip text" are the same column: the intro's words live only in
//     course_audio.text (and in a human mark). So "the linked clip's text matches" is checked by
//     reading the clip the row actually links, from every place the learner path resolves an
//     intro: course_legos.presentation_audio_id (cycles.ts), lego_introductions (useScriptCache)
//     and course_audio.lego_id (what phase8 counts as "has an intro"). A secondary link that
//     disagrees with the primary is reported as such.
//   • COMPONENTS ARE NEVER INTRODUCED (Tom, 2026-08-06; trigger components_never_introduced
//     refuses a new binding; cycles.ts never plays them). Component intro links are historic.
//     They are still checked — a lying link is a lying link — but the fix for one is to
//     unlink it, never to render a clip nobody will hear.
//
// Pure functions first (tested with node --test in tools/check-intro-mirror.test.cjs); the
// live census at the bottom takes a pg client and reads the course.

const { stripSeedClause, expandGenderedKnownSlot, introChunk } = require('../phases/presentation-author.cjs')

/** Whitespace-collapsed, apostrophe-normalised, case-folded — for CONTAINS tests only. */
function fold(s) {
  return String(s || '').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
}
/** Exact chunk comparison: whitespace-collapsed and apostrophe-normalised, case KEPT. */
function exact(s) {
  return String(s || '').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim()
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Compile a template into anchored regexes: one per (frame, gendered) variant. A slot becomes a
 * lazy capture; {target_lang_name} is matched loosely so a house-name change does not blind us.
 */
function compileTemplate(template, { knownLang = null } = {}) {
  const variants = []
  const plainB = template
  const plainA = stripSeedClause(template)
  // Same order as renderIntro: strip the seed clause FIRST, then expand the gendered slot.
  const genderedB = expandGenderedKnownSlot(template, knownLang)
  const genderedA = expandGenderedKnownSlot(plainA, knownLang)
  for (const [frame, gendered, t] of [['B', false, plainB], ['A', false, plainA], ['B', true, genderedB], ['A', true, genderedA]]) {
    if (gendered && t === (frame === 'B' ? plainB : plainA)) continue
    const names = []
    let src = ''
    const parts = t.split(/(\{target_lang_name\}|\{known_m\}|\{known\}|\{seed\})/)
    for (const p of parts) {
      if (p === '{target_lang_name}') { names.push('lang'); src += '(.+?)' }
      else if (p === '{known}') { names.push('known'); src += '(.+?)' }
      else if (p === '{known_m}') { names.push('known_m'); src += '(.+?)' }
      else if (p === '{seed}') { names.push('seed'); src += '(.+?)' }
      else src += escapeRe(p).replace(/\s+/g, '\\s+')
    }
    variants.push({ frame, gendered, names, re: new RegExp('^\\s*' + src + '\\s*$', 'su') })
  }
  // Most specific first: a lazy {known} capture would otherwise swallow "'F' या 'M'" whole.
  return variants.sort((a, b) => b.names.length - a.names.length)
}

/**
 * Parse one intro line against the compiled variants of every template offered.
 * Returns { frame:'A'|'B'|'free', known, seed, gendered, by:'template'|'quote' } or null.
 */
function parseIntro(text, compiled) {
  const t = String(text || '')
  for (const v of compiled) {
    const m = v.re.exec(t)
    if (!m) continue
    const out = { frame: v.frame, gendered: v.gendered, known: null, seed: null, known_m: null, by: 'template' }
    v.names.forEach((n, i) => { out[n] = m[i + 1] })
    if (out.known != null) return out
  }
  // No template fits (a human line, an older template, a "…, when it's someone…" gloss): a free
  // line. It mirrors when it QUOTES the chunk somewhere — verdict() tests that — so `known` is
  // left null here. A line with no quote character at all cannot quote anything: unparsed.
  if (/['‘’「]/u.test(t)) return { frame: 'free', gendered: false, known: null, seed: null, known_m: null, by: 'quote' }
  return null
}
/** Does a free-form line quote this chunk, as 'chunk' with a quote on each side? */
function quotes(text, chunk) {
  const f = fold(text), c = fold(chunk)
  return c.length > 0 && (f.includes(`'${c}'`) || f.includes(`「${c}」`))
}

/**
 * The verdict for one introduced row.
 *   status: 'mirror' | 'mismatch' | 'unparsed'
 *   reasons: [] | ['chunk', 'context', 'guarded-text', ...]
 * @param {object} o
 * @param {string} o.introText   the linked clip's text (or the pending row's text)
 * @param {string} o.knownText   the row's CURRENT known_text
 * @param {object[]} o.compiled  compileTemplate() output
 * @param {object} [o.mark]      human_authored_presentations row, when the LEGO is guarded
 * @param {{f:string,m:string}} [o.chunkForms]  gendered pair, when the course has one for this row
 */
function verdict({ introText, knownText, compiled, mark = null, chunkForms = null }) {
  const reasons = []
  const parsed = parseIntro(introText, compiled)
  if (!parsed) return { status: 'unparsed', reasons: ['no-quote'], parsed: null }
  const chunk = exact(introChunk(knownText))
  const quoted = exact(parsed.known)
  if (parsed.frame === 'free') {
    if (!quotes(introText, chunk)) reasons.push('chunk')
  } else if (chunkForms && chunkForms.f && chunkForms.m) {
    if (quoted !== exact(chunkForms.f)) reasons.push('chunk')
    if (parsed.known_m != null && exact(parsed.known_m) !== exact(chunkForms.m)) reasons.push('chunk-m')
    if (parsed.known_m == null && !fold(introText).includes(fold(`'${chunkForms.m}'`))) reasons.push('chunk-m')
  } else if (quoted !== chunk) {
    reasons.push(fold(quoted) === fold(chunk) ? 'chunk-case' : 'chunk')
  }
  if (parsed.frame === 'B' && parsed.seed != null && !fold(parsed.seed).includes(fold(chunk))) reasons.push('context')
  if (mark) {
    if (exact(mark.text) !== exact(introText)) reasons.push('guarded-text')
  }
  // 'chunk-case' alone is a note, not a defect: the clip speaks the same words (Kai's bar is
  // what the learner hears; re-rendering 'i agree' as 'I agree' buys nothing).
  const defects = reasons.filter(r => r !== 'chunk-case')
  return { status: defects.length ? 'mismatch' : 'mirror', reasons, parsed }
}

/**
 * The line a row SHOULD carry now, keeping its prior frame (phase8 getAudioNeeds keeps the frame
 * too; a frame is a judgement already made). Frame B keeps its old context when that context
 * still contains the new chunk, else uses the context offered (the seed sentence, or the parent
 * LEGO for a component) when THAT contains it, else drops to Frame A.
 */
function expectedLine({ template, targetLangName, knownText, priorText = null, compiled, contextText = null, chunkForms = null, knownLang = null }) {
  const { renderIntro } = require('../phases/presentation-author.cjs')
  const chunk = introChunk(knownText)
  const prior = priorText ? parseIntro(priorText, compiled) : null
  let frame = prior ? (prior.frame === 'B' ? 'B' : 'A') : (contextText ? 'B' : 'A')
  let seed = null
  if (frame === 'B') {
    if (prior && prior.seed != null && fold(prior.seed).includes(fold(chunk))) seed = prior.seed
    else if (contextText && fold(contextText).includes(fold(chunk))) seed = contextText
    else frame = 'A'
  }
  return { frame, text: renderIntro({ frame, template, targetLangName, chunk, seed: seed || '', chunkForms, knownLang }) }
}

// ── Live census ────────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function loadTemplates(pg, knownLang) {
  const { rows } = await pg.query(
    `SELECT template, priority, is_active FROM presentation_templates WHERE known_lang = $1 ORDER BY is_active DESC, priority DESC`, [knownLang])
  return rows
}

/**
 * Census one course. Returns counts plus every judged row.
 * @param {import('pg').Client} pg
 * @param {string} courseCode
 * @param {{ seeds?: number[] }} [opts]  restrict to these seed numbers (an edit job's scope)
 */
async function checkCourse(pg, courseCode, opts = {}) {
  const { localisedLangName } = require('../phases/presentation-author.cjs')
  const { rows: [course] } = await pg.query('SELECT course_code, known_lang, target_lang FROM courses WHERE course_code = $1', [courseCode])
  if (!course) throw new Error(`no such course: ${courseCode}`)
  const templates = await loadTemplates(pg, course.known_lang)
  const compiled = templates.flatMap(t => compileTemplate(t.template, { knownLang: course.known_lang }))
  const targetLangName = localisedLangName(course.target_lang, course.known_lang)
  const seedFilter = Array.isArray(opts.seeds) && opts.seeds.length ? opts.seeds.map(Number) : null
  const seedSql = seedFilter ? ' AND x.seed_number = ANY($2)' : ''
  const params = seedFilter ? [courseCode, seedFilter] : [courseCode]

  const { rows: marks } = await pg.query('SELECT lego_id, text FROM human_authored_presentations WHERE course_code = $1', [courseCode])
  const markById = new Map(marks.map(m => [m.lego_id, m]))

  // Gendered known pairs (two-known-voice courses): the intro quotes 'F' or 'M'.
  let pairs = new Map()
  try {
    const { rows } = await pg.query(
      `SELECT expanded_f, expanded_m FROM course_gender_expansions WHERE course_code = $1 AND text_side = 'known' AND expanded_f IS NOT NULL AND expanded_m IS NOT NULL`, [courseCode])
    for (const r of rows) { const pair = { f: r.expanded_f, m: r.expanded_m }; pairs.set(exact(r.expanded_f), pair); pairs.set(exact(r.expanded_m), pair) }
  } catch (_) { pairs = new Map() /* table absent on this schema: no gendered pairs */ }

  const { rows: legos } = await pg.query(
    `SELECT x.lego_id, x.seed_number, x.lego_index, x.known_text, x.target_text, x.is_new,
            x.presentation_audio_id AS link,
            a.text AS link_text, a.voice_id AS link_voice, a.s3_key AS link_s3,
            li.presentation_audio_id AS li_link, ali.text AS li_text,
            s.known_text AS seed_known
       FROM course_legos x
       LEFT JOIN course_audio a ON x.presentation_audio_id ~* '^[0-9a-f-]{36}$' AND a.id = x.presentation_audio_id::uuid
       LEFT JOIN lego_introductions li ON li.course_code = x.course_code AND li.lego_id = x.lego_id
       LEFT JOIN course_audio ali ON ali.id = li.presentation_audio_id
       LEFT JOIN course_seeds s ON s.course_code = x.course_code AND s.seed_number = x.seed_number
      WHERE x.course_code = $1${seedSql}
      ORDER BY x.seed_number, x.lego_index`, params)
  const { rows: keyed } = await pg.query(
    `SELECT a.id, a.lego_id, a.text, a.s3_key FROM course_audio a
      WHERE a.course_code = $1 AND a.role = 'presentation' AND a.lego_id IS NOT NULL`, [courseCode])
  const keyedByLego = new Map()
  for (const k of keyed) { if (!keyedByLego.has(k.lego_id)) keyedByLego.set(k.lego_id, []); keyedByLego.get(k.lego_id).push(k) }

  const { rows: comps } = await pg.query(
    `SELECT x.id, x.seed_number, x.lego_index, x.known_text, x.target_text, x.introduce,
            x.presentation_audio_id AS link, a.text AS link_text, a.voice_id AS link_voice,
            l.known_text AS parent_known
       FROM course_practice_phrases x
       LEFT JOIN course_audio a ON a.id = x.presentation_audio_id
       LEFT JOIN course_legos l ON l.course_code = x.course_code AND l.seed_number = x.seed_number AND l.lego_index = x.lego_index
      WHERE x.course_code = $1 AND x.phrase_role = 'component'${seedSql}
      ORDER BY x.seed_number, x.lego_index, x.id`, params)

  const out = {
    course: courseCode, known_lang: course.known_lang, target_lang: course.target_lang, targetLangName,
    templates: templates.map(t => t.template),
    legos: { checked: legos.length, with_intro: 0, without_intro: 0, new_without_intro: 0, mirror: 0, mismatch: 0, unparsed: 0, guarded: 0, li_diverges: 0, keyed_stale: 0 },
    components: { checked: comps.length, with_intro: 0, without_intro: 0, mirror: 0, mismatch: 0, unparsed: 0 },
    rows: [],
  }

  for (const l of legos) {
    const chunkForms = pairs.get(exact(l.known_text)) || null
    const mark = markById.get(l.lego_id) || null
    if (mark) out.legos.guarded++
    if (!l.link || !l.link_text) {
      out.legos.without_intro++
      if (l.is_new) out.legos.new_without_intro++
      out.rows.push({ kind: 'lego', id: l.lego_id, seed: l.seed_number, known: l.known_text, target: l.target_text, is_new: l.is_new, status: 'silent', reasons: [], link: l.link || null, intro: null, guarded: !!mark, li_link: l.li_link, li_text: l.li_text })
      continue
    }
    out.legos.with_intro++
    const v = verdict({ introText: l.link_text, knownText: l.known_text, compiled, mark, chunkForms })
    out.legos[v.status]++
    const row = { kind: 'lego', id: l.lego_id, seed: l.seed_number, known: l.known_text, target: l.target_text, is_new: l.is_new, status: v.status, reasons: v.reasons, frame: v.parsed?.frame || null, link: l.link, intro: l.link_text, voice: l.link_voice, guarded: !!mark, seed_known: l.seed_known }
    if (l.li_link && String(l.li_link) !== String(l.link)) { out.legos.li_diverges++; row.li_link = l.li_link; row.li_text = l.li_text; row.reasons = [...row.reasons, 'lego_introductions-diverges'] }
    const stale = (keyedByLego.get(l.lego_id) || []).filter(k => String(k.id) !== String(l.link) && !String(k.s3_key || '').startsWith('pending/') && verdict({ introText: k.text, knownText: l.known_text, compiled, chunkForms }).status === 'mismatch')
    if (stale.length) { out.legos.keyed_stale += stale.length; row.keyed_stale = stale.map(k => ({ id: k.id, text: k.text })) }
    out.rows.push(row)
  }
  for (const c of comps) {
    if (!c.link || !c.link_text) { out.components.without_intro++; continue }
    out.components.with_intro++
    const v = verdict({ introText: c.link_text, knownText: c.known_text, compiled })
    out.components[v.status]++
    out.rows.push({ kind: 'component', id: c.id, seed: c.seed_number, known: c.known_text, target: c.target_text, parent_known: c.parent_known, status: v.status, reasons: v.reasons, frame: v.parsed?.frame || null, link: c.link, intro: c.link_text, voice: c.link_voice })
  }
  out.mismatches = out.rows.filter(r => r.status === 'mismatch' || (r.reasons || []).some(x => x !== 'chunk-case'))
  out.case_only = out.rows.filter(r => r.status === 'mirror' && (r.reasons || []).includes('chunk-case')).length
  return out
}

module.exports = { fold, exact, quotes, compileTemplate, parseIntro, verdict, expectedLine, checkCourse, loadTemplates, UUID_RE }
