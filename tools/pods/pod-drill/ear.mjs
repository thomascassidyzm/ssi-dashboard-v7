#!/usr/bin/env node
/**
 * POD DRILL EAR MARKS (job #750). Files a person's listen-and-mark answers on the known pieces of a course
 * as <course>.ear.json beside its score, so score.mjs can obey the ear over the machine score and the
 * calibration of BOUNDARY (lib.mjs) can be re-checked against what was actually heard.
 *
 *   node tools/pods/pod-drill/ear.mjs <review-page-state.json> [--by=Kai] [--page=d/15149e60] [--write]
 *
 * The state file is the review page's own answer, GET /api/review-page/state?id=<page> on the command
 * surface: { items: [{ id, source: '<course> <card>: "<known>" (from …)' }], answers: { <id>: { choice, text } } }.
 * choice accept → 'accept'; reject → 'reject'; own (a note) → 'borderline' with the note. On the #707 page every
 * note said the cut was abrupt "but probably fine", and Kai then ruled them "a little distracting" (2026-11-03,
 * r-2026-10-31: not distracting is the bar), so score.mjs treats borderline as tight; only 'accept' keeps a cut.
 * Each item is matched to its score row by course, card and known text, in page order (a card can say the
 * same words twice, "I'd like … I'd like"); an item that matches nothing is printed and filed nowhere.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { OPS } from './paths.mjs'

const argv = process.argv.slice(2)
const file = argv.find((a) => !a.startsWith('--'))
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
if (!file) { console.error('usage: ear.mjs <review-page-state.json> [--by=Kai] [--page=d/<id>] [--write]'); process.exit(1) }
const st = JSON.parse(readFileSync(file, 'utf8'))
const markOf = (a) => !a ? null : a.choice === 'accept' ? 'accept' : a.choice === 'reject' ? 'reject' : a.choice === 'own' && a.text ? 'borderline' : null

const byCourse = new Map()
const used = new Set()
const missing = []
for (const it of st.items || []) {
  const m = /^(\S+_for_\S+) (\S+): "(.*)" \(from /.exec(it.source || '')
  const mark = markOf(st.answers?.[it.id])
  if (!m || !mark) { missing.push(`${it.id}: ${!m ? 'source not understood' : 'no answer'}`); continue }
  const [, course, card, known] = m
  if (!byCourse.has(course)) {
    const f = path.join(OPS, `${course}.score.json`)
    if (!existsSync(f)) { missing.push(`${it.id}: no ${course}.score.json`); continue }
    byCourse.set(course, { rows: JSON.parse(readFileSync(f, 'utf8')).pieces, marks: {} })
  }
  const c = byCourse.get(course)
  const row = c.rows.find((r) => r.id.endsWith(`:${card}`) && r.known === known && !used.has(`${r.id}|${r.line}|${r.chunk}`))
  if (!row) { missing.push(`${it.id}: no ${course} piece "${known}" on ${card}`); continue }
  const key = `${row.id}|${row.line}|${row.chunk}`
  used.add(key)
  c.marks[key] = { label: it.id, known, mark, ...(st.answers[it.id].text ? { note: st.answers[it.id].text } : {}) }
}
for (const x of missing) console.error(`  not filed ${x}`)
for (const [course, c] of byCourse) {
  const n = (v) => Object.values(c.marks).filter((m) => m.mark === v).length
  const out = { course, tool: 'tools/pods/pod-drill/ear.mjs (#750)', by: opt.by || null, page: opt.page || null, submitted: st.submitted_ts || null,
    totals: { marked: Object.keys(c.marks).length, accept: n('accept'), borderline: n('borderline'), reject: n('reject') }, marks: c.marks }
  console.error(`${course}: ${JSON.stringify(out.totals)}`)
  if (opt.write) writeFileSync(path.join(OPS, `${course}.ear.json`), JSON.stringify(out, null, 1) + '\n')
}
