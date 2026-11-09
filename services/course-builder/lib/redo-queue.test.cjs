/**
 * Redo queue (job #457). Kai, 9 Nov 2026: a Redo pressed while no agent can run must WAIT, not be refused.
 * These tests pin: a redo is queued (nothing written to course content) when capacity is full; it runs when
 * capacity frees; the queue is rebuilt from the chat rows alone, so it survives a restart; a cancelled redo
 * never runs; and nothing is deleted until the redo can actually run. In-memory fake DB only.
 *
 * Run: npx vitest run services/course-builder/lib/redo-queue
 */
import { describe, it, expect } from 'vitest'

const Q = require('./redo-queue.cjs')

const FULL_AGENTS = { kind: 'agents', reason: 'waiting for a free agent — all 12 agent slots are busy (12 running)', eta: null, eta_text: 'as soon as a running build or redo finishes' }

// ── in-memory fake of the supabase calls the queue makes ──────────────────────
function makeDb(tables) {
  const get = (row, col) => {
    const m = /^(\w+)->>(\w+)$/.exec(col)
    return m ? (row[m[1]] || {})[m[2]] : row[col]
  }
  let tick = Date.parse('2026-11-09T12:00:00Z')
  return {
    tables,
    from(table) {
      const filters = []
      let op = 'select', payload = null, single = false
      const q = {
        select() { return q },
        eq(c, v) { filters.push((r) => get(r, c) === v); return q },
        in(c, vs) { filters.push((r) => vs.includes(get(r, c))); return q },
        gte(c, v) { filters.push((r) => get(r, c) >= v); return q },
        order() { return q },
        limit() { return q },
        single() { single = true; return q },
        insert(row) { op = 'insert'; payload = row; return q },
        update(row) { op = 'update'; payload = row; return q },
        then(res, rej) {
          tables[table] = tables[table] || []
          if (op === 'insert') {
            for (const r of [].concat(payload)) tables[table].push({ created_at: new Date(tick++).toISOString(), ...r })
            return Promise.resolve({ data: null, error: null }).then(res, rej)
          }
          const rows = tables[table].filter((r) => filters.every((f) => f(r)))
          if (op === 'update') { rows.forEach((r) => Object.assign(r, payload)); return Promise.resolve({ count: rows.length, error: null }).then(res, rej) }
          return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(res, rej)
        },
      }
      return q
    },
  }
}

const seeds = () => [
  { course_code: 'tst', seed_number: 5, decomposed_at: '2026-11-01T00:00:00Z' },
  { course_code: 'tst', seed_number: 6, decomposed_at: '2026-11-01T00:00:00Z' },
]

/** A drain whose performRedo is the REAL one, with every destructive step recorded in order. */
function realPerform(log) {
  return (ctx, args) => Q.performRedo(ctx, {
    ...args,
    recordEdit: async () => { log.push('edit-event'); return 'ev-1' },
    deps: {
      snapshotSeeds: async (_sb, code, ns) => { log.push(`snapshot ${ns}`); return { batchId: 'B', snapshots: ns.map((n) => ({ id: `s${n}`, seed_number: n })) } },
      wipeSeedTeaching: async (_sb, code, ns) => { log.push(`WIPE ${ns}`); return { phrases_deleted: 3, legos_deleted: 1 } },
      bumpCourseVersion: async () => {},
      spawnRedoAgent: async (_ctx, a) => { log.push(`spawn ${a.seeds}`); return { account: 'kai@x' } },
      restoreSnapshot: async () => { log.push('restore') },
    },
  })
}

