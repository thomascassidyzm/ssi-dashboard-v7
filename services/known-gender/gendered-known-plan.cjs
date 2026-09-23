/**
 * GENDERED KNOWN — the plan builder for a two-known-voice course
 * (Kai's rulings, 2026-09-23 20:13Z and 20:23Z; jobs #883·H → #938·H → #941·H).
 *
 * THE DESIGN IN ONE PARAGRAPH. A course whose KNOWN language marks the
 * speaker's gender (Hindi first) has TWO known voices, one per gender. Every
 * gendered practice phrase gets exactly ONE form — the female-speaker form in
 * the female voice or the male-speaker form in the male voice — fixed for
 * ever and stamped on the row (metadata.known_gender). NEVER both forms of one
 * phrase (Tom: no doubling). The split is balanced and random-looking: an
 * FNV-1a coin over the phrase id, then a per-seed pass that caps same-side
 * runs at 2. Neutral lines are hash-split by text, as the voice engine already
 * does (services/shared/known-voice-gender.cjs). Gendered SEED sentences are
 * split half and half too (a coin per seed, not by grammar). Gendered LEGO
 * debuts use the FEMALE form. Presentations stay in the female voice and
 * quote BOTH forms (services/phases/presentation-author.cjs
 * expandGenderedKnownSlot).
 *
 * CHOOSING A SIDE SELECTS THE STORED FORM. The other form of a gendered line
 * comes from the pair list (course_gender_expansions, text_side='known'),
 * never from anything written here. A row whose text is already in its
 * assigned gender is stamped and left alone; a row in the other gender is
 * rewritten to the pair's stored form for the assigned side.
 *
 * WHAT WAS DROPPED FROM THE FIRST DESIGN (#883·H): sibling phrases (a second
 * row per gendered phrase), the position-0 male first build, the bare-LEGO
 * guard exemption for gender variants, the SQL link-rule twin. A pair of rows
 * that already IS both forms of one phrase (same target, the two sides of one
 * pair) is a doubled phrase and is COLLAPSED to one row (the lowest id wins,
 * the other is deleted), which then takes a side like any other.
 *
 * VOICE FOLLOWS TEXT. After the rewrite the engine needs no special case: a
 * text that is one side of a stored pair takes that side's voice, so the
 * stamp and the voice agree by construction. The stamp exists so the side
 * NEVER MOVES afterwards: a re-run refuses to change a row that already
 * carries metadata.known_gender (it keeps the stamped side, and rewrites the
 * text only if the text somehow disagrees with its own stamp).
 *
 * Pure: no DB, no I/O, no randomness. The same inputs give the same plan on
 * any machine, which is what makes a dry run an honest preview of --apply.
 */

const {
  buildKnownGenderIndex, knownGenderForText, normalizeKnownKey, buildAnchorSet, fnv1a32, F, M,
} = require('../shared/known-voice-gender.cjs')

const PAIRABLE_PHRASE_ROLES = new Set(['build', 'use', 'practice'])
const MAX_RUN = 2

function normTarget(t) {
  return String(t || '').normalize('NFC').toLowerCase().trim().replace(/[.?!,]+$/u, '').replace(/\s+/g, ' ')
}
function pairKey(known, target) { return `${normalizeKnownKey(known)}|${normTarget(target)}` }

/**
 * The coin for one row: bit 0 of a mixed FNV-1a hash over "<salt>|<id>".
 * Keyed on the ROW ID (not the text), so the side a phrase gets is stable
 * under any later edit of its wording, any insertion or deletion elsewhere,
 * and identical on every machine.
 */
function coinForId(id, salt = '') {
  const h = fnv1a32(`${salt}|${id}`)
  const mixed = (h ^ (h >>> 16) ^ (h >>> 8)) >>> 0
  return (mixed & 1) ? F : M
}

/**
 * THE BALANCED SPLIT. `items` are the gendered rows of ONE seed, in the order
 * the learner meets them. Each item: { id, fixed? } — `fixed` is a side
 * already stamped on the row, which is honoured and never flipped. Returns a
 * Map id → 'm'|'f'.
 *
 * Rule: coin per id; then, walking the seed in order, (a) a side that is
 * already two ahead within the seed yields the row to the other side, and
 * (b) a THIRD consecutive same-side row is flipped — (b) is checked last so
 * the run cap always holds and the balance is best-effort. Fixed rows count
 * toward the run and the tally but are never flipped.
 */
