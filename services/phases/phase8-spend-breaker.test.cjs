/**
 * phase8's per-pass breakers (job #425), on top of #383's runSpendCap.
 *
 *  - RENDER-TO-ATTACH: #382's passes 2-37 made ~60 provider calls for every
 *    slot they filled. A pass whose calls outnumber its filled slots by more
 *    than 1.2x past a warm-up is paying for audio nothing plays, and stops.
 *  - DOOR REFUSAL STOPS THE PASS: when the door's spend guard refuses a call
 *    (daily cap, pool share, repeat), every later item would be refused too;
 *    the pass stops and says so rather than grinding through thousands of
 *    refusals that each read as an ordinary "failed".
 *  - CALLER CEILING: a driver's remaining character budget caps the pass.
 *
 * The route tests drive the SHIPPED POST /generate against the in-memory
 * PostgREST double with a TTS double. Zero live DB, zero S3, zero spend.
 */
import { describe, it, expect, beforeAll } from 'vitest'
const http = require('http')
const { loadPhase8 } = require('./__fixtures__/phase8-sandbox.cjs')

beforeAll(() => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:9'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only'
  process.env.SUPABASE_SERVICE_KEY = 'test-only'
})

const COURSE_CODE = 'zzz_for_hin'
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const KRITI = 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73'

/** 40 English target1 lines, none rendered anywhere: every one is a real render. */
function freshCourse(n = 40) {
  const course = {
    course_code: COURSE_CODE, known_lang: 'hin', target_lang: 'eng', seed_count: 1,
    voice_config: { voices: { known: { voiceId: KRITI, provider: 'cartesia' }, target1: { voiceId: CHARLOTTE, provider: 'cartesia' }, target2: { voiceId: CHARLOTTE, provider: 'cartesia' } } },
  }
  const phrases = Array.from({ length: n }, (_, i) => ({
    id: `ph-${i}`, course_code: COURSE_CODE, seed_number: 1, known_text: `hindi ${i}`, target_text: `fresh line number ${i}`,
    known_audio_id: `known-${i}`, target1_audio_id: null, target2_audio_id: `t2-${i}`,
  }))
  return { courses: [course], course_audio: [], course_practice_phrases: phrases, course_legos: [], course_seeds: [] }
}

function veracityDouble() {
  return (real) => ({
    ...real,
    announceStatus() {},
    startCourse() { return { rate: 0, step_clips: 1 } },
    verdictColumns() { return {} },
    async renderChecked(o) { await o.render(); return { published: true, attempts: 1, buffer: Buffer.from('x'), durationMs: 100, wordBoundaries: null, verdict: null } },
  })
}

async function postGenerate(app, body) {
  const server = app.listen(0, '127.0.0.1')
  await new Promise(r => server.once('listening', r))
  try {
    const { port } = server.address()
    return await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', path: `/generate/${COURSE_CODE}`, headers: { 'Content-Type': 'application/json' } }, (res) => {
        let buf = ''
        res.on('data', c => { buf += c })
        res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(buf) }) } catch (e) { reject(new Error(buf)) } })
      })
      req.on('error', reject)
      req.end(JSON.stringify(body))
    })
  } finally { server.close() }
}

const FILL = { roles: ['target1'], authorScope: 'none', concurrency: 4 }

describe('runSpendCap: the render-to-attach breaker', () => {
  it('trips once provider calls outnumber filled slots by more than 1.2x past the warm-up', () => {
    const { runSpendCap } = loadPhase8({ tables: freshCourse(1) }).phase8
    const cap = runSpendCap([{ text: 'x'.repeat(1000) }], { warmup: 10 })
    for (let i = 0; i < 9; i++) { cap.charge('x'); cap.checkProgress(0) }
    expect(cap.tripped).toBeNull()                          // still warming up
    cap.charge('x'); cap.checkProgress(9)                   // 10 calls, 9 slots: healthy
    expect(cap.tripped).toBeNull()
    for (let i = 0; i < 10; i++) cap.charge('x')
    cap.checkProgress(10)                                   // 20 calls, 10 slots: 2x
    expect(cap.tripKind).toBe('render-attach')
    expect(() => cap.charge('x')).toThrow(/spend cap: render\/attach breaker/)
  })

  it('a caller ceiling lowers the pass budget below 1.5x planned', () => {
    const { runSpendCap } = loadPhase8({ tables: freshCourse(1) }).phase8
    const cap = runSpendCap([{ text: 'x'.repeat(10000) }], { ceilingChars: 3000 })
    expect(cap.budget).toBe(3000)
  })
})

