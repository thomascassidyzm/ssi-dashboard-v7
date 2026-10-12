// Read-only: for every component row the phrase-ZUT audit flagged as a target-membership
// failure (its target_text is not a contiguous substring of its own seed's target sentence),
// pull the evidence a triager needs — the row itself (created_at, lego_index, introduce),
// its seed's FULL sentence in both languages, and every sibling row at the same seed_number
// (course_legos + course_practice_phrases). Never triage the bare fragment.
//
// Generalises the July fix sweep's dump-membership-failure-context.cjs (fra/spa only) to any
// course list; reads the audit snapshots written by audit-phrase-zut.cjs --tag <tag>.
//
//   node tools/course-optimization/zut-967-dump-membership-context.cjs --tag pre-967 <course...>
//
// Output: one JSON per course in the evidence store (tools/lib/evidence-path.cjs).
const fs = require('fs')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

// The batch-regeneration windows the July sweep found orphans clustered in. Corroborating
// evidence only — never a reason to cut on its own.
const BATCH_WINDOWS = [
  ['2026-03-11T17:06:00Z', '2026-03-11T17:09:00Z'],
  ['2026-03-11T19:34:00Z', '2026-03-11T19:36:00Z'],
  ['2026-05-23T00:00:00Z', '2026-05-24T00:00:00Z'],
]
const inBatchWindow = iso => {
  const t = Date.parse(iso)
  return BATCH_WINDOWS.some(([a, b]) => t >= Date.parse(a) && t < Date.parse(b))
}

function dbUrl() {
  const line = fs.readFileSync(require('path').join(__dirname, '../../.env.psql'), 'utf8').split('\n').find(l => l.startsWith('DATABASE_URL='))
  return line.slice('DATABASE_URL='.length).replace(/^"|"$/g, '')
}

async function main() {
  const argv = process.argv.slice(2)
  const ti = argv.indexOf('--tag')
  const tag = ti >= 0 ? argv.splice(ti, 2)[1] : 'pre-967'
  const courses = argv
  const db = new Client({ connectionString: dbUrl() })
  await db.connect()
  for (const course of courses) {
    const audit = JSON.parse(fs.readFileSync(evidencePath(`tools/course-optimization/zut-audit-${course}-${tag}.json`), 'utf8'))
    const failures = audit.membershipFailures
    const seedNums = [...new Set(failures.map(f => f.seed))]
    if (!failures.length) { console.log(`${course}: 0`); continue }
    const seeds = (await db.query('select seed_number, known_text, target_text from course_seeds where course_code=$1 and seed_number = any($2)', [course, seedNums])).rows
    const legos = (await db.query('select id, seed_number, lego_index, type, known_text, target_text from course_legos where course_code=$1 and seed_number = any($2)', [course, seedNums])).rows
    const phrases = (await db.query('select id, seed_number, lego_index, position, phrase_role, introduce, known_text, target_text, created_at from course_practice_phrases where course_code=$1 and seed_number = any($2)', [course, seedNums])).rows
    const seedBy = new Map(seeds.map(s => [s.seed_number, s]))
    const phraseById = new Map(phrases.map(p => [p.id, p]))
    const out = failures.map(f => {
      const own = phraseById.get(f.id) || {}
      const s = seedBy.get(f.seed) || {}
      const sib = r => ({ id: r.id, role: r.phrase_role || `lego-${r.type}`, li: r.lego_index, known: r.known_text, target: r.target_text })
      return {
        id: f.id, course, seed: f.seed, lego_index: own.lego_index, introduce: own.introduce,
        known: f.known, target: f.target,
        created_at: own.created_at && own.created_at.toISOString(),
        batch_window: own.created_at ? inBatchWindow(own.created_at.toISOString()) : false,
        seed_known: s.known_text, seed_target: s.target_text,
        legos: legos.filter(l => l.seed_number === f.seed).sort((a, b) => a.lego_index - b.lego_index).map(sib),
        same_lego_components: phrases.filter(p => p.seed_number === f.seed && p.lego_index === own.lego_index && p.phrase_role === 'component' && p.id !== f.id).map(sib),
        same_lego_practice: phrases.filter(p => p.seed_number === f.seed && p.lego_index === own.lego_index && p.phrase_role !== 'component').slice(0, 12).map(sib),
        other_components_in_seed: phrases.filter(p => p.seed_number === f.seed && p.lego_index !== own.lego_index && p.phrase_role === 'component').map(sib),
      }
    })
    const p = evidencePath(`tools/course-optimization/zut-967-context-${course}.json`)
    fs.writeFileSync(p, JSON.stringify(out, null, 1))
    console.log(`${course}: ${out.length} rows, ${out.filter(o => o.batch_window).length} in batch windows -> ${p}`)
  }
  await db.end()
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
