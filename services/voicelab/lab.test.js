/**
 * VOICELAB — the parts that must not be wrong.
 *
 * The money arithmetic, the refusals that stand between a stuck finger and a bill, the
 * blinding, and the scoreboard. Every test here is pure: no TTS key, no whisper, no
 * network, no disk. A test that needs a real render is a test nobody runs, and these are
 * exactly the numbers nobody would notice being wrong.
 *
 * Run: npx vitest run services/voicelab/lab.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const lab = require_('./lab.cjs')
const speechSpan = require_('../audio-intelligence/tiers/speech-span.cjs')
const edge = require_('../audio-intelligence/tiers/tier2-edge-shape.cjs')
const loudness = require_('../audio-intelligence/tiers/loudness.cjs')
const veracity = require_('../audio-veracity.cjs')

const cfg = (over = {}) => lab.normaliseConfig({ provider: 'xai', voiceId: 'v1', language: 'deu', ...over })

describe('estimate — what it costs, before it is spent', () => {
  it('counts every sentence against every config', () => {
    const e = lab.estimate({ sentences: ['abcde', 'fghij'], configs: [{ ...cfg(), key: 'A' }, { ...cfg(), key: 'B' }] })
    expect(e.clips).toBe(4)
    expect(e.chars).toBe(20) // 10 characters, rendered twice
  })

  it('prices xAI at its published rate and nothing else', () => {
    const e = lab.estimate({ sentences: ['x'.repeat(200)], configs: [{ ...cfg(), key: 'A' }] })
    expect(e.usd).toBeCloseTo(200 / 1e6 * 15, 6) // $0.003 for a 200-character sentence
  })

  it('refuses to invent an Azure price, and says so rather than reporting zero silently', () => {
    const e = lab.estimate({ sentences: ['hello'], configs: [{ ...cfg({ provider: 'azure' }), key: 'A' }] })
    expect(e.usd).toBe(0)
    expect(e.perConfig[0].metered).toBe(false)
    expect(e.caveats.join(' ')).toMatch(/Azure/)
    // Characters still count: the ceiling is a character ceiling, not a dollar ceiling.
    expect(e.chars).toBe(5)
  })

  it('ignores blank sentences rather than billing for them', () => {
    const e = lab.estimate({ sentences: ['one', '', '   '], configs: [{ ...cfg(), key: 'A' }] })
    expect(e.clips).toBe(1)
  })

  it('reports what is left of today, and whether this run would go through it', () => {
    const limits = { ...lab.LIMITS, dailyCharCeiling: 100 }
    const under = lab.estimate({ sentences: ['x'.repeat(40)], configs: [{ ...cfg(), key: 'A' }], charsSpentToday: 50, limits })
    expect(under.ceilingRemaining).toBe(50)
    expect(under.wouldExceed).toBe(false)
    const over = lab.estimate({ sentences: ['x'.repeat(60)], configs: [{ ...cfg(), key: 'A' }], charsSpentToday: 50, limits })
    expect(over.wouldExceed).toBe(true)
  })
})

describe('refuse — the caps, and they name their numbers', () => {
  const base = { kind: 'batch', configs: [{ ...cfg(), key: 'A' }], charsSpentToday: 0 }

  it('lets a normal run through', () => {
    expect(lab.refuse({ ...base, sentences: ['guten Tag'] })).toBe(null)
  })

  it('refuses a sentence over the per-sentence cap', () => {
    const r = lab.refuse({ ...base, sentences: ['x'.repeat(301)] })
    expect(r.status).toBe(400)
    expect(r.error).toMatch(/301 characters/)
    expect(r.error).toMatch(/300/)
  })

  it('refuses a batch over the sentence cap', () => {
    const r = lab.refuse({ ...base, sentences: Array.from({ length: 21 }, (_, i) => `line ${i}`) })
    expect(r.status).toBe(400)
    expect(r.error).toMatch(/21 sentences/)
  })

  it('a blind A/B needs exactly two configs', () => {
    expect(lab.refuse({ ...base, kind: 'ab', sentences: ['hi'] }).error).toMatch(/exactly 2 configs/)
    expect(lab.refuse({ ...base, kind: 'ab', sentences: ['hi'], configs: [{ ...cfg(), key: 'A' }, { ...cfg(), key: 'B' }] })).toBe(null)
  })

  it('a single-clip run is one sentence and one config', () => {
    expect(lab.refuse({ ...base, kind: 'single', sentences: ['a', 'b'] }).error).toMatch(/exactly 1 sentence/)
  })

  it('REFUSES at the daily ceiling with a 429 that names spent, remaining and requested', () => {
    const limits = { ...lab.LIMITS, dailyCharCeiling: 1000 }
    const r = lab.refuse({ ...base, sentences: ['x'.repeat(300)], charsSpentToday: 900, limits })
    expect(r.status).toBe(429)
    expect(r.error).toMatch(/900/)   // spent today
    expect(r.error).toMatch(/1000/)  // the ceiling
    expect(r.error).toMatch(/100/)   // what is left
    expect(r.error).toMatch(/300/)   // what this run needs
    expect(r.error).toMatch(/VOICELAB_DAILY_CHARS/)
  })

  it('refuses an empty run rather than creating an experiment with nothing in it', () => {
    expect(lab.refuse({ ...base, sentences: [] }).status).toBe(400)
    expect(lab.refuse({ ...base, sentences: ['hi'], configs: [] }).status).toBe(400)
  })
})

describe('slots — a blind A/B that does not leak the answer by position', () => {
  const keys = ['A', 'B']

  it('puts A on the left every time when the run is not blind', () => {
    const slots = lab.assignSlots({ id: 'abc', sentenceCount: 6, configKeys: keys, blind: false })
    expect(slots.map((s) => s.left)).toEqual(['A', 'A', 'A', 'A', 'A', 'A'])
  })

  it('is stable for one experiment — a reload does not reshuffle a half-judged run', () => {
    const a = lab.assignSlots({ id: 'deadbeefdeadbeef', sentenceCount: 8, configKeys: keys, blind: true })
    const b = lab.assignSlots({ id: 'deadbeefdeadbeef', sentenceCount: 8, configKeys: keys, blind: true })
    expect(a).toEqual(b)
  })

  it('does not simply alternate, and does not put one config on the left every time', () => {
    // Across many experiments the layout must be mixed; a fixed or alternating side is a
    // pattern a listener learns in two clips, and every verdict after that is contaminated.
    let leftA = 0
    let total = 0
    let alternating = 0
    for (let e = 0; e < 200; e++) {
      const slots = lab.assignSlots({ id: `exp${e}`, sentenceCount: 6, configKeys: keys, blind: true })
      for (let i = 0; i < slots.length; i++) {
        total++
        if (slots[i].left === 'A') leftA++
        if (i > 0 && slots[i].left !== slots[i - 1].left) alternating++
      }
    }
    expect(leftA / total).toBeGreaterThan(0.35)
    expect(leftA / total).toBeLessThan(0.65)
    expect(alternating).toBeGreaterThan(0)
    expect(alternating).toBeLessThan(total - 200) // not a perfect A,B,A,B march
  })

  it('a one-config run has one side and does not pretend otherwise', () => {
    const slots = lab.assignSlots({ id: 'x', sentenceCount: 3, configKeys: ['A'], blind: true })
    expect(slots.every((s) => s.left === 'A')).toBe(true)
  })
})

describe('totals — recomputed, never incremented', () => {
  const configs = [{ key: 'A' }, { key: 'B' }]
  const clips = [
    { configKey: 'A', chars: 10, costUsd: 0.00015, verdict: { outcome: 'admitted', refusedBy: [] } },
    { configKey: 'A', chars: 10, costUsd: 0.00015, verdict: { outcome: 'quarantined', refusedBy: ['tail-shape'] } },
    { configKey: 'B', chars: 10, costUsd: 0.00015, verdict: { outcome: 'quarantined', refusedBy: ['tail-shape', 'words'] } },
    { configKey: 'B', chars: 10, costUsd: 0.00015, verdict: null },
    { configKey: 'B', chars: 10, costUsd: 0.00015, error: 'xAI 500' },
  ]

  it('adds up the money and the characters across every clip', () => {
    const t = lab.totals(clips, configs)
    expect(t.clips).toBe(5)
    expect(t.chars).toBe(50)
    expect(t.usd).toBeCloseTo(0.00075, 8)
  })

  it('counts admitted, quarantined, still-running and failed apart from each other', () => {
    const t = lab.totals(clips, configs)
    expect(t.admitted).toBe(1)
    expect(t.quarantined).toBe(2)
    expect(t.errored).toBe(1)
    expect(t.byConfig.B.pending).toBe(1)
  })

  it('names which gate refused, per config — the whole point of an A/B', () => {
    const t = lab.totals(clips, configs)
    expect(t.byConfig.A.gateFails).toEqual({ 'tail-shape': 1 })
    expect(t.byConfig.B.gateFails).toEqual({ 'tail-shape': 1, words: 1 })
  })

  it('a config with no clips scores zero rather than going missing', () => {
    const t = lab.totals([], configs)
    expect(t.byConfig.A.clips).toBe(0)
    expect(t.byConfig.B.admitted).toBe(0)
  })
})

describe('defaults — the lab opens on production, not on an opinion', () => {
  it('reads every default threshold off the tier that enforces it', () => {
    const d = lab.defaultThresholds()
    expect(d.speechSpan.minSpeechMs).toBe(speechSpan.MIN_SPEECH_MS)
    expect(d.speechSpan.speechAboveFloorDb).toBe(speechSpan.SPEECH_ABOVE_FLOOR_DB)
    expect(d.tailShape).toEqual({ ...edge.THRESHOLDS })
    expect(d.loudness.targetLufs).toBe(loudness.DEFAULT_BAND.targetLufs)
    expect(d.loudness.toleranceDb).toBe(loudness.DEFAULT_BAND.toleranceDb)
    expect(d.loudness.truePeakCeilingDbtp).toBe(loudness.DEFAULT_BAND.truePeakCeilingDbtp)
    expect(d.words.cerThreshold).toBe(veracity.CER_THRESHOLD)
  })

  it('fills in every field of a half-written config without dropping the caller\'s overrides', () => {
    const c = lab.normaliseConfig({ provider: 'azure', voiceId: 'de-DE-KatjaNeural', language: 'deu', thresholds: { loudness: { targetLufs: -18 } } })
    expect(c.codec).toBe('mp3')
    expect(c.speed).toBe(1)
    expect(c.thresholds.loudness.targetLufs).toBe(-18)
    // The untouched legs of the same gate keep the shipped value.
    expect(c.thresholds.loudness.toleranceDb).toBe(loudness.DEFAULT_BAND.toleranceDb)
    expect(c.thresholds.words.cerThreshold).toBe(veracity.CER_THRESHOLD)
  })
})

describe('providers — the supports flags are honest', () => {
  it('says plainly that xAI has no speed, style or pitch', () => {
    const xai = lab.PROVIDERS.find((p) => p.id === 'xai')
    expect(xai.supports.speed).toBe(false)
    expect(xai.supports.style).toBe(false)
    expect(xai.supports.sampleRate).toBe(true)
    expect(xai.supports.bitRate).toBe(true)
    expect(xai.note).toMatch(/no speed/i)
  })

  it('says Azure takes speed but not the output format', () => {
    const azure = lab.PROVIDERS.find((p) => p.id === 'azure')
    expect(azure.supports.speed).toBe(true)
    expect(azure.supports.sampleRate).toBe(false)
    expect(azure.supports.bitRate).toBe(false)
    expect(azure.supports.style).toBe(false)
  })
})

describe('masterLufs — the loudness Play mode moves is the RENDER, not the gate band', () => {
  it('defaults to the house mastering level rather than the gate band centre', () => {
    // These are two different numbers on purpose: -16.0 is what masterAudio
    // renders to, -15.5 is the centre of the band the store would admit. If a
    // future edit collapses them, the loudness slider stops being able to fail
    // and the gate stops meaning anything.
    expect(lab.defaultConfig().masterLufs).toBe(lab.HOUSE_MASTER_LUFS)
    expect(lab.HOUSE_MASTER_LUFS).toBe(-16.0)
    expect(lab.HOUSE_MASTER_LUFS).not.toBe(loudness.DEFAULT_BAND.targetLufs)
  })

  it('is carried on a config and survives normalisation', () => {
    expect(cfg({ masterLufs: -14.5 }).masterLufs).toBe(-14.5)
    expect(cfg({ masterLufs: 'nonsense' }).masterLufs).toBe(lab.HOUSE_MASTER_LUFS)
  })

  it('sits inside the band at every Play-mode stop, so no slider position can be a refusal', () => {
    // Play mode derives its stops as centre ± reach/2 where reach is the widest
    // symmetric swing that stays in band; this asserts the arithmetic that
    // guarantee rests on.
    const { targetLufs, toleranceDb } = loudness.DEFAULT_BAND
    const centre = lab.HOUSE_MASTER_LUFS
    const reach = Math.min(centre - (targetLufs - toleranceDb), (targetLufs + toleranceDb) - centre)
    expect(reach).toBeGreaterThan(0)
    for (const i of [0, 1, 2, 3, 4]) {
      const lufs = centre + (i - 2) * (reach / 2)
      expect(Math.abs(lufs - targetLufs)).toBeLessThanOrEqual(toleranceDb)
    }
  })
})

describe('export — a config for a human, never a deployment', () => {
  const experiment = {
    id: 'aaaaaaaaaaaaaaaa',
    at: '2026-08-07T10:00:00.000Z',
    title: 'clone vs Clara',
    sentences: [{ i: 0, text: 'guten Tag' }],
    configs: [{ key: 'A', ...cfg({ voiceName: "Tom's clone" }) }],
    clips: [{ configKey: 'A', chars: 9, costUsd: 0.0001, verdict: { outcome: 'admitted', refusedBy: [] } }],
  }

  it('carries the parameters AND the evidence they were judged on', () => {
    const out = lab.exportConfig(experiment, 'A')
    expect(out.config.provider).toBe('xai')
    expect(out.config.thresholds.loudness.targetLufs).toBe(loudness.DEFAULT_BAND.targetLufs)
    expect(out.config.evidence.admitted).toBe(1)
    expect(out.config.evidence.sentences).toEqual(['guten Tag'])
    expect(out.filename).toMatch(/^voicelab-aaaaaaaaaaaaaaaa-A\.json$/)
  })

  it('says in the payload itself that nothing was written anywhere', () => {
    expect(lab.exportConfig(experiment, 'A').note).toMatch(/never|not a deployment|human applies/i)
    expect(lab.exportConfig(experiment, 'A').note).toMatch(/algorithm_config/)
  })
})