describe('POST /generate stops the pass when the door refuses to spend', () => {
  it('a spend-guard refusal ends the pass after the batch it hit — not 40 refusals later', async () => {
    const tts = {
      calls: [],
      async generateWithRetry(text, provider, cfg) {
        cfg.door?.onAttempt?.(text, 1)      // the real door charges the pass per attempt
        tts.calls.push(text)
        throw new Error('TTS spend guard (402) DAILY_CAP: today\'s cartesia spend is 1,000,000 chars')
      },
    }
    const { phase8 } = loadPhase8({ tables: freshCourse(40), tts, doubles: { '/audio-veracity.cjs': veracityDouble() } })
    const r = await postGenerate(phase8, FILL)
    expect(r.status).toBe(200)
    expect(r.body.status).toBe('spend-capped')
    expect(r.body.spend.tripKind).toBe('spend-guard')
    expect(tts.calls.length).toBeLessThanOrEqual(FILL.concurrency)
  })

  it('a driver budget passed as budgetChars caps what the pass may spend', async () => {
    const tts = {
      calls: [],
      async generateWithRetry(text, provider, cfg) { cfg.door?.onAttempt?.(text, 1); tts.calls.push(text); return { audioBuffer: Buffer.from('not really audio'), wordBoundaries: null } },
    }
    const { phase8 } = loadPhase8({ tables: freshCourse(40), tts, doubles: { '/audio-veracity.cjs': veracityDouble() } })
    const r = await postGenerate(phase8, { ...FILL, budgetChars: 100 })
    expect(r.body.spend.budgetChars).toBe(100)
    expect(r.body.spend.spentChars).toBeLessThanOrEqual(100)
    expect(tts.calls.length).toBeLessThan(40)
  })
})

// ─── Job #430: no budget, no paid pass; the pass is charged per ATTEMPT ─────

/** A course whose missing lines add up to more than the small-pass budget. */
function bigCourse() {
  const t = freshCourse(300)
  t.course_practice_phrases.forEach((p, i) => { p.target_text = `a much longer fresh line to render, number ${i}` })
  return t
}

describe('POST /generate refuses a paid pass without a budget (job #430)', () => {
  it('a pass above the small-pass budget with no budgetChars is refused 400 before a single render', async () => {
    const tts = { calls: [], async generateWithRetry(text, provider, cfg) { cfg.door?.onAttempt?.(text, 1); tts.calls.push(text); return { audioBuffer: Buffer.from('x'), wordBoundaries: null } } }
    const { phase8 } = loadPhase8({ tables: bigCourse(), tts, doubles: { '/audio-veracity.cjs': veracityDouble() } })
    const r = await postGenerate(phase8, FILL)
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('BUDGET_REQUIRED')
    expect(r.body.wouldSpendChars).toBeGreaterThan(r.body.smallPassBudgetChars)
    expect(tts.calls).toHaveLength(0)
  })

  it('a small pass without budgetChars runs under the small-pass budget, and says it was defaulted', async () => {
    const tts = { calls: [], async generateWithRetry(text, provider, cfg) { cfg.door?.onAttempt?.(text, 1); tts.calls.push(text); return { audioBuffer: Buffer.from('x'), wordBoundaries: null } } }
    const { phase8 } = loadPhase8({ tables: freshCourse(4), tts, doubles: { '/audio-veracity.cjs': veracityDouble() } })
    const r = await postGenerate(phase8, FILL)
    expect(r.status).toBe(200)
    expect(r.body.spend.budgetDefaulted).toBe(true)
    expect(r.body.spend.budgetChars).toBeLessThanOrEqual(phase8.SMALL_PASS_BUDGET_CHARS)   // the smaller of the default and 1.5x the plan
  })

  it('resolvePassBudget: a named budget is used as given; a nonsense one is refused', () => {
    const { resolvePassBudget } = loadPhase8({ tables: freshCourse(1) }).phase8
    expect(resolvePassBudget(700000, 10 ** 7)).toEqual({ ok: true, budgetChars: 700000, defaulted: false })
    expect(resolvePassBudget('abc', 10).ok).toBe(false)
    expect(resolvePassBudget(0, 10).ok).toBe(false)
    expect(resolvePassBudget(undefined, 10 ** 6).ok).toBe(false)
  })
})

describe('the pass cap counts every provider ATTEMPT, retries included (job #430)', () => {
  it('three attempts per line are three charges — spendCap and the breaker see the retries', async () => {
    // A door double that retries twice before succeeding: the real door calls
    // door.onAttempt before each billed send.
    const tts = {
      calls: 0,
      async generateWithRetry(text, provider, cfg) {
        for (let a = 1; a <= 3; a++) { cfg.door?.onAttempt?.(text, a); tts.calls++ }
        return { audioBuffer: Buffer.from('x'), wordBoundaries: null }
      },
    }
    const { phase8 } = loadPhase8({ tables: freshCourse(8), tts, doubles: { '/audio-veracity.cjs': veracityDouble() } })
    const r = await postGenerate(phase8, { ...FILL, budgetChars: 100000 })
    const lineChars = freshCourse(8).course_practice_phrases.reduce((n, p) => n + p.target_text.length, 0)
    expect(r.body.spend.providerCalls).toBe(24)
    expect(r.body.spend.spentChars).toBe(3 * lineChars)
  })
})
