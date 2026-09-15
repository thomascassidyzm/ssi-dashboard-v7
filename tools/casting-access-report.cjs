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
 *   node tools/casting-access-report.cjs --nightly    the check: exit 1 on ANY refusal in the
 *                                                     last 24h, or on NO human reach for
 *                                                     QUIET_DAYS_RED days; a quiet 24h is
 *                                                     printed, never red, never silent
 *   CASTING_ACCESS_LEDGER=<file>                      read another ledger (tests)
 */
'use strict'

const fs = require('fs')

// A QUIET DAY IS NOT A BROKEN BOOTH (job #773·G, 2026-09-15). The 24h-zero leg went red on
// 2026-09-15 with the booth verified up (prod restarted 14:50Z the day before, the voice
// endpoint answering 200, the real-browser artist's day green, zero refusals): nobody had
// recorded on the Monday. The studio does not record daily, so a 24h zero cannot tell "no one
// came" from "no one could get in", and a red here dispatches a 3am fix worker every quiet
// day. Refusals stay red at 24h — that leg caught a real bug on 2026-09-13. The zero leg is
// red only after this many days without a single HUMAN reach; a quiet 24h is printed.
const QUIET_DAYS_RED = 7

// THE NIGHTLY'S OWN FIXTURE IS NOT AN ARTIST. Every e2e voice in this estate logs in from a
// `.invalid` address (RFC 2606 reserved TLD — no OTP can ever be delivered there, so it is
// never a person). The staging booth writes the same ledger as prod, so without this rule the
// browser e2e's own reach could prop the usage signal up by a few seconds' luck. A fixture's
// REFUSAL still counts: that is a break signal, whoever was refused.
function isSynthetic(email) { return /\.invalid$/i.test(String(email || '').trim()) }

function readEvents(file) {
  if (!fs.existsSync(file)) return []
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
}

/** Per-day summary: distinct HUMAN cast artists (emails) and courses reached, and every refusal. */
function summarise(events, { now = Date.now(), days = 7 } = {}) {
  const since = now - days * 86400000
  const byDay = new Map()
  for (const e of events) {
    const t = Date.parse(e.ts)
    if (!(t >= since)) continue
    const day = e.ts.slice(0, 10)
    if (!byDay.has(day)) byDay.set(day, { day, artists: new Set(), courses: new Set(), reaches: 0, refusals: [] })
    const d = byDay.get(day)
    if (e.kind === 'reach') { d.reaches += 1; if (!isSynthetic(e.email)) { d.artists.add(e.email); d.courses.add(e.courseCode) } }
    else if (e.kind === 'refused') d.refusals.push(e)
  }
  const humanReaches = (ms) => new Set(events.filter((e) => e.kind === 'reach' && !isSynthetic(e.email) && Date.parse(e.ts) >= now - ms).map((e) => e.email)).size
  return {
    days: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)).map((d) => ({
      day: d.day, artists: d.artists.size, courses: d.courses.size, reaches: d.reaches, refusals: d.refusals,
    })),
    last24h: {
      artists: humanReaches(86400000),
      refusals: events.filter((e) => e.kind === 'refused' && Date.parse(e.ts) >= now - 86400000),
    },
    quietWindow: { days: QUIET_DAYS_RED, artists: humanReaches(QUIET_DAYS_RED * 86400000) },
  }
}

/** The nightly verdict: red on any refusal in 24h; red on no human reach for QUIET_DAYS_RED days; a quiet 24h is a note. */
function verdict(summary) {
  const reasons = []
  const notes = []
  if (summary.quietWindow.artists === 0) reasons.push(`NO human cast artist reached a course page in ${summary.quietWindow.days} days`)
  else if (summary.last24h.artists === 0) notes.push(`quiet day: no human cast artist reached a course page in the last 24h (${summary.quietWindow.artists} in the last ${summary.quietWindow.days} days)`)
  for (const r of summary.last24h.refusals) {
    reasons.push(`REFUSED ${r.email} (${(r.voices || []).join('+') || 'voice unknown'}) on ${r.courseCode}: ${r.sentence}`)
  }
  return { ok: reasons.length === 0, reasons, notes }
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
  for (const n of v.notes) console.log(`NOTE: ${n}`)
  console.log(v.ok
    ? `OK: ${summary.last24h.artists} human cast artist(s) reached a course page in the last 24h, ${summary.quietWindow.artists} in ${summary.quietWindow.days} days, no refusals`
    : `RED:\n  ${v.reasons.join('\n  ')}`)
  return v.ok ? 0 : 1
}

if (require.main === module) process.exit(main(process.argv.slice(2)))

module.exports = { readEvents, summarise, verdict, render, isSynthetic, QUIET_DAYS_RED }