function balancedGenderSplit(items, { salt = '', maxRun = MAX_RUN } = {}) {
  const out = new Map()
  let runSide = null, runLen = 0
  const count = { m: 0, f: 0 }
  const other = (g) => (g === M ? F : M)
  for (const it of items) {
    let side = it.fixed || coinForId(it.id, salt)
    if (!it.fixed) {
      // balance: a side already two ahead within the seed yields to the other
      if (count[side] - count[other(side)] >= 2) side = other(side)
      // run cap: a third consecutive same-side row flips (checked last, so it always holds)
      if (side === runSide && runLen >= maxRun) side = other(side)
    }
    if (side === runSide) runLen += 1; else { runSide = side; runLen = 1 }
    count[side] += 1
    out.set(it.id, side)
  }
  return out
}

/** The order the learner meets a seed's phrases: LEGO, then builds before uses, then position, then id. */
function learnerOrder(a, b) {
  if (a.lego_index !== b.lego_index) return a.lego_index - b.lego_index
  const ra = a.phrase_role === 'use' ? 1 : 0, rb = b.phrase_role === 'use' ? 1 : 0
  if (ra !== rb) return ra - rb
  if ((a.position || 0) !== (b.position || 0)) return (a.position || 0) - (b.position || 0)
  return String(a.id).localeCompare(String(b.id))
}

/**
 * @param {object} args
 * @param {string} args.courseCode
 * @param {Array}  args.seeds     course_seeds rows   (seed_id, seed_number, known_text, target_text)
 * @param {Array}  args.legos     course_legos rows   (lego_id, seed_number, lego_index, known_text, target_text)
 * @param {Array}  args.phrases   course_practice_phrases rows (id, seed_number, lego_index, position, phrase_role, known_text, target_text, metadata)
 * @param {Array}  args.pairs     course_gender_expansions rows, text_side='known' (expanded_m, expanded_f)
 * @param {string} [args.salt]    coin salt; defaults to courseCode
 */
