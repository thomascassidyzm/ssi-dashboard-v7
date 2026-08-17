#!/usr/bin/env node
/**
 * filler-build-scan.cjs — the measurable form of Deborah's spa_for_eng complaint
 * (2026-08-17): "nearly every Build just appends 'before'/'here'/'yesterday' to
 * the LEGO instead of varied practice."
 *
 * The rule already exists in prose — services/course-builder/routes/qa.cjs:86,
 * "Flag: BUILD phrases with meaningless filler (LEGO + 'here' or LEGO + 'please')"
 * — but only inside an LLM QA prompt, which is advisory and can simply not run.
 * This is the deterministic version.
 *
 * DEFINITION (deliberately narrow, so a confirmed count means something):
 *   A Build phrase is FILLER when its known_text is the LEGO's known_text plus a
 *   residue of 1-3 tokens and nothing else — i.e. the LEGO survives as a
 *   contiguous run and the only other content is a short tail/head. That is
 *   "LEGO + adverb", not recombination with previously-taught LEGOs.
 *
 *   A LEGO is a FILLER CLUSTER when >= 2 of its Builds are filler AND their
 *   residues are distinct (the 'here / yesterday / before' shape Deborah saw:
 *   the same LEGO padded three different ways rather than used three ways).
 *
 * Counts are reported RAW (matches the definition) and CONFIRMED (filler
 * clusters, whose residues also recur across the course — the systematic
 * defect rather than an isolated short phrase). Kai's rule: never merge the two.
 *
 * Read-only. Writes nothing, generates nothing, costs nothing.
 *
 * Usage:
 *   node tools/deborah/filler-build-scan.cjs <course_code> [--from-round N] [--json out.json]
 *   node tools/deborah/filler-build-scan.cjs --all-eng-known   [estate sweep]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / service key in .env')
  process.exit(1)
}
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const PAGE = 1000

/**
 * Ordered paging. PostgREST offset paging without an ORDER BY silently returns
 * duplicate rows while count=exact still matches, so every page here is ordered.
 */
async function pageAll (buildQuery, label) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

/**
 * Unicode-aware tokeniser. \w and \b are ASCII-only in JS regex, which is how
 * earlier audits read 0 defects across 31 non-Latin courses and 1,126 false
 * ones in Arabic. \p{L}\p{M}\p{N} with /u covers every script the estate holds,
 * including combining marks (Yoruba tone, Devanagari matras).
 */
function tokenize (text) {
  if (typeof text !== 'string') return []
  return (text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}]+)?/gu) || [])
}

/**
 * Does `legoToks` appear as a contiguous run inside `phraseToks`?
 * Returns the residue tokens (everything outside the run) or null if absent.
 */
function residueAfterRemovingLego (phraseToks, legoToks) {
  if (legoToks.length === 0 || phraseToks.length < legoToks.length) return null
  for (let i = 0; i + legoToks.length <= phraseToks.length; i++) {
    let hit = true
    for (let j = 0; j < legoToks.length; j++) {
      if (phraseToks[i + j] !== legoToks[j]) { hit = false; break }
    }
    if (hit) return [...phraseToks.slice(0, i), ...phraseToks.slice(i + legoToks.length)]
  }
  return null
}

const MAX_RESIDUE_TOKENS = 3

