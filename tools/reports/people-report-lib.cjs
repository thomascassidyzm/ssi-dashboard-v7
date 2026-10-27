/**
 * people-report-lib.cjs — the pure half of Kai's weekly people report (job #501, Kai 2026-10-27).
 *
 * Kai, course production lead, asked for one report every Monday: how every RECORDER, every
 * VOLUNTEER BUILDER and every PROOFREADER in Popty did last week and all-time, per person, in
 * numbers. Nobody is named in this file: every person is DISCOVERED from live rows — the booth's
 * own artist list, dashboard_users roles, and the human actors in content_edit_events — so a new
 * recorder or builder appears the first week they exist, with no list to keep.
 *
 * No I/O here: tools/reports/weekly-people-report.cjs reads the rows and hands them in. The rules
 * that decide what a number MEANS live here, beside their tests (people-report-lib.test.cjs).
 *
 * HONESTY RULE (Kai's brief): a source that is missing or failed is reported as a GAP in the report
 * itself, in plain words. Nothing is estimated to fill it.
 */

'use strict'

const DAY_MS = 24 * 3600 * 1000
/** A recorder with lines left and no take for this long is STALLED (Kai's brief: 7+ days). */
const STALL_MS = 7 * DAY_MS
/** An approval is credited to the person whose edit event was stamped within this of approved_at. */
const APPROVAL_MATCH_MS = 10 * 60 * 1000
const TZ = 'Europe/London'

// ── WHAT EACH content_edit_events.operation COUNTS AS ─────────────────────────────────────────────
// The operations are the ones services/shared/content-write-surfaces.cjs stamps. An operation not
// named here is never dropped: it is counted under "other" with its own name, so a new surface shows
// up in the report the week it is first used.
const OP_GROUPS = Object.freeze({
  seedText: ['translate', 'seed-update', 'seed-retranslate', 'orchestrator-seed-edit', 'seed-initialise', 'reset-translations', 'seed-deprecate'],
  seedBuild: ['decomposition-submit', 'decomposition-finalize', 'lego-submit', 'batch-submit', 'backfill-submit', 'draft-finalize', 'component-backfill', 'decomposition-backfill', 'decomposition-recompute'],
  seedRedo: ['redo-wipe', 'rebuild-wipe', 'redo-undo'],
  legoEdit: ['lego-edit'],
  phraseEdit: ['phrase-edit', 'phrase-delete', 'phrases-write', 'phrase-v4-gap-fill'],
  approve: ['approve'],
  unapprove: ['unapprove'],
  flag: ['flag'],
  unflag: ['unflag'],
  checked: ['qa-mark-checked'],
})
const GROUP_OF = new Map(Object.entries(OP_GROUPS).flatMap(([g, ops]) => ops.map((o) => [o, g])))
/** The groups that are proofreading acts rather than building. */
const PROOF_GROUPS = new Set(['approve', 'unapprove', 'flag', 'unflag', 'checked'])

function opGroup(operation) {
  return GROUP_OF.get(String(operation || '')) || (operation === 'course-edit' ? 'courseEdit' : 'other')
}

/** A login that is a fixture, not a person (Tom's thomas.cassidy+… builder/recorder test logins). */
function isTestPerson(p) {
  return /test|e2e|thomas\.cassidy\+|thomas_cassidy/i.test(`${p.email || ''} ${p.name || ''} ${p.label || ''}`)
}

