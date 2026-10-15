/**
 * The booth take's script check runs AFTER the upload answers (job #842). Three promises pinned:
 *   1. the upload is not held by the check — enqueue returns while the check has not answered,
 *      and handleRecordingUpload no longer awaits it;
 *   2. a take that does not match its line comes back on the artist's re-record list, and leaves
 *      it when the line is read again (or he keeps the take);
 *   3. a restart mid-check loses nothing: the job is on disk and the next process runs it, and
 *      decoders the dead process left behind are killed.
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const Q = require('./take-text-check-queue.cjs')

const quiet = { log () {}, warn () {}, error () {}, info () {} }
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ttcq-'))
const never = () => new Promise(() => {})
const job = (n, extra = {}) => ({
  takeId: `TAKE-${n}`, audioId: `audio-${n}`, voiceId: 'human_tom_zzz', lineId: `seed:S${n}:target1`,
  courseCode: 'zzz_test2_for_eng', text: 'Bore da', language: 'cy', kind: 'target1', ...extra,
})
const failing = async () => ({ checked: true, pass: false, reason: 'cer_above_threshold', decode: 'Bara da', similarity: 0.4 })
const passing = async () => ({ checked: true, pass: true, reason: 'cer_within_threshold', decode: 'Bore da' })

describe('the upload is not held by the script check', () => {
  it('enqueue returns at once while the check has not answered, with the job already on disk', () => {
    const dir = tmp()
    let started = 0
    const q = Q.createTextCheckQueue({ dir, logger: quiet, check: () => { started++; return never() } })
    const r = q.enqueue(job(1), Buffer.from('mastered-bytes'))
    expect(r.queued).toBe(true)
    expect(started).toBe(1)
    expect(fs.existsSync(path.join(dir, 'pending', 'TAKE-1.json'))).toBe(true)
    expect(fs.readFileSync(path.join(dir, 'pending', 'TAKE-1.audio'), 'utf8')).toBe('mastered-bytes')
  })

  it('handleRecordingUpload queues the check and never awaits it before replying', () => {
    const src = fs.readFileSync(path.join(__dirname, 'production-api.cjs'), 'utf8')
    const start = src.indexOf('async function handleRecordingUpload(')
    const end = src.indexOf("app.post('/api/production/:courseCode/recording/upload', handleRecordingUpload)")
    expect(start).toBeGreaterThan(0)
    const body = src.slice(start, end)
    expect(body).not.toMatch(/await\s+veracity\.checkAudioVeracity/)
    const queued = body.indexOf('textChecks.enqueue(')
    const reply = body.indexOf('res.json({\n      success: true')
    expect(queued).toBeGreaterThan(0)
    expect(reply).toBeGreaterThan(queued)
    // and the refusal gates are still inline, before the queue
    for (const gate of ['speechGate.checkTakeHasSpeech(', 'speechGate.checkTakeIsNotSteadyNoise(', 'speechGate.checkTakeBoundaries(']) {
      const at = body.indexOf(gate)
      expect(at).toBeGreaterThan(0)
      expect(at).toBeLessThan(queued)
    }
  })
})

describe('a take that does not match its line comes back as a re-record', () => {
  it('a failed check is on the voice list; a pass and an unchecked one are not', async () => {
    const dir = tmp()
    const verdicts = { 'TAKE-1': failing, 'TAKE-2': passing, 'TAKE-3': async () => ({ checked: false, pass: null, reason: 'unchecked_decoder_not_validated' }) }
    const q = Q.createTextCheckQueue({ dir, logger: quiet, check: (b, t, l, o) => verdicts[o.meta.audioId.replace('audio', 'TAKE')]() })
    q.enqueue(job(1), Buffer.from('a'))
    q.enqueue(job(2), Buffer.from('b'))
    q.enqueue(job(3), Buffer.from('c'))
    await q.idle()
    const f = q.failuresFor(['human_tom_zzz'])
    expect(f.map(x => x.lineId)).toEqual(['seed:S1:target1'])
    expect(f[0]).toMatchObject({ takeId: 'TAKE-1', heard: 'Bara da', reason: 'cer_above_threshold' })
    expect(fs.readdirSync(path.join(dir, 'pending'))).toEqual([])
  })

  it('a new take of the line takes it off; a re-read that fails again comes back with its own take', async () => {
    const dir = tmp()
    let gate
    const q = Q.createTextCheckQueue({ dir, logger: quiet, check: (b) => (b.toString() === 'held' ? new Promise(r => { gate = r }) : failing()) })
    q.enqueue(job(1), Buffer.from('a'))
    await q.idle()
    expect(q.failuresFor('human_tom_zzz')).toHaveLength(1)
    // read again: accepted, its own check still running — the old failure is already gone
    q.enqueue(job(1, { takeId: 'TAKE-1b' }), Buffer.from('held'))
    expect(q.failuresFor('human_tom_zzz')).toHaveLength(0)
    gate({ checked: true, pass: false, reason: 'cer_above_threshold', decode: 'x' })
    await q.idle()
    expect(q.failuresFor('human_tom_zzz').map(x => x.takeId)).toEqual(['TAKE-1b'])
  })

  it('a take with no script text still clears the line (noteTake), and "keep it" clears it too', async () => {
    const dir = tmp()
    const q = Q.createTextCheckQueue({ dir, logger: quiet, check: failing })
    q.enqueue(job(1), Buffer.from('a'))
    q.enqueue(job(2), Buffer.from('b'))
    await q.idle()
    expect(q.failuresFor('human_tom_zzz')).toHaveLength(2)
    q.noteTake({ voiceId: 'human_tom_zzz', lineId: 'seed:S1:target1', takeId: 'TAKE-1c' })
    q.keep({ voiceId: 'human_tom_zzz', lineId: 'seed:S2:target1', takeId: 'TAKE-2' })
    expect(q.failuresFor('human_tom_zzz')).toHaveLength(0)
  })

  it('reads every spelling of the voice', async () => {
    const dir = tmp()
    const q = Q.createTextCheckQueue({ dir, logger: quiet, check: failing })
    q.enqueue(job(1, { voiceId: 'human_aran_cym_n' }), Buffer.from('a'))
    q.enqueue(job(2, { voiceId: 'human_aran_cym_n_2' }), Buffer.from('b'))
    await q.idle()
    expect(q.failuresFor(['human_aran_cym_n', 'human_aran_cym_n_2'])).toHaveLength(2)
    expect(q.failuresFor(['human_aran_cym_n'])).toHaveLength(1)
  })
})

describe('a restart mid-check loses nothing', () => {
  it('the next process re-queues the interrupted check from disk and runs it', async () => {
    const dir = tmp()
    const before = Q.createTextCheckQueue({ dir, logger: quiet, check: never })
    before.enqueue(job(1), Buffer.from('mastered'))
    // ...the process is killed here. A new one starts on the same directory:
    let heard = null
    const after = Q.createTextCheckQueue({ dir, logger: quiet, check: async (buf) => { heard = buf.toString(); return failing() } })
    expect(after.recover()).toBe(1)
    await after.idle()
    expect(heard).toBe('mastered')
    expect(after.failuresFor('human_tom_zzz').map(x => x.takeId)).toEqual(['TAKE-1'])
    expect(fs.readdirSync(path.join(dir, 'pending'))).toEqual([])
  })

  it('a check that has killed the process MAX_ATTEMPTS times is recorded unchecked, not retried for ever', async () => {
    const dir = tmp()
    const q0 = Q.createTextCheckQueue({ dir, logger: quiet, check: never })
    q0.enqueue(job(1), Buffer.from('x'))
    for (let i = 0; i < Q.MAX_ATTEMPTS; i++) Q.createTextCheckQueue({ dir, logger: quiet, check: never }).recover()
    let ran = false
    const last = Q.createTextCheckQueue({ dir, logger: quiet, check: async () => { ran = true; return failing() } })
    last.recover()
    await last.idle()
    expect(ran).toBe(false)
    expect(last.failuresFor('human_tom_zzz')).toHaveLength(0)
    expect(fs.readdirSync(path.join(dir, 'pending'))).toEqual([])
  })

  it('kills a decoder the dead process left behind, and never one a live node process owns', () => {
    const proc = tmp()
    const mk = (pid, ppid, cmd, uid = 995) => {
      fs.mkdirSync(path.join(proc, String(pid)))
      fs.writeFileSync(path.join(proc, String(pid), 'status'), `Name:\tx\nPPid:\t${ppid}\nUid:\t${uid}\t${uid}\t${uid}\t${uid}\n`)
      fs.writeFileSync(path.join(proc, String(pid), 'cmdline'), cmd.join('\0') + '\0')
    }
    const wav = '/tmp/veracity-3f2b8c1e-9a4d-4c55-8e21-0d6a1b2c3d4e.wav'
    mk(1, 0, ['/sbin/init'], 0)
    mk(100, 1, ['/home/tomcassidy/.local/bin/whisper-cli.real', '-m', 'm.bin', '-f', wav])   // orphan
    mk(200, 1, ['/usr/bin/node', 'services/phases/phase8-audio-v13.cjs'])
    mk(201, 200, ['/home/tomcassidy/.local/bin/whisper-cli.real', '-f', wav])               // phase8's own
    mk(300, 1, ['ffmpeg', '-y', '-i', '/tmp/veracity-3f2b8c1e-9a4d-4c55-8e21-0d6a1b2c3d4f.src'])  // orphan ffmpeg
    mk(400, 1, ['/home/tomcassidy/.local/bin/whisper-cli.real', '-f', wav], 1000)           // someone else's
    mk(500, 1, ['/home/tomcassidy/.local/bin/whisper-cli.real', '-f', '/tmp/cs-vstream-1.wav']) // not ours
    const killed = []
    Q.reapOrphanedDecoders({ procRoot: proc, uid: 995, kill: (pid) => killed.push(pid), logger: quiet })
    expect(killed.sort()).toEqual([100, 300])
  })
})

describe('failuresFromEvents', () => {
  it('drops a failure older than the window', () => {
    const now = Date.parse('2026-10-15T12:00:00Z')
    const ev = [
      { e: 'take', lineId: 'L', takeId: 'T', at: '2026-10-01T00:00:00Z' },
      { e: 'check', lineId: 'L', takeId: 'T', checked: true, pass: false, at: '2026-10-01T00:00:05Z' },
    ]
    expect(Q.failuresFromEvents(ev, { now })).toHaveLength(0)
    expect(Q.failuresFromEvents(ev, { now, windowMs: 30 * 24 * 3600 * 1000 })).toHaveLength(1)
  })
})
