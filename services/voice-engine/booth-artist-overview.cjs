/**
 * booth-artist-overview.cjs — how every recording artist is doing, for the God admins only.
 *
 * Aran, 2026-10-14 (job #350): "headline (and drilldown) information for how our other recording
 * artists are doing, what they've completed, how much time they've taken, that sort of stuff."
 * Read-only. Nothing here writes a row.
 *
 * WHO MAY SEE IT. Recording artists must never see each other's work, and Popty's `admin` role is
 * wider than "Tom and Aran": on 2026-10-14 it is seven accounts, one of them Kai, who is also a
 * recording artist (human_kai_fin). So the gate is the estate's ONE admin gate (hasAdminRole, via
 * production-api's requireAdmin) AND a named God-admin list. No such list existed anywhere in
 * Popty when this was written — the learners `educational_role = 'god'` value the identity
 * resolver honours is held by nobody — so this is the list, in one place, and widening it is a
 * one-line change here that a test pins.
 *
 * WHAT THE NUMBERS ARE, each a different measure, never blended:
 *   - LINES DONE / TOTAL — the booth's own definition of recorded (a take exists for the line),
 *     from buildCoverage for pods/seeds/minimal set, and from the phrase plan for practice phrases.
 *   - TAKES — STORED clips in course_audio (origin 'human'), timestamped by created_at, which is
 *     when that clip was first saved. A re-read of the same line replaces the clip's bytes under
 *     the SAME row, so a re-read adds no take and moves no timestamp: takes count lines read, not
 *     attempts. Takes later archived by Re-record all (voice id 'human_archived-<id>-<voice>') are
 *     still work the artist did, so they are counted, and shown separately.
 *   - AUDIO RECORDED — the sum of duration_ms of those stored clips: speech actually kept.
 *   - SESSION TIME — first-to-last take of each sitting, a sitting being takes less than
 *     SESSION_GAP_MS apart. It cannot see the minutes before the first take or after the last, so a
 *     one-take sitting counts as zero. It is a floor on time spent at the booth, not a stopwatch.
 */

'use strict'

const { hasAdminRole } = require('../shared/popty-identity.cjs')

/** Tom's Popty login and Aran's — the two people Aran named on 2026-10-14. */
const GOD_ADMIN_EMAILS = Object.freeze(['thomas.cassidy+ssi@gmail.com', 'aran@hey.com'])

/** Takes closer together than this are one sitting at the booth. */
const SESSION_GAP_MS = 15 * 60 * 1000

/** The team records in Wales; "today" and the day chart are London days. */
const DAY_TZ = 'Europe/London'

function isGodAdmin(identity) {
  if (!hasAdminRole(identity)) return false
  const email = String(identity.email || '').trim().toLowerCase()
  return GOD_ADMIN_EMAILS.includes(email)
}

/** 'human_archived-20a3405f-human_tom_zzz' → { voiceId: 'human_tom_zzz', archived: true }. */
function baseVoice(voiceId) {
  const m = /^human_archived-[0-9a-f]+-(.+)$/i.exec(String(voiceId || ''))
  return m ? { voiceId: m[1], archived: true } : { voiceId: String(voiceId || ''), archived: false }
}

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: DAY_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
/** YYYY-MM-DD of an instant, in London. */
function londonDay(t) { return dayFmt.format(new Date(t)) }

/**
 * Group sorted take times into sittings.
 * @param {number[]} times epoch ms, any order
 * @returns {{start:number, end:number, takes:number}[]} oldest first
 */
function sessionize(times, gapMs = SESSION_GAP_MS) {
  const sorted = [...times].filter(Number.isFinite).sort((a, b) => a - b)
  const out = []
  for (const t of sorted) {
    const last = out[out.length - 1]
    if (last && t - last.end < gapMs) { last.end = t; last.takes += 1 } else out.push({ start: t, end: t, takes: 1 })
  }
  return out
}

/**
 * The headline numbers of one artist's takes.
 * @param {{created_at:string, duration_ms:number|null, archived?:boolean}[]} takes
 */