const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })
/** "Sun 26 Oct" for a recent instant, "3 Sept 2026" for an older one. */
function when(t, now) {
  if (t == null) return 'never'
  const ms = typeof t === 'number' ? t : Date.parse(t)
  if (!Number.isFinite(ms)) return 'unknown'
  return now - ms < 180 * DAY_MS ? dayFmt.format(new Date(ms)) : dateFmt.format(new Date(ms))
}
const n = (x) => Number(x || 0).toLocaleString('en-GB')
const pct = (done, total) => (total > 0 ? `${Math.floor((100 * done) / total)}%` : '–')
const plural = (k, one, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`

/** [1,2,3,7,9,10] → "S1–3, S7, S9–10" (seed numbers, ascending, ranges collapsed). */
function seedRanges(nums, max = 8) {
  const s = [...new Set(nums.map(Number).filter(Number.isFinite))].sort((a, b) => a - b)
  const runs = []
  for (const x of s) {
    const last = runs[runs.length - 1]
    if (last && x === last[1] + 1) last[1] = x
    else runs.push([x, x])
  }
  const parts = runs.map(([a, b]) => (a === b ? `S${a}` : `S${a}–${b}`))
  return parts.length > max ? `${parts.slice(0, max).join(', ')} and ${parts.length - max} more runs` : parts.join(', ')
}

// ── PEOPLE ────────────────────────────────────────────────────────────────────────────────────────

/**
 * One person per human actor in the edit log, joined to their dashboard_users row where one can be
 * found. content_edit_events carries the auth user id and a LABEL (the person's Popty name, else
 * their email) but no email column, so the join is by label = name or label = email.
 * @returns {Map<string, object>} actor_id → { id, label, name, email, role, courses }
 */
function peopleIndex(users, events) {
  const byKey = new Map()
  for (const u of users || []) {
    if (u.email) byKey.set(String(u.email).trim().toLowerCase(), u)
    if (u.name) byKey.set(String(u.name).trim().toLowerCase(), u)
  }
  const people = new Map()
  for (const e of events || []) {
    if (people.has(e.actor_id)) {
      const p = people.get(e.actor_id)
      if (e.actor_role) p.role = p.user ? p.user.role : e.actor_role
      continue
    }
    const u = byKey.get(String(e.actor_label || '').trim().toLowerCase()) || null
    people.set(e.actor_id, {
      id: e.actor_id, label: e.actor_label, name: (u && u.name) || e.actor_label, email: u ? u.email : null,
      role: u ? u.role : (e.actor_role || null), courses: u ? u.courses : null, user: u,
    })
  }
  return people
}

function emptyTally() {
  return { events: 0, seeds: new Set(), seedsBy: {}, legos: 0, phrases: 0, courses: new Set(), other: {}, first: null, last: null }
}

/** Fold one edit event into a tally: seeds per group, LEGO/phrase row counts, courses, first/last. */
function addEvent(t, e) {
  const g = opGroup(e.operation)
  const at = Date.parse(e.occurred_at)
  t.events += 1
  if (e.course_code) t.courses.add(e.course_code)
  if (Number.isFinite(at)) { t.first = t.first == null ? at : Math.min(t.first, at); t.last = t.last == null ? at : Math.max(t.last, at) }
  const seeds = Array.isArray(e.seeds) ? e.seeds.map(Number).filter(Number.isFinite) : []
  // A course-edit batch names its ops; a batch that only touched LEGOs or phrases is not a seed edit.
  const bucket = g === 'courseEdit'
    ? ((e.ops || []).some((o) => /^seed\./.test(o)) ? 'seedText' : null)
    : (g === 'legoEdit' || g === 'phraseEdit' || g === 'other') ? null : g
  if (bucket) {
    const set = t.seedsBy[bucket] || (t.seedsBy[bucket] = { events: 0, seeds: new Set() })
    set.events += 1
    for (const s of seeds) { set.seeds.add(`${e.course_code}:${s}`); if (!PROOF_GROUPS.has(bucket)) t.seeds.add(`${e.course_code}:${s}`) }
  }
  if (g === 'legoEdit') t.legos += Math.max(1, Number(e.legos) || 0)
  else t.legos += Number(e.legos) || 0
  if (g === 'phraseEdit') t.phrases += Math.max(1, Number(e.phrases) || 0)
  else t.phrases += Number(e.phrases) || 0
  if (g === 'other') t.other[e.operation] = (t.other[e.operation] || 0) + 1
  return t
}

const seedCount = (t, group) => (t.seedsBy[group] ? t.seedsBy[group].seeds.size : 0)
const groupEvents = (t, group) => (t.seedsBy[group] ? t.seedsBy[group].events : 0)

// ── SECTION 1: RECORDERS ──────────────────────────────────────────────────────────────────────────

/**
 * One row per recording artist, from the booth's own overview (booth-artists-reader.cjs). Lines done
 * and lines assigned are the sum of the artist's PROJECTS that have a queue (the booth home cards),
 * so a take of an old line nobody asks for any more counts as a take but not as progress.
 */
function recorderRows(overview, now) {
  const artists = ((overview && overview.artists) || []).filter((a) => !a.isTest)
  return artists.map((a) => {
    const projects = (a.projects || []).filter((p) => !p.other && Number.isFinite(p.total) && p.total > 0)
    const total = projects.reduce((s, p) => s + p.total, 0)
    const done = projects.reduce((s, p) => s + (p.recorded || 0), 0)
    const act = a.activity || {}
    const last = act.lastActive ? Date.parse(act.lastActive) : null
    const remaining = Math.max(0, total - done)
    return {
      name: a.name || a.voiceId, voiceId: a.voiceId, language: a.languageName || a.language || null, dialect: a.dialect || null,
      week: act.takes7d || 0, allTime: act.takes || 0, archived: act.archivedTakes || 0,
      done, total, remaining, last, first: act.firstActive ? Date.parse(act.firstActive) : null,
      stalled: remaining > 0 && (last == null || now - last >= STALL_MS),
      // Nothing assigned and nothing recorded this week: an old or parked voice, listed in one line.
      dormant: total === 0 && !(act.takes7d > 0),
      noQueue: !!a.noQueue, queueUnavailable: !!a.queueUnavailable,
      projects: projects.map((p) => ({ label: p.label, done: p.recorded || 0, total: p.total, week: (p.activity && p.activity.takes7d) || 0 })),
    }
  }).sort((x, y) => (y.week - x.week) || ((y.last || 0) - (x.last || 0)))
}

// ── SECTION 2: VOLUNTEER BUILDERS ─────────────────────────────────────────────────────────────────

/**
 * A volunteer builder is a person whose Popty role is 'editor' — the role an outside course builder
 * is given; recorders are 'recorder' and the SSi team 'admin'. Everyone with that role is listed,
 * active or not, so "has access, did nothing yet" is visible rather than silent.
 */
function builderRows(users, events, since, now) {
  const people = peopleIndex(users, events)
  const tallies = new Map()
  for (const e of events || []) {
    const p = people.get(e.actor_id)
    if (!p || p.role !== 'editor' || isTestPerson(p)) continue
    const k = p.id
    const t = tallies.get(k) || { person: p, all: emptyTally(), week: emptyTally(), weekSeedsByCourse: {} }
    addEvent(t.all, e)
    if (Date.parse(e.occurred_at) >= since) {
      addEvent(t.week, e)
      const g = opGroup(e.operation)
      if (!PROOF_GROUPS.has(g) && Array.isArray(e.seeds)) {
        const arr = t.weekSeedsByCourse[e.course_code] || (t.weekSeedsByCourse[e.course_code] = [])
        arr.push(...e.seeds)
      }
    }
    tallies.set(k, t)
  }
  const seen = new Set([...tallies.values()].map((t) => (t.person.email || '').toLowerCase()).filter(Boolean))
  const idle = (users || []).filter((u) => u.role === 'editor' && !isTestPerson(u) && !seen.has(String(u.email || '').toLowerCase()))
  const rows = [...tallies.values()].map((t) => ({
    name: t.person.name, email: t.person.email, access: courseAccess(t.person.courses),
    week: t.week, all: t.all, weekSeedsByCourse: t.weekSeedsByCourse, last: t.all.last,
  })).sort((a, b) => (b.week.events - a.week.events) || ((b.last || 0) - (a.last || 0)))
  // One person can hold two logins (two emails, same name and courses): listed once, with the count.
  const idleBy = new Map()
  for (const u of idle) {
    const row = { name: u.name || u.email, access: courseAccess(u.courses), logins: 1 }
    const k = `${String(row.name).toLowerCase()}\u0000${row.access}`
    if (idleBy.has(k)) idleBy.get(k).logins += 1
    else idleBy.set(k, row)
  }
  return { rows, idle: [...idleBy.values()] }
}

function courseAccess(courses) {
  if (courses == null) return null
  if (courses === '*' || (Array.isArray(courses) && courses.includes('*'))) return 'all courses'
  if (Array.isArray(courses)) return courses.join(', ') || 'no courses'
  return String(courses)
}

// ── SECTION 3: PROOFREADING ───────────────────────────────────────────────────────────────────────

/**
 * Who approved this seed? Only answerable when the seed's last_edit_event_id points at a human's
 * event stamped at the same moment (mass-approve, an approve from chat). The stand-alone proofread
 * tool (tools/proofread/server.cjs) writes approved_at with no editor identity, so its approvals
 * come back as nobody — and are counted, per course, as "approver not recorded".
 */
function approvalActor(row) {
  if (!row.event_at || row.actor_kind !== 'human') return null
  return Math.abs(Date.parse(row.approved_at) - Date.parse(row.event_at)) <= APPROVAL_MATCH_MS ? row.actor_id : null
}

/**
 * Per person, per course: proofreading acts in the edit log (approve/unapprove/flag/unflag/checked),
 * seed approvals credited by approvalActor, and LEGO/phrase proof flags (lego_proof_flags /
 * phrase_proof_flags, keyed by the flagger's email). Text corrections by the same person in the same
 * course are shown beside them.
 */
function proofRows({ users, events, approvals, proofFlags, since }) {
  const people = peopleIndex(users, events)
  const byEmail = new Map((users || []).map((u) => [String(u.email || '').toLowerCase(), u]))
  const rows = new Map() // `${who}\u0000${course}` → row
  const row = (who, name, course) => {
    const k = `${who}\u0000${course}`
    if (!rows.has(k)) rows.set(k, { who, name, course, week: blank(), all: blank(), last: null })
    return rows.get(k)
  }
  const blank = () => ({ approved: new Set(), unapproved: new Set(), flagged: 0, unflagged: 0, checked: 0, corrections: 0, legoFlags: 0, phraseFlags: 0 })
  const bump = (r, at, f) => { f(r.all); if (at >= since) f(r.week); r.last = r.last == null ? at : Math.max(r.last, at) }

  const proofPeople = new Set()
  for (const e of events || []) if (PROOF_GROUPS.has(opGroup(e.operation))) proofPeople.add(`${e.actor_id}\u0000${e.course_code}`)
  for (const a of approvals || []) { const id = approvalActor(a); if (id) proofPeople.add(`${id}\u0000${a.course_code}`) }

  for (const e of events || []) {
    const p = people.get(e.actor_id)
    if (!p || isTestPerson(p)) continue
    const g = opGroup(e.operation)
    const key = `${e.actor_id}\u0000${e.course_code}`
    const isCorrection = g === 'seedText' || g === 'legoEdit' || g === 'phraseEdit' || g === 'courseEdit'
    if (!PROOF_GROUPS.has(g) && !(isCorrection && proofPeople.has(key))) continue
    const at = Date.parse(e.occurred_at)
    const seeds = (Array.isArray(e.seeds) ? e.seeds : []).map(Number).filter(Number.isFinite)
    bump(row(e.actor_id, p.name, e.course_code), at, (b) => {
      if (g === 'unapprove') seeds.forEach((s) => b.unapproved.add(s))
      else if (g === 'flag') b.flagged += Math.max(1, seeds.length)
      else if (g === 'unflag') b.unflagged += Math.max(1, seeds.length)
      else if (g === 'checked') b.checked += 1
      else if (g === 'approve') { /* counted from course_seeds below, where the seeds are known */ }
      else b.corrections += 1
    })
  }
  const unattributed = {}
  for (const a of approvals || []) {
    const id = approvalActor(a)
    const at = Date.parse(a.approved_at)
    if (!id) {
      const u = unattributed[a.course_code] || (unattributed[a.course_code] = { week: 0, all: 0 })
      u.all += 1; if (at >= since) u.week += 1
      continue
    }
    const p = people.get(id)
    bump(row(id, p ? p.name : a.actor_label, a.course_code), at, (b) => b.approved.add(a.seed_number))
  }
  for (const f of proofFlags || []) {
    if (!f.flagged) continue
    const u = byEmail.get(String(f.flagged_by || '').toLowerCase())
    const name = (u && u.name) || f.flagged_by
    if (isTestPerson({ email: f.flagged_by, name })) continue
    bump(row(`email:${String(f.flagged_by).toLowerCase()}`, name, f.course_code), Date.parse(f.updated_at), (b) => {
      if (f.kind === 'lego') b.legoFlags += 1
      else b.phraseFlags += 1
    })
  }
  const out = [...rows.values()]
  // One person may appear under two keys (an edit-log id and a flag email): merge by name + course.
  const merged = new Map()
  for (const r of out) {
    const k = `${String(r.name).toLowerCase()}\u0000${r.course}`
    const m = merged.get(k)
    if (!m) { merged.set(k, r); continue }
    for (const span of ['week', 'all']) {
      for (const s of r[span].approved) m[span].approved.add(s)
      for (const s of r[span].unapproved) m[span].unapproved.add(s)
      for (const f of ['flagged', 'unflagged', 'checked', 'corrections', 'legoFlags', 'phraseFlags']) m[span][f] += r[span][f]
    }
    m.last = Math.max(m.last || 0, r.last || 0) || null
  }
  return { rows: [...merged.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)) || a.course.localeCompare(b.course)), unattributed }
}

// ── RENDERING ─────────────────────────────────────────────────────────────────────────────────────

function proofLine(b) {
  const bits = []
  if (b.approved.size) bits.push(`${n(b.approved.size)} approved`)
  if (b.unapproved.size) bits.push(`${n(b.unapproved.size)} unapproved`)
  if (b.flagged) bits.push(`${n(b.flagged)} flagged`)
  if (b.legoFlags) bits.push(`${n(b.legoFlags)} LEGO flags`)
  if (b.phraseFlags) bits.push(`${n(b.phraseFlags)} phrase flags`)
  if (b.unflagged) bits.push(`${n(b.unflagged)} flags cleared`)
  if (b.checked) bits.push(`${n(b.checked)} checked`)
  if (b.corrections) bits.push(`${plural(b.corrections, 'correction')}`)
  return bits.length ? bits.join(', ') : 'nothing'
}

function buildLine(t) {
  const bits = []
  const st = seedCount(t, 'seedText'); if (st) bits.push(`${plural(st, 'seed')} written/edited`)
  const sb = seedCount(t, 'seedBuild'); if (sb) bits.push(`${plural(sb, 'seed')} built`)
  const sr = seedCount(t, 'seedRedo'); if (sr) bits.push(`${plural(sr, 'seed')} redone`)
  if (t.legos) bits.push(`${plural(t.legos, 'LEGO edit')}`)
  if (t.phrases) bits.push(`${plural(t.phrases, 'phrase edit')}`)
  const ap = seedCount(t, 'approve') || groupEvents(t, 'approve'); if (ap) bits.push(`${n(ap)} approvals`)
  const other = Object.entries(t.other).map(([op, k]) => `${k}× ${op}`)
  if (other.length) bits.push(`other: ${other.join(', ')}`)
  return bits.length ? bits.join(', ') : 'no edits'
}

/**
 * The whole report as phone-readable markdown, and the one-line summary posted with its link.
 * @param {object} d { now, since, recorders, builders, proof, gaps: string[], sources }
 */
function renderReport(d) {
  const { now, since } = d
  const L = []
  const range = `${when(since, now)} – ${when(now, now)}`
  L.push(`# Popty people report, ${range}`, '')
  L.push(`Last 7 days to ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC, London dates. All-time = everything in the live database.`, '')

  // 1
  L.push('## 1. Recorders', '')
  if (d.recorders.error) L.push(`**Not available this week:** ${d.recorders.error}`, '')
  else if (!d.recorders.rows.length) L.push('No recording artists found in the booth.', '')
  const dormant = (d.recorders.rows || []).filter((r) => r.dormant)
  for (const r of (d.recorders.rows || []).filter((x) => !x.dormant)) {
    const head = `**${r.name}**${r.language ? ` (${[r.language, r.dialect].filter(Boolean).join(', ')})` : ''}${r.stalled ? ' — ⚠ STALLED' : ''}`
    L.push(head)
    L.push(`- This week: ${plural(r.week, 'line')} recorded`)
    if (r.total) L.push(`- Done ${n(r.done)} of ${n(r.total)} assigned (${pct(r.done, r.total)}), ${n(r.remaining)} left`)
    else L.push(r.noQueue ? '- No queue in the booth now (an older voice with takes only)' : '- No lines assigned in the booth now')
    L.push(`- All-time: ${plural(r.allTime, 'take')}${r.archived ? ` (${n(r.archived)} later archived by re-record all)` : ''}, since ${when(r.first, now)}`)
    L.push(`- Last active: ${when(r.last, now)}${r.stalled ? ` — no takes for ${r.last ? Math.floor((now - r.last) / DAY_MS) + ' days' : 'ever'} with ${n(r.remaining)} lines left` : ''}`)
    for (const p of r.projects) L.push(`  - ${p.label}: ${n(p.done)}/${n(p.total)} (${pct(p.done, p.total)})${p.week ? `, ${n(p.week)} this week` : ''}`)
    if (r.queueUnavailable) L.push('  - (the booth could not build this queue today, so lines done/assigned are missing)')
    L.push('')
  }
  if (dormant.length) {
    L.push('Not recording now (no lines assigned, nothing this week):')
    for (const r of dormant) L.push(`- ${r.name}${r.language ? ` (${r.language})` : ''}: ${plural(r.allTime, 'take')} all-time, last ${when(r.last, now)}`)
    L.push('')
  }

  // 2
  L.push('## 2. Volunteer builders', '')
  if (d.builders.error) L.push(`**Not available this week:** ${d.builders.error}`, '')
  else {
    if (!d.builders.rows.length) L.push('No edits by anyone with the builder (editor) role, ever.', '')
    for (const b of d.builders.rows) {
      L.push(`**${b.name}** — ${[...b.all.courses].join(', ') || 'no course'}${b.access ? ` (access: ${b.access})` : ''}`)
      L.push(`- This week: ${b.week.events ? buildLine(b.week) : 'no edits'}`)
      for (const [course, seeds] of Object.entries(b.weekSeedsByCourse)) if (seeds.length) L.push(`  - ${course} seeds changed: ${seedRanges(seeds)}`)
      L.push(`- All-time: ${buildLine(b.all)}, ${plural(b.all.events, 'save')}`)
      L.push(`- Last active: ${when(b.last, now)}`, '')
    }
    if (d.builders.idle.length) {
      L.push('Builder access, no recorded edits ever:')
      for (const u of d.builders.idle) L.push(`- ${u.name}${u.access ? ` (access: ${u.access})` : ''}${u.logins > 1 ? ` — ${u.logins} logins` : ''}`)
      L.push('')
    }
  }

  // 3
  L.push('## 3. Proofreading', '')
  if (d.proof.error) L.push(`**Not available this week:** ${d.proof.error}`, '')
  else {
    const byPerson = new Map()
    for (const r of d.proof.rows) { if (!byPerson.has(r.name)) byPerson.set(r.name, []); byPerson.get(r.name).push(r) }
    if (!byPerson.size) L.push('No proofreading recorded against a named person, ever.', '')
    for (const [name, rows] of byPerson) {
      const last = Math.max(...rows.map((r) => r.last || 0)) || null
      L.push(`**${name}** — last active ${when(last, now)}`)
      for (const r of rows) {
        const prog = d.proof.courseProgress && d.proof.courseProgress[r.course]
        L.push(`- ${r.course}: ${proofLine(r.week)} this week; all-time ${proofLine(r.all)}${prog ? ` · course ${n(prog.approved)}/${n(prog.total)} seeds approved` : ''}`)
      }
      L.push('')
    }
    const un = Object.entries(d.proof.unattributed || {}).filter(([, u]) => u.week > 0)
    const namedWeek = d.proof.rows.reduce((s, r) => s + r.week.approved.size, 0)
    if (!un.length && !namedWeek) L.push('No seed was approved in any course this week, by anyone.', '')
    if (un.length) {
      L.push('Seeds approved this week with **no approver recorded** (the stand-alone proofread tool does not record who):')
      for (const [course, u] of un) {
        const prog = d.proof.courseProgress && d.proof.courseProgress[course]
        L.push(`- ${course}: ${n(u.week)} this week${prog ? ` · course ${n(prog.approved)}/${n(prog.total)} seeds approved` : ''}`)
      }
      L.push('')
    }
  }

  L.push('## What this report cannot see', '')
  for (const g of d.gaps) L.push(`- ${g}`)
  L.push('', `_Generated by tools/reports/weekly-people-report.cjs (Popty), ${new Date(now).toISOString()}._`)
  return L.join('\n')
}

