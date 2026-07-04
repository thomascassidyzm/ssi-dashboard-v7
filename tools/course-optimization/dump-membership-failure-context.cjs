// Read-only context dump for the 148 target-membership failures found by the
// rescoped ZUT audit (tools/course-optimization/audit-phrase-zut.cjs), for the
// fix-sweep triage. For each failing component row, pulls:
//   - the row itself (id, known, target, seed_number, created_at, version)
//   - its own seed's FULL known_text/target_text sentence (course_seeds)
//   - every sibling row (course_legos + course_practice_phrases) at the same
//     seed_number, so a triager can read the row against its own sentence and
//     siblings before acting — same depth as the 40-item pilot.
// Output: tools/course-optimization/zut-membership-context-<course>.json
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { supabase } = require('../../services/supabase-client.cjs')

async function fetchAll(table, courseCode, cols, filterFn) {
  const PAGE = 1000
  let all = [], from = 0
  for (;;) {
    let q = supabase.from(table).select(cols).eq('course_code', courseCode).range(from, from + PAGE - 1)
    const { data, error } = await q
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function main() {
  for (const course of ['fra_for_eng', 'spa_for_eng']) {
    const auditPath = path.join(__dirname, `zut-audit-${course}.json`)
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'))
    const failures = audit.membershipFailures
    console.log(`${course}: ${failures.length} membership failures to enrich`)

    const seedNumbers = [...new Set(failures.map(f => f.seed))]
    const [legos, phrases, seeds] = await Promise.all([
      fetchAll('course_legos', course, 'id, seed_number, lego_index, type, is_new, known_text, target_text, created_at, version'),
      fetchAll('course_practice_phrases', course, 'id, seed_number, lego_index, phrase_role, known_text, target_text, created_at, version'),
      fetchAll('course_seeds', course, 'seed_number, known_text, target_text, created_at, version'),
    ])
    const seedByNumber = new Map(seeds.map(s => [s.seed_number, s]))
    const legosBySeed = new Map()
    for (const r of legos) { if (!legosBySeed.has(r.seed_number)) legosBySeed.set(r.seed_number, []); legosBySeed.get(r.seed_number).push({ ...r, table: 'course_legos' }) }
    const phrasesBySeed = new Map()
    for (const r of phrases) { if (!phrasesBySeed.has(r.seed_number)) phrasesBySeed.set(r.seed_number, []); phrasesBySeed.get(r.seed_number).push({ ...r, table: 'course_practice_phrases' }) }

    // Also grab the exact failing row's own metadata (created_at, version, lego_index, phrase_role)
    const failingIds = failures.map(f => f.id)
    const ownRowById = new Map(phrases.filter(r => failingIds.includes(r.id)).map(r => [r.id, r]))

    const enriched = failures.map(f => {
      const seed = seedByNumber.get(f.seed)
      const own = ownRowById.get(f.id)
      const siblings = [
        ...(legosBySeed.get(f.seed) || []),
        ...(phrasesBySeed.get(f.seed) || []),
      ].filter(r => r.id !== f.id)
      return {
        id: f.id,
        known: f.known,
        target: f.target,
        seed_number: f.seed,
        lego_index: own?.lego_index,
        phrase_role: own?.phrase_role,
        created_at: own?.created_at,
        version: own?.version,
        seed_known_full: seed?.known_text,
        seed_target_full: seed?.target_text,
        seed_created_at: seed?.created_at,
        seed_version: seed?.version,
        siblings: siblings.map(s => ({
          id: s.id, table: s.table, phrase_role: s.phrase_role ?? null, type: s.type ?? null,
          lego_index: s.lego_index, known: s.known_text, target: s.target_text,
          created_at: s.created_at, version: s.version,
        })),
      }
    })

    const outPath = path.join(__dirname, `zut-membership-context-${course}.json`)
    fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2))
    console.log(`  wrote ${outPath}`)
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