async function scanCourse (courseCode, { fromRound = null } = {}) {
  // Neither content table carries a round number — rounds live only in the
  // course_round_index materialised view, one round per LEGO. Deborah's "R1150"
  // is a round_index, so the view is the only way to honour --from-round.
  const rounds = await pageAll(() => db.from('course_round_index')
    .select('round_index, lego_id, seed_number')
    .eq('course_code', courseCode)
    .order('round_index'), `rounds ${courseCode}`)
  const roundByLegoId = new Map(rounds.map(r => [r.lego_id, r.round_index]))

  const legos = await pageAll(() => db.from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode)
    .order('lego_id'), `legos ${courseCode}`)

  // Phrases carry seed_number + lego_index, not a lego FK, so that pair is the
  // join key both tables actually agree on.
  const key = (seed, idx) => `${seed}|${idx}`
  const legoByKey = new Map(legos.map(l => [key(l.seed_number, l.lego_index), l]))

  // Builds only. 'component' rows are never drilled by the bundle and are not
  // learner-facing practice, so they are out of scope by definition here.
  const phrases = await pageAll(() => db.from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, phrase_role')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'build')
    .order('id'), `phrases ${courseCode}`)

  const perLego = new Map()
  let buildsExamined = 0
  let roundsUnknown = 0

  for (const p of phrases) {
    const lego = legoByKey.get(key(p.seed_number, p.lego_index))
    if (!lego || !lego.known_text || !p.known_text) continue
    const round = roundByLegoId.has(lego.lego_id) ? roundByLegoId.get(lego.lego_id) : null
    if (round == null) roundsUnknown++
    if (fromRound != null && (round == null || round < fromRound)) continue
    buildsExamined++
    const residue = residueAfterRemovingLego(tokenize(p.known_text), tokenize(lego.known_text))
    if (residue == null) continue                       // LEGO not contiguous → genuine recombination
    if (residue.length === 0) continue                  // Build == LEGO alone: a different defect
    if (residue.length > MAX_RESIDUE_TOKENS) continue    // long enough to carry real content

    if (!perLego.has(lego.lego_id)) perLego.set(lego.lego_id, { lego, round, hits: [] })
    perLego.get(lego.lego_id).hits.push({
      phrase_id: p.id,
      round,
      known_text: p.known_text,
      residue: residue.join(' ')
    })
  }

  // Residue frequency across the whole in-scope course: the tell that this is a
  // template and not a coincidence.
  const residueFreq = new Map()
  for (const { hits } of perLego.values()) {
    for (const h of hits) residueFreq.set(h.residue, (residueFreq.get(h.residue) || 0) + 1)
  }

  const RECURRENCE_MIN = 3
  const clusters = []
  for (const [legoId, { lego, round, hits }] of perLego) {
    const distinct = new Set(hits.map(h => h.residue))
    if (distinct.size < 2) continue
    const recurring = [...distinct].filter(r => (residueFreq.get(r) || 0) >= RECURRENCE_MIN)
    if (recurring.length < 2) continue
    clusters.push({
      lego_id: legoId,
      round,
      lego_known: lego.known_text,
      lego_target: lego.target_text,
      builds: hits.sort((a, b) => String(a.phrase_id).localeCompare(String(b.phrase_id)))
    })
  }

  const rawHits = [...perLego.values()].reduce((n, v) => n + v.hits.length, 0)
  const confirmedHits = clusters.reduce((n, c) => n + c.builds.length, 0)

  return {
    course_code: courseCode,
    from_round: fromRound,
    builds_examined: buildsExamined,
    // Honest gap marker: builds whose LEGO has no row in course_round_index
    // (stale view). With --from-round these are EXCLUDED, so a stale view
    // silently shrinks the scan — hence reporting the number rather than hiding it.
    builds_with_unknown_round: roundsUnknown,
    raw: { filler_builds: rawHits, legos_touched: perLego.size },
    confirmed: { filler_builds: confirmedHits, filler_clusters: clusters.length },
    top_residues: [...residueFreq.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([residue, count]) => ({ residue, count })),
    clusters: clusters.sort((a, b) => (a.round || 0) - (b.round || 0))
  }
}

async function main () {
  const argv = process.argv.slice(2)
  const jsonAt = argv.indexOf('--json')
  const jsonOut = jsonAt >= 0 ? argv[jsonAt + 1] : null
  const fromAt = argv.indexOf('--from-round')
  const fromRound = fromAt >= 0 ? Number(argv[fromAt + 1]) : null

  let courses
  if (argv.includes('--all-eng-known')) {
    const rows = await pageAll(() => db.from('courses')
      .select('course_code').eq('known_lang', 'eng').order('course_code'), 'courses')
    courses = rows.map(r => r.course_code)
  } else {
    courses = argv.filter(a => /^[a-z]{3}(_[a-z]{2})?_for_[a-z]{3}$/.test(a))
  }
  if (courses.length === 0) {
    console.error('Usage: filler-build-scan.cjs <course_code>… [--from-round N] [--json out] | --all-eng-known')
    process.exit(1)
  }

  const results = []
  for (const course of courses) {
    try {
      const r = await scanCourse(course, { fromRound })
      results.push(r)
      console.log(
        `${course.padEnd(18)} builds=${String(r.builds_examined).padStart(6)}  ` +
        `RAW=${String(r.raw.filler_builds).padStart(5)}  ` +
        `CONFIRMED=${String(r.confirmed.filler_builds).padStart(5)} in ${r.confirmed.filler_clusters} clusters  ` +
        `top=${r.top_residues.slice(0, 4).map(t => `${t.residue}×${t.count}`).join(', ')}`
      )
    } catch (e) {
      console.log(`${course.padEnd(18)} GAP: ${e.message}`)
      results.push({ course_code: course, gap: e.message })
    }
  }

  if (jsonOut) {
    require('fs').writeFileSync(jsonOut, JSON.stringify(results, null, 2))
    console.log(`\nwrote ${jsonOut}`)
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { tokenize, residueAfterRemovingLego, scanCourse }
