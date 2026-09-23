/**
 * GENDERED KNOWN VARIANTS — the plan builder (Kai's design, 2026-09-23; #883·H).
 *
 * Given a course's content rows and the stored known-side gender pairs, decide:
 *   - which voice gender every known line renders in (pair-bound or hash-split),
 *   - which SIBLING PHRASES must exist so that every gendered known line has its
 *     counterpart as a full separate phrase with the same target,
 *   - the numbers Kai asked for (male/female split, pairs created, characters).
 *
 * WHERE A SIBLING LIVES — one rule per content kind, because the three kinds
 * are keyed differently and only phrases can be added freely:
 *
 *   phrase (build/use)  → a phrase of the SAME role under the SAME LEGO, same
 *                          target, known = the other form. id = the next free
 *                          index of that role (makePhraseId), position = the
 *                          LEGO's max position + n. Appended, not interleaved:
 *                          renumbering positions would touch every later row.
 *   component phrase    → NO sibling. Components are never introduced (Tom,
 *                          2026-08-06); they reach the learner as tiles only.
 *   LEGO                → the LEGO row is the ONE LEGO (a second LEGO would
 *                          double the round map). Its counterpart is a BUILD
 *                          phrase under it: known = other form, target = the
 *                          LEGO target. By target alone that is a "bare LEGO"
 *                          phrase, which the submit path drops as teaching
 *                          nothing — here it teaches the gender lesson, so it
 *                          carries metadata.gender_variant_of = <lego_id> and
 *                          the bare-LEGO rule must read that mark.
 *   seed                → seeds are one row per seed number, so the counterpart
 *                          is a USE phrase under the seed's LAST LEGO with the
 *                          seed's target, marked gender_variant_of = <seed_id>.
 *
 * DEDUPE, ALWAYS BY known|target ACROSS THE WHOLE COURSE. Shuchita's
 * proofreading already left some lines in the female form; where the
 * counterpart already exists as any phrase/LEGO/seed row, no sibling is added.
 * That is also the player's own claim key (cycles.ts phraseKey), so two rows
 * with the same known|target could never both play anyway.
 *
 * Pure: no DB, no I/O, no randomness. Everything here is reproducible from the
 * same inputs, which is what makes a dry-run diff an honest preview of --apply.
 */

const {
  buildKnownGenderIndex, knownGenderForText, counterpartForText, normalizeKnownKey,
} = require('../shared/known-voice-gender.cjs')
const { makePhraseId, computeLegoPosition } = require('../course-builder/lib/phrase-structure.cjs')

const PAIRABLE_PHRASE_ROLES = new Set(['build', 'use', 'practice'])

function normTarget(t) {
  return String(t || '').normalize('NFC').toLowerCase().trim().replace(/[.?!,]+$/u, '').replace(/\s+/g, ' ')
}
function pairKey(known, target) { return `${normalizeKnownKey(known)}|${normTarget(target)}` }

/**
 * @param {object} args
 * @param {string} args.courseCode
 * @param {Array}  args.seeds     course_seeds rows   (seed_id, seed_number, known_text, target_text)
 * @param {Array}  args.legos     course_legos rows   (lego_id, seed_number, lego_index, known_text, target_text)
 * @param {Array}  args.phrases   course_practice_phrases rows (id, seed_number, lego_index, position, phrase_role, known_text, target_text)
 * @param {Array}  args.pairs     course_gender_expansions rows, text_side='known'
 * @param {string} [args.salt]    hash salt; defaults to courseCode
 */
