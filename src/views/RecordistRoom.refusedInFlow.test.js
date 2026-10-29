// Aran, 2026-10-15 (live, popty.app, health-ladder-pilot batch 1): refused takes STACKED as big red
// notices, one per take, and hid the line he should have been reading. "The actual phrases should be
// coming up as normal in the recording tool." So: no notices over the reading area; a refused line is
// a normal line still to read (status "refused", reached by Jump to next unrecorded) with one small
// reason under it; at most ONE slim bar counts them and jumps to the first.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { shortRefusalReason, refusedLineWords } from './recordist/refused-takes.js'

const rec = vi.hoisted(() => ({ failed: null }))
vi.mock('@/composables/useRecordistQueue', () => ({
  DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
  useRecordistQueue: () => ({
    persistent: ref(true), carriedOverCount: ref(0), refusedCount: ref(3),
    isUnsent: () => false, attach: vi.fn(), teardown: vi.fn(), queueTake: vi.fn(), markFailed: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0), failedCount: ref(0),
    saved: reactive(new Map()), failed: rec.failed, flush: vi.fn(), retryFailed: vi.fn(),
  }),
}))
vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice', resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(true), level: ref(0.3), clipping: ref(false), devices: ref([]),
    appliedSettings: ref({}), profile: ref('voice'), error: ref(null), lineHasSpeech: ref(true),
    quietMs: ref(0), meterTrusted: ref(true), inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    beginLine: vi.fn(), endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)]))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))
import RecordistRoom from './RecordistRoom.vue'

beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

const SILENT = 'This take contains no audible speech (1ms after silence trimming, minimum 100ms), so it was not saved. Check the microphone is live and record it again.'
const LINES = [1, 2, 3, 4, 5, 6].map(n => ({
  id: `line-${n}`, order: n, text: `llinell ${n}`, knownText: `line ${n}`, recorded: n === 1 || n === 2, clipUrl: null,
}))

beforeEach(() => {
  global.fetch = vi.fn().mockImplementation(() => Promise.resolve({
    ok: true, status: 200,
    json: async () => ({ displayName: 'Test Voice', languageName: 'Welsh', total: 6, recorded: 2, remaining: 4, lines: LINES }),
  }))
})

rec.failed = reactive(new Map())

async function live() {
  const w = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' } })
  await flushPromises()
  await w.find('.btn-begin').trigger('click')
  await flushPromises()
  return w
}

describe('RecordistRoom — refused lines come up in the normal flow', () => {
  it('no stacked notices over the line; ONE slim bar counts them and Go to first lands on the first', async () => {
    rec.failed.clear()
    const w = await live()
    // Start lands on line 3, the first unrecorded line — line 1 of the four left to read,
    // because lines 1-2 were recorded when the batch opened (job #816).
    expect(w.find('[data-test="line-pos"]').text()).toContain('Line 1 of 4')
    expect(w.find('[data-test="refused-summary"]').exists()).toBe(false)
    rec.failed.set('line-4', SILENT)
    rec.failed.set('line-5', SILENT)
    rec.failed.set('line-6', SILENT)
    await flushPromises()
    expect(w.find('[data-test="refused-notice"]').exists()).toBe(false)
    expect(w.findAll('[data-test="refused-rerecord"]')).toHaveLength(0)
    expect(w.text()).not.toContain("That line didn't save")
    expect(w.text()).not.toContain('1ms after silence trimming')
    const bars = w.findAll('[data-test="refused-summary"]')
    expect(bars).toHaveLength(1)
    // All three were refused for no speech, so the one bar is the small grey note (job #915).
    expect(bars[0].text()).toContain('No speech heard on 3 lines')
    expect(bars[0].classes()).toContain('quiet')
    // ...and no second notice about the same takes at the top of the page.
    expect(w.find('.safety-banner.refused').exists()).toBe(false)
    // The line he is on is still the line on screen.
    expect(w.find('.line-target').text()).toContain('llinell 3')
    await w.find('[data-test="refused-go-first"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="line-pos"]').text()).toContain('Line 2 of 4')
    expect(w.find('[data-test="line-state"]').text()).toBe('refused')
    // Shown exactly like any other line to read, with one small reason under it.
    expect(w.find('.line-target').text()).toContain('llinell 4')
    expect(w.find('[data-test="refused-why"]').text()).toBe("Last take didn't save: no speech heard")
    // Standing on the first, the bar keeps its count but has nowhere to send him.
    expect(w.find('[data-test="refused-go-first"]').exists()).toBe(false)
    // Jump to next unrecorded stops on the next refused line.
    expect(w.find('[data-test="jump-unrecorded"]').text()).toContain('line 3')
  })

  it('a line that is not refused carries no reason', async () => {
    rec.failed.clear()
    const w = await live()
    rec.failed.set('line-5', SILENT)
    await flushPromises()
    expect(w.find('[data-test="refused-why"]').exists()).toBe(false)
    expect(w.find('[data-test="refused-summary"]').text()).toContain('No speech heard on 1 line')
  })
})

describe('shortRefusalReason', () => {
  it('says each server refusal in a few words', () => {
    expect(shortRefusalReason(SILENT)).toBe('no speech heard')
    expect(shortRefusalReason('That take came out silent — read it again.')).toBe('no speech heard')
    expect(shortRefusalReason("We couldn't hear your voice on that one - it sounded like background noise. Please try again somewhere quiet.")).toBe('only background noise heard')
    expect(shortRefusalReason('That take runs off the end, so your last word is cut off. It hasn\'t been saved.')).toBe('the last word was cut off')
    expect(shortRefusalReason('Your take recorded fine — the server could not process it.')).toBe('a fault on our server, not yours')
    expect(shortRefusalReason('Something new. More words.')).toBe('Something new')
    expect(refusedLineWords('')).toBe("Last take didn't save: the server would not take it")
  })
})
