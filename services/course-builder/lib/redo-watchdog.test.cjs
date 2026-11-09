/**
 * Redo watchdog (job #429). The specimen: pdc_for_eng seeds 200/203/225, 6 Nov 2026 — each redo agent stopped
 * ~1 s in on "You've hit your weekly limit", nothing looked at the exit, the seeds sat empty three days.
 * These tests pin: a dead agent is retried ONCE (on the other account when the log shows a usage limit); a
 * failed retry restores the snapshot and alerts; a seed that was submitted is never touched; nothing is wiped
 * when no agent could run. In-memory fake DB only — no real course data.
 *
 * Run: npx vitest run services/course-builder/lib/redo-watchdog
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const { decideRedoAction, preflightRedo, sweepRedos, findStuckRedoSeeds, REDO_STALL_MS } = require('./redo-watchdog.cjs')

const MIN = 60e3
const WEEKLY = "You've hit your weekly limit · resets Nov 7, 3pm (UTC)"

describe('decideRedoAction', () => {
  it('does nothing once every seed has been submitted', () => {
    expect(decideRedoAction({ pendingSeeds: [], agentAlive: false }).action).toBe('done')
  })
  it('waits while the agent is alive inside the stall window', () => {
    expect(decideRedoAction({ pendingSeeds: [200], agentAlive: true, ageMs: 10 * MIN }).action).toBe('wait')
  })
  it('waits when liveness is unknown until the stall window passes, then retries', () => {
    expect(decideRedoAction({ pendingSeeds: [200], agentAlive: null, ageMs: 10 * MIN }).action).toBe('wait')
    expect(decideRedoAction({ pendingSeeds: [200], agentAlive: null, ageMs: REDO_STALL_MS }).action).toBe('retry')
  })
  it('the 6 Nov case: agent dead on a weekly limit, other account has room → retry there', () => {
    const d = decideRedoAction({ pendingSeeds: [200], agentAlive: false, ageMs: MIN, logText: WEEKLY, spentAccount: 'claude@x', altAccount: () => 'kai@x' })
    expect(d).toMatchObject({ action: 'retry', excludeAccount: 'claude@x', kill: false })
    expect(d.why).toMatch(/weekly limit/)
  })
  it('weekly limit and no other account with room → restore at once, no doomed retry', () => {
    const d = decideRedoAction({ pendingSeeds: [200], agentAlive: false, ageMs: MIN, logText: WEEKLY, spentAccount: 'claude@x', altAccount: () => null })
    expect(d.action).toBe('restore')
    expect(d.why).toMatch(/no other SSi account/)
  })
  it('a crash with no usage limit retries on any account', () => {
    expect(decideRedoAction({ pendingSeeds: [3], agentAlive: false, ageMs: MIN, logText: 'API Error: 500' })).toMatchObject({ action: 'retry', excludeAccount: null })
  })
  it('alive past the stall window is killed and retried', () => {
    expect(decideRedoAction({ pendingSeeds: [3], agentAlive: true, ageMs: REDO_STALL_MS + MIN })).toMatchObject({ action: 'retry', kill: true })
  })
  it('the retry failing → restore', () => {
    expect(decideRedoAction({ attempt: 2, pendingSeeds: [3], agentAlive: false, ageMs: MIN }).action).toBe('restore')
  })
})

describe('preflightRedo — nothing is wiped when no agent can run', () => {
  it('refuses when the agent cap is full', () => {
    expect(preflightRedo({ runningAgents: 12, maxAgents: 12, accounts: 2, altAccount: () => 'a' })).toMatch(/agent cap/)
  })
  it('refuses when every SSi account is at its weekly limit', () => {
    expect(preflightRedo({ runningAgents: 0, maxAgents: 12, accounts: 2, altAccount: () => null })).toMatch(/weekly limit/)
  })
  it('passes otherwise, and when no SSi token dir exists (default token)', () => {
    expect(preflightRedo({ runningAgents: 0, maxAgents: 12, accounts: 2, altAccount: () => 'a' })).toBeNull()
    expect(preflightRedo({ runningAgents: 0, maxAgents: 12, accounts: 0, altAccount: () => null })).toBeNull()
  })
})

// ── in-memory fake of the supabase surface the watchdog uses ──────────────────
function makeDb(tables) {
  const get = (row, col) => {
    const m = /^(\w+)->>(\w+)$/.exec(col)
    return m ? (row[m[1]] || {})[m[2]] : row[col]
  }
  return {
    tables,
    from(table) {
      const filters = []
      let op = 'select', payload = null
      const q = {
        select() { return q },
        eq(c, v) { filters.push((r) => get(r, c) === v); return q },
        in(c, vs) { filters.push((r) => vs.includes(get(r, c))); return q },
        gte(c, v) { filters.push((r) => get(r, c) >= v); return q },
        order() { return q },
        limit() { return q },
        insert(row) { op = 'insert'; payload = row; return q },
        then(res, rej) {
          try {
            tables[table] = tables[table] || []
            if (op === 'insert') {
              for (const r of [].concat(payload)) tables[table].push({ created_at: new Date().toISOString(), ...r })
              return Promise.resolve({ data: null, error: null }).then(res, rej)
            }
            return Promise.resolve({ data: tables[table].filter((r) => filters.every((f) => f(r))), error: null }).then(res, rej)
          } catch (e) { return Promise.reject(e).then(res, rej) }
        },
      }
      return q
    },
  }
}

function scenario({ logText = WEEKLY } = {}) {
  const dir = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'redo-wd-'))
  const logFile = path.join(dir, 'Redo-tst.log')
  fs.writeFileSync(logFile, logText)
  const t0 = new Date('2026-11-06T14:00:00Z')
  const db = makeDb({
    course_seeds: [{ course_code: 'tst', seed_number: 200, decomposed_at: null }, { course_code: 'tst', seed_number: 201, decomposed_at: null }],
    course_legos: [],
    seed_redo_snapshots: [
      { id: 'snap-200', batch_id: 'B', course_code: 'tst', seed_number: 200, reason: 'redo', restored_at: null, created_at: t0.toISOString() },
      { id: 'snap-201', batch_id: 'B', course_code: 'tst', seed_number: 201, reason: 'redo', restored_at: null, created_at: t0.toISOString() },
    ],
    orchestrator_messages: [{
      course_code: 'tst', created_at: t0.toISOString(),
      metadata: { action: 'redo_spawned', redo_watchdog: 'v1', snapshot_batch_id: 'B', seeds: [200, 201], attempt: 1, spawned_at: t0.toISOString(), machine_name: 'box', pid: 4242, log_file: logFile, log_offset: 0, account: 'claude@x' },
    }],
  })
  const ctx = { supabase: db, MACHINE_NAME: 'box', config: { PORT: 0 } }
  const calls = { spawn: [], restore: [], kill: [] }
  const deps = {
    isProcessAlive: () => false,
    killProcessTree: async (pid) => { calls.kill.push(pid) },
    altAccount: (spent) => (spent === 'claude@x' ? 'kai@x' : null),
    spawnRedoAgent: async (c, args) => {
      calls.spawn.push(args)
      db.tables.orchestrator_messages.push({ course_code: args.courseCode, created_at: new Date().toISOString(), metadata: { action: 'redo_retry_spawned', redo_watchdog: 'v1', snapshot_batch_id: args.batchId, seeds: args.seeds, attempt: args.attempt, spawned_at: new Date(t0.getTime() + 2 * MIN).toISOString(), machine_name: 'box', pid: 5353, log_file: logFile, log_offset: 0, account: 'kai@x' } })
    },
    restore: async (c, courseCode, snapshotId) => {
      calls.restore.push(snapshotId)
      const s = db.tables.seed_redo_snapshots.find((r) => r.id === snapshotId)
      s.restored_at = new Date().toISOString()
    },
  }
  return { db, ctx, calls, deps, t0 }
}

describe('sweepRedos — a simulated redo whose agent fails', () => {
  it('retries once on the other account, then restores both seeds and alerts', async () => {
    const { db, ctx, calls, deps, t0 } = scenario()
    // sweep 1: agent dead on a weekly limit → retry, excluding the spent account
    let r = await sweepRedos(ctx, { now: new Date(t0.getTime() + MIN), deps })
    expect(r[0].action).toBe('retry')
    expect(calls.spawn).toHaveLength(1)
    expect(calls.spawn[0]).toMatchObject({ seeds: [200, 201], attempt: 2, excludeAccounts: ['claude@x'], batchId: 'B' })
    expect(calls.restore).toHaveLength(0)

    // sweep 2: the retry died too → restore every empty seed + one final alert
    r = await sweepRedos(ctx, { now: new Date(t0.getTime() + 4 * MIN), deps })
    expect(r[0].action).toBe('restore')
    expect(calls.restore.sort()).toEqual(['snap-200', 'snap-201'])
    const alerts = db.tables.orchestrator_messages.filter((m) => m.metadata.action === 'redo_watchdog_alert')
    expect(alerts).toHaveLength(1)
    expect(alerts[0].metadata).toMatchObject({ final: true, outcome: 'restored', restored: [200, 201] })
    expect(alerts[0].message).toMatch(/did not submit/)

    // sweep 3: finished batch is left alone — no second retry, no second alert
    r = await sweepRedos(ctx, { now: new Date(t0.getTime() + 6 * MIN), deps })
    expect(r).toHaveLength(0)
    expect(calls.spawn).toHaveLength(1)
  })

  it('only the seed that never submitted is retried; a submitted seed is never touched', async () => {
    const { db, ctx, calls, deps, t0 } = scenario({ logText: 'done' })
    db.tables.course_seeds[0].decomposed_at = '2026-11-06T14:00:30Z' // 200 submitted
    await sweepRedos(ctx, { now: new Date(t0.getTime() + MIN), deps })
    expect(calls.spawn[0].seeds).toEqual([201])
  })

  it('waits while the agent is alive', async () => {
    const { ctx, calls, deps, t0 } = scenario()
    const r = await sweepRedos(ctx, { now: new Date(t0.getTime() + MIN), deps: { ...deps, isProcessAlive: () => true } })
    expect(r[0].action).toBe('wait')
    expect(calls.spawn).toHaveLength(0)
  })

  it('if the retry cannot even start, restores at once rather than leaving the seed empty', async () => {
    const { db, ctx, calls, deps, t0 } = scenario()
    deps.spawnRedoAgent = async () => { throw new Error('Agent cap reached') }
    await sweepRedos(ctx, { now: new Date(t0.getTime() + MIN), deps })
    expect(calls.restore.sort()).toEqual(['snap-200', 'snap-201'])
    expect(db.tables.orchestrator_messages.at(-1).message).toMatch(/could not start/)
  })
})

describe('findStuckRedoSeeds — read-only census of older redos', () => {
  it('lists a seed whose newest snapshot is an unrestored redo and which is empty now', async () => {
    const db = makeDb({
      seed_redo_snapshots: [
        { id: 'a', course_code: 'x', seed_number: 5, reason: 'redo', restored_at: null, created_at: '2026-11-06T00:00:00Z' },
        { id: 'b', course_code: 'x', seed_number: 6, reason: 'redo', restored_at: null, created_at: '2026-11-06T00:00:00Z' },
        { id: 'c', course_code: 'x', seed_number: 7, reason: 'redo', restored_at: '2026-11-07T00:00:00Z', created_at: '2026-11-06T00:00:00Z' },
      ],
      course_seeds: [
        { course_code: 'x', seed_number: 5, decomposed_at: null, known_text: 'k5' },
        { course_code: 'x', seed_number: 6, decomposed_at: '2026-11-06T01:00:00Z', known_text: 'k6' },
        { course_code: 'x', seed_number: 7, decomposed_at: null, known_text: 'k7' },
      ],
      course_legos: [],
    })
    const stuck = await findStuckRedoSeeds({ supabase: db }, { sinceDays: 100000 })
    expect(stuck.map((s) => s.seed_number)).toEqual([5])
  })
})
