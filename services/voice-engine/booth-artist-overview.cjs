/**
 * booth-artist-overview.cjs — how every recording artist is doing, for the God admins only.
 *
 * Aran, 2026-10-14 (job #350): "headline (and drilldown) information for how our other recording
 * artists are doing, what they've completed, how much time they've taken, that sort of stuff."
 * Read-only. Nothing here writes a row.
 *
 * WHO MAY SEE IT. Recording artists must never see each other's work, and Popty's `admin` role is
 * wider than the people who should see everything (seven accounts on 2026-10-14). So the gate is
 * the estate's ONE admin gate (hasAdminRole, via production-api's requireAdmin) AND the named
 * God-admin list in booth-god-admins.cjs — Tom, Aran and, since job #371, Kai. No such list
 * existed anywhere in Popty when this was written — the learners `educational_role = 'god'` value
 * the identity resolver honours is held by nobody — so that file is the list, in one place.
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
 *
 * PROJECTS (Aran, 2026-10-14, job #379): "I don't know what Booth lines mean. I need to see which
 * project they've been working on: is it Pod1, is it new seeds, is it new or old practice
 * phrases." So every artist's work is split the way the booth's own home screen splits it — one
 * project per card of buildHomeTracks (booth-home.cjs), with practice phrases split per course and
 * pass — and each is named in plain words (projectLabel). A take is filed under the project whose
 * line has its words; a take whose words are on no line of the queue today (an old pod line, the
 * anthem, a welcome) is filed under "earlier lines" for its course, so no work disappears.
 */

'use strict'

// The one God-admin list, shared with the latest-takes route (job #371).
const { GOD_ADMIN_EMAILS, isGodAdmin } = require('./booth-god-admins.cjs')

/** Takes closer together than this are one sitting at the booth. */
const SESSION_GAP_MS = 15 * 60 * 1000

/** The team records in Wales; "today" and the day chart are London days. */
const DAY_TZ = 'Europe/London'

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

/**
 * How the booth's courses are named to Aran. The two v2 relaunch sandboxes are the NEW courses
 * (their sentences, LEGOs and practice phrases are new reading — booth-home.cjs `newCourse`); the
 * two live courses are the old ones. Anything else is named by its own code.
 */
const COURSE_PLACES = Object.freeze({
  cym_n_for_eng: { place: 'North Welsh', fresh: false },
  cym_nv2_for_eng: { place: 'North Welsh', fresh: true },
  cym_s_for_eng: { place: 'South Welsh', fresh: false },
  cym_sv2_for_eng: { place: 'South Welsh', fresh: true },
})

/**
 * WHAT "POD 1" IS: the pod with slug `pod-1`, every course's core pod (Tom, 2026-09-13). For the
 * Welsh readers it is the pod-1 of the two LIVE courses (cym_n_for_eng, cym_s_for_eng) — the
 * POD-1 conversations, each reader voicing their half. The other pods are named for what they are.
 */
const POD_NAMES = Object.freeze({
  'pod-1': 'Pod 1',
  health: 'Health scripts',
  'health-ladder-pilot': 'Health scripts (test)',
  'senedd-s4c-steve': 'Senedd session',
  'guess-i-love-you': 'guess-game line',
})

/** What kind of reading each line kind is, for a project's name. */
const KIND_WORDS = Object.freeze({
  quarry: 'minimal set (LEGOs and words)',
  rerecord: 're-recordings',
  lego: 'LEGOs',
})

/**
 * A voice reads the KNOWN side of a course when the course is not of its own language: Aran's
 * English voice (eng) reads the English of the cym_* courses. Course codes start with their
 * target language, so a cym course read by an eng voice is known-side reading.
 */
function isKnownSide(courseCode, language) {
  return !!(courseCode && language && !String(courseCode).startsWith(`${language}_`))
}

/**
 * A project's plain name, e.g. "North Welsh: Pod 1", "North Welsh: new sentences",
 * "South Welsh: new practice phrases, pass 1", "English known lines: North Welsh old sentences".
 * @param {{kind:string, courseCode?:string, podSlug?:string, podTitle?:string, pass?:number,
 *          newCourse?:boolean, seedExisting?:boolean|null, other?:boolean}} p
 */
