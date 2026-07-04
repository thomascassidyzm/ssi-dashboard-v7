// Read-only course-wide phrase-level ZUT audit: same known_text (normalized per
// checkPhraseZUT's rules) mapping to 2+ different target_text (normalized) across
// course_legos + course_practice_phrases. Mirrors the exact normalization the live
// gate (services/course-builder/lib/validation.cjs checkPhraseZUT) uses.
require('dotenv').config()
const { supabase } = require('../../services/supabase-client.cjs')

const nk = s => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '')
const nt = s => (s || '').replace(/[\s。，？！、.?!,]/g, '')
// The live gate's nt() is case-sensitive (verbatim from checkPhraseZUT), which floods
// the count with lego-vs-phrase capitalization pairs ("cuánto tiempo" vs "Cuánto tiempo")
// that are not real methodology violations. ntCI adds lowercasing to separate genuine
// same-known/different-target collisions from this case-only noise.
const ntCI = s => nt(s).toLowerCase()
// Further tightened: the live gate's char class also misses Spanish/French inverted
// punctuation (¿¡) and guillemets, which otherwise masquerade as "different targets"
// for the same content (e.g. "has oído" vs "¿Has oído?"). Stripped here only to isolate
// genuine word-level collisions for reporting — NOT part of the live gate.
const ntStrict = s => ntCI(s).replace(/[¿¡«»"'’]/g, '')

async function fetchAll(table, courseCode) {
  const PAGE = 1000
  let all = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select('id, known_text, target_text, seed_number')
      .eq('course_code', courseCode).range(from, from + PAGE - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function auditCourse(courseCode) {
  const [legos, phrases] = await Promise.all([
    fetchAll('course_legos', courseCode),
    fetchAll('course_practice_phrases', courseCode)
  ])
  const rows = [
    ...legos.map(r => ({ ...r, table: 'course_legos' })),
    ...phrases.map(r => ({ ...r, table: 'course_practice_phrases' }))
  ].filter(r => r.known_text && r.target_text)

  const byKnown = new Map()
  for (const r of rows) {
    const k = nk(r.known_text)
    if (!byKnown.has(k)) byKnown.set(k, [])
    byKnown.get(k).push(r)
  }

  const violations = [], violationsCI = [], violationsStrict = []
  for (const [k, group] of byKnown) {
    const byTarget = new Map(), byTargetCI = new Map(), byTargetStrict = new Map()
    for (const r of group) {
      const t = nt(r.target_text)
      if (!byTarget.has(t)) byTarget.set(t, [])
      byTarget.get(t).push(r)
      const tci = ntCI(r.target_text)
      if (!byTargetCI.has(tci)) byTargetCI.set(tci, [])
      byTargetCI.get(tci).push(r)
      const ts = ntStrict(r.target_text)
      if (!byTargetStrict.has(ts)) byTargetStrict.set(ts, [])
      byTargetStrict.get(ts).push(r)
    }
    const toEntry = (map) => ({
      known_norm: k,
      distinct_targets: [...map.entries()].map(([t, rs]) => ({
        target_norm: t,
        example: { known: rs[0].known_text, target: rs[0].target_text, seed: rs[0].seed_number, table: rs[0].table },
        count: rs.length
      }))
    })
    if (byTarget.size > 1) violations.push(toEntry(byTarget))
    if (byTargetCI.size > 1) violationsCI.push(toEntry(byTargetCI))
    if (byTargetStrict.size > 1) violationsStrict.push(toEntry(byTargetStrict))
  }
  return { totalRows: rows.length, totalDistinctKnowns: byKnown.size, violations, violationsCI, violationsStrict }
}

async function main() {
  for (const course of ['spa_for_eng', 'fra_for_eng']) {
    const { totalRows, totalDistinctKnowns, violations, violationsCI, violationsStrict } = await auditCourse(course)
    console.log(`\n=== ${course}: ${totalRows} rows, ${totalDistinctKnowns} distinct normalized knowns ===`)
    console.log(`  gate-exact (matches live checkPhraseZUT normalization verbatim): ${violations.length} violation groups`)
    console.log(`  case-insensitive (strips lego-vs-phrase capitalization noise):    ${violationsCI.length} violation groups`)
    console.log(`  strict (also strips ¿¡«»' quote/inverted-punct noise):            ${violationsStrict.length} violation groups`)
    console.log(`  --- strict (most-genuine) violations, up to 60 ---`)
    for (const v of violationsStrict.slice(0, 60)) {
      console.log(`  known="${v.known_norm}"`)
      for (const dt of v.distinct_targets) {
        console.log(`    -> "${dt.example.target}" (seed ${dt.example.seed}, ${dt.example.table}, x${dt.count})`)
      }
    }
    if (violationsStrict.length > 60) console.log(`  ... and ${violationsStrict.length - 60} more`)
    require('fs').writeFileSync(
      require('path').join(__dirname, `zut-audit-${course}.json`),
      // Only the strict tier is persisted — violations/violationsCI are near-total
      // supersets dominated by the live gate's own normalization gaps (see doc), so
      // committing all three would triple the file for no diagnostic value.
      JSON.stringify({ counts: { gateExact: violations.length, caseInsensitive: violationsCI.length, strict: violationsStrict.length }, violationsStrict }, null, 2)
    )
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