function buildGenderedKnownPlan({ courseCode, seeds = [], legos = [], phrases = [], pairs = [], salt }) {
  const index = buildKnownGenderIndex(pairs)
  const hashSalt = salt === undefined ? courseCode : salt
  const anchors = buildAnchorSet([...legos.map(l => l.known_text), ...seeds.map(sd => sd.known_text)])
  const pairFor = (text) => index.get(normalizeKnownKey(text)) || null
  const formFor = (hit, gender) => (gender === M ? hit.m : hit.f)

  const counts = {
    rows: { seed: 0, lego: 0, phrase: 0, component: 0 },
    genderedRows: { seed: 0, lego: 0, phrase: 0, component: 0 },
    split: { phrase: { m: 0, f: 0 }, seed: { m: 0, f: 0 } },
    rewrites: { phrase: 0, seed: 0 },
    stampedAlready: 0,
    collapsed: 0,
    legoFlips: 0,
    legoFlipsRefusedZut: 0,
    rewritesRefusedZut: 0,
    longestRun: 0,
    seedsSkewedOver2: 0,
  }
  const notes = []

  // ── 1. DOUBLED ROWS: two phrase rows that are the two forms of ONE phrase
  //      (same target, known texts the two sides of one pair). Keep the lowest
  //      id, drop the rest. Pure duplicates (same form twice) are not ours. ──
  const collapses = []
  const dropped = new Set()
  {
    const groups = new Map()
    for (const p of phrases) {
      if (p.phrase_role === 'component') continue
      const hit = pairFor(p.known_text)
      if (!hit) continue
      const key = `${normalizeKnownKey(hit.m)}|${normTarget(p.target_text)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push({ row: p, gender: hit.gender })
    }
    for (const g of groups.values()) {
      const genders = new Set(g.map(x => x.gender))
      if (g.length < 2 || genders.size < 2) continue
      g.sort((a, b) => String(a.row.id).localeCompare(String(b.row.id)))
      const keep = g[0]
      for (const other of g.slice(1)) {
        if (other.gender === keep.gender) continue // a same-form duplicate is not a doubled phrase
        dropped.add(other.row.id)
        collapses.push({ keep: keep.row.id, drop: other.row.id, keep_known: keep.row.known_text, drop_known: other.row.known_text, target_text: keep.row.target_text, seed_number: keep.row.seed_number })
      }
    }
    counts.collapsed = collapses.length
  }
  const livePhrases = phrases.filter(p => !dropped.has(p.id))

  // ── 2. LEGO DEBUTS: a gendered LEGO debuts in the FEMALE form. A flip is
  //      refused (recorded) when another LEGO already carries the female form
  //      under a different target — a ZUT collision. ──
  const legosByKnown = new Map()
  for (const l of legos) {
    const k = normalizeKnownKey(l.known_text)
    if (!legosByKnown.has(k)) legosByKnown.set(k, [])
    legosByKnown.get(k).push(l)
  }
  const legoFlips = []
  const legoFinalText = new Map()
  const presentations = [] // every gendered LEGO: both forms for the intro
  for (const l of legos) {
    counts.rows.lego++
    const hit = pairFor(l.known_text)
    let text = l.known_text
    if (hit) {
      counts.genderedRows.lego++
      if (hit.gender === M) {
        const female = hit.f
        const clash = (legosByKnown.get(normalizeKnownKey(female)) || []).find(x => x.lego_id !== l.lego_id && normTarget(x.target_text) !== normTarget(l.target_text))
        if (clash) {
          counts.legoFlipsRefusedZut++
          notes.push({ id: l.lego_id, kind: 'lego', reason: `flip refused: "${female}" already maps to "${clash.target_text}" on ${clash.lego_id}` })
        } else {
          legoFlips.push({ lego_id: l.lego_id, seed_number: l.seed_number, lego_index: l.lego_index, from: l.known_text, to: female, target_text: l.target_text })
          counts.legoFlips++
          text = female
        }
      }
      presentations.push({ lego_id: l.lego_id, seed_number: l.seed_number, target_text: l.target_text, f: hit.f, m: hit.m, debut: text })
    }
    legoFinalText.set(l.lego_id, text)
  }

  // ── 3. the known→target map of the whole course AFTER the plan, for the
  //      offline ZUT check on every rewrite (a rewritten form must not already
  //      mean something else anywhere in the course) ──
  const targetsByKnown = new Map()
  const addKT = (known, target) => {
    const k = normalizeKnownKey(known)
    if (!targetsByKnown.has(k)) targetsByKnown.set(k, new Set())
    targetsByKnown.get(k).add(normTarget(target))
  }
  for (const l of legos) addKT(legoFinalText.get(l.lego_id), l.target_text)
  for (const p of livePhrases) addKT(p.known_text, p.target_text)
  for (const s of seeds) addKT(s.known_text, s.target_text)
  const zutClash = (known, target) => {
    const set = targetsByKnown.get(normalizeKnownKey(known))
    if (!set) return null
    for (const t of set) if (t !== normTarget(target)) return t
    return null
  }

  // ── 4. PHRASES: the balanced split per seed, then rewrite/stamp per row ──
  const phraseAssignments = []
  const bySeed = new Map()
  for (const p of livePhrases) {
    counts.rows[p.phrase_role === 'component' ? 'component' : 'phrase']++
    const hit = pairFor(p.known_text)
    if (!hit) continue
    if (p.phrase_role === 'component' || !PAIRABLE_PHRASE_ROLES.has(p.phrase_role)) { counts.genderedRows.component++; continue }
    counts.genderedRows.phrase++
    if (!bySeed.has(p.seed_number)) bySeed.set(p.seed_number, [])
    bySeed.get(p.seed_number).push({ row: p, hit })
  }
  for (const [seedNumber, list] of [...bySeed.entries()].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => learnerOrder(a.row, b.row))
    const items = list.map(x => {
      const stamped = x.row.metadata && (x.row.metadata.known_gender === M || x.row.metadata.known_gender === F) ? x.row.metadata.known_gender : null
      return { id: x.row.id, fixed: stamped }
    })
    const sides = balancedGenderSplit(items, { salt: hashSalt })
    let run = 0, last = null, mCount = 0, fCount = 0
    for (const x of list) {
      const side = sides.get(x.row.id)
      const stamped = items.find(i => i.id === x.row.id).fixed
      if (stamped) counts.stampedAlready++
      if (side === last) run++; else { run = 1; last = side }
      counts.longestRun = Math.max(counts.longestRun, run)
      if (side === M) mCount++; else fCount++
      const current = x.hit.gender
      let to = formFor(x.hit, side)
      let rewrite = current !== side
      let assigned = side
      if (rewrite) {
        const clash = zutClash(to, x.row.target_text)
        if (clash) {
          // keep the current form and side rather than create a collision
          counts.rewritesRefusedZut++
          notes.push({ id: x.row.id, kind: 'phrase', reason: `rewrite refused: "${to}" already means "${clash}" elsewhere in the course; row keeps its ${current} form` })
          assigned = current; to = x.row.known_text; rewrite = false
        }
      }
      if (rewrite) { counts.rewrites.phrase++; addKT(to, x.row.target_text) }
      counts.split.phrase[assigned]++
      phraseAssignments.push({
        id: x.row.id, seed_number: seedNumber, lego_index: x.row.lego_index, phrase_role: x.row.phrase_role, target_text: x.row.target_text,
        gender: assigned, stamped_already: !!stamped, current_form: current, from: x.row.known_text, to, rewrite,
      })
    }
    if (Math.abs(mCount - fCount) > 2) counts.seedsSkewedOver2++
  }

  // ── 5. SEEDS: a coin per seed, half and half, not by grammar ──
  const seedAssignments = []
  for (const s of seeds) {
    counts.rows.seed++
    const hit = pairFor(s.known_text)
    if (!hit) continue
    counts.genderedRows.seed++
    let side = coinForId(s.seed_id, hashSalt)
    let to = formFor(hit, side)
    let rewrite = hit.gender !== side
    if (rewrite) {
      const clash = zutClash(to, s.target_text)
      if (clash) {
        counts.rewritesRefusedZut++
        notes.push({ id: s.seed_id, kind: 'seed', reason: `rewrite refused: "${to}" already means "${clash}" elsewhere in the course; seed keeps its ${hit.gender} form` })
        side = hit.gender; to = s.known_text; rewrite = false
      }
    }
    if (rewrite) { counts.rewrites.seed++; addKT(to, s.target_text) }
    counts.split.seed[side]++
    seedAssignments.push({ seed_id: s.seed_id, seed_number: s.seed_number, target_text: s.target_text, gender: side, current_form: hit.gender, from: s.known_text, to, rewrite })
  }

  // ── 6. the voice census and render estimate AFTER the plan: one clip per
  //      distinct known text; gendered by pair, LEGO/seed lines anchored
  //      female, everything else by the text hash ──
  const finalRows = []
  for (const l of legos) finalRows.push({ kind: 'lego', id: l.lego_id, text: legoFinalText.get(l.lego_id) })
  const seedTo = new Map(seedAssignments.map(a => [a.seed_id, a.to]))
  for (const s of seeds) finalRows.push({ kind: 'seed', id: s.seed_id, text: seedTo.has(s.seed_id) ? seedTo.get(s.seed_id) : s.known_text })
  const phraseTo = new Map(phraseAssignments.map(a => [a.id, a.to]))
  for (const p of livePhrases) finalRows.push({ kind: p.phrase_role === 'component' ? 'component' : 'phrase', id: p.id, text: phraseTo.has(p.id) ? phraseTo.get(p.id) : p.known_text })
  const finalAnchors = buildAnchorSet(finalRows.filter(r => r.kind === 'lego' || r.kind === 'seed').map(r => r.text))
  const assignments = []
  const voiced = { m: 0, f: 0 }, bySource = { pair: 0, anchor: 0, hash: 0 }
  const distinct = new Map()
  for (const r of finalRows) {
    const g = knownGenderForText(r.text, index, { salt: hashSalt, anchors: finalAnchors })
    voiced[g.gender]++; bySource[g.source]++
    assignments.push({ kind: r.kind, id: r.id, known_text: r.text, gender: g.gender, source: g.source })
    const k = normalizeKnownKey(r.text)
    if (!distinct.has(k)) distinct.set(k, { text: r.text, gender: g.gender })
  }
  const render = { clips: { m: 0, f: 0 }, chars: { m: 0, f: 0 } }
  for (const d of distinct.values()) { render.clips[d.gender]++; render.chars[d.gender] += d.text.length }
  render.clipsTotal = render.clips.m + render.clips.f
  render.charsTotal = render.chars.m + render.chars.f

  return {
    courseCode, salt: hashSalt, counts, voiced, bySource, render, indexSize: index.size,
    legoFlips, collapses, phraseAssignments, seedAssignments, presentations, assignments, notes,
  }
}

module.exports = { buildGenderedKnownPlan, balancedGenderSplit, coinForId, learnerOrder, pairKey, PAIRABLE_PHRASE_ROLES, MAX_RUN }
