#!/usr/bin/env node
/**
 * casting-access-report.cjs — the USAGE signal for artist rights from casting.
 *
 * Tom, 2026-09-12: "add a usage signal, not only a break signal. Count, per
 * day, cast artists who reach a course page via the booth nav or the casting
 * rule, and log each refusal of a cast artist LOUDLY … so a zero-or-refusal is
 * red, not silent."
 *
 * Reads the ledger services/voice-engine/casting-rights.cjs appends to
 * (~/ssi-evidence/ssi-dashboard-v7/ops/casting-access.jsonl, one JSON event
 * per line: reach = a cast artist reached a course page, once per day per
 * course; refused = a cast artist was refused, every time).
 *
 *   node tools/casting-access-report.cjs              last 7 days, per-day table, exit 0
 *   node tools/casting-access-report.cjs --days 30    a longer window
 *   node tools/casting-access-report.cjs --nightly    the check: exit 1 when the last
 *                                                     24h had ZERO reaches or ANY refusal
 *   CASTING_ACCESS_LEDGER=<file>                      read another ledger (tests)
 */
'use strict'

const fs = require('fs')

function readEvents(file) {
  if (!fs.existsSync(file)) return []
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
}

/** Per-day summary: distinct cast artists (emails) and courses reached, and every refusal. */
function summarise(events, { now = Date.now(), days = 7 } = {}) {
  const since = now - days * 86400000
  const byDay = new Map()
  for (const e of events) {
    const t = Date.parse(e.ts)
    if (!(t >= since)) continue
    const day = e.ts.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, { day, artists: new Set(), courses: new Set(), reaches: 0, refusals: [] })
    const d = byDay.get(day)
    if (e.kind === 'reach') { d.reaches += 1; d.artists.add(e.email); d.courses.add(e.courseCode) }
    else if (e.kind === 'refused') d.refusals.push(e)
  }
  const last24h = events.filter((e) => Date.parse(e.ts) >= now - 86400000)
  return {
    days: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({
      day: d.day, artists: d.artists.size, courses: d.courses.size, reaches: d.reaches, refusals: d.refusals,
    })),
    last24h: {
      artists: new Set(last24h.filter((e) => e.kind === 'reach').map((e) => e.email)).size,
      refusals: last24h.filter((e) => e.kind === 'refused'),
    },
  }
}

/** The nightly verdict: red on zero reaches in 24h, red on any refusal in 24h. */
function verdict(summary) {
  const reasons = []
  if (summary.last24h.artists === 0) reasons.push('ZERO cast artists reached a course page in the last 24h')
  for (const r of summary.last24h.refusals) {
    reasons.push(`REFUSED ${r.email} (${(r.voices || []).join('+') || 'voice unknown'}) on ${r.courseCode}: ${r.sentence}`)
  }
  return { ok: reasons.length === 0, reasons }
}

function render(summary) {
  const lines = ['day         artists  courses  reaches  refusals']
  for (const d of summary.days) {
    lines.push(`${d.day}  ${String(d.artists).padStart(7)}  ${String(d.courses).padStart(7)}  ${String(d.reaches).padStart(7)}  ${String(d.refusals.length).padStart(8)}`)
    for (const r of d.refusals) lines.push(`    REFUSED ${r.email} (${(r.voices || []).join('+') || '?'}) on ${r.courseCode} [${r.method} ${r.path}]: ${r.sentence}`)
  }
  if (!summary.days.length) lines.push('(no events in the window)')
  return lines.join('\n')
}

function main(argv) {
  const nightly = argv.includes('--nightly')
  const di = argv.indexOf('--days')
  const days = di >= 0 ? Number(argv[di + 1]) || 7 : 7
  const { accessLedger } = require('../services/voice-engine/casting-rights.cjs')
  const file = accessLedger()
  const summary = summarise(readEvents(file), { days })
  console.log(`casting access ledger: ${file}`)
  console.log(render(summary))
  if (!nightly) return 0
  const v = verdict(summary)
  console.log(v.ok
    ? `OK: ${summary.last24h.artists} cast artist(s) reached a course page in the last 24h, no refusals`
    : `RED:\n  ${v.reasons.join('\n  ')}`)
  return v.ok ? 0 : 1
}

if (require.main === module) process.exit(main(process.argv.slice(2)))

module.exports = { readEvents, summarise, verdict, render }