describe('describeBlocker — plain-English reason and ETA', () => {
  it('agent cap full: says so, no ETA', () => {
    const b = Q.describeBlocker({ runningAgents: 12, maxAgents: 12, accounts: 2, altAccount: () => 'a' })
    expect(b.kind).toBe('agents')
    expect(b.reason).toMatch(/free agent/)
    expect(b.eta).toBeNull()
  })
  it('both accounts full: ETA is the soonest future reset', () => {
    const now = Date.parse('2026-11-09T12:00:00Z')
    const b = Q.describeBlocker({ runningAgents: 0, maxAgents: 12, accounts: 2, altAccount: () => null, accountResets: ['2026-11-12T08:00:00Z', '2026-11-10T15:00:00Z', '2026-11-01T00:00:00Z'], now })
    expect(b.kind).toBe('accounts')
    expect(b.reason).toMatch(/weekly limit/)
    expect(b.eta).toBe('2026-11-10T15:00:00.000Z')
  })
  it('capacity free → null', () => {
    expect(Q.describeBlocker({ runningAgents: 3, maxAgents: 12, accounts: 2, altAccount: () => 'a' })).toBeNull()
  })
})

describe('the queue', () => {
  it('queued when full: one chat row, no course content touched, nothing runs', async () => {
    const db = makeDb({ course_seeds: seeds(), orchestrator_messages: [] })
    const ctx = { supabase: db }
    await Q.enqueueRedo(ctx, { courseCode: 'tst', seeds: [5], notes: 'fix L02', blocker: FULL_AGENTS, identity: { kind: 'user', id: 'u1', label: 'Kai', verified: true } })
    const log = []
    const r = await Q.drainRedoQueue(ctx, { deps: { blocker: () => FULL_AGENTS, performRedo: realPerform(log), refreshRoundIndex: () => {} } })
    expect(r).toEqual([expect.objectContaining({ action: 'wait', why: FULL_AGENTS.reason })])
    expect(log).toEqual([]) // never snapshotted, never wiped
    expect(db.tables.course_seeds.every((s) => s.decomposed_at)).toBe(true)
    const st = await Q.queueStatus(ctx, { courseCode: 'tst', blocker: FULL_AGENTS })
    expect(st.entries[0]).toMatchObject({ seeds: [5], position: 1, of: 1, reason: FULL_AGENTS.reason, notes: 'fix L02', queued_by: 'Kai' })
  })

  it('runs when capacity frees: snapshot BEFORE wipe, then spawn; entry closed', async () => {
    const db = makeDb({ course_seeds: seeds(), orchestrator_messages: [] })
    const ctx = { supabase: db }
    await Q.enqueueRedo(ctx, { courseCode: 'tst', seeds: [5], blocker: FULL_AGENTS })
    let full = true
    const log = []
    const deps = { blocker: () => (full ? FULL_AGENTS : null), performRedo: realPerform(log), refreshRoundIndex: () => {} }
    await Q.drainRedoQueue(ctx, { deps })
    expect(log).toEqual([])
    full = false
    const r = await Q.drainRedoQueue(ctx, { deps })
    expect(r).toEqual([expect.objectContaining({ action: 'ran', account: 'kai@x' })])
    expect(log).toEqual(['snapshot 5', 'edit-event', 'WIPE 5', 'spawn 5'])
    expect((await Q.loadOpenEntries(ctx)).length).toBe(0)
    // it never runs twice
    await Q.drainRedoQueue(ctx, { deps })
    expect(log.filter((l) => l.startsWith('WIPE')).length).toBe(1)
  })

  it('first come, first served: the pass stops at the first blocked entry', async () => {
    const db = makeDb({ course_seeds: seeds(), orchestrator_messages: [] })
    const ctx = { supabase: db }
    await Q.enqueueRedo(ctx, { courseCode: 'tst', seeds: [5], blocker: FULL_AGENTS })
    await Q.enqueueRedo(ctx, { courseCode: 'tst', seeds: [6], blocker: FULL_AGENTS })
    let free = 1 // one slot frees
    const ran = []
    const r = await Q.drainRedoQueue(ctx, { deps: { blocker: () => (free-- > 0 ? null : FULL_AGENTS), performRedo: async (_c, a) => { ran.push(a.seedNumbers[0]); return {} }, refreshRoundIndex: () => {} } })
    expect(ran).toEqual([5])
    expect(r.map((x) => x.action)).toEqual(['ran', 'wait'])
    expect((await Q.loadOpenEntries(ctx)).map((e) => e.seeds)).toEqual([[6]])
  })

  it('survives a restart: the queue is rebuilt from the stored chat rows alone', async () => {
    const db = makeDb({ course_seeds: seeds(), orchestrator_messages: [] })
    await Q.enqueueRedo({ supabase: db }, { courseCode: 'tst', seeds: [6], notes: 'n', blocker: FULL_AGENTS })
    // "restart": a fresh ctx, a fresh module instance, the same rows
    const stored = JSON.parse(JSON.stringify(db.tables.orchestrator_messages))
    const fresh = makeDb({ course_seeds: seeds(), orchestrator_messages: stored })
    const ran = []
    await Q.drainRedoQueue({ supabase: fresh }, { deps: { blocker: () => null, performRedo: async (_c, a) => { ran.push(a); return {} }, refreshRoundIndex: () => {} } })
    expect(ran).toEqual([expect.objectContaining({ courseCode: 'tst', seedNumbers: [6], notes: 'n' })])
  })

  it('cancel works: a cancelled redo never runs and nothing is changed', async () => {
    const db = makeDb({ course_seeds: seeds(), orchestrator_messages: [] })
    const ctx = { supabase: db }
    const { queue_id } = await Q.enqueueRedo(ctx, { courseCode: 'tst', seeds: [5], blocker: FULL_AGENTS })
    expect((await Q.cancelQueuedRedo(ctx, { courseCode: 'tst', queueId: queue_id, by: 'Kai' })).ok).toBe(true)
    expect((await Q.cancelQueuedRedo(ctx, { courseCode: 'tst', queueId: queue_id })).ok).toBe(false) // already gone
    const log = []
    await Q.drainRedoQueue(ctx, { deps: { blocker: () => null, performRedo: realPerform(log), refreshRoundIndex: () => {} } })
    expect(log).toEqual([])
    expect(db.tables.course_seeds.every((s) => s.decomposed_at)).toBe(true)
  })

  it('a queued redo whose spawn fails is restored by performRedo and closed as failed', async () => {
    const db = makeDb({ course_seeds: seeds(), orchestrator_messages: [] })
    const ctx = { supabase: db }
    await Q.enqueueRedo(ctx, { courseCode: 'tst', seeds: [5], blocker: FULL_AGENTS })
    const log = []
    const perform = (c, args) => Q.performRedo(c, { ...args, deps: {
      snapshotSeeds: async (_s, _c, ns) => ({ batchId: 'B', snapshots: ns.map((n) => ({ id: `s${n}`, seed_number: n })) }),
      wipeSeedTeaching: async () => { log.push('WIPE'); return {} },
      bumpCourseVersion: async () => {},
      spawnRedoAgent: async () => { throw new Error('Agent cap reached') },
      restoreSnapshot: async () => { log.push('restore') },
    } })
    const r = await Q.drainRedoQueue(ctx, { deps: { blocker: () => null, performRedo: perform, refreshRoundIndex: () => {} } })
    expect(r[0].action).toBe('failed')
    expect(log).toEqual(['WIPE', 'restore'])
    expect(db.tables.orchestrator_messages.some((m) => m.metadata.action === 'redo_queue_failed')).toBe(true)
    expect((await Q.loadOpenEntries(ctx)).length).toBe(0)
  })

  it('overlapping() finds seeds already queued for the same course only', () => {
    const entries = [{ course_code: 'tst', seeds: [5, 6] }, { course_code: 'other', seeds: [7] }]
    expect(Q.overlapping(entries, 'tst', [6, 7])).toEqual([6])
  })
})

describe('operator hold', () => {
  it('holds every redo with a plain reason and its own ETA; 0 lifts it', () => {
    Q.setHold({ minutes: 10, reason: 'checking the queued banner', by: 't' })
    const b = Q.liveBlocker()
    expect(b).toMatchObject({ kind: 'hold' })
    expect(b.reason).toMatch(/on hold — checking the queued banner/)
    Q.setHold({ minutes: 0 })
    expect(Q.currentHold()).toBeNull()
  })
  it('caps a hold at an hour', () => {
    const h = Q.setHold({ minutes: 600 })
    expect(h.until - Date.now()).toBeLessThanOrEqual(60 * 60e3)
    Q.setHold({ minutes: 0 })
  })
})
