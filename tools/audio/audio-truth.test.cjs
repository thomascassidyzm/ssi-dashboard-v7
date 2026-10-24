/** tools/audio/audio-truth.cjs — the pure slot extraction and three-column join (job #329). */
import { describe, it, expect } from 'vitest'
import t from './audio-truth.cjs'
const { parseRef, extractSlots, providerOf, join, aggregate } = t

const U = (n) => `0000000${n}-0000-4000-8000-000000000000`.slice(-36)
const bundle = {
  previewOnly: true,
  legos: [{ legoId: 'S0001L01', seedNumber: 1, ephemeralAudio: { target1: { id: U(1) }, target2: { id: `${U(2)}.v3` }, known: { id: U(3) } } },
    { legoId: 'S0150L01', seedNumber: 150, ephemeralAudio: { target1: { id: U(9) } } }],
  phrases: [{ phraseId: 'S0001L01_use_01', legoId: 'S0001L01', audio: { target1: { id: U(4) } } }],
  seeds: [{ seedId: 'S0001', seedNumber: 1, audio: { target2: { id: U(5) } } }],
  pods: [{ podId: 'zho_for_eng:pod-1', sentences: [{ globalOrder: 1, targetAudio: { id: U(6) }, knownAudio: { id: U(7) } }] }],
}

describe('audio truth', () => {
  it('parses a revisioned ref and a bare one', () => {
    expect(parseRef(`${U(2)}.v3`)).toEqual({ id: U(2), revision: 3 })
    expect(parseRef(U(1))).toEqual({ id: U(1), revision: 1 })
    expect(parseRef('nope')).toBeNull()
  })
  it('extracts every slot in range, presentation only on legos, and reports the highest seed', () => {
    const { slots, maxSeed, previewOnly } = extractSlots(bundle, { from: 1, to: 100 })
    expect(maxSeed).toBe(150)
    expect(previewOnly).toBe(true)
    expect(slots.filter((s) => s.kind === 'lego').map((s) => s.role)).toEqual(['target1', 'target2', 'known', 'presentation'])
    expect(slots.filter((s) => s.kind === 'phrase').map((s) => s.role)).toEqual(['target1', 'target2', 'known'])
    expect(slots.find((s) => s.kind === 'lego' && s.role === 'presentation').ref).toBeNull()
    expect(slots.some((s) => s.seed === 150)).toBe(false)
    expect(slots.filter((s) => s.kind === 'pod').map((s) => [s.role, s.ref])).toEqual([['pod-target', U(6)], ['pod-known', U(7)]])
  })
  it('shows a pod slot as played and recorded with no course cast', () => {
    const { slots } = extractSlots(bundle, { from: 1, to: 1 })
    const rows = join(slots, new Map([[U(6), { voice_id: 'xai_eve', origin: 'tts', audio_revision: 1 }]]), { target1: 'cartesia_x' })
    const pod = rows.find((r) => r.role === 'pod-target')
    expect(pod.recorded_provider).toBe('xai')
    expect(pod.flag).toBe('no-cast')
  })
  it('names providers under the one identity rule', () => {
    expect(providerOf('zh-CN-XiaoxiaoMultilingualNeural')).toBe('azure')
    expect(providerOf('eve')).toBe('xai')
    expect(providerOf('xai_eve')).toBe('xai')
    expect(providerOf('cartesia_f9a4b3a6-b44b-469f-90e3-c8e19bd30e99')).toBe('cartesia')
  })
  it('flags ok, off-cast, human, no-row, no-audio and a stale revision', () => {
    const { slots } = extractSlots(bundle, { from: 1, to: 1 })
    const clips = new Map([
      [U(1), { voice_id: 'cartesia_f9a4b3a6-b44b-469f-90e3-c8e19bd30e99', origin: 'tts', audio_revision: 1 }],
      [U(2), { voice_id: 'zh-CN-YunyiMultilingualNeural', origin: 'tts', audio_revision: 4 }],
      [U(3), { voice_id: 'human_aran', origin: 'human', audio_revision: 1 }],
    ])
    const cast = { target1: 'cartesia_f9a4b3a6-b44b-469f-90e3-c8e19bd30e99', target2: 'cartesia_16212f18-4955-4be9-a6cd-2196ce2c11d1', known: 'cartesia_x' }
    const rows = join(slots, clips, cast)
    const f = (kind, role) => rows.find((r) => r.kind === kind && r.role === role)
    expect(f('lego', 'target1').flag).toBe('ok')
    expect(f('lego', 'target2').flag).toBe('off-cast')
    expect(f('lego', 'target2').stale_ref).toBe(true)
    expect(f('lego', 'target2').recorded_provider).toBe('azure')
    expect(f('lego', 'known').flag).toBe('human')
    expect(f('lego', 'presentation').flag).toBe('no-audio')
    expect(f('phrase', 'target1').flag).toBe('no-row')
    const agg = aggregate(rows)
    expect(agg.byFlag['off-cast']).toBe(1)
    expect(agg.staleRefs).toBe(1)
  })
})