function projectLabel(p, language) {
  const c = COURSE_PLACES[p.courseCode] || null
  const place = c ? c.place : (p.courseCode || 'Other')
  const fresh = c ? c.fresh : !!p.newCourse
  let what
  if (p.other) what = 'earlier lines, not in the queue now'
  else if (p.kind === 'pod' || p.kind === 'takeg') what = POD_NAMES[p.podSlug] || String(p.podTitle || '').replace(/\s*\(job #[^)]*\)/gi, '').trim() || p.podSlug || 'Pod 1'
  else if (p.kind === 'seed') what = (fresh || p.newCourse || p.seedExisting === false) ? 'new sentences' : 'old sentences'
  else if (p.kind === 'phrase') what = `${fresh ? 'new' : 'old'} practice phrases, pass ${p.pass || 1}`
  else if (p.kind === 'lego') what = `${fresh ? 'new' : 'old'} LEGOs`
  else what = KIND_WORDS[p.kind] || 'other lines'
  return isKnownSide(p.courseCode, language) ? `English known lines: ${place} ${what}` : `${place}: ${what}`
}

/** The project a phrase-plan line belongs to: practice phrases split by course and pass. */
const phraseProjectKey = (courseCode, pass) => `phrase.${courseCode}.${pass || 1}`
const otherProjectKey = (courseCode) => `other.${courseCode || 'none'}`

/**
 * Words → project, for filing takes. Queue lines first (pods, sentences, LEGOs…), then the phrase
 * plan; a text on several lines keeps every project it is on, and a take prefers the one in its
 * own course (filePosition).
 * @param {object[]} lines the queue's wire lines (recorded included); phrase lines are skipped,
 *   the plan carries all of them
 * @param {object[]} phraseLines this voice's phrase-plan lines {text, courseCode, pass}
 * @param {(line:object) => string} trackKeyOf booth-home's card key
 * @param {(text:string) => string[]} keysOf audioKeyCandidates
 */
function lineIndex(lines, phraseLines, trackKeyOf, keysOf) {
  const idx = new Map()
  const add = (text, project, courseCode) => {
    for (const k of keysOf(text || '')) {
      if (!idx.has(k)) idx.set(k, [])
      idx.get(k).push({ project, courseCode })
    }
  }
  for (const l of lines || []) if ((l.kind || 'pod') !== 'phrase') add(l.text, trackKeyOf(l), l.courseCode)
  for (const l of phraseLines || []) add(l.text, phraseProjectKey(l.courseCode, l.pass), l.courseCode)
  return idx
}

/** Which project a take is: the line with its words in its own course, else any, else "earlier". */
function projectOfTake(take, idx, keysOf) {
  const hits = keysOf(take.text_normalized || take.text || '').flatMap((k) => idx.get(k) || [])
  const hit = hits.find((h) => h.courseCode === take.course_code) || hits[0]
  return hit ? hit.project : otherProjectKey(take.course_code)
}

/**
 * Every project of one artist, with done/total from the queue and activity from the takes.
 * Order: worked on most recently first, then the not-yet-started in the booth's own order, then
 * earlier lines that are no longer in the queue.
 *
 * @param {object} a
 * @param {object[]} a.tracks buildHomeTracks output (its phrase tracks are replaced per course)
 * @param {object[]} a.phraseBatches the queue's phraseBatchList ({courseCode, pass, total, recorded, held})
 * @param {object[]} a.takes this artist's takes, each with `project` already filed
 * @param {string} a.language the voice's language
 */
function artistProjects({ tracks = [], phraseBatches = [], takes = [], language = null, now = Date.now() }) {
  const out = new Map()
  for (const t of tracks) {
    if (t.kind === 'phrase') continue
    out.set(t.key, {
      key: t.key, kind: t.kind, courseCode: t.courseCode, podSlug: t.podSlug || null,
      label: projectLabel(t, language), total: t.total, recorded: t.recorded, other: false,
    })
  }
  for (const b of phraseBatches || []) {
    const key = phraseProjectKey(b.courseCode, b.pass)
    if (!out.has(key)) {
      out.set(key, {
        key, kind: 'phrase', courseCode: b.courseCode, pass: b.pass, podSlug: null,
        label: projectLabel({ kind: 'phrase', courseCode: b.courseCode, pass: b.pass }, language),
        total: 0, recorded: 0, held: 0, batches: 0, batchesDone: 0, other: false,
      })
    }
    const p = out.get(key)
    p.total += b.total
    p.recorded += b.recorded
    p.held += b.held || 0
    p.batches += 1
    if (b.recorded + (b.held || 0) >= b.total) p.batchesDone += 1
  }
  const byProject = new Map()
  for (const t of takes) {
    if (!byProject.has(t.project)) byProject.set(t.project, [])
    byProject.get(t.project).push(t)
  }
  for (const [key, list] of byProject) {
    if (out.has(key)) continue
    // Filed against a queue project this artist no longer has (a phrase project whose plan
    // failed to read, say) or against no line at all: shown as earlier lines of that course.
    const courseCode = list[0].course_code || null
    const okey = key.startsWith('other.') ? key : otherProjectKey(courseCode)
    if (!out.has(okey)) {
      out.set(okey, { key: okey, kind: 'other', courseCode, podSlug: null, label: projectLabel({ other: true, courseCode }, language), total: null, recorded: null, other: true })
    }
    if (okey !== key) byProject.set(okey, [...(byProject.get(okey) || []), ...list])
  }
  const order = [...out.keys()]
  const rows = [...out.values()].map((p) => {
    const a = summarizeTakes(byProject.get(p.key) || [], now)
    return { ...p, activity: { takes: a.takes, takesToday: a.takesToday, takes7d: a.takes7d, lastActive: a.lastActive } }
  })
  return rows.sort((x, y) => (x.other - y.other) ||
    String(y.activity.lastActive || '').localeCompare(String(x.activity.lastActive || '')) ||
    (order.indexOf(x.key) - order.indexOf(y.key)))
}

module.exports = {
  GOD_ADMIN_EMAILS,
  COURSE_PLACES,
  POD_NAMES,
  isKnownSide,
  projectLabel,
  phraseProjectKey,
  otherProjectKey,
  lineIndex,
  projectOfTake,
  artistProjects,
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
