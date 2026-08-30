// Read-only course-wide phrase-level ZUT audit. Mirrors the exact rules the live
// gate (services/course-builder/lib/validation.cjs checkPhraseZUT) uses, RESCOPED
// per Tom's ruling 2026-07-04 (docs/course-optimization/zut-violation-sweep-pilot-fra-40.md):
//
//   "Component rows for tiling are often NOT part of the sentence — they are often
//   LITERAL translations. They are exempt from ZUT in known language — but not in
//   target language. They MUST be part of the target sentence of course."
//
// So a `course_practice_phrases` row with phrase_role:'component' (course_legos rows
// are never components — confirmed empirically, `type` is always M/A) is:
//   - EXEMPT from the known-side check: its known_text is never compared against other
//     rows' known_text to flag a divergent target, in either direction.
//   - NOT exempt on the target side: its target_text must be a genuine constituent of
//     its own seed's target sentence (course_seeds.target_text, same seed_number).
//     Matching rule: plain SUBSTRING containment (normalizeForContainment(seed)
//     .includes(normalizeForContainment(target))) — NOT the word-multiset
//     checkWordContainment used elsewhere for "does this phrase contain its LEGO"
//     (which tolerates word reordering, needed there for e.g. German brackets). A
//     component is supposed to be a LITERAL, CONTIGUOUS slice of its seed's target
//     sentence, so contiguous substring is the more faithful test, and it composes
//     for free with elision/inversion the tiling already produces (French subject-verb
//     inversion "voulons-nous", elision "qu'il", Spanish enclitics "seguirnos") that a
//     whitespace/word-based check would wrongly flag as non-members. Matches the rule
//     implemented in checkPhraseZUT (services/course-builder/lib/validation.cjs).
//
// Three reported categories (mutually exclusive, grouped by normalized known_text as before):
//   1. bidirectional  — 2+ LEGO/BUILD/USE (non-component) rows disagree on target for the
//                        same known. UNCHANGED from the pre-rescope check.
//   2. targetMembership — a component row whose target_text is NOT contained in its own
//                        seed's target sentence. NEW.
//   3. targetSideCollision — informational only, NOT enforced by the live gate: a known_text
//                        used ONLY by component rows where those components still disagree
//                        with each other on target. Reported for visibility into what's now
//                        silently exempted, per-component, target-language-only.
require('dotenv').config()
const { supabase } = require('../../services/supabase-client.cjs')
const { normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs')

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

async function fetchAll(table, courseCode, cols) {
  const PAGE = 1000
  let all = [], from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select(cols)
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
    fetchAll('course_legos', courseCode, 'id, known_text, target_text, seed_number'),
    fetchAll('course_practice_phrases', courseCode, 'id, known_text, target_text, seed_number, phrase_role'),
  ])
  const rows = [
    ...legos.map(r => ({ ...r, table: 'course_legos', phrase_role: null })),
    ...phrases.map(r => ({ ...r, table: 'course_practice_phrases' })),
  ].filter(r => r.known_text && r.target_text)

  const isComponent = r => r.phrase_role === 'component'

  // ── Target-membership check (new) ──────────────────────────────────────
  const componentRows = rows.filter(isComponent)
  const seedNumbers = [...new Set(componentRows.map(r => r.seed_number))]
  let seedTargetByNumber = new Map()
  if (seedNumbers.length) {
    const seeds = []
    const PAGE = 1000
    for (let i = 0; i < seedNumbers.length; i += PAGE) {
      const { data, error } = await supabase.from('course_seeds').select('seed_number, target_text')
        .eq('course_code', courseCode).in('seed_number', seedNumbers.slice(i, i + PAGE))
      if (error) throw error
      seeds.push(...data)
    }
    seedTargetByNumber = new Map(seeds.map(s => [s.seed_number, s.target_text]))
  }
  const membershipFailures = []
  let membershipNoSeedContext = 0
  for (const r of componentRows) {
    const seedTarget = seedTargetByNumber.get(r.seed_number)
    if (!seedTarget) { membershipNoSeedContext++; continue }
    const isMember = normalizeForContainment(seedTarget).includes(normalizeForContainment(r.target_text))
    if (!isMember) {
      membershipFailures.push({ known: r.known_text, target: r.target_text, seed: r.seed_number, seed_target: seedTarget, id: r.id })
    }
  }

  // ── Known-side grouping (bidirectional for non-components; informational for components) ──
  const byKnown = new Map()
  for (const r of rows) {
    const k = nk(r.known_text)
    if (!byKnown.has(k)) byKnown.set(k, [])
    byKnown.get(k).push(r)
  }

  const makeTierBuckets = () => ({ violations: [], violationsCI: [], violationsStrict: [] })
  const bidirectional = makeTierBuckets()   // non-component vs non-component
  const targetSideCollision = makeTierBuckets() // component-only groups

  for (const [k, group] of byKnown) {
    const nonComp = group.filter(r => !isComponent(r))
    const comp = group.filter(isComponent)

    const tierEntry = (subGroup) => {
      const byTarget = new Map(), byTargetCI = new Map(), byTargetStrict = new Map()
      for (const r of subGroup) {
        const t = nt(r.target_text); if (!byTarget.has(t)) byTarget.set(t, []); byTarget.get(t).push(r)
        const tci = ntCI(r.target_text); if (!byTargetCI.has(tci)) byTargetCI.set(tci, []); byTargetCI.get(tci).push(r)
        const ts = ntStrict(r.target_text); if (!byTargetStrict.has(ts)) byTargetStrict.set(ts, []); byTargetStrict.get(ts).push(r)
      }
      const toEntry = (map) => ({
        known_norm: k,
        distinct_targets: [...map.entries()].map(([t, rs]) => ({
          target_norm: t,
          example: { known: rs[0].known_text, target: rs[0].target_text, seed: rs[0].seed_number, table: rs[0].table, phrase_role: rs[0].phrase_role },
          count: rs.length,
        })),
      })
      return {
        exact: byTarget.size > 1 ? toEntry(byTarget) : null,
        ci: byTargetCI.size > 1 ? toEntry(byTargetCI) : null,
        strict: byTargetStrict.size > 1 ? toEntry(byTargetStrict) : null,
      }
    }

    if (nonComp.length > 1) {
      const t = tierEntry(nonComp)
      if (t.exact) bidirectional.violations.push(t.exact)
      if (t.ci) bidirectional.violationsCI.push(t.ci)
      if (t.strict) bidirectional.violationsStrict.push(t.strict)
    }
    // Only report as "target-side collision" when EVERY row sharing this known is a
    // component (mixed component+non-component groups are the ~d1 bucket the rescope
    // is designed to silently clear — no longer a violation of any kind).
    if (comp.length > 1 && nonComp.length === 0) {
      const t = tierEntry(comp)
      if (t.exact) targetSideCollision.violations.push(t.exact)
      if (t.ci) targetSideCollision.violationsCI.push(t.ci)
      if (t.strict) targetSideCollision.violationsStrict.push(t.strict)
    }
  }

  return {
    totalRows: rows.length,
    totalComponentRows: componentRows.length,
    totalDistinctKnowns: byKnown.size,
    bidirectional,
    targetSideCollision,
    membershipFailures,
    membershipNoSeedContext,
  }
}

