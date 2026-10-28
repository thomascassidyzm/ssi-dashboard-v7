import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
const { makeBudget, tailVerdict, rollbackLines, staleAsks, isStop, castFromVoiceConfig, postWith, renderAsk } = createRequire(import.meta.url)('./revoice-seeds-to-cast.cjs')

// job #864: Popty restarting under an auto-deploy (ECONNREFUSED) is waited out; an answer, a 402 included, comes back first time
describe('postWith', () => {
  it('waits out a 503 (phase8 restarting behind production-api) instead of returning it as a failure (job #394)', async () => {
    let n = 0
    const fetchFn = async () => (++n < 3 ? { status: 503, json: async () => ({ ok: false, error: 'Phase 8 audio server not reachable' }) } : { status: 200, json: async () => ({ ok: true }) })
    const r = await postWith(fetchFn, async () => {}, '/api/audio/render', {})
    expect(r.status).toBe(200)
    expect(n).toBe(3)
  })
  const refused = () => { const e = new Error('fetch failed'); e.cause = { code: 'ECONNREFUSED' }; throw e }
  const answer = (status, body) => async () => ({ status, json: async () => body })
  it('waits out a dropped connection, never retries an answer', async () => {
    const calls = []; const waits = []
    const seq = [refused, refused, answer(200, { ok: true, audioId: 'x' })]
    const r = await postWith(async (...a) => { calls.push(a); return seq.shift()() }, async (ms) => { waits.push(ms) }, '/api/audio/render', {})
    expect(r).toEqual({ status: 200, body: { ok: true, audioId: 'x' } })
    expect(waits).toHaveLength(2)
    let n = 0
    const r402 = await postWith(async () => { n++; return answer(402, { code: 'REPEAT' })() }, async () => {}, '/api/audio/render', {})
    expect([r402.status, n]).toEqual([402, 1])
  })
})

// job #863: only TTS clips off the cast voice move; human takes and cast clips stay; one ask per (role, words), course order
describe('revoice-seeds-to-cast', () => {
  const cast = { target1: 'cartesia_f1', target2: 'cartesia_m1' }
  const clips = new Map([
    ['a', { id: 'a', voice_id: 'es-ES-ElviraNeural', origin: 'tts' }],
    ['b', { id: 'b', voice_id: 'f1', origin: 'tts' }],           // already the cast voice (bare id)
    ['c', { id: 'c', voice_id: 'azure_es-ES-AlvaroNeural', origin: 'human' }], // a human take: never replaced
    ['d', { id: 'd', voice_id: 'xai_eve', origin: 'tts' }],
  ])
  const rows = [
    { seed_number: 7, target_text: 'mucho', target1_audio_id: 'a', target2_audio_id: 'c', slot: { legoId: 'S0007L01' } },
    { seed_number: 3, target_text: 'mucho', target1_audio_id: 'd', target2_audio_id: 'd', slot: { phraseId: 'x:S0003L01B01' } },
    { seed_number: 2, target_text: 'ir', target1_audio_id: 'b', target2_audio_id: null, slot: { seedNumber: 2 } },
  ]
  it('selects only off-cast TTS slots and groups them', () => {
    const asks = staleAsks(rows, clips, cast)
    expect(asks.map((a) => [a.role, a.text, a.firstSeed, a.slots.length])).toEqual([
      ['target1', 'mucho', 3, 2],
      ['target2', 'mucho', 3, 1],
    ])
    expect(asks[0].slots.map((s) => s.current).sort()).toEqual(['a', 'd'])
  })
  it('treats a spend-guard refusal as the answer', () => {
    expect(isStop({ status: 402, body: {} })).toBe(true)
    expect(isStop({ status: 200, body: { code: 'DAILY_TOTAL_CAP' } })).toBe(true)
    expect(isStop({ status: 500, body: { ok: false } })).toBe(false)
  })
  // job #864: por_for_eng stores Azure Raquel/Duarte but its language cast resolves to Cartesia Mariana/Matias; the cast wins
  it('takes the resolved cast over a stale stored Azure row, and stops when nothing is Cartesia', () => {
    const az = (n) => ({ provider: 'azure', voiceId: `pt-PT-${n}Neural` })
    const vc = {
      stored: { voices: { target1: az('Raquel'), target2: az('Duarte') } },
      resolved: { voices: { target1: { provider: 'cartesia', voiceId: 'cartesia_d93' }, target2: { provider: 'cartesia', voiceId: 'b1d' } } },
    }
    expect(castFromVoiceConfig(vc)).toEqual({ castByRole: { target1: 'cartesia_d93', target2: 'cartesia_b1d' }, missing: null })
    expect(castFromVoiceConfig({ stored: vc.stored }).missing.role).toBe('target1')
  })
})

