#!/usr/bin/env node
/**
 * CI guard — forbid ad-hoc writes to course-content tables.
 *
 * Enforcement decision from the 2026-06-17 incident: the ONLY sanctioned writer
 * to course_legos / course_practice_phrases / course_seeds / course_audio is
 * services/course-editor/. Any other `.from('<content table>').update|insert|
 * upsert|delete(...)` in committed source is an ad-hoc write — exactly the class
 * of script that caused the 79-course corruption.
 *
 * Reality: a lot of existing code (production-api.cjs, course-data-service.cjs,
 * qa.cjs, …) still writes directly. We baseline those KNOWN sites so CI is green
 * today, and fail the build only when a NEW ad-hoc write appears. Migrate the
 * baseline down over time by routing those sites through the course-editor.
 *
 *   node tools/ci/check-no-adhoc-db-writes.mjs            # check (exit 1 on new)
 *   node tools/ci/check-no-adhoc-db-writes.mjs --update   # regenerate baseline
 *   node tools/ci/check-no-adhoc-db-writes.mjs --json     # machine output
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const BASELINE = path.join(ROOT, 'tools/ci/adhoc-db-writes.baseline.json')

const CONTENT_TABLES = ['course_legos', 'course_practice_phrases', 'course_seeds', 'course_audio']
const WRITE_RE = /\.(update|insert|upsert|delete)\s*\(/
const FROM_RE = (t) => new RegExp(`\\.from\\(\\s*['"\`]${t}['"\`]\\s*\\)`)

// Committed dirs that ship to prod. scripts/ is the gitignored agent workspace —
// out of scope (those are the throwaway fixes the tool is meant to replace).
const SCAN_DIRS = ['services', 'src', 'tools', 'api']
const EXCLUDE = [
  'services/course-editor', // the sanctioned writer itself
  'tools/ci',               // this guard
  'node_modules',
]
const SKIP_FILE = (p) => /\.(test|spec)\.|__tests__|\.min\./.test(p)

function walk(dir, acc = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return acc }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    const rel = path.relative(ROOT, full)
    if (EXCLUDE.some((x) => rel.startsWith(x))) continue
    if (e.isDirectory()) walk(full, acc)
    else if (/\.(c?js|mjs|ts|vue)$/.test(e.name) && !SKIP_FILE(rel)) acc.push(full)
  }
  return acc
}

/** Find write-chains targeting a content table. Heuristic chain scan. */
function findViolations(file) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split('\n')
  const hits = []
  for (let i = 0; i < lines.length; i++) {
    for (const table of CONTENT_TABLES) {
      if (!FROM_RE(table).test(lines[i])) continue
      let chain = lines[i]
      for (let j = i + 1; j < Math.min(lines.length, i + 12); j++) {
        if (/\.from\(/.test(lines[j])) break // a new statement
        chain += '\n' + lines[j]
        if (/;\s*$/.test(lines[j]) || /^\s*$/.test(lines[j])) break
      }
      if (WRITE_RE.test(chain)) {
        const method = chain.match(WRITE_RE)[1]
        hits.push({ file: path.relative(ROOT, file), line: i + 1, table, method })
      }
    }
  }
  return hits
}

function keyOf(v) { return `${v.file}:${v.table}:${v.method}` }

function scanAll() {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)))
  return files.flatMap(findViolations)
}

const args = process.argv.slice(2)
const violations = scanAll()

const nowCounts = {}
for (const v of violations) nowCounts[keyOf(v)] = (nowCounts[keyOf(v)] || 0) + 1

if (args.includes('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify({ note: 'site-keys (file:table:method) grandfathered at baseline time; migrate down over time', counts: nowCounts }, null, 2) + '\n')
  console.log(`Baseline updated: ${Object.keys(nowCounts).length} site-keys, ${violations.length} total ad-hoc writes.`)
  process.exit(0)
}

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).counts || {} : {}
const newViolations = violations.filter((v) => !(keyOf(v) in baseline))
const increased = Object.keys(nowCounts).filter((k) => (k in baseline) && nowCounts[k] > baseline[k])

if (args.includes('--json')) {
  console.log(JSON.stringify({ total: violations.length, baselineKeys: Object.keys(baseline).length, newViolations, increased }, null, 2))
} else {
  console.log(`Scanned ${SCAN_DIRS.join(', ')} (excluding services/course-editor).`)
  console.log(`Total ad-hoc content writes: ${violations.length} across ${Object.keys(nowCounts).length} site-keys (baseline: ${Object.keys(baseline).length} keys).`)
  if (newViolations.length || increased.length) {
    console.log('\n❌ NEW ad-hoc DB writes detected — route these through services/course-editor:')
    for (const v of newViolations) console.log(`  ${v.file}:${v.line}  .from('${v.table}').${v.method}(...)`)
    for (const k of increased) console.log(`  [increase] ${k}: ${baseline[k]} → ${nowCounts[k]}`)
    console.log('\nIf this is an intentional, reviewed migration, run with --update to re-baseline.')
  } else {
    console.log('\n✅ No new ad-hoc content-table writes outside services/course-editor.')
  }
}

process.exit(newViolations.length || increased.length ? 1 : 0)