async function main() {
  for (const course of ['ell_for_eng']) {
    const result = await auditCourse(course)
    const { totalRows, totalComponentRows, totalDistinctKnowns, bidirectional, targetSideCollision, membershipFailures, membershipNoSeedContext } = result
    console.log(`\n=== ${course}: ${totalRows} rows (${totalComponentRows} component), ${totalDistinctKnowns} distinct normalized knowns ===`)
    console.log(`  [1] bidirectional (non-component vs non-component, unchanged):`)
    console.log(`      gate-exact: ${bidirectional.violations.length}  case-insensitive: ${bidirectional.violationsCI.length}  strict: ${bidirectional.violationsStrict.length}`)
    console.log(`  [2] target-membership failures (component target_text not in its seed's target sentence): ${membershipFailures.length}`)
    if (membershipNoSeedContext) console.log(`      (${membershipNoSeedContext} component rows skipped — no matching course_seeds row)`)
    console.log(`  [3] target-side ZUT collisions (component-only known groups, informational — NOT enforced):`)
    console.log(`      gate-exact: ${targetSideCollision.violations.length}  case-insensitive: ${targetSideCollision.violationsCI.length}  strict: ${targetSideCollision.violationsStrict.length}`)

    console.log(`  --- [1] bidirectional strict violations, up to 30 ---`)
    for (const v of bidirectional.violationsStrict.slice(0, 30)) {
      console.log(`  known="${v.known_norm}"`)
      for (const dt of v.distinct_targets) console.log(`    -> "${dt.example.target}" (seed ${dt.example.seed}, ${dt.example.table}, x${dt.count})`)
    }
    if (bidirectional.violationsStrict.length > 30) console.log(`  ... and ${bidirectional.violationsStrict.length - 30} more`)

    console.log(`  --- [2] target-membership failures, up to 30 ---`)
    for (const f of membershipFailures.slice(0, 30)) {
      console.log(`  known="${f.known}" -> target="${f.target}" NOT IN seed ${f.seed} target="${f.seed_target}"`)
    }
    if (membershipFailures.length > 30) console.log(`  ... and ${membershipFailures.length - 30} more`)

    console.log(`  --- [3] target-side collisions strict, up to 30 ---`)
    for (const v of targetSideCollision.violationsStrict.slice(0, 30)) {
      console.log(`  known="${v.known_norm}"`)
      for (const dt of v.distinct_targets) console.log(`    -> "${dt.example.target}" (seed ${dt.example.seed}, x${dt.count})`)
    }
    if (targetSideCollision.violationsStrict.length > 30) console.log(`  ... and ${targetSideCollision.violationsStrict.length - 30} more`)

    require('fs').writeFileSync(
      require('path').join(__dirname, `zut-audit-${course}.json`),
      JSON.stringify({
        counts: {
          bidirectional: { gateExact: bidirectional.violations.length, caseInsensitive: bidirectional.violationsCI.length, strict: bidirectional.violationsStrict.length },
          targetMembershipFailures: membershipFailures.length,
          targetSideCollision: { gateExact: targetSideCollision.violations.length, caseInsensitive: targetSideCollision.violationsCI.length, strict: targetSideCollision.violationsStrict.length },
        },
        bidirectionalStrict: bidirectional.violationsStrict,
        membershipFailures,
        targetSideCollisionStrict: targetSideCollision.violationsStrict,
      }, null, 2)
    )
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
