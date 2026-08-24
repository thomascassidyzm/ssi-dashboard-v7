// @vitest-environment jsdom
/**
 * Course-order reading mode (Kai, 2026-08-21): the recording script is ordered
 * by LEGO coverage, so an uncapped course opens somewhere in the middle. A
 * recordist working straight through wants the SAME lines in course sequence
 * instead, so the audio that lands first is audio for the start of the course.
 *
 * The mode is carried on the recorder link as ?order=course and it is OFF
 * unless it is asked for by that exact word — these tests hold that boundary,
 * because a session silently reordered is a session whose takes land against
 * the wrong expectations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutocueState } from '@/composables/useAutocueState'

function scriptResponse() {
  return {
    ok: true,
    json: async () => ({
      totalItems: 2,
      totalPhrases: 1,
      totalDirect: 0,
      estimatedMinutes: 1,
      maxSeed: null,
      order: 'course',
      items: [
        { index: 0, text: 'eins', cadence: 'natural', type: 'phrase', phraseIndex: 0, seedNumber: 3 },
        { index: 1, text: 'eins', cadence: 'slow', type: 'phrase', phraseIndex: 0, seedNumber: 3 }
      ]
    })
  }
}

let urls
beforeEach(() => {
  urls = []
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    urls.push(String(url))
    if (String(url).includes('/recording-script')) return scriptResponse()
    return { ok: false, json: async () => ({}) }
  }))
})

describe('?order=course reaches the script request', () => {
  it('is off by default — no order param at all', async () => {
    const a = useAutocueState()
    a.resetSession()
    a.state.courseCode = 'deu_at_for_eng'
    await a.loadOptimizedScript('deu_at_for_eng')
    const scriptUrl = urls.find(u => u.includes('/recording-script'))
    expect(scriptUrl).not.toContain('order=')
  })

  it('sends order=course once the link asked for it', async () => {
    const a = useAutocueState()
    a.resetSession()
    a.setScriptOrder('course')
    a.state.courseCode = 'deu_at_for_eng'
    await a.loadOptimizedScript('deu_at_for_eng')
    expect(urls.find(u => u.includes('/recording-script'))).toContain('order=course')
  })

  it('ignores anything that is not exactly "course"', () => {
    const a = useAutocueState()
    a.resetSession()
    for (const bad of ['COURSE', 'sequential', '1', '', undefined, null]) {
      a.setScriptOrder(bad)
      expect(a.state.scriptOrder).toBe('coverage')
    }
  })

  it('a reset drops the order, so it cannot leak into the next session', () => {
    const a = useAutocueState()
    a.setScriptOrder('course')
    expect(a.state.scriptOrder).toBe('course')
    a.resetSession()
    expect(a.state.scriptOrder).toBe('coverage')
  })

  it('records the order the server actually used, for the confirmation screen', async () => {
    const a = useAutocueState()
    a.resetSession()
    a.setScriptOrder('course')
    a.state.courseCode = 'deu_at_for_eng'
    await a.loadOptimizedScript('deu_at_for_eng')
    expect(a.state.scriptInfo.order).toBe('course')
  })
})
