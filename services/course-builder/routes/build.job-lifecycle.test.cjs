/**
 * Job #482 — the build lifecycle routes against an in-memory build_jobs table:
 *   - team-start refuses (409) while a build for the course is running;
 *   - a running row whose process is gone does not block a start;
 *   - Stop kills the recorded process tree, not just the row;
 *   - job-done never marks a usage-limit exit complete, and schedules the resume.
 * Real processes are spawned (sleep) so "Stop kills it" is observed, not mocked.
 *
 * Run: npx vitest run services/course-builder/routes/build.job-lifecycle.test.cjs
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

// No SSi token alternatives in this test: the resume waits for the printed reset time.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cb482-'))
process.env.SSI_CLAUDE_CONFIG_DIR = tmp
process.env.SSI_CLAUDE_USAGE_FILE = path.join(tmp, 'none.json')
process.env.SSI_CLAUDE_ROUTING_URL = 'http://127.0.0.1:9/none'

const express = require('express')
const buildRoutes = require('./build.cjs')

// ── a tiny PostgREST-shaped fake: enough of supabase-js for these routes ──
function fakeSupabase(tables) {
  function query(table) {
    const st = { filters: [], op: 'select', payload: null, single: false, order: null, limit: null, head: false, count: false }
    const rows = () => (tables[table] ||= [])
    const match = (r) => st.filters.every((f) => f(r))
    const run = () => {
      if (st.op === 'insert') {
        const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ id: `job-${rows().length + 1}`, metadata: {}, ...p }))
        rows().push(...list)
        return { data: st.single ? list[0] : list, error: null }
      }
      if (st.op === 'update') {
        const hit = rows().filter(match)
        for (const r of hit) Object.assign(r, JSON.parse(JSON.stringify(st.payload)))
        return { data: hit, error: null }
      }
      let out = rows().filter(match)
      if (st.order) out = [...out].sort((a, b) => String(b[st.order] ?? '').localeCompare(String(a[st.order] ?? '')))
      if (st.limit) out = out.slice(0, st.limit)
      if (st.head) return { data: null, count: out.length, error: null }
      if (st.single) return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: `${out.length} rows` } }
      return { data: JSON.parse(JSON.stringify(out)), error: null }
    }
    const q = {
      select(_c, opts) { if (st.op === 'select' && opts?.head) st.head = true; return q },
      insert(p) { st.op = 'insert'; st.payload = p; return q },
      update(p) { st.op = 'update'; st.payload = p; return q },
      eq(k, v) { st.filters.push((r) => r[k] === v); return q },
      in(k, vs) { st.filters.push((r) => vs.includes(r[k])); return q },
      not(k, _op, _v) { st.filters.push((r) => r[k] !== null && r[k] !== undefined); return q },
      order(k) { st.order = k; return q },
      limit(n) { st.limit = n; return q },
      single() { st.single = true; return q },
      then(res, rej) { try { res(run()) } catch (e) { rej(e) } },
    }
    return q
  }
  return { from: query }
}

let server, base, tables
const pids = []

function sleeper() {
  // Same shape as a headless spawn: a detached bash leading its own group, with a child.
  const p = spawn('bash', ['-c', 'sleep 300 & sleep 300; wait'], { detached: true, stdio: 'ignore' })
  p.unref()
  pids.push(p.pid)
  return p.pid
}
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }

beforeAll(async () => {
  tables = {}
  const ctx = {
    supabase: fakeSupabase(tables),
    config: { PORT: 0 }, MACHINE_NAME: 'test-box', SPAWN_MODE: 'headless', PROJECT_DIR: tmp,
    activeBuilds: new Map(), courseActivity: new Map(), agentHeartbeats: new Map(),
    emitPipelineEvent: () => {},
  }
  const app = express()
  app.use(express.json())
  app.use('/api', buildRoutes(ctx))
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => {
  server?.close()
  for (const p of pids) { try { process.kill(-p, 'SIGKILL') } catch {} }
})
beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k]
  tables.courses = [{ course_code: 'tst_for_eng', seed_count: 300 }]
  tables.course_seeds = []
  tables.orchestrator_messages = []
})

const post = (p, body = {}, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

describe('team-start guard', () => {
  it('refuses with 409 while a build for the course is running', async () => {
    const pid = sleeper()
    tables.build_jobs = [{ id: 'live-1', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', started_at: '2026-10-29T10:00:00Z', machine_name: 'test-box', metadata: { pid } }]
    const r = await post('/api/build/team-start/tst_for_eng', { targetSeeds: 300 })
    expect(r.status).toBe(409)
    const body = await r.json()
    expect(body.code).toBe('BUILD_ALREADY_RUNNING')
    expect(body.error).toMatch(/already running for tst_for_eng since 10:00 UTC/)
    expect(tables.build_jobs.filter((j) => j.status === 'running')).toHaveLength(1) // no second row
  })

  it('a running row started before process tracking (no pid) also blocks — Stop clears it', async () => {
    tables.build_jobs = [{ id: 'legacy', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', started_at: '2026-10-28T00:00:00Z', metadata: {} }]
    expect((await post('/api/build/team-start/tst_for_eng')).status).toBe(409)
  })

  it('a running row whose process has died is settled (process_gone) instead of blocking', async () => {
    const pid = sleeper()
    process.kill(-pid, 'SIGKILL')
    await new Promise((r) => setTimeout(r, 200))
    tables.build_jobs = [{ id: 'dead-1', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', started_at: '2026-10-29T10:00:00Z', total_seeds: 300, machine_name: 'test-box', metadata: { pid } }]
    // The brief fetch has no server here, so the start itself fails after the guard — what
    // matters is that the guard let it through and settled the dead row.
    const r = await post('/api/build/team-start/tst_for_eng', { dryRun: true })
    expect(r.status).not.toBe(409)
    expect(tables.build_jobs[0].status).toBe('stopped')
    expect(tables.build_jobs[0].metadata.stop_reason).toBe('process_gone')
  })
})

describe('stop', () => {
  it('kills the recorded orchestrator process tree and records who stopped it', async () => {
    const pid = sleeper()
    await new Promise((r) => setTimeout(r, 200))
    tables.build_jobs = [{ id: 'live-2', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', started_at: '2026-10-29T10:00:00Z', machine_name: 'test-box', metadata: { pid } }]
    expect(alive(pid)).toBe(true)
    const r = await post('/api/build/stop/tst_for_eng', {}, { 'x-stopped-by': 'kai.claude@saysomethingin.com' })
    const body = await r.json()
    expect(body.ok).toBe(true)
    expect(body.stopped[0].process_killed).toBe(true)
    await new Promise((r) => setTimeout(r, 300))
    expect(alive(pid)).toBe(false)
    expect(tables.build_jobs[0].status).toBe('stopped')
    expect(tables.build_jobs[0].metadata).toMatchObject({ stop_reason: 'human', stopped_by: 'kai.claude@saysomethingin.com' })
  })

  it('stops BOTH rows of a double start (the old .single() said "No active build")', async () => {
    const a = sleeper(), b = sleeper()
    tables.build_jobs = [
      { id: 'dup-a', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', machine_name: 'test-box', metadata: { pid: a } },
      { id: 'dup-b', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', machine_name: 'test-box', metadata: { pid: b } },
    ]
    const body = await (await post('/api/build/stop/tst_for_eng')).json()
    expect(body.stopped).toHaveLength(2)
    await new Promise((r) => setTimeout(r, 300))
    expect(alive(a) || alive(b)).toBe(false)
  })
})

describe('job-done', () => {
  it('a usage-limit exit at 294/300 is stopped (not complete) and auto-resume is scheduled for the reset', async () => {
    const log = path.join(tmp, 'Build Team-tst_for_eng.log')
    fs.writeFileSync(log, 'old run: Background tasks still running 10m after the last turn (subagent "x"); stopping them.\n')
    const offset = fs.statSync(log).size
    fs.appendFileSync(log, "Seed 291 is in.\n\nYou've hit your 5-hour limit · resets 1:50am (UTC)\n")
    tables.course_seeds = Array.from({ length: 294 }, (_, i) => ({ course_code: 'tst_for_eng', seed_number: i + 1, decomposed_at: '2026-10-28T20:00:00Z' }))
    tables.build_jobs = [{ id: 'lim-1', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', total_seeds: 300, machine_name: 'test-box', metadata: { log_file: log, log_offset: offset, account: 'claude@saysomethingin.com', seeds_at_start: 100 } }]
    const body = await (await post('/api/build/job-done/lim-1?exit=1')).json()
    expect(body.stop_reason).toBe('usage_limit') // judged on THIS run's slice, not the old kill line
    const job = tables.build_jobs[0]
    expect(job.status).toBe('stopped')
    expect(job.metadata.seeds_at_stop).toBe(294)
    expect(job.metadata.auto_resume.state).toBe('scheduled')
    expect(job.metadata.auto_resume.switch_account).toBe(false)
    expect(new Date(job.metadata.auto_resume.at).getUTCHours()).toBe(1)
    expect(new Date(job.metadata.auto_resume.at).getUTCMinutes()).toBe(51)
    expect(body.message).toMatch(/^Paused: usage limit reached at seed 294 of 300 — resumes automatically at 01:50 UTC/)
  })

  it('a clean exit at 300/300 is complete', async () => {
    tables.course_seeds = Array.from({ length: 300 }, (_, i) => ({ course_code: 'tst_for_eng', seed_number: i + 1, decomposed_at: 'x' }))
    tables.build_jobs = [{ id: 'ok-1', course_code: 'tst_for_eng', pass: 'build-team', status: 'running', total_seeds: 300, metadata: {} }]
    await post('/api/build/job-done/ok-1?exit=0')
    expect(tables.build_jobs[0].status).toBe('complete')
  })
})

describe('status', () => {
  it('reports how the last build ended, in plain English', async () => {
    tables.course_seeds = Array.from({ length: 4 }, (_, i) => ({ course_code: 'tst_for_eng', seed_number: i + 1, decomposed_at: 'x' }))
    tables.build_jobs = [{ id: 'h-1', course_code: 'tst_for_eng', pass: 'build-team', status: 'stopped', total_seeds: 300, completed_at: '2026-10-28T00:29:00Z', metadata: { stop_reason: 'background_kill', seeds_at_stop: 4 } }]
    const body = await (await fetch(`${base}/api/build/status/tst_for_eng`)).json()
    expect(body.active).toBe(false)
    expect(body.last_stop.message).toMatch(/cut off by the Claude CLI's 10-minute background-task limit at seed 4 of 300/)
  })
})
