// Job #501 (Kai 2026-10-27): the weekly people report. Proves the rules people-report-lib.cjs
// carries: people are DISCOVERED (no names in code), a recorder with lines left and no take for
// 7 days is stalled, builders are role 'editor' and the idle ones are listed, an approval is only
// credited to a person whose event was stamped at the same moment (else "no approver recorded"),
// and a failed source renders as a gap, never as zeros.

import { describe, it, expect } from 'vitest'
const lib = require('./people-report-lib.cjs')

const NOW = Date.parse('2026-10-27T07:00:00Z')
const SINCE = NOW - 7 * 24 * 3600 * 1000
const daysAgo = (d) => new Date(NOW - d * 24 * 3600 * 1000).toISOString()

const users = [
  { email: 'doug@example.org', name: 'Doug', role: 'editor', courses: ['pdc_for_eng'] },
  { email: 'rhys@example.org', name: 'Rhys', role: 'editor', courses: ['cym_n_for_eng'] },
  { email: 'rhys.other@example.org', name: 'Rhys', role: 'editor', courses: ['cym_n_for_eng'] }, // a second login, same person
  { email: 'kai@saysomethingin.com', name: 'Kai', role: 'admin', courses: '*' },
  { email: 'thomas.cassidy+builder@gmail.com', name: 'Tom Builder', role: 'editor', courses: ['cat_for_eng'] },
]
const ev = (o) => ({ actor_role: null, seeds: [], legos: 0, phrases: 0, ops: null, ...o })
const events = [
  ev({ occurred_at: daysAgo(2), course_code: 'pdc_for_eng', operation: 'seed-update', actor_id: 'u-doug', actor_label: 'Doug', actor_role: 'editor', seeds: [101], surface: 'course-builder:PATCH /api/seed/:courseCode/:seedNumber', actor_verified: true }),
  ev({ occurred_at: daysAgo(2), course_code: 'pdc_for_eng', operation: 'seed-update', actor_id: 'u-doug', actor_label: 'Doug', actor_role: 'editor', seeds: [102] }),
  ev({ occurred_at: daysAgo(1), course_code: 'pdc_for_eng', operation: 'redo-wipe', actor_id: 'u-doug', actor_label: 'Doug', actor_role: 'editor', seeds: [102] }),
  ev({ occurred_at: daysAgo(1), course_code: 'pdc_for_eng', operation: 'lego-edit', actor_id: 'u-doug', actor_label: 'Doug', actor_role: 'editor' }),
  ev({ occurred_at: daysAgo(40), course_code: 'pdc_for_eng', operation: 'decomposition-submit', actor_id: 'u-doug', actor_label: 'Doug', actor_role: 'editor', seeds: [1, 2, 3], phrases: 30 }),
  ev({ occurred_at: daysAgo(1), course_code: 'pdc_for_eng', operation: 'brand-new-op', actor_id: 'u-doug', actor_label: 'Doug', actor_role: 'editor' }),
  ev({ occurred_at: daysAgo(3), course_code: 'fin_for_eng', operation: 'unapprove', actor_id: 'u-kai', actor_label: 'Kai', actor_role: 'admin', seeds: [5, 6] }),
  ev({ occurred_at: daysAgo(3), course_code: 'fin_for_eng', operation: 'mass-approve-ish', actor_id: 'u-kai', actor_label: 'Kai', actor_role: 'admin' }),
  ev({ occurred_at: daysAgo(3), course_code: 'cat_for_eng', operation: 'seed-update', actor_id: 'u-tb', actor_label: 'Tom Builder', actor_role: 'editor', seeds: [9] }),
]

describe('who is who is discovered, never listed', () => {
  it('builders are the editor-role people with edits; test logins are left out; idle editors are listed', () => {
    const { rows, idle } = lib.builderRows(users, events, SINCE, NOW)
    expect(rows.map((r) => r.name)).toEqual(['Doug'])
    expect(idle).toEqual([{ name: 'Rhys', access: 'cym_n_for_eng', logins: 2 }]) // two logins, listed once
    const doug = rows[0]
    expect([...doug.week.seeds].sort()).toEqual(['pdc_for_eng:101', 'pdc_for_eng:102'])
    expect(doug.week.seedsBy.seedText.seeds.size).toBe(2)
    expect(doug.week.seedsBy.seedRedo.seeds.size).toBe(1)
    expect(doug.week.legos).toBe(1)
    expect(doug.all.phrases).toBe(30)
    expect(doug.week.other).toEqual({ 'brand-new-op': 1 }) // an unknown operation is shown, not dropped
    expect(doug.weekSeedsByCourse.pdc_for_eng.sort()).toEqual([101, 102, 102])
  })
})