function summarizeTakes(takes, now = Date.now()) {
  const times = takes.map((t) => Date.parse(t.created_at))
  const today = londonDay(now)
  const weekAgo = now - 7 * 24 * 3600 * 1000
  const sessions = sessionize(times)
  let audioMs = 0
  let missingDuration = 0
  for (const t of takes) {
    if (Number.isFinite(t.duration_ms)) audioMs += t.duration_ms
    else missingDuration += 1
  }
  return {
    takes: takes.length,
    archivedTakes: takes.filter((t) => t.archived).length,
    takesToday: times.filter((t) => londonDay(t) === today).length,
    takes7d: times.filter((t) => t >= weekAgo).length,
    lastActive: times.length ? new Date(Math.max(...times)).toISOString() : null,
    firstActive: times.length ? new Date(Math.min(...times)).toISOString() : null,
    audioMs,
    missingDuration,
    sessions: sessions.length,
    sessionMs: sessions.reduce((s, x) => s + (x.end - x.start), 0),
    sessionMs7d: sessions.filter((x) => x.end >= weekAgo).reduce((s, x) => s + (x.end - x.start), 0),
  }
}

/** One row per London day for the last `days` days (today last), zeros included. */
function dailyActivity(takes, now = Date.now(), days = 30) {
  const byDay = new Map()
  for (const t of takes) {
    const d = londonDay(Date.parse(t.created_at))
    const e = byDay.get(d) || { takes: 0, audioMs: 0, times: [] }
    e.takes += 1
    if (Number.isFinite(t.duration_ms)) e.audioMs += t.duration_ms
    e.times.push(Date.parse(t.created_at))
    byDay.set(d, e)
  }
  const out = []
  const seen = new Set()
  // Step back by 12h so a DST change can neither skip nor repeat a London day.
  for (let t = now; out.length < days; t -= 12 * 3600 * 1000) {
    const d = londonDay(t)
    if (seen.has(d)) continue
    seen.add(d)
    const e = byDay.get(d)
    out.push({
      date: d,
      takes: e ? e.takes : 0,
      audioMs: e ? e.audioMs : 0,
      sessionMs: e ? sessionize(e.times).reduce((s, x) => s + (x.end - x.start), 0) : 0,
    })
  }
  return out.reverse()
}

/** Practice-phrase lines grouped by course, pass and batch, in serving order. */
function phraseBatches(lines, isRecorded) {
  const groups = new Map()
  for (const l of lines) {
    const key = `${l.courseCode}\u0000${l.pass}\u0000${l.batch}`
    const g = groups.get(key) || { courseCode: l.courseCode, pass: l.pass, batch: l.batch, total: 0, recorded: 0, held: 0 }
    g.total += 1
    if (isRecorded(l)) g.recorded += 1
    else if ((l.copies || []).length && l.copies.every((c) => c.flagged)) g.held += 1
    groups.set(key, g)
  }
  // No seed range: a batch is a run of the course's RUNNING ORDER, and seed numbers do not
  // follow it (North batch 1 runs from seed 14 to seed 1020), so a range would mislead.
  return [...groups.values()]
    .sort((a, b) => (a.pass - b.pass) || a.courseCode.localeCompare(b.courseCode) || (a.batch - b.batch))
}

/** Pass totals from batches: { 1: {total, recorded}, 2: {...} }. */
function phrasePasses(batches) {
  const out = {}
  for (const b of batches) {
    const p = out[b.pass] || { total: 0, recorded: 0, batches: 0, batchesDone: 0 }
    p.total += b.total
    p.recorded += b.recorded
    p.batches += 1
    if (b.recorded + b.held >= b.total) p.batchesDone += 1
    out[b.pass] = p
  }
  return out
}

/**
 * A test voice or a fixture, kept out of the headline list (shown below it). Tom's own
 * thomas.cassidy+… logins (Rhian Recorder, Tom Builder on Catalan) are test accounts too.
 */
function isTestVoice(v) {
  return v.language === 'zzz' || /test|e2e|thomas_cassidy/i.test(`${v.voiceId} ${v.name || ''}`)
}

module.exports = {
  GOD_ADMIN_EMAILS,
  SESSION_GAP_MS,
  DAY_TZ,
  isGodAdmin,
  baseVoice,
  londonDay,
  sessionize,
  summarizeTakes,
  dailyActivity,
  phraseBatches,
  phrasePasses,
  isTestVoice,
}