function buildGenderedKnownPlan({ courseCode, seeds = [], legos = [], phrases = [], pairs = [], salt }) {
  const index = buildKnownGenderIndex(pairs)
  const hashSalt = salt === undefined ? courseCode : salt

  // ── every existing known|target in the course, so a counterpart that is
  //    already authored is recognised rather than duplicated ──
  const existing = new Set()
  for (const s of seeds) existing.add(pairKey(s.known_text, s.target_text))
  for (const l of legos) existing.add(pairKey(l.known_text, l.target_text))
  for (const p of phrases) existing.add(pairKey(p.known_text, p.target_text))

  // ── per-LEGO bookkeeping for ids and positions ──
  const legoKey = (seed, idx) => `${seed}:${idx}`
  const perLego = new Map() // key → { maxPos, roleMax: {build, use, component}, target, lego_id }
  const legoByKey = new Map()
  for (const l of legos) {
    const k = legoKey(l.seed_number, l.lego_index)
    legoByKey.set(k, l)
    perLego.set(k, { maxPos: 0, roleMax: { build: 0, use: 0, component: 0 }, legoId: l.lego_id, target: l.target_text })
  }
  const roleIndexOf = (id, role) => {
    // eng_for_hin:S0001L02B01 → 1 ; role letters B/U/C
    const m = /[BUC](\d+)$/.exec(id || '')
    return m ? parseInt(m[1], 10) : 0
  }
  for (const p of phrases) {
    const k = legoKey(p.seed_number, p.lego_index)
    if (!perLego.has(k)) perLego.set(k, { maxPos: 0, roleMax: { build: 0, use: 0, component: 0 }, legoId: null, target: null })
    const b = perLego.get(k)
    b.maxPos = Math.max(b.maxPos, p.position || 0)
    const role = p.phrase_role === 'practice' ? 'build' : p.phrase_role
    if (role in b.roleMax) b.roleMax[role] = Math.max(b.roleMax[role], roleIndexOf(p.id, role))
  }
  // last LEGO of each seed (for seed counterparts)
  const lastLegoOfSeed = new Map()
  for (const l of legos) {
    const cur = lastLegoOfSeed.get(l.seed_number)
    if (!cur || l.lego_index > cur.lego_index) lastLegoOfSeed.set(l.seed_number, l)
  }

  // ── assignments: one entry per content row ──
  const assignments = []
  const siblings = []
  const skipped = [] // gendered rows that got no sibling, with the reason
  const counts = {
    rows: { seed: 0, lego: 0, phrase: 0, component: 0 },
    byGender: { m: 0, f: 0 },
    bySource: { pair: 0, hash: 0 },
    genderedRows: 0,
    siblingsPlanned: { fromPhrase: 0, fromLego: 0, fromSeed: 0 },
    siblingsSkippedExisting: 0,
  }

  const planned = new Set() // known|target of siblings already planned, so two rows with the same text add one sibling

  const addSibling = ({ from, kind, seedNumber, legoIndex, role, known, target, gender, originId }) => {
    const key = pairKey(known, target)
    if (existing.has(key)) { counts.siblingsSkippedExisting++; skipped.push({ originId, reason: 'counterpart already authored', known, target }); return }
    if (planned.has(key)) return // another row with the same text already planned it
    planned.add(key)
    const k = legoKey(seedNumber, legoIndex)
    if (!perLego.has(k)) perLego.set(k, { maxPos: 0, roleMax: { build: 0, use: 0, component: 0 }, legoId: null, target: null })
    const b = perLego.get(k)
    b.roleMax[role] += 1
    b.maxPos += 1
    const legoTarget = (legoByKey.get(k) || {}).target_text || target
    siblings.push({
      id: makePhraseId(courseCode, seedNumber, legoIndex, role, b.roleMax[role]),
      course_code: courseCode,
      seed_number: seedNumber,
      lego_index: legoIndex,
      position: b.maxPos,
      known_text: known,
      target_text: target,
      phrase_role: role,
      known_gender: gender,
      lego_position: computeLegoPosition(target, legoTarget),
      metadata: { format: 'build_use', gender_variant_of: originId, gender_variant_kind: kind, known_gender: gender },
      from,
    })
    counts.siblingsPlanned[from] += 1
  }

  const assign = (kind, row, id, text) => {
    const g = knownGenderForText(text, index, { salt: hashSalt })
    counts.rows[kind] += 1
    counts.byGender[g.gender] += 1
    counts.bySource[g.source] += 1
    if (g.source === 'pair') counts.genderedRows += 1
    assignments.push({ kind, id, seed_number: row.seed_number, known_text: text, target_text: row.target_text, gender: g.gender, source: g.source })
    return g
  }

  for (const p of phrases) {
    const isComponent = p.phrase_role === 'component'
    const g = assign(isComponent ? 'component' : 'phrase', p, p.id, p.known_text)
    if (g.source !== 'pair' || isComponent || !PAIRABLE_PHRASE_ROLES.has(p.phrase_role)) continue
    const other = counterpartForText(p.known_text, index)
    addSibling({
      from: 'fromPhrase', kind: 'phrase', seedNumber: p.seed_number, legoIndex: p.lego_index,
      role: p.phrase_role === 'practice' ? 'build' : p.phrase_role,
      known: other.text, target: p.target_text, gender: other.gender, originId: p.id,
    })
  }
  for (const l of legos) {
    const g = assign('lego', l, l.lego_id, l.known_text)
    if (g.source !== 'pair') continue
    const other = counterpartForText(l.known_text, index)
    addSibling({
      from: 'fromLego', kind: 'lego', seedNumber: l.seed_number, legoIndex: l.lego_index, role: 'build',
      known: other.text, target: l.target_text, gender: other.gender, originId: l.lego_id,
    })
  }
  for (const s of seeds) {
    const g = assign('seed', s, s.seed_id, s.known_text)
    if (g.source !== 'pair') continue
    const other = counterpartForText(s.known_text, index)
    const last = lastLegoOfSeed.get(s.seed_number)
    if (!last) { skipped.push({ originId: s.seed_id, reason: 'seed has no LEGOs to hang a counterpart under', known: other.text, target: s.target_text }); continue }
    addSibling({
      from: 'fromSeed', kind: 'seed', seedNumber: s.seed_number, legoIndex: last.lego_index, role: 'use',
      known: other.text, target: s.target_text, gender: other.gender, originId: s.seed_id,
    })
  }

  // ── render estimate: phase8 renders ONE clip per distinct text|language|role,
  //    so characters are counted over distinct known texts, existing + siblings ──
  const distinct = new Map() // normalised key → { text, gender, source }
  for (const a of assignments) {
    const k = normalizeKnownKey(a.known_text)
    if (!distinct.has(k)) distinct.set(k, { text: a.known_text, gender: a.gender, source: a.source, sibling: false })
  }
  for (const s of siblings) {
    const k = normalizeKnownKey(s.known_text)
    if (!distinct.has(k)) distinct.set(k, { text: s.known_text, gender: s.known_gender, source: 'pair', sibling: true })
  }
  const render = { clips: { m: 0, f: 0 }, chars: { m: 0, f: 0 }, siblingClips: 0, siblingChars: 0 }
  for (const d of distinct.values()) {
    render.clips[d.gender] += 1
    render.chars[d.gender] += d.text.length
    if (d.sibling) { render.siblingClips += 1; render.siblingChars += d.text.length }
  }
  render.clipsTotal = render.clips.m + render.clips.f
  render.charsTotal = render.chars.m + render.chars.f

  return { courseCode, salt: hashSalt, counts, render, assignments, siblings, skipped, indexSize: index.size }
}

module.exports = { buildGenderedKnownPlan, pairKey, PAIRABLE_PHRASE_ROLES }