describe('recorders', () => {
  const overview = { artists: [
    { voiceId: 'human_dan', name: 'Dan', languageName: 'Welsh', dialect: 'south', isTest: false,
      projects: [{ label: 'South Welsh: Pod 1', total: 100, recorded: 60, other: false, activity: { takes7d: 12 } },
        { label: 'South Welsh: earlier lines', total: null, recorded: null, other: true }],
      activity: { takes: 80, takes7d: 12, lastActive: daysAgo(1), firstActive: daysAgo(30) } },
    { voiceId: 'human_eleri', name: 'Eleri', languageName: 'Welsh', isTest: false,
      projects: [{ label: 'South Welsh: Pod 1', total: 50, recorded: 10, other: false }],
      activity: { takes: 10, takes7d: 0, lastActive: daysAgo(9) } },
    { voiceId: 'human_test_zzz', name: 'Test', isTest: true, projects: [], activity: {} },
    { voiceId: 'human_recording', name: 'human_recording', noQueue: true, isTest: false, projects: [], activity: { takes: 1187, takes7d: 0, lastActive: daysAgo(200) } },
  ] }
  it('done/assigned come from queued projects only, and 7+ days idle with lines left is stalled', () => {
    const rows = lib.recorderRows(overview, NOW)
    expect(rows.map((r) => r.name)).toEqual(['Dan', 'Eleri', 'human_recording'])
    expect(rows.map((r) => r.dormant)).toEqual([false, false, true]) // no queue, nothing this week: one line, not a card
    const md = lib.renderReport({ now: NOW, since: SINCE, gaps: [], recorders: { rows }, builders: { rows: [], idle: [] }, proof: { rows: [], unattributed: {} } })
    expect(md).toContain('- human_recording: 1,187 clips all-time, last')
    expect(md).not.toContain('**human_recording**')
    expect(md).toContain('No seed was approved in any course this week, by anyone.')
    expect(rows[0]).toMatchObject({ week: 12, done: 60, total: 100, remaining: 40, stalled: false })
    expect(rows[1]).toMatchObject({ week: 0, done: 10, total: 50, stalled: true })
  })
})

describe('proofreading', () => {
  const approvals = [
    // credited: Kai's own event stamped at the approval moment
    { course_code: 'fin_for_eng', seed_number: 7, approved_at: daysAgo(2), actor_kind: 'human', actor_id: 'u-kai', actor_label: 'Kai', event_at: daysAgo(2) },
    // not credited: the last edit is weeks older than the approval (the stand-alone proofread tool)
    { course_code: 'hin_for_eng', seed_number: 3, approved_at: daysAgo(1), actor_kind: 'human', actor_id: 'u-kai', actor_label: 'Kai', event_at: daysAgo(30) },
    { course_code: 'hin_for_eng', seed_number: 4, approved_at: daysAgo(1), actor_kind: null, actor_id: null, event_at: null },
  ]
  const proofFlags = [
    { kind: 'lego', course_code: 'cym_nv2_for_eng', flagged: true, flagged_by: 'aran@hey.com', updated_at: daysAgo(2) },
    { kind: 'phrase', course_code: 'cym_nv2_for_eng', flagged: false, flagged_by: 'aran@hey.com', updated_at: daysAgo(2) },
  ]
  it('credits an approval only to a same-moment human event; the rest are counted as unattributed per course', () => {
    expect(lib.approvalActor(approvals[0])).toBe('u-kai')
    expect(lib.approvalActor(approvals[1])).toBe(null)
    const { rows, unattributed } = lib.proofRows({ users, events, approvals, proofFlags, since: SINCE })
    const kaiFin = rows.find((r) => r.name === 'Kai' && r.course === 'fin_for_eng')
    expect(kaiFin.week.approved.size).toBe(1)
    expect(kaiFin.week.unapproved.size).toBe(2)
    expect(unattributed).toEqual({ hin_for_eng: { week: 2, all: 2 } })
    const aran = rows.find((r) => r.course === 'cym_nv2_for_eng')
    expect(aran.name).toBe('aran@hey.com') // no dashboard_users row in this fixture: shown by email
    expect(aran.week.legoFlags).toBe(1)
    expect(aran.week.phraseFlags).toBe(0) // a cleared flag is not a flag
    expect(rows.some((r) => r.name === 'Doug')).toBe(false) // building is not proofreading
  })
})

