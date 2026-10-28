/**
 * Export Step 2 as a detached, restart-proof run (job #27).
 * Run: npx vitest run services/shared/export-step2-run.test.cjs
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { writeRun, readRun } = require('./export-step2-state.cjs')
const { runStep2 } = require('./export-step2-run.cjs')

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'step2-'))

describe('step 2 run file', () => {
  it('a live worker stays running; a dead or silent one is reported as an error, never as running forever', () => {
    const d = tmp()
    writeRun(d, 'x', { status: 'running', pid: process.pid, startedAt: 1, progress: {} })
    expect(readRun(d, 'x').status).toBe('running')
    expect(readRun(d, 'x', Date.now() + 11 * 60 * 1000).status).toBe('error') // silent > 10 min
    writeRun(d, 'x', { status: 'running', pid: 2 ** 22 + 12345, startedAt: 1, progress: {} }) // no such pid
    expect(readRun(d, 'x').status).toBe('error')
    writeRun(d, 'x', { status: 'completed', pid: 2 ** 22 + 12345, s3Verified: true })
    expect(readRun(d, 'x').status).toBe('completed')
    expect(readRun(d, 'nope')).toBeNull()
  })

  it('a detached child keeps writing after its parent process is gone (the API-restart case)', async () => {
    const d = tmp()
    const child = `const {writeRun}=require(${JSON.stringify(require.resolve('./export-step2-state.cjs'))});setTimeout(()=>writeRun(${JSON.stringify(d)},'x',{status:'completed',pid:process.pid}),700)`
    const parent = spawn(process.execPath, ['-e', `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(child)}],{detached:true,stdio:'ignore'}).unref()`])
    await new Promise((r) => parent.on('exit', r))
    await new Promise((r) => setTimeout(r, 1500))
    expect(readRun(d, 'x').status).toBe('completed')
  })
})

describe('runStep2', () => {
  const manifest = { introduction: { id: 'I', duration: 1 }, slices: [{ samples: { a: [{ id: 'A', duration: 2 }] } }] }
  it('fixes a duration mismatch, re-verifies, and stores the verdict', async () => {
    const d = tmp(); const mp = path.join(d, 'c_pending_manifest.json'); fs.writeFileSync(mp, JSON.stringify(manifest))
    const writes = []
    const supabase = { from: () => ({ upsert: async (row) => { writes.push(row); return {} } }) }
    const s3 = {
      collectManifestUuids: () => ['I', 'A'],
      verifyStageAudio: async () => ({ total: 2, existing: 2, missing: 0, durationChecked: 2, durationMismatched: 1, durationErrors: 0, formatChecked: 2, formatFailed: 0, extractedDurations: new Map([['I', 1], ['A', 2.5]]) }),
      autoFixDurations: async (u, m) => ({ fixed: 1, errors: 0, dbRowsUpdated: 1, dbAlreadyCorrect: 1, dbErrors: 0, updatedManifest: { ...m, slices: [{ samples: { a: [{ id: 'A', duration: 2.5 }] } }] } }),
    }
    const events = []
    const out = await runStep2({ courseCode: 'c', manifestPath: mp, onProgress: (e) => events.push(e.phase), supabase, s3DeployService: s3, log: { info () {}, error () {} } })
    expect(out.s3Verified).toBe(true)
    expect(out.results.verifyFixed.mismatched).toBe(0)
    expect(JSON.parse(fs.readFileSync(mp)).slices[0].samples.a[0].duration).toBe(2.5)
    expect(writes.at(-1).s3_verified).toBe(true)
    expect(events).toContain('fixing')
  })
})