// job #76·AA: deu_at target1 is Kai's ElevenLabs Tamara (cast gate CAST_ANY_PROVIDER); target2 stays as it is
describe('castFromVoiceConfig — a non-Cartesia cast on a CAST_ANY_PROVIDER course, one role', () => {
  const vc = { resolved: { voices: {
    target1: { provider: 'elevenlabs', voiceId: 'elevenlabs_Zq8xdM7UEWBINjdZQdBE' },
    target2: { provider: 'cartesia', voiceId: 'f6f3' },
  } } }
  it('takes the ElevenLabs cast only when the course allows any provider', () => {
    expect(castFromVoiceConfig(vc, { roles: ['target1'], anyProvider: true })).toEqual({ castByRole: { target1: 'elevenlabs_Zq8xdM7UEWBINjdZQdBE' }, missing: null })
    expect(castFromVoiceConfig(vc, { roles: ['target1'] }).missing.role).toBe('target1')
  })
  it('deu_at is in the cast gate set and plain deu is not', () => {
    const { CAST_ANY_PROVIDER } = createRequire(import.meta.url)('../../services/shared/voice-cast-gate.cjs')
    expect(CAST_ANY_PROVIDER.has('deu_at')).toBe(true)
    expect(CAST_ANY_PROVIDER.has('deu')).toBe(false)
  })
  it('a slot already on Tamara is not stale; a Vreni slot is; the job rides on the ask', () => {
    const clips = new Map([['t', { id: 't', voice_id: 'elevenlabs_Zq8xdM7UEWBINjdZQdBE', origin: 'tts' }], ['v', { id: 'v', voice_id: 'cartesia_40e0', origin: 'tts' }]])
    const rows = [{ seed_number: 1, target_text: 'wü', target1_audio_id: 't', slot: { legoId: 'S0001L02' } }, { seed_number: 1, target_text: 'i wü', target1_audio_id: 'v', slot: { legoId: 'S0001L01' } }]
    const asks = staleAsks(rows, clips, { target1: 'elevenlabs_Zq8xdM7UEWBINjdZQdBE', target2: 'cartesia_f6f3' })
    expect(asks.filter((a) => a.role === 'target1').map((a) => a.text)).toEqual(['i wü'])
    expect(renderAsk('deu_at_for_eng', asks[0], { target1: 'elevenlabs_Zq8xdM7UEWBINjdZQdBE' }, 'p', '#76')).toMatchObject({ job: '#76', voiceBound: true })
  })
})

// Tom 2026-10-17: every repoint keeps the old pointer so any course can be rolled back
describe('rollbackLines', () => {
  it('records old and new pointer per slot, one JSON line each', () => {
    const out = rollbackLines('ita_for_eng', [{ seedNumber: 3, role: 'target1', audioId: 'N1', expectCurrent: 'O1' }, { phraseId: 'p9', role: 'target2', audioId: 'N2', expectCurrent: 'O2' }], 'T')
    const rows = out.trim().split('\n').map((l) => JSON.parse(l))
    expect(rows).toEqual([
      { at: 'T', course: 'ita_for_eng', seedNumber: 3, role: 'target1', old: 'O1', new: 'N1' },
      { at: 'T', course: 'ita_for_eng', phraseId: 'p9', role: 'target2', old: 'O2', new: 'N2' },
    ])
  })
})

// job #366: a clip with a tail click (or one the audit cannot measure) is not swapped in
describe('tailVerdict', () => {
  it('passes clean, refuses click and unmeasurable', () => {
    expect(tailVerdict('{"click":false,"tail_spike":3,"end_abs":0.01}')).toBeNull()
    expect(tailVerdict('{"click":true,"tail_spike":40,"end_abs":0.2}')).toMatch(/tail click/)
    expect(tailVerdict('{"error":"short"}')).toMatch(/error/)
    expect(tailVerdict('')).toMatch(/nothing/)
  })
})