describe('rendering', () => {
  it('a failed source says so in the report and the summary, never as zeros', () => {
    const d = { now: NOW, since: SINCE, gaps: ['g1'], recorders: { error: 'the booth overview could not be built (boom).' },
      builders: lib.builderRows(users, events, SINCE, NOW), proof: { error: 'none of the proofreading sources could be read.' } }
    const md = lib.renderReport(d)
    expect(md).toContain('**Not available this week:** the booth overview could not be built (boom).')
    expect(md).toContain('**Doug**')
    expect(md).toContain('pdc_for_eng seeds changed: S101–102')
    expect(md).toContain('- g1')
    const line = lib.summaryLine(d)
    expect(line).toContain('recorders: not available')
    expect(line).toContain('Doug 2 seeds')
    expect(line).toContain('proofreading: not available')
  })
  it('collapses seed runs', () => {
    expect(lib.seedRanges([10, 1, 2, 3, 7, 9])).toBe('S1–3, S7, S9–10')
  })
})

describe('calibration (Kai, 2026-10-27): what the recorders SENT is counted apart from clips stored', () => {
  it('booth uploads are joined to the artist through every voice spelling, archived ids included', () => {
    const uploads = {
      week: lib.uploadMap([
        { voice_id: 'human_dan', takes: 40, clips: 35, last: daysAgo(1) },
        { voice_id: 'human_dan_cym_s', takes: 10, clips: 10, last: daysAgo(2) },
        { voice_id: 'human_archived-20a3405f-human_dan', takes: 5, clips: 5, last: daysAgo(3) },
        { voice_id: 'human_someone_else', takes: 999, clips: 999, last: daysAgo(1) },
      ]),
      all: lib.uploadMap([{ voice_id: 'human_dan', takes: 70, clips: 60, last: daysAgo(1) }]),
    }
    const overview = { artists: [{ voiceId: 'human_dan', spellings: ['human_dan', 'human_dan_cym_s'], name: 'Dan', isTest: false,
      projects: [{ label: 'Pod 1', total: 100, recorded: 60, other: false }], activity: { takes: 500, takes7d: 300, lastActive: daysAgo(1) } }] }
    const [dan] = lib.recorderRows(overview, NOW, uploads)
    expect(dan.uploadsWeek.takes).toBe(55)
    expect(dan.uploadsWeek.clips).toBe(50)
    expect(dan.week).toBe(300) // clips stored, a different measure, kept separate
    const md = lib.renderReport({ now: NOW, since: SINCE, gaps: [], recorders: { rows: [dan] }, builders: { rows: [], idle: [] }, proof: { rows: [], unattributed: {} }, agents: [] })
    expect(md).toContain('- This week: 55 takes uploaded from the booth (re-reads included), landing on 50 clips')
    expect(md).toContain('- New clips stored under this voice this week: 300 (more clips than takes')
    expect(lib.summaryLine({ now: NOW, since: SINCE, recorders: { rows: [dan] }, builders: { rows: [], idle: [] }, proof: { rows: [], unattributed: {} } }))
      .toContain('55 booth takes uploaded (300 clips stored)')
  })
  it('a builder line says which door the saves came through and whether the sign-in was their own', () => {
    const { rows } = lib.builderRows(users, events, SINCE, NOW)
    expect(lib.surfaceLine(rows[0].week)).toContain('PATCH /api/seed/:courseCode/:seedNumber ×1')
    const agentOnly = lib.emptyTally()
    lib.addEvent(agentOnly, { occurred_at: daysAgo(1), course_code: 'pdc_for_eng', operation: 'course-edit', surface: 'production-api:POST /api/production/:courseCode/edit-batch', actor_verified: false, seeds: [1], ops: ['seed.update'] })
    expect(lib.surfaceLine(agentOnly)).toContain('1 of 1 saves NOT from a verified sign-in')
  })
  it('no proofreading in Popty is said as such, not as "0 proofreaders"', () => {
    const line = lib.summaryLine({ now: NOW, since: SINCE, recorders: { rows: [] }, builders: { rows: [], idle: [] }, proof: { rows: [], unattributed: {} } })
    expect(line).toContain('no proofreading recorded in Popty (notes applied by agents are not named')
    expect(line).not.toContain('0 proofreaders')
  })
})

describe('agent saves stay short', () => {
  it('lists the ten busiest courses and folds the rest into one line', () => {
    const agents = Array.from({ length: 13 }, (_, i) => ({ course_code: `c${i}_for_eng`, actor_kind: 'agent', saves: 2, seeds: i, labels: null }))
    const md = lib.renderReport({ now: NOW, since: SINCE, gaps: [], recorders: { rows: [] }, builders: { rows: [], idle: [] }, proof: { rows: [], unattributed: {} }, agents })
    expect(md).toContain('- c12_for_eng: 2 saves, 12 seeds named (agent)')
    expect(md).not.toContain('- c2_for_eng:')
    expect(md).toContain('- and 3 more courses: 6 saves, 3 seeds named')
  })
})
