#!/usr/bin/env node
// Procedure `phrase-quality-status` (registry.cjs): the phrase-quality lane's state, per course.
// Run by bin/with-lane.sh with the working directory at a checkout of lanes/phrase-quality, so it
// reads the lane's own files and the lane's own ledger rule (ledger.cjs doneRowIds — a row is
// applied while its last ledger line is a change, open again once that line is 'undone').
// Read-only: no database, no writes.
'use strict'
const fs = require('fs'), path = require('path')

const LANE = path.resolve(process.cwd(), 'ops/lanes/phrase-quality')
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : [])

function summarise(staged, ledger, doneRowIds) {
  const done = doneRowIds(ledger)
  const undone = new Set(ledger.filter((l) => l.action === 'undone').map((l) => l.row_id))
  const n = (pred) => staged.filter(pred).length
  const change = (d) => d.decision === 'replace' || d.decision === 'delete'
  return {
    replace: n((d) => d.decision === 'replace'),
    delete: n((d) => d.decision === 'delete'),
    keep: n((d) => d.decision === 'keep'),
    held: n((d) => change(d) && d.hold && !done.has(d.row_id)),
    applied: done.size,
    undone: [...undone].filter((id) => !done.has(id)).length,
    open: n((d) => change(d) && !d.hold && !done.has(d.row_id)),
  }
}

function main() {
  const { doneRowIds } = require(path.join(LANE, 'ledger.cjs'))
  const stagedDir = path.join(LANE, 'staged')
  const courses = fs.existsSync(stagedDir) ? fs.readdirSync(stagedDir).filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, -6)).sort() : []
  const rows = courses.map((c) => ({ course: c, ...summarise(readJsonl(path.join(stagedDir, `${c}.jsonl`)), readJsonl(path.join(LANE, 'undo', `${c}.jsonl`)), doneRowIds) }))
  const cols = ['course', 'replace', 'delete', 'keep', 'applied', 'undone', 'held', 'open']
  const w = cols.map((k) => Math.max(k.length, ...rows.map((r) => String(r[k]).length)))
  const line = (r) => cols.map((k, i) => (i ? String(r[k]).padStart(w[i]) : String(r[k]).padEnd(w[i]))).join('  ')
  console.log(line(Object.fromEntries(cols.map((k) => [k, k]))))
  for (const r of rows) console.log(line(r))
  const tot = Object.fromEntries(cols.map((k) => [k, k === 'course' ? `${rows.length} courses` : rows.reduce((s, r) => s + r[k], 0)]))
  console.log(line(tot))
  console.log('\napplied = changes live now (per the undo ledger); open = staged changes not yet applied; held = waiting on audio.')
}

if (require.main === module) main()
module.exports = { summarise }