// job #464: a re-voice ask is voice-bound to the cast voice, so an old-voice library clip with identical words can never answer it
describe('renderAsk', () => {
  it('binds the ask to the cast voice and refuses a role with no cast voice', () => {
    const ask = renderAsk('zho_for_eng', { role: 'target1', text: '你好' }, { target1: 'cartesia_f9a4' }, 'p')
    expect(ask).toMatchObject({ voiceId: 'cartesia_f9a4', voiceBound: true })
    expect(() => renderAsk('zho_for_eng', { role: 'target2', text: '你好' }, { target1: 'cartesia_f9a4' }, 'p')).toThrow(/no cast voice/)
  })
})

// job #574: a clip that fails the tail audit is marked, and a marked clip is not handed back by library-first reuse
describe('audit-failed clips are excluded from reuse', () => {
  const req = createRequire(import.meta.url)
  const { auditFailOp } = req('./revoice-seeds-to-cast.cjs')
  const { pickExistingClip } = req('../../services/shared/clip-library.cjs')
  const base = { id: 'c1', course_code: 'fra_for_eng', text: 'expliquer très bien', language: 'fra', voice_id: 'cartesia_f1', s3_key: 'a/b.mp3', origin: 'tts' }
  const want = { text: 'expliquer très bien', language: 'fra', courseCode: 'fra_for_eng' }
  it('the op marks veracity_pass false; applying it makes reuse miss, an unmarked clip is still reused', () => {
    expect(pickExistingClip([base], want).id).toBe('c1')
    const op = auditFailOp('c1', 'tail click (spike 9.0, end_abs 0.200)')
    expect(op).toMatchObject({ op: 'audio.update', audio_id: 'c1', set: { veracity_pass: false } })
    expect(pickExistingClip([{ ...base, ...op.set }], want)).toBeNull()
  })
})

// P1 #10: PARALLEL=5 workers all saw spent=0 and sent five 100-char renders under MAX_CHARS=100
describe('makeBudget', () => {
  it('five concurrent 100-char asks under a 100 cap: only one reserves; a settled-to-zero library hit frees its room', () => {
    const b = makeBudget(100)
    expect([1, 2, 3, 4, 5].map(() => b.reserve(100))).toEqual([true, false, false, false, false])
    b.settle(100, 0)
    expect(b.reserve(100)).toBe(true)
    b.settle(100, 100)
    expect(b.reserve(1)).toBe(false)
  })
  it('no cap (0) never refuses', () => { expect(makeBudget(0).reserve(1e9)).toBe(true) })
})

// #736: MAX_CHARS is a hard cap. Six 20-char renders under MAX_CHARS=100 once charged 120 (a paid render whose storage step failed was released as 0)
describe('runPool hard cap', () => {
  const { runPool } = createRequire(import.meta.url)('./revoice-seeds-to-cast.cjs')
  const asks = Array.from({ length: 6 }, (_, i) => ({ chars: 20, i }))
  const run = async (outcome, parallel = 5) => {
    const budget = makeBudget(100); let charged = 0
    const doAsk = async (a, spent) => {
      await new Promise((r) => setTimeout(r, 5 * (a.i + 1)))
      const o = outcome(a); spent(o.paid); charged += o.paid
      if (o.throwAfter) throw new Error('storage failed')
    }
    const r = await runPool(asks, { parallel, budget, max: 100, doAsk: async (a, s, st) => { try { await doAsk(a, s, st) } catch (e) { /* tool logs it */ } } })
    return { charged, ...r }
  }
  it('six paid 20-char renders: total charged <= 100', async () => { const r = await run(() => ({ paid: 20 })); expect(r.charged).toBeLessThanOrEqual(100); expect(r.stopped).toMatch(/MAX_CHARS/) })
  it('a paid render whose storage step fails keeps its reservation', async () => {
    const r = await run((a) => ({ paid: 20, throwAfter: a.i === 0 })); expect(r.charged).toBeLessThanOrEqual(100)
  })
  it('a free library hit releases its reservation and does not stop the run', async () => {
    const r = await run((a) => ({ paid: a.i === 0 ? 0 : 20 })); expect(r.charged).toBe(100); expect(r.next).toBe(6)
  })
})
