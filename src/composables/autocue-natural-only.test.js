// @vitest-environment jsdom
/**
 * Natural-only recording (Kai, 2026-08-21): in course order the recordist reads
 * each line ONCE, at natural speed, and the slow pass never appears. The server
 * decides that — it simply stops emitting the slow items — so the composable's
 * job is to carry the verdict through to the confirmation screen and to load
 * whatever items arrived without inventing a second pass.
 *
 * The flag matters on screen: the script-loaded panel otherwise promises "amber
 * text for slow reading", which a natural-only session never shows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutocueState } from '@/composables/useAutocueState'

function respond(body) {
  return { ok: true, json: async () => body }
}

// What the endpoint returns for ?order=course: one natural item per line.
const NATURAL_ONLY = {
  totalItems: 2,
  totalPhrases: 1,
  totalDirect: 1,
  estimatedMinutes: 1,
  maxSeed: null,
  order: 'course',
  naturalOnly: true,
  items: [
    { index: 0, text: 'wos mechatst?', cadence: 'natural', type: 'phrase', phraseIndex: 0, seedNumber: 3, chunksString: 'wos | mechatst', chunkCount: 2 },
    { index: 1, text: 'mecht', cadence: 'natural', type: 'direct', legoId: 'L9' }
  ]
}

// The unchanged default: natural then slow for the same line.
const INTERLEAVED = {
  totalItems: 2,
  totalPhrases: 1,
  totalDirect: 0,
  estimatedMinutes: 1,
  maxSeed: null,
  order: 'coverage',
  naturalOnly: false,
  items: [
    { index: 0, text: 'wos mechatst?', cadence: 'natural', type: 'phrase', phraseIndex: 0, seedNumber: 3 },
    { index: 1, text: 'wos mechatst?', cadence: 'slow', type: 'phrase', phraseIndex: 0, seedNumber: 3 }
  ]
}

function stubFetch(body) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/recording-script')) return respond(body)
    return { ok: false, json: async () => ({}) }
  }))
}

beforeEach(() => vi.unstubAllGlobals())

describe('natural-only script loading', () => {
  it('loads a natural-only script with no slow item anywhere', async () => {
    stubFetch(NATURAL_ONLY)
    const a = useAutocueState()
    a.resetSession()
    a.setScriptOrder('course')
    a.state.courseCode = 'deu_at_for_eng'
    await a.loadOptimizedScript('deu_at_for_eng')

    expect(a.state.phrases).toHaveLength(2)
    expect(a.state.phrases.every(p => p.cadence === 'natural')).toBe(true)
    expect(a.state.scriptInfo.naturalOnly).toBe(true)
  })

  it('keeps chunk data on the natural take, so the line stays alignable later', async () => {
    stubFetch(NATURAL_ONLY)
    const a = useAutocueState()
    a.resetSession()
    a.setScriptOrder('course')
    await a.loadOptimizedScript('deu_at_for_eng')
    expect(a.state.phrases[0].chunksString).toBe('wos | mechatst')
    expect(a.state.phrases[0].chunkCount).toBe(2)
  })

  it('leaves the default session two-pass, exactly as before', async () => {
    stubFetch(INTERLEAVED)
    const a = useAutocueState()
    a.resetSession()
    await a.loadOptimizedScript('deu_at_for_eng')
    expect(a.state.scriptInfo.naturalOnly).toBe(false)
    expect(a.state.phrases.map(p => p.cadence)).toEqual(['natural', 'slow'])
  })

  it('infers natural-only from the order if an older API omits the flag', async () => {
    const { naturalOnly, ...noFlag } = NATURAL_ONLY
    stubFetch(noFlag)
    const a = useAutocueState()
    a.resetSession()
    a.setScriptOrder('course')
    await a.loadOptimizedScript('deu_at_for_eng')
    expect(a.state.scriptInfo.naturalOnly).toBe(true)
  })

  it('does not claim natural-only for a coverage session missing the flag', async () => {
    const { naturalOnly, ...noFlag } = INTERLEAVED
    stubFetch(noFlag)
    const a = useAutocueState()
    a.resetSession()
    await a.loadOptimizedScript('deu_at_for_eng')
    expect(a.state.scriptInfo.naturalOnly).toBe(false)
  })
})