function summaryLine(d) {
  const rec = (d.recorders.rows || []).filter((r) => !r.dormant)
  const recLines = rec.reduce((s, r) => s + r.week, 0)
  const activeRec = rec.filter((r) => r.week > 0).length
  const stalled = rec.filter((r) => r.stalled).map((r) => r.name)
  const bRows = (d.builders.rows || []).filter((b) => b.week.events > 0)
  const bSeeds = bRows.reduce((s, b) => s + b.week.seeds.size, 0)
  const pRows = (d.proof.rows || []).filter((r) => proofLine(r.week) !== 'nothing')
  const approvedNamed = pRows.reduce((s, r) => s + r.week.approved.size, 0)
  const approvedAnon = Object.values(d.proof.unattributed || {}).reduce((s, u) => s + u.week, 0)
  const bits = [
    d.recorders.error ? 'recorders: not available' : `${activeRec}/${rec.length} recorders active, ${n(recLines)} lines${stalled.length ? ` (stalled: ${stalled.join(', ')})` : ''}`,
    d.builders.error ? 'builders: not available' : `${bRows.length} builder${bRows.length === 1 ? '' : 's'} active, ${plural(bSeeds, 'seed')} changed`,
    d.proof.error ? 'proofreading: not available' : `${new Set(pRows.map((r) => r.name)).size} proofreaders active, ${n(approvedNamed + approvedAnon)} seeds approved`,
  ]
  return `Weekly people report (${when(d.since, d.now)} – ${when(d.now, d.now)}): ${bits.join('; ')}.`
}

module.exports = {
  OP_GROUPS, PROOF_GROUPS, STALL_MS, APPROVAL_MATCH_MS,
  opGroup, isTestPerson, seedRanges, peopleIndex, addEvent, emptyTally,
  recorderRows, builderRows, proofRows, approvalActor, renderReport, summaryLine, when,
}
